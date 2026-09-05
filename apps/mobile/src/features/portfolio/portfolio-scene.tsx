import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { EdgeInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { DitherField } from '@/components/dither-field';
import { PulseDot } from '@/components/ui/pulse-dot';
import { Segmented, type Segment } from '@/components/ui/segmented';
import { Body, Display, Num } from '@/components/ui/text';
import {
  formatLedgerAmount,
  formatNumber,
  formatPercent,
  formatUsd,
  isGain,
  splitUsd,
  type CompanyExposure,
  type LedgerRow,
} from '@tradetoken/domain';
import {
  account,
  activity,
  companies,
  events,
  hasUnreviewedEvents,
  totals,
} from '@tradetoken/domain/fixtures';
import { fill, ink, palette, radius, shadow, space, stroke } from '@/theme/tokens';

/** Height of the dither field at the top of the screen. */
const FIELD_HEIGHT = 380;

const SEGMENTS: Segment[] = [
  { key: 'holdings', label: 'Holdings' },
  { key: 'events', label: 'Events', badge: hasUnreviewedEvents },
  { key: 'activity', label: 'Activity' },
];

/**
 * The portfolio destination, chrome-less: no dock, no scene transition of its
 * own. The dock shell keeps it mounted across switches, so the segment choice
 * and the scroll position belong to this scene and survive tab changes.
 */
export function PortfolioScene({ insets }: { insets: EdgeInsets }) {
  const { width } = useWindowDimensions();
  const [segment, setSegment] = useState('holdings');

  const navHeight = 56 + insets.bottom + 26;
  const exposure = splitUsd(totals.exposureUsd);

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
            onPress={() => router.push('/wallet')}
            accessibilityRole="button"
            accessibilityLabel="Open wallet and security"
            style={({ pressed }) => [styles.identity, pressed && { opacity: 0.65 }]}>
            <LinearGradient
              colors={[palette.cobalt, palette.violet]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.avatar}>
              <Body size={12} weight="semibold" color="#fff">
                {account.initial}
              </Body>
            </LinearGradient>
            <Body size={14.5} weight="semibold">
              {account.name}
            </Body>
          </Pressable>

          {account.isSandbox && (
            <Pressable
              onPress={() => router.push('/connections')}
              accessibilityRole="button"
              accessibilityLabel="Open sandbox connections"
              style={({ pressed }) => [styles.chip, pressed && { opacity: 0.65 }]}>
              <PulseDot />
              <Body size={11} weight="semibold" color={ink.secondary}>
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
              {formatUsd(totals.walletAllocatableUsd)}
            </Num>
          </View>

          <View style={[styles.card, styles.cardMuted]}>
            <Body size={11.5} weight="semibold" color={ink.tertiary}>
              Brokerage · observed
            </Body>
            <Num size={20} weight="medium" style={styles.cardValue}>
              {formatUsd(totals.brokerageObservedUsd)}
            </Num>
          </View>
        </View>

        <View style={styles.segmentWrap}>
          <Segmented segments={SEGMENTS} value={segment} onChange={setSegment} />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelSpecular} />
          <Animated.View
            key={segment}
            entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}>
            {segment === 'holdings' ? (
              <>
              <View style={styles.panelHeader}>
                <Body size={14.5} weight="semibold">
                  By company
                </Body>
                <Body size={12} weight="medium" color={ink.quaternary}>
                  {formatNumber(totals.holdingsCount)} holdings
                </Body>
              </View>
              {companies.map((company) => (
                <CompanyRow key={company.ticker} company={company} />
              ))}
              </>
            ) : (
              <View style={styles.ledger}>
                {(segment === 'events' ? events : activity).map((row) => (
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
 * A company's total exposure, split by whether it can be put to work.
 *
 * The bar is the honest part: the outlined portion is observed at a brokerage
 * and inert, the cobalt portion is onchain and allocatable. Two companies can
 * show the same value and mean completely different things.
 */
function CompanyRow({ company }: { company: CompanyExposure }) {
  const value = formatUsd(company.valueUsd);
  const change = formatPercent(company.changePct);
  const changeColor = isGain(company.changePct) ? palette.positive : ink.quaternary;

  return (
    <Pressable
      onPress={() => router.push(`/company/${company.ticker}`)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: fill.press }]}
      accessibilityRole="button"
      accessibilityLabel={`${company.name}, ${value}, ${change}. ${company.onchainPct}% onchain and allocatable, ${company.observedPct}% observed at a brokerage.`}>
      <View style={styles.tile}>
        <Body size={11.5} weight="semibold" color="rgba(242,243,245,0.8)">
          {company.initials}
        </Body>
      </View>

      <View style={styles.rowBody}>
        <Body size={14} weight="semibold">
          {company.name}
        </Body>
        <View style={styles.exposureBar}>
          <View style={[styles.barObserved, { flexGrow: company.observedPct }]} />
          <View style={[styles.barOnchain, { flexGrow: company.onchainPct }]} />
        </View>
      </View>

      <View style={styles.rowTrailing}>
        <Num size={14} weight="medium">
          {value}
        </Num>
        <Num size={11.5} color={changeColor} style={styles.rowSub}>
          {change}
        </Num>
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
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: fill.muted,
    borderWidth: 1,
    borderColor: stroke.raised,
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
  specular: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: stroke.specular },

  segmentWrap: { paddingHorizontal: space.gutter, marginTop: space.xl },

  panel: {
    marginHorizontal: 12,
    marginTop: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: stroke.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 10,
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
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 13,
    paddingBottom: 9,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 12, borderRadius: radius.md },
  tile: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: stroke.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTrailing: { alignItems: 'flex-end' },
  rowSub: { marginTop: 2 },

  exposureBar: { flexDirection: 'row', gap: 3, height: 5, marginTop: 8, width: 132 },
  barObserved: { borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  barOnchain: { borderRadius: 3, backgroundColor: palette.cobalt },

  ledger: { paddingHorizontal: 2, paddingVertical: 4 },
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