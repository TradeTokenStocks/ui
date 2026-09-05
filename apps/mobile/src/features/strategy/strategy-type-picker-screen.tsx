import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back-button';
import { Body, Display, Num } from '@/components/ui/text';
import { bandMarket, executableTotalUsd, formatUsd, hasPeggedEligibility } from '@tradetoken/domain';
import { companyDetails } from '@tradetoken/domain/fixtures';
import type { StrategyMechanism } from '@tradetoken/domain';
import { fill, ink, palette, radius, space, stroke } from '@/theme/tokens';
import { goBackOrHome } from '@/navigation/go-back';

type MechanismOption = {
  mechanism: StrategyMechanism;
  title: string;
  description: string;
};

const OPTIONS: MechanismOption[] = [
  {
    mechanism: 'concentrated',
    title: 'Concentrated liquidity',
    description: 'A stock/USDC band you bound yourself. Earns fees while price stays in range.',
  },
  {
    mechanism: 'pegged',
    title: 'Same-stock pegged',
    description:
      'Provides liquidity between two tokenized representations of the same company, near their calculated parity.',
  },
  {
    mechanism: 'xyk',
    title: 'Full range',
    description: "Not used for stock/USDC pairs — a stock and USDC don't hold near a fixed ratio.",
  },
];

/**
 * Step 2 of opening a strategy: which Aqua mechanism, for the company chosen
 * in step 1. Only Concentrated has a working builder; Pegged and Full range
 * are shown so the picker reflects Aqua's real strategy taxonomy, but both
 * are disabled — Pegged is this project's stretch goal, Full range isn't
 * planned for stock/USDC pairs at all.
 */
export function StrategyTypePickerScreen() {
  const insets = useSafeAreaInsets();
  const { ticker: tickerParam } = useLocalSearchParams<{ ticker?: string }>();
  const ticker = tickerParam?.toUpperCase() ?? 'NVDA';
  const company = companyDetails[ticker];
  const peggedEligible = company ? hasPeggedEligibility(company) : false;
  const executableUsd = company ? executableTotalUsd(company) : 0;

  const select = (mechanism: StrategyMechanism) => {
    if (mechanism !== 'concentrated') return;
    router.push({ pathname: '/strategy/new', params: { ticker } });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton onPress={goBackOrHome} />
          <Display size={22}>Choose strategy</Display>
          <View style={styles.headerSpacer} />
        </View>
        <Body size={12.5} color={ink.tertiary} style={styles.subtitle}>
          {bandMarket(ticker)} · {formatUsd(executableUsd)} onchain and allocatable
        </Body>

        <View style={styles.list}>
          {OPTIONS.map((option) => {
            const enabled = option.mechanism === 'concentrated';
            const eligibleNote =
              option.mechanism === 'pegged'
                ? peggedEligible
                  ? `${ticker} has a second representation — builder coming soon`
                  : `Needs a second tokenized representation of ${ticker}`
                : null;

            return (
              <Pressable
                key={option.mechanism}
                onPress={() => select(option.mechanism)}
                disabled={!enabled}
                accessibilityRole="button"
                accessibilityState={{ disabled: !enabled }}
                style={({ pressed }) => [
                  styles.card,
                  !enabled && styles.cardDisabled,
                  enabled && pressed && { backgroundColor: fill.press },
                ]}>
                <View style={styles.cardTop}>
                  <Body size={14.5} weight="semibold" color={enabled ? ink.primary : ink.tertiary}>
                    {option.title}
                  </Body>
                  {!enabled && (
                    <View style={styles.comingSoon}>
                      <Body size={10.5} weight="semibold" color={ink.quaternary}>
                        Coming soon
                      </Body>
                    </View>
                  )}
                </View>
                <Body size={12.5} color={ink.tertiary} style={styles.cardBody}>
                  {option.description}
                </Body>
                {eligibleNote && (
                  <Num size={11} color={ink.quaternary} style={styles.cardNote}>
                    {eligibleNote}
                  </Num>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { paddingHorizontal: space.gutter, paddingBottom: 42 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 32 },
  subtitle: { marginTop: 10 },

  list: { marginTop: 22, gap: 12 },
  card: {
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: palette.surface,
  },
  cardDisabled: { opacity: 0.55 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardBody: { marginTop: 6, lineHeight: 18 },
  cardNote: { marginTop: 8 },
  comingSoon: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: stroke.hairline,
    backgroundColor: fill.subtle,
  },
});
