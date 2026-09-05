import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { BackButton } from '@/components/ui/back-button';
import { BottomNav } from '@/components/ui/bottom-nav';
import { PulseDot } from '@/components/ui/pulse-dot';
import { Segmented, type Segment } from '@/components/ui/segmented';
import { Body, Display, Num } from '@/components/ui/text';
import { activity, type LedgerRow } from '@/data/fixtures';
import { fill, ink, palette, radius, shadow, space, stroke } from '@/theme/tokens';

const FILTERS: Segment[] = [
  { key: 'all', label: 'All' },
  { key: 'onchain', label: 'Onchain' },
  { key: 'observed', label: 'Observed' },
];

function money(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ActiveStrategyScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('all');
  const [fillCount, setFillCount] = useState(318);
  const [feeTotal, setFeeTotal] = useState(247.18);
  const [stockPct, setStockPct] = useState(38);

  useEffect(() => {
    const timer = setInterval(() => {
      const buying = Math.random() > 0.5;
      setFillCount((value) => value + 1);
      setFeeTotal((value) => value + 0.3 + Math.random() * 1.2);
      setStockPct((value) => Math.max(24, Math.min(56, value + (buying ? 1 : -1))));
    }, 3600);
    return () => clearInterval(timer);
  }, []);

  const rows = useMemo(
    () => activity.filter((row) => filter === 'all' || row.provenance === filter),
    [filter],
  );
  const usdcPct = 100 - stockPct;
  const positionValue = 11762 + stockPct * 12.8 + feeTotal;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 126 }}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.headerCopy}>
            <Body size={15} weight="semibold">
              nvda·B20 / USDC
            </Body>
            <Num size={11.5} color={ink.quaternary} style={styles.headerSub}>
              Open 14 days
            </Num>
          </View>
          <View style={styles.inBandChip}>
            <PulseDot size={12} color="rgba(74,222,139,0.18)" duration={2400} />
            <Body size={11} weight="semibold" color={palette.positive}>
              In band
            </Body>
          </View>
        </View>

        <View style={styles.summary}>
          <Body size={12.5} weight="medium" color={ink.tertiary}>
            Position value
          </Body>
          <Display size={44} style={styles.positionValue}>
            ${money(positionValue)}
          </Display>
          <View style={styles.gainRow}>
            <Num size={13} weight="medium" color={palette.positive}>
              +${money(feeTotal)} fees
            </Num>
            <Num size={13} color={ink.quaternary}>
              +2.06% vs deposit
            </Num>
          </View>
        </View>

        <View style={styles.positionPanel}>
          <View style={styles.panelSpecular} />
          <View style={styles.bandChart}>
            <View style={styles.bandRegion} />
            <View
              style={[styles.marketLine, { left: `${Math.min(76, 42 + stockPct / 2)}%` }]}
            />
            <View
              style={[styles.marketTag, { left: `${Math.min(76, 42 + stockPct / 2)}%` }]}>
              <Num size={11} weight="medium" color={palette.bg}>
                $178.40
              </Num>
            </View>
            <Num size={11} color={ink.quaternary} style={styles.lowerLabel}>
              $160.56
            </Num>
            <Num size={11} color={ink.quaternary} style={styles.upperLabel}>
              $196.24
            </Num>
          </View>

          <View style={styles.compositionTrack}>
            <View style={[styles.stockTrack, { width: `${stockPct}%` }]} />
            <View style={styles.usdcTrack} />
          </View>
          <View style={styles.compositionLabels}>
            <Num size={11.5} weight="medium" color={palette.cobaltText}>
              {stockPct}% stock · {(stockPct * 0.687).toFixed(1)} tokens
            </Num>
            <Num size={11.5} weight="medium" color={ink.quaternary}>
              {usdcPct}% USDC
            </Num>
          </View>

          <View style={styles.stats}>
            <Stat label="Fills" value={fillCount.toLocaleString('en-US')} />
            <Stat label="Fees earned" value={`$${money(feeTotal)}`} />
            <Stat label="Time in band" value="91%" />
          </View>
        </View>

        <View style={styles.filter}>
          <Segmented segments={FILTERS} value={filter} onChange={setFilter} />
        </View>
        <Animated.View
          key={filter}
          entering={FadeIn.duration(150).reduceMotion(ReduceMotion.System)}
          style={styles.activityList}>
          {rows.map((row) => (
            <ActivityRow key={row.id} row={row} />
          ))}
        </Animated.View>
      </ScrollView>
      <View style={[styles.nav, { bottom: insets.bottom + 20 }]}>
        <BottomNav
          value="strategies"
          onChange={(next) => {
            if (next === 'portfolio') router.navigate('/');
          }}
          onCreate={() => router.push({ pathname: '/strategy/new', params: { ticker: 'NVDA' } })}
        />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Body size={11.5} weight="medium" color={ink.quaternary}>
        {label}
      </Body>
      <Num size={16.5} weight="medium" style={styles.statValue}>
        {value}
      </Num>
    </View>
  );
}

