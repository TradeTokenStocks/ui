import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { DitherField } from '@/components/dither-field';
import { PulseDot } from '@/components/ui/pulse-dot';
import { Segmented, type Segment } from '@/components/ui/segmented';
import { Body, Display, Num } from '@/components/ui/text';
import { fill, ink, palette, radius, shadow, space, stroke } from '@/theme/tokens';
import { usePrivy } from '@privy-io/expo';
import {
  executableTotalUsd,
  formatLedgerAmount,
  formatNumber,
  formatPercent,
  formatUsd,
  isGain,
  splitUsd,
  type BrokeragePosition,
  type CompanyExposure,
  type LedgerRow,
} from '@tradetoken/domain';
import {
  account,
  activity,
  companies,
  companyDetails,
  tokenizedStocks,
  totals,
} from '@tradetoken/domain/fixtures';
import { useBrokerageHoldings } from '@/features/connections/hooks/use-brokerage-holdings';
import { useAddedStockHoldings } from '@/features/stocks/stock-holdings-store';
import { useWalletStockHoldings } from '@/features/stocks/use-wallet-stock-holdings';
import { useIndexedEvents } from '@/features/events/use-indexed-events';

/** Height of the dither field at the top of the screen. */
const FIELD_HEIGHT = 380;

/**
 * What a company holds onchain, taken from the legs its own detail page calls
 * executable, so a row and the page it opens never disagree.
 */
function onchainValueUsd(company: CompanyExposure): number {
  const detail = companyDetails[company.ticker];
  if (detail) return executableTotalUsd(detail);
  return company.valueUsd * (company.onchainPct / 100);
}

/**
 * The portfolio destination, chrome-less: no dock, no scene transition of its
 * own. The dock shell keeps it mounted across switches, so the segment choice
 * and the scroll position belong to this scene and survive tab changes.
 */
