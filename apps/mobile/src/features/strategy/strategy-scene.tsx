import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { BackButton } from '@/components/ui/back-button';
import { DitherField } from '@/components/dither-field';
import { PulseDot } from '@/components/ui/pulse-dot';
import { Segmented, type Segment } from '@/components/ui/segmented';
import { Body, Display, Num } from '@/components/ui/text';
import {
  bandMarket,
  formatLedgerAmount,
  formatNumber,
  formatPercent,
  formatUsd,
  resolveStrategy,
  strategyMechanismLabel,
  type LedgerRow,
} from '@tradetoken/domain';
import { strategies, strategyActivity } from '@tradetoken/domain/fixtures';
import { fill, ink, palette, radius, ramps, shadow, space, stroke } from '@/theme/tokens';

const FILTERS: Segment[] = [
  { key: 'all', label: 'All' },
  { key: 'onchain', label: 'Onchain' },
  { key: 'observed', label: 'Observed' },
];

type Props = {
  insets: EdgeInsets;
  /** Which open strategy to show. Defaults to the first open strategy. */
  ticker?: string;
  /**
   * As a dock tab there is no back step, but the header keeps a same-sized
   * slot so the title never shifts between the docked and pushed forms.
   */
  standalone?: boolean;
  onBack?: () => void;
};

/**
 * A single open strategy's detail, chrome-less. Rendered both as a pushed
 * route after strategy review (`/strategy/[ticker]`, where the back slot is
 * filled with a real back button) and — for a single-strategy account — could
 * be embedded directly. Multi-strategy accounts reach this through
 * `StrategyListScene` instead.
 */
export function StrategyScene({ insets, ticker, standalone = false, onBack }: Props) {
  const { width } = useWindowDimensions();
  const strategy = resolveStrategy(strategies, ticker);
  const [filter, setFilter] = useState('all');
  const [fillCount, setFillCount] = useState<number>(strategy.fills);
  const [feeTotal, setFeeTotal] = useState<number>(strategy.feesEarnedUsd);
  const [stockPct, setStockPct] = useState<number>(strategy.stockPct);

  useEffect(() => {
    const timer = setInterval(() => {
      const buying = Math.random() > 0.5;
      setFillCount((value) => value + 1);
      setFeeTotal((value) => value + 0.3 + Math.random() * 1.2);
      setStockPct((value) => Math.max(24, Math.min(56, value + (buying ? 1 : -1))));
    }, 3600);
    return () => clearInterval(timer);
  }, []);

  const rows = (strategyActivity[strategy.ticker] ?? []).filter(
    (row) => filter === 'all' || row.provenance === filter,
  );
  const usdcPct = 100 - stockPct;
  const positionValue =
    strategy.depositedUsd * (1 + strategy.gainVsDepositPct / 100) +
    (feeTotal - strategy.feesEarnedUsd);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 126 }}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          {standalone ? (
            <BackButton onPress={onBack ?? (() => undefined)} />
          ) : (
            <View style={styles.headerSlot} />
          )}
          <View style={styles.headerCopy}>
            <View style={styles.headerTitleRow}>
              <Body size={15} weight="semibold">
                {bandMarket(strategy.ticker)}
              </Body>
              <View style={styles.mechanismChip}>
                <Body size={10.5} weight="semibold" color={ink.tertiary}>
                  {strategyMechanismLabel(strategy.mechanism)}
                </Body>
              </View>
            </View>
            <Num size={11.5} color={ink.quaternary} style={styles.headerSub}>
              Open {strategy.openDays} days
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
            {formatUsd(positionValue, { digits: 2 })}
          </Display>
          <View style={styles.gainRow}>
            <Num size={13} weight="medium" color={palette.positive}>
              {formatUsd(feeTotal, { digits: 2, sign: true })} fees
            </Num>
            <Num size={13} color={ink.quaternary}>
              {formatPercent(strategy.gainVsDepositPct, 2)} vs deposit
            </Num>
          </View>
        </View>

        <View style={styles.positionPanel}>
          <View style={styles.panelSpecular} />
          <View style={styles.bandChart}>
            <DitherField
              width={width - 62}
              height={96}
              ramp={ramps.strategy}
              bg={palette.surfaceSunken}
              speed={0.02}
              levels={4}
              cell={2}
              contour={0.7}
              intensity={0.62}
            />
            <View style={styles.bandRegion} />
            <View
              style={[styles.marketLine, { left: `${Math.min(76, 42 + stockPct / 2)}%` }]}
            />
            <View
              style={[styles.marketTag, { left: `${Math.min(76, 42 + stockPct / 2)}%` }]}>
              <Num size={11} weight="medium" color={palette.bg}>
                {formatUsd(strategy.spotUsd, { digits: 2 })}
              </Num>
            </View>
            <Num size={11} color={ink.quaternary} style={styles.lowerLabel}>
              {formatUsd(strategy.lowerUsd, { digits: 2 })}
            </Num>
            <Num size={11} color={ink.quaternary} style={styles.upperLabel}>
              {formatUsd(strategy.upperUsd, { digits: 2 })}
            </Num>
          </View>

          <View style={styles.compositionTrack}>
            <View style={[styles.stockTrack, { width: `${stockPct}%` }]} />
            <View style={styles.usdcTrack} />
          </View>
          <View style={styles.compositionLabels}>
            <Num size={11.5} weight="medium" color={palette.cobaltText}>
              {stockPct}% stock · {formatNumber(stockPct * 0.687, 1)} tokens
            </Num>
            <Num size={11.5} weight="medium" color={ink.quaternary}>
              {usdcPct}% USDC
            </Num>
          </View>

          <View style={styles.stats}>
            <Stat label="Fills" value={formatNumber(fillCount)} />
            <Stat label="Fees earned" value={formatUsd(feeTotal, { digits: 2 })} />
            <Stat label="Time in band" value={`${strategy.timeInBandPct}%`} />
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
          {formatLedgerAmount(row.amount)}
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
  headerSlot: { width: 32 },
  headerCopy: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  mechanismChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: fill.subtle,
  },
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
});