function ActivityRow({ row }: { row: LedgerRow }) {
  const onchain = row.provenance === 'onchain';
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.activityRow, pressed && { backgroundColor: fill.press }]}>
      <View style={[styles.provenance, onchain ? styles.provenanceOnchain : styles.provenanceObserved]} />
      <View style={styles.activityCopy}>
        <Body size={13} weight="semibold">
          {row.title}
        </Body>
        <Num size={11.5} color={ink.quaternary} style={styles.activityMeta}>
          {row.meta}
        </Num>
      </View>
      <View style={styles.activityAmount}>
        <Num size={12.5} weight="medium">
          {row.amount}
        </Num>
        <Num size={11} color={ink.faint} style={styles.activityTime}>
          {row.time}
        </Num>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: { paddingHorizontal: space.gutter, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1 },
  headerSub: { marginTop: 1 },
  inBandChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(74,222,139,0.22)', backgroundColor: 'rgba(74,222,139,0.1)' },
  summary: { paddingHorizontal: space.gutter, marginTop: 26 },
  positionValue: { marginTop: 2 },
  gainRow: { flexDirection: 'row', gap: 9, marginTop: 9 },
  positionPanel: { marginHorizontal: 12, marginTop: 20, padding: 18, borderRadius: radius.xl, borderWidth: 1, borderColor: stroke.hairline, backgroundColor: palette.surface, ...shadow.card },
  panelSpecular: { position: 'absolute', left: 20, right: 20, top: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  bandChart: { position: 'relative', height: 96, overflow: 'hidden', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.055)', backgroundColor: palette.surfaceSunken },
  bandRegion: { position: 'absolute', left: '18%', right: '18%', top: 0, bottom: 0, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: palette.cobalt, backgroundColor: 'rgba(94,124,255,0.14)' },
  marketLine: { position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: palette.text },
  marketTag: { position: 'absolute', top: 11, transform: [{ translateX: -28 }], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: palette.text },
  lowerLabel: { position: 'absolute', left: 12, bottom: 9 },
  upperLabel: { position: 'absolute', right: 12, bottom: 9 },
  compositionTrack: { flexDirection: 'row', gap: 5, height: 12, marginTop: 14 },
  stockTrack: { borderRadius: 6, backgroundColor: palette.cobalt },
  usdcTrack: { flex: 1, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  compositionLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 15, paddingTop: 14, borderTopWidth: 1, borderTopColor: stroke.hairline },
  stat: { flex: 1 },
  statValue: { marginTop: 2 },
  filter: { paddingHorizontal: space.gutter, marginTop: 18 },
  activityList: { paddingHorizontal: space.gutter, marginTop: 6 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 2, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.055)', borderRadius: 4 },
  provenance: { width: 8, height: 24, borderRadius: 4 },
  provenanceOnchain: { backgroundColor: palette.cobalt },
  provenanceObserved: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  activityCopy: { flex: 1 },
  activityMeta: { marginTop: 3 },
  activityAmount: { alignItems: 'flex-end' },
  activityTime: { marginTop: 2 },
  nav: { position: 'absolute', left: 16, right: 16 },
});