export function PortfolioScene({ insets }: { insets: EdgeInsets }) {
  const { width } = useWindowDimensions();
  const [segment, setSegment] = useState('holdings');
  const added = useAddedStockHoldings();
  const brokerage = useBrokerageHoldings();
  const walletStocks = useWalletStockHoldings();
  const indexedEvents = useIndexedEvents();
  const segments: Segment[] = [
    { key: 'holdings', label: 'Holdings' },
    { key: 'events', label: 'Events', badge: indexedEvents.events.length > 0 },
    { key: 'activity', label: 'Activity' },
  ];
  const { user } = usePrivy();

  const emailAccount = user?.linked_accounts?.find((acc) => acc.type === 'email');
  const userEmail = emailAccount?.type === 'email' ? emailAccount.address : null;

  const isSignedIn = Boolean(user);
  const displayName = userEmail ? (userEmail.split('@')[0] ?? 'User') : 'User';
  const avatarInitial = displayName[0]?.toUpperCase() ?? 'U';

  const navHeight = 56 + insets.bottom + 26;
  const addedTotalUsd = Object.values(added).reduce((total, holding) => total + holding.amountUsd, 0);
  /**
   * Total exposure is wallet plus brokerage, and nothing else. An unlinked or
   * expired brokerage contributes zero rather than a remembered figure — the
   * headline number never claims to know something the connection cannot tell
   * it right now.
   */
  const walletAllocatableUsd = walletStocks.live
    ? walletStocks.totalUsd
    : totals.walletAllocatableUsd + addedTotalUsd;
  const brokerageObservedUsd = brokerage.connected ? brokerage.totalValueUsd : 0;
  const exposure = splitUsd(walletAllocatableUsd + brokerageObservedUsd);
  const liveHoldingsByTicker = (walletStocks.holdings ?? []).reduce<Record<string, number>>((acc, item) => {
    if (item.valueUsd > 0) {
      acc[item.underlying] = (acc[item.underlying] ?? 0) + item.valueUsd;
    }
    return acc;
  }, {});

  const liveTickers = Array.from(
    new Set([...Object.keys(liveHoldingsByTicker), ...Object.keys(added)])
  );

  const visibleCompanies: CompanyExposure[] = walletStocks.live
    ? liveTickers
        .map((ticker) => {
          const stock = tokenizedStocks.find((item) => item.ticker === ticker);
          const holding = added[ticker];
          const walletValue = (liveHoldingsByTicker[ticker] ?? 0) + (holding?.amountUsd ?? 0);
          const brokeragePos = brokerage.connected
            ? brokerage.positions.find((p) => p.ticker.toUpperCase() === ticker.toUpperCase())
            : undefined;
          const brokerageValue = brokeragePos?.valueUsd ?? 0;
          const totalValue = walletValue + brokerageValue;
          const onchainPct = totalValue > 0 ? Math.round((walletValue / totalValue) * 100) : 100;
          const observedPct = 100 - onchainPct;

          return {
            ticker,
            name: stock?.name ?? ticker,
            initials: ticker.slice(0, 2),
            valueUsd: totalValue,
            changePct: stock?.changePct ?? 0,
            observedPct,
            onchainPct,
            ...(holding ? { dividendPreference: holding.preference } : {}),
          };
        })
        .filter((company) => company.valueUsd > 0)
    : [
        ...companies.map((company) => {
          const holding = added[company.ticker];
          return {
            ...company,
            valueUsd: onchainValueUsd(company) + (holding?.amountUsd ?? 0),
            ...(holding ? { dividendPreference: holding.preference } : {}),
          };
        }),
        ...Object.entries(added)
          .filter(([ticker]) => !companies.some((company) => company.ticker === ticker))
          .map(([ticker, holding]) => {
            const stock = tokenizedStocks.find((item) => item.ticker === ticker)!;
            return {
              ticker,
              name: stock.name,
              initials: ticker.slice(0, 2),
              observedPct: 0,
              onchainPct: 100,
              valueUsd: holding.amountUsd,
              changePct: stock.changePct,
              dividendPreference: holding.preference,
            };
          }),
      ];

  const unmergedBrokeragePositions = brokerage.connected
    ? brokerage.positions.filter(
        (p) => !visibleCompanies.some((c) => c.ticker.toUpperCase() === p.ticker.toUpperCase()),
      )
    : [];

  return (
    <View style={styles.root}>
      {/* Ambient field. Sits behind the balance only — it stops well above the
          list so the numbers never sit on moving pixels. */}
      <View style={[styles.field, { height: FIELD_HEIGHT }]} pointerEvents="none">
        <DitherField width={width} height={FIELD_HEIGHT} />
        <LinearGradient
          colors={['rgba(10,11,13,0)', 'rgba(10,11,13,0.82)', palette.bg]}
          locations={[0, 0.52, 1]}
          style={styles.fieldFade}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: navHeight + space.xl }}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.push(isSignedIn ? '/wallet' : '/sign-in')}
            accessibilityRole="button"
            accessibilityLabel={isSignedIn ? 'Open wallet and security' : 'Sign in and create your wallet'}
            style={({ pressed }) => [
              styles.identity,
              !isSignedIn && styles.signInIdentity,
              pressed && styles.identityPressed,
            ]}>
            {isSignedIn ? (
              <LinearGradient
                colors={[palette.cobalt, palette.violet]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.avatar}>
                <Body size={12} weight="semibold" color="#fff">
                  {avatarInitial}
                </Body>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={[palette.cobalt, palette.violet]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.signInMark}
                accessible={false}>
                <View style={styles.personHead} />
                <View style={styles.personShoulders} />
              </LinearGradient>
            )}
            <Body size={14} weight="semibold" color={isSignedIn ? ink.primary : palette.cobaltText}>
              {isSignedIn ? displayName : 'Sign in'}
            </Body>
            {!isSignedIn && (
              <Body size={17} weight="medium" color={palette.cobaltText} style={styles.signInChevron}>
                ›
              </Body>
            )}
          </Pressable>

          {account.isSandbox && (
            <Pressable
              onPress={() => router.push('/connections')}
              accessibilityRole="button"
              accessibilityLabel="Open sandbox connections"
              style={({ pressed }) => [styles.chip, pressed && { opacity: 0.65 }]}>
              <PulseDot />
              <Body size={11.5} weight="semibold" color={ink.primary}>
                Sandbox
              </Body>
            </Pressable>
          )}
        </View>

        <View style={styles.balance}>
          <Body size={12.5} weight="medium" color={ink.tertiary}>
            Total exposure
          </Body>
          <Display size={50} style={styles.balanceValue}>
            {exposure.whole}
            <Display size={50} style={styles.cents}>
              {exposure.cents}
            </Display>
          </Display>
          <View style={styles.changeRow}>
            <Num size={13} weight="medium" color={palette.positive}>
              {formatUsd(totals.changeAbsoluteUsd, { digits: 2, sign: true })}
            </Num>
            <Num size={13} color={ink.quaternary}>
              {`${formatPercent(totals.changePct, 2)} today`}
            </Num>
          </View>
        </View>

        {/* The single most important distinction in the app: one of these can
            settle a fill and the other cannot. Saturation carries that, so the
            allocatable card is the only filled surface on the screen. */}
        <View style={styles.cards}>
          <View style={[styles.card, styles.cardAccent]}>
            <LinearGradient
              colors={[palette.cobalt, palette.cobaltDeep]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.specular} />
            <Body size={11.5} weight="semibold" color="rgba(255,255,255,0.78)">
              Wallet · allocatable
            </Body>
            <Num size={20} weight="medium" color="#fff" style={styles.cardValue}>
              {formatUsd(walletAllocatableUsd)}
            </Num>
          </View>

          <Pressable
            onPress={() => router.push('/connections')}
            accessibilityRole="button"
            accessibilityLabel={
              brokerage.connected
                ? `Brokerage observed, ${formatUsd(brokerageObservedUsd)}, read only`
                : 'Connect a brokerage'
            }
            style={({ pressed }) => [styles.card, styles.cardMuted, pressed && { opacity: 0.8 }]}>
            <Body size={11.5} weight="semibold" color={ink.tertiary}>
              Brokerage · observed
            </Body>
            <Num size={20} weight="medium" style={styles.cardValue}>
              {formatUsd(brokerageObservedUsd)}
            </Num>
            <Body size={10.5} color={ink.quaternary} style={styles.cardMeta}>
              {brokerage.connected
                ? `Read-only · ${brokerage.institution ?? 'brokerage'}`
                : brokerage.needsReconnect
                  ? 'Access expired · reconnect'
                  : brokerage.isLoading
                    ? 'Checking connection…'
                    : 'Connect a brokerage'}
            </Body>
          </Pressable>
        </View>

        <View style={styles.segmentWrap}>
          <Segmented segments={segments} value={segment} onChange={setSegment} />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelSpecular} />
          <Animated.View
            key={segment}
            entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}>
            {segment === 'holdings' ? (
              <>
                <View style={styles.panelHeader}>
                  <View style={styles.panelTitleRow}>
                    <View style={styles.panelTitleCopy}>
                      <Body size={15.5} weight="semibold">
                        Companies
                      </Body>
                      <Body size={11.5} weight="medium" color={ink.quaternary} style={styles.panelCount}>
                        {formatNumber(visibleCompanies.length + unmergedBrokeragePositions.length)} holdings
                      </Body>
                    </View>
                    <Pressable
                      onPress={() => router.push('/stocks/add' as Href)}
                      accessibilityRole="button"
                      accessibilityLabel="Add a tokenized stock"
                      style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.72 }]}>
                      <Body size={11.5} weight="semibold" color="#fff">＋ Add stock</Body>
                    </Pressable>
                  </View>
                </View>
                {brokerage.connected ? (
                  <View style={styles.groupLabel}>
                    <Body size={10.5} weight="semibold" color={ink.faint} tracking={1.1}>
                      CONSOLIDATED · ONCHAIN & OBSERVED
                    </Body>
                  </View>
                ) : null}
                {visibleCompanies.length > 0 ? (
                  <View style={styles.companyList}>
                    {visibleCompanies.map((company, index) => (
                      <CompanyRow key={company.ticker} company={company} divided={index > 0} />
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Body size={13} weight="medium" color={ink.tertiary}>
                      No onchain stock tokens yet
                    </Body>
                    <Body size={11.5} color={ink.faint} style={styles.emptyDescription}>
                      Mint tokenized stock pairs to commit into Aqua strategies.
                    </Body>
                    <Pressable
                      onPress={() => router.push('/stocks/add' as Href)}
                      style={({ pressed }) => [
                        styles.emptyButton,
                        pressed && { opacity: 0.72 },
                      ]}>
                      <Body size={11.5} weight="medium" color={palette.cobaltText}>
                        ＋ Mint test stocks
                      </Body>
                    </Pressable>
                  </View>
                )}

                {brokerage.connected && unmergedBrokeragePositions.length > 0 ? (
                  <>
                    <View style={[styles.groupLabel, styles.groupLabelObserved]}>
                      <Body size={10.5} weight="semibold" color={ink.faint} tracking={1.1}>
                        OBSERVED AT {(brokerage.institution ?? 'BROKERAGE').toUpperCase()} · READ-ONLY
                      </Body>
                    </View>
                    <View style={styles.companyList}>
                      {unmergedBrokeragePositions.map((position, index) => (
                        <ObservedRow key={position.ticker} position={position} divided={index > 0} />
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            ) : (
              <View style={styles.ledger}>
                {segment === 'events' && indexedEvents.loading ? (
                  <Body size={12} color={ink.faint} style={styles.ledgerStatus}>Loading indexed events…</Body>
                ) : null}
                {segment === 'events' && indexedEvents.error ? (
                  <Body size={12} color={palette.amberBright} style={styles.ledgerStatus}>{indexedEvents.error}</Body>
                ) : null}
                {segment === 'events' && !indexedEvents.loading && !indexedEvents.error && indexedEvents.events.length === 0 ? (
                  <Body size={12} color={ink.faint} style={styles.ledgerStatus}>No multiplier updates indexed yet.</Body>
                ) : null}
                {(segment === 'events' ? indexedEvents.events : activity).map((row) => (
                  <LedgerItem key={row.id} row={row} />
                ))}
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * A brokerage position. Inert by design — not pressable, no chevron: there is
 * no onchain representation behind it to act on.
 */
function ObservedRow({ position, divided }: { position: BrokeragePosition; divided: boolean }) {
  return (
    <View
      style={[styles.row, divided && styles.rowDivided]}
      accessible
      accessibilityLabel={`${position.name}, ${formatUsd(position.valueUsd)}, ${formatNumber(position.shares, 2)} shares observed at a brokerage.`}>
      <View style={styles.tile}>
        <Body size={12} weight="semibold" color={ink.tertiary}>
          {position.ticker.slice(0, 2)}
        </Body>
      </View>

      <View style={styles.rowBody}>
        <View style={styles.companyLine}>
          <View style={styles.flex}>
            <View style={styles.companyNameRow}>
              <Body size={14.5} weight="semibold" numberOfLines={1} style={styles.companyName}>
                {position.name}
              </Body>
              <View style={styles.observedBadge}>
                <Body size={9} weight="semibold" color={ink.tertiary}>Observed</Body>
              </View>
            </View>
            <Num size={10.5} color={ink.faint} style={styles.ticker}>
              {position.ticker} · {formatNumber(position.shares, 2)} shares
            </Num>
          </View>
          <View style={styles.rowTrailing}>
            <Num size={14} weight="medium">{formatUsd(position.valueUsd)}</Num>
            <Num size={11.5} color={ink.quaternary} style={styles.rowSub}>
              {formatUsd(position.priceUsd, { digits: 2 })}
            </Num>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * A company's total exposure, split by whether it can be put to work.
 *
 * The bar is the honest part: the outlined portion is observed at a brokerage
 * and inert, the cobalt portion is onchain and allocatable. Two companies can
 * show the same value and mean completely different things.
 */
function CompanyRow({ company, divided }: { company: CompanyExposure; divided: boolean }) {
  const value = formatUsd(company.valueUsd);
  const change = formatPercent(company.changePct);
  const changeColor = isGain(company.changePct) ? palette.positive : ink.quaternary;

  return (
    <Pressable
      onPress={() => router.push(`/company/${company.ticker}`)}
      style={({ pressed }) => [
        styles.row,
        divided && styles.rowDivided,
        pressed && { backgroundColor: fill.press },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${company.name}, ${value}, ${change}. ${company.onchainPct}% onchain and allocatable, ${company.observedPct}% observed at a brokerage.`}>
      <View style={styles.tile}>
        <Body size={12} weight="semibold" color={ink.secondary}>
          {company.initials}
        </Body>
      </View>

      <View style={styles.rowBody}>
        <View style={styles.companyLine}>
          <View style={styles.flex}>
            <View style={styles.companyNameRow}>
              <Body size={14.5} weight="semibold" numberOfLines={1} style={styles.companyName}>
                {company.name}
              </Body>
              {company.dividendPreference ? <View style={[styles.dividendBadge, company.dividendPreference === 'usdc' && styles.dividendBadgeUsdc]}><Body size={9} weight="semibold" color={company.dividendPreference === 'usdc' ? palette.positive : palette.cobaltText}>{company.dividendPreference === 'drip' ? 'DRIP' : 'USDC yield'}</Body></View> : null}
            </View>
            <Num size={10.5} color={ink.faint} style={styles.ticker}>
              {company.ticker}
            </Num>
          </View>
          <View style={styles.rowTrailing}>
            <Num size={14} weight="medium">
              {value}
            </Num>
            <Num size={11.5} color={changeColor} style={styles.rowSub}>
              {change}
            </Num>
          </View>
        </View>

        <View style={styles.exposureBar} accessible={false}>
          <LinearGradient
            colors={[palette.cobalt, palette.cobaltDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.barOnchain, { flex: company.onchainPct }]}
          />
          <View style={[styles.barObserved, { flex: company.observedPct }]} />
        </View>
        <View style={styles.splitLabels}>
          {/* A zero side is noise, not information — a full bar already says
              which custody model holds everything. */}
          {company.onchainPct > 0 ? (
            <Num size={10.5} color={palette.cobaltText}>
              Wallet {company.onchainPct}%
            </Num>
          ) : null}
          {company.observedPct > 0 ? (
            <Num size={10.5} color={ink.faint} style={styles.observedLabel}>
              Brokerage {company.observedPct}%
            </Num>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function LedgerItem({ row }: { row: LedgerRow }) {
  const onchain = row.provenance === 'onchain';
  const needsReview = row.amount.kind === 'action';
  const amount = formatLedgerAmount(row.amount);
  return (
    <Pressable
      onPress={row.id === 'nvda-split' ? () => router.push('/events/nvda-split') : undefined}
      style={({ pressed }) => [styles.ledgerRow, pressed && { backgroundColor: fill.press }]}
      accessibilityRole="button"
      accessibilityLabel={`${row.title}. ${row.meta}. ${amount}, ${row.time}. ${
        onchain ? 'Onchain' : 'Observed at a brokerage'
      }.`}>
      <View
        style={[
          styles.provenanceBar,
          onchain
            ? { backgroundColor: needsReview ? palette.amber : palette.cobalt }
            : { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
        ]}
      />
      <View style={styles.rowBody}>
        <Body size={13.5} weight="semibold">
          {row.title}
        </Body>
        <Num size={11.5} color={ink.quaternary} style={styles.rowSub}>
          {row.meta}
        </Num>
      </View>
      <View style={styles.rowTrailing}>
        <Num size={13} weight="medium">
          {amount}
        </Num>
        <Num size={11} color={ink.faint} style={styles.rowSub}>
          {row.time}
        </Num>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  field: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  fieldFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 200 },

  header: {
    paddingHorizontal: space.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  identityPressed: { opacity: 0.65, transform: [{ scale: 0.98 }] },
  signInIdentity: {
    gap: 8,
    minHeight: 38,
    paddingLeft: 5,
    paddingRight: 11,
    paddingVertical: 4,
    backgroundColor: 'rgba(94,124,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(141,162,255,0.3)',
    borderRadius: radius.pill,
  },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  signInMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personHead: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginBottom: 2,
  },
  personShoulders: {
    width: 13,
    height: 6,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    backgroundColor: '#fff',
  },
  signInChevron: { marginLeft: -2, marginTop: -1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 38,
    backgroundColor: 'rgba(10,11,13,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },

  balance: { paddingHorizontal: space.gutter, marginTop: space.xxl },
  balanceValue: { marginTop: 4 },
  cents: { opacity: 0.3 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10 },

  cards: { flexDirection: 'row', gap: 10, paddingHorizontal: space.gutter, marginTop: space.xl },
  card: { flex: 1, borderRadius: radius.lg, paddingHorizontal: 15, paddingVertical: 14, overflow: 'hidden' },
  cardAccent: { borderWidth: 1, borderColor: stroke.onAccent, ...shadow.accent },
  cardMuted: { backgroundColor: fill.subtle, borderWidth: 1, borderColor: stroke.raised },
  cardValue: { marginTop: 6 },
  cardMeta: { marginTop: 6 },
  specular: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: stroke.specular },

  segmentWrap: { paddingHorizontal: space.gutter, marginTop: space.xl },

  panel: {
    marginHorizontal: 12,
    marginTop: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: stroke.hairline,
    borderRadius: radius.xl,
    paddingBottom: 4,
    ...shadow.card,
  },
  panelSpecular: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  panelHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: fill.subtle,
    borderBottomWidth: 1,
    borderBottomColor: stroke.hairline,
  },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  panelTitleCopy: { flex: 1 },
  panelCount: { marginTop: 3 },
  addButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: palette.cobalt },
  companyList: { paddingHorizontal: 10 },
  emptyContainer: {
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  emptyDescription: {
    marginTop: 4,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: fill.muted,
    borderWidth: 1,
    borderColor: stroke.hairline,
  },
  groupLabel: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8, borderTopWidth: 1, borderTopColor: stroke.hairline, backgroundColor: fill.subtle },
  groupLabelObserved: { marginTop: 4 },
  observedBadge: { flexShrink: 0, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1, borderColor: stroke.raised, backgroundColor: fill.muted },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingHorizontal: 8, paddingVertical: 16 },
  rowDivided: { borderTopWidth: 1, borderTopColor: stroke.hairline },
  tile: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: fill.muted,
    borderWidth: 1,
    borderColor: stroke.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTrailing: { alignItems: 'flex-end' },
  rowSub: { marginTop: 2 },
  companyLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  companyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  companyName: { flexShrink: 1 },
  dividendBadge: { flexShrink: 0, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(94,124,255,.3)', backgroundColor: 'rgba(94,124,255,.09)' },
  dividendBadgeUsdc: { borderColor: 'rgba(57,198,137,.3)', backgroundColor: 'rgba(57,198,137,.08)' },
  ticker: { marginTop: 2 },
  flex: { flex: 1 },

  exposureBar: {
    flexDirection: 'row',
    height: 8,
    marginTop: 12,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: fill.muted,
    borderWidth: 1,
    borderColor: stroke.hairline,
  },
  barObserved: { backgroundColor: fill.active },
  barOnchain: { height: '100%' },
  observedLabel: { marginLeft: 'auto' },
  splitLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },

  ledger: { paddingHorizontal: 2, paddingVertical: 4 },
  ledgerStatus: { paddingHorizontal: 18, paddingVertical: 24, textAlign: 'center' },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 13,
    borderRadius: radius.md,
  },
  provenanceBar: { width: 8, height: 26, borderRadius: 4 },
});
