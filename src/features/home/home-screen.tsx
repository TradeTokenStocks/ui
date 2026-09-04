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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DitherField } from '@/components/dither-field';
import { BottomNav, type NavKey } from '@/components/ui/bottom-nav';
import { PulseDot } from '@/components/ui/pulse-dot';
import { Segmented, type Segment } from '@/components/ui/segmented';
import { Body, Display, Num } from '@/components/ui/text';
import {
  account,
  activity,
  companies,
  events,
  hasUnreviewedEvents,
  tickerByCompany,
  totals,
  type CompanyExposure,
  type LedgerRow,
} from '@/data/fixtures';
import { fill, ink, palette, radius, shadow, space, stroke } from '@/theme/tokens';

/** Height of the dither field at the top of the screen. */
const FIELD_HEIGHT = 380;

const SEGMENTS: Segment[] = [
  { key: 'holdings', label: 'Holdings' },
  { key: 'events', label: 'Events', badge: hasUnreviewedEvents },
  { key: 'activity', label: 'Activity' },
];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [segment, setSegment] = useState('holdings');
  const [tab, setTab] = useState<NavKey>('portfolio');

  const navHeight = 56 + insets.bottom + 26;

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
          <View style={styles.identity}>
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
          </View>

          {account.isSandbox && (
            <View style={styles.chip}>
              <PulseDot />
              <Body size={11} weight="semibold" color={ink.secondary}>
                Sandbox
              </Body>
            </View>
          )}
        </View>

        <View style={styles.balance}>
          <Body size={12.5} weight="medium" color={ink.tertiary}>
            Total exposure
          </Body>
          <Display size={50} style={styles.balanceValue}>
            ${totals.exposure}
            <Display size={50} style={styles.cents}>
              {totals.exposureCents}
            </Display>
          </Display>
          <View style={styles.changeRow}>
            <Num size={13} weight="medium" color={palette.positive}>
              {totals.changeAbsolute}
            </Num>
            <Num size={13} color={ink.quaternary}>
              {totals.changeRelative}
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
              {totals.walletAllocatable}
            </Num>
          </View>

          <View style={[styles.card, styles.cardMuted]}>
            <Body size={11.5} weight="semibold" color={ink.tertiary}>
              Brokerage · observed
            </Body>
            <Num size={20} weight="medium" style={styles.cardValue}>
              {totals.brokerageObserved}
            </Num>
          </View>
        </View>

        <View style={styles.segmentWrap}>
          <Segmented segments={SEGMENTS} value={segment} onChange={setSegment} />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelSpecular} />
          {segment === 'holdings' ? (
            <>
              <View style={styles.panelHeader}>
                <Body size={14.5} weight="semibold">
                  By company
                </Body>
                <Body size={12} weight="medium" color={ink.quaternary}>
                  {totals.holdingsCount} holdings
                </Body>
              </View>
              {companies.map((company) => (
                <CompanyRow key={company.name} company={company} />
              ))}
            </>
          ) : (
            <View style={styles.ledger}>
              {(segment === 'events' ? events : activity).map((row) => (
                <LedgerItem key={row.id} row={row} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fade the list out from under the nav rather than clipping it, so
          scrolled content dissolves instead of disappearing at a hard edge. */}
      <LinearGradient
        colors={['rgba(10,11,13,0)', palette.bg]}
        locations={[0, 0.62]}
        pointerEvents="none"
        style={[styles.navFade, { height: navHeight + 60 }]}
      />
      <View style={[styles.nav, { bottom: insets.bottom + 20 }]}>
        <BottomNav value={tab} onChange={setTab} onCreate={() => {}} />
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
function CompanyRow({ company }: { company: CompanyExposure }) {
  const changeColor =
    company.changeIsPositive === true ? palette.positive : ink.quaternary;

  const ticker = tickerByCompany[company.name];

  return (
    <Pressable
      onPress={() => ticker && router.push(`/company/${ticker}`)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: fill.press }]}
      accessibilityRole="button"
      accessibilityLabel={`${company.name}, ${company.value}, ${company.change}. ${company.onchainPct}% onchain and allocatable, ${company.observedPct}% observed at a brokerage.`}>
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
          {company.value}
        </Num>
        <Num size={11.5} color={changeColor} style={styles.rowSub}>
          {company.change}
        </Num>
      </View>
    </Pressable>
  );
}

function LedgerItem({ row }: { row: LedgerRow }) {
  const onchain = row.provenance === 'onchain';
  return (
    <Pressable
      style={({ pressed }) => [styles.ledgerRow, pressed && { backgroundColor: fill.press }]}
      accessibilityRole="button"
      accessibilityLabel={`${row.title}. ${row.meta}. ${row.amount}, ${row.time}. ${
        onchain ? 'Onchain' : 'Observed at a brokerage'
      }.`}>
      <View
        style={[
          styles.provenanceBar,
          onchain
            ? { backgroundColor: row.amount === 'Review' ? palette.amber : palette.cobalt }
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
          {row.amount}
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

  navFade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  nav: { position: 'absolute', left: 16, right: 16 },
});
