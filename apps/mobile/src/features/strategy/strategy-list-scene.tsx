import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { DitherField } from '@/components/dither-field';
import { Body, Display, Num } from '@/components/ui/text';
import {
  bandMarket,
  formatNumber,
  formatPercent,
  formatUsd,
  isGain,
  strategyMechanismLabel,
} from '@tradetoken/domain';
import { strategies } from '@tradetoken/domain/fixtures';
import type { StrategySummary } from '@tradetoken/domain';
import { fill, ink, palette, radius, ramps, shadow, space, stroke } from '@/theme/tokens';

/** Height of the dither field at the top of the screen. */
const FIELD_HEIGHT = 220;

/**
 * The Strategies destination, chrome-less. Lists every open strategy on the
 * sandbox account; each row routes to its detail at `/strategy/[ticker]`,
 * which is the same scene a completed review lands on directly.
 *
 * Kept mounted by the dock shell alongside `PortfolioScene`, so scroll
 * position survives a tab switch the same way the portfolio list's does.
 */
export function StrategyListScene({ insets }: { insets: EdgeInsets }) {
  const { width } = useWindowDimensions();

  return (
    <View style={styles.root}>
      <View style={[styles.field, { height: FIELD_HEIGHT }]} pointerEvents="none">
        <DitherField width={width} height={FIELD_HEIGHT} ramp={ramps.strategy} />
        <LinearGradient
          colors={['rgba(10,11,13,0)', 'rgba(10,11,13,0.82)', palette.bg]}
          locations={[0, 0.55, 1]}
          style={styles.fieldFade}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 126 }}>
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Display size={27}>Strategies</Display>
            <Num size={12.5} color={ink.quaternary} style={styles.headerSub}>
              {strategies.length} open
            </Num>
          </View>
          <Pressable
            onPress={() => router.push('/strategy/create')}
            accessibilityRole="button"
            accessibilityLabel="New strategy"
            hitSlop={8}
            style={({ pressed }) => [styles.newButton, pressed && styles.newButtonPressed]}>
            <View style={styles.newButtonBarH} />
            <View style={styles.newButtonBarV} />
          </Pressable>
        </View>

        {strategies.length === 0 ? (
          <View style={styles.empty}>
            <Body size={14} weight="semibold">
              No open strategies
            </Body>
            <Body size={12.5} color={ink.tertiary} style={styles.emptyBody}>
              Tap + above to open a strategy on a company you hold.
            </Body>
          </View>
        ) : (
          <View style={styles.list}>
            {strategies.map((strategy) => (
              <StrategyCard key={strategy.ticker} strategy={strategy} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StrategyCard({ strategy }: { strategy: StrategySummary }) {
  // Approximate mark-to-market for the list row. The detail screen simulates
  // this live; here it only needs to be directionally right at a glance.
  const positionValue = strategy.depositedUsd * (1 + strategy.gainVsDepositPct / 100);
  const gainColor = isGain(strategy.gainVsDepositPct) ? palette.positive : ink.quaternary;

  return (
    <Pressable
      onPress={() => router.push(`/strategy/${strategy.ticker.toLowerCase()}`)}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: fill.press }]}
      accessibilityRole="button"
      accessibilityLabel={`${strategy.ticker}. ${bandMarket(strategy.ticker)}. Open ${strategy.openDays} days. Position ${formatUsd(positionValue)}, ${formatPercent(strategy.gainVsDepositPct, 2)} vs deposit.`}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitle}>
          <View style={styles.cardTitleRow}>
            <Body size={14.5} weight="semibold">
              {bandMarket(strategy.ticker)}
            </Body>
            <View style={styles.mechanismChip}>
              <Body size={10.5} weight="semibold" color={ink.tertiary}>
                {strategyMechanismLabel(strategy.mechanism)}
              </Body>
            </View>
          </View>
          <Num size={11.5} color={ink.quaternary} style={styles.cardSub}>
            Open {strategy.openDays} days · {formatUsd(strategy.lowerUsd, { digits: 2 })} —{' '}
            {formatUsd(strategy.upperUsd, { digits: 2 })}
          </Num>
        </View>
        <View style={styles.inBandChip}>
          <Body size={11} weight="semibold" color={palette.positive}>
            In band
          </Body>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View>
          <Num size={19} weight="medium">
            {formatUsd(positionValue, { digits: 2 })}
          </Num>
          <Num size={12} color={gainColor} style={styles.cardSub}>
            {formatPercent(strategy.gainVsDepositPct, 2)} vs deposit
          </Num>
        </View>
        <View style={styles.cardStats}>
          <Num size={12} color={ink.quaternary}>
            {formatNumber(strategy.fills)} fills
          </Num>
          <Num size={12} color={ink.quaternary}>
            {strategy.timeInBandPct}% in band
          </Num>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  field: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  fieldFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 },

  header: {
    paddingHorizontal: space.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  headerSub: { marginBottom: 2 },
  newButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: fill.subtle,
    borderWidth: 1,
    borderColor: stroke.hairline,
  },
  newButtonPressed: { backgroundColor: fill.press },
  newButtonBarH: { position: 'absolute', width: 14, height: 2, borderRadius: 1, backgroundColor: ink.primary },
  newButtonBarV: { position: 'absolute', width: 2, height: 14, borderRadius: 1, backgroundColor: ink.primary },

  empty: {
    marginHorizontal: 12,
    marginTop: 26,
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: fill.subtle,
  },
  emptyBody: { marginTop: 7, lineHeight: 19 },

  list: { paddingHorizontal: 12, marginTop: 22, gap: 12 },
  card: {
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: palette.surface,
    ...shadow.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardTitle: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  mechanismChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: fill.subtle,
  },
  cardSub: { marginTop: 3 },
  inBandChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(74,222,139,0.22)',
    backgroundColor: 'rgba(74,222,139,0.1)',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: stroke.hairline,
  },
  cardStats: { alignItems: 'flex-end', gap: 3 },
});
