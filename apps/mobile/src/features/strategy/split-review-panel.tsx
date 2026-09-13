import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { Body, Num } from '@/components/ui/text';
import { fill, ink, palette, radius, stroke } from '@/theme/tokens';
import { corporateActionRescale, formatNumber, formatUsd, type StrategySummary } from '@tradetoken/domain';
import { nvdaSplit } from '@tradetoken/domain/fixtures';

import { markSplitRescaled, useSplitRescaled } from './split-review-store';

const range = (min: number, max: number) => `${min.toFixed(2)}x — ${max.toFixed(2)}x`;
const band = (lower: number, upper: number) =>
  `${formatUsd(lower, { digits: 2 })} — ${formatUsd(upper, { digits: 2 })}`;

/**
 * The strategy-side consequence of the NVDA split: the guard halted the band,
 * and rescaling is the owner's decision, so it lives with the strategy rather
 * than in the events feed.
 */
export function SplitReviewPanel({ strategy }: { strategy: StrategySummary }) {
  const rescaled = useSplitRescaled();
  const plan = corporateActionRescale({
    band: { lowerUsd: strategy.lowerUsd, upperUsd: strategy.upperUsd },
    multiplierBefore: nvdaSplit.multiplierBefore,
    multiplierAfter: nvdaSplit.multiplierAfter,
    guardTolerancePct: 5,
  });

  return (
    <View style={[styles.panel, rescaled ? styles.panelRescaled : styles.panelHalted]}>
      <View style={styles.titleRow}>
        <Body size={10.5} weight="semibold" color={rescaled ? palette.cobaltText : palette.amber}>
          {rescaled ? 'BAND RESCALED' : `${nvdaSplit.title.toUpperCase()} SPLIT`}
        </Body>
        <View style={[styles.chip, rescaled ? styles.chipRescaled : styles.chipHalted]}>
          <Body size={10.5} weight="semibold" color={rescaled ? palette.cobaltText : palette.amber}>
            {rescaled ? `Guard active · ${formatNumber(nvdaSplit.multiplierAfter, 2)}x` : 'Halted onchain'}
          </Body>
        </View>
      </View>

      <Body size={12.5} color={ink.secondary} style={styles.copy}>
        {rescaled
          ? 'Band and multiplier guard now match the post-split multiplier. Safe trading resumed.'
          : `NVDA's multiplier moved from ${formatNumber(nvdaSplit.multiplierBefore, 2)}x to ${formatNumber(nvdaSplit.multiplierAfter, 2)}x, outside this band's guard, so Swap-VM halted new fills. Rescale to keep trading.`}
      </Body>

      <ChangeRow
        label="Price band"
        before={band(plan.bandBefore.lowerUsd, plan.bandBefore.upperUsd)}
        after={band(plan.bandAfter.lowerUsd, plan.bandAfter.upperUsd)}
        applied={rescaled}
      />
      <ChangeRow
        label="Multiplier guard"
        before={range(plan.guardBefore.min, plan.guardBefore.max)}
        after={range(plan.guardAfter.min, plan.guardAfter.max)}
        applied={rescaled}
      />

      <View style={styles.actions}>
        {rescaled ? null : (
          <Pressable
            onPress={markSplitRescaled}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, styles.primaryAction, pressed && styles.pressed]}>
            <LinearGradient colors={[palette.cobalt, palette.cobaltDeep]} style={StyleSheet.absoluteFill} />
            <Body size={13.5} weight="semibold">
              Rescale band
            </Body>
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push('/events/nvda-split')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.action, styles.secondaryAction, pressed && styles.pressed]}>
          <Body size={13.5} weight="semibold">
            View the split
          </Body>
        </Pressable>
      </View>
    </View>
  );
}

function ChangeRow({ label, before, after, applied }: { label: string; before: string; after: string; applied: boolean }) {
  return (
    <View style={styles.changeRow}>
      <Body size={11.5} color={ink.tertiary}>
        {label}
      </Body>
      <View style={styles.changeValues}>
        <Num size={12} color={ink.quaternary} style={styles.before}>
          {before}
        </Num>
        <Num size={12} weight="medium" color={applied ? palette.cobaltText : palette.text}>
          → {after}
        </Num>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: 12, marginTop: 20, padding: 16, borderRadius: radius.xl, borderWidth: 1 },
  panelHalted: { borderColor: 'rgba(224,163,60,0.24)', backgroundColor: 'rgba(224,163,60,0.05)' },
  panelRescaled: { borderColor: 'rgba(94,124,255,0.26)', backgroundColor: 'rgba(94,124,255,0.05)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  chip: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  chipHalted: { borderColor: 'rgba(224,163,60,0.24)', backgroundColor: 'rgba(224,163,60,0.1)' },
  chipRescaled: { borderColor: 'rgba(94,124,255,0.26)', backgroundColor: 'rgba(94,124,255,0.1)' },
  copy: { marginTop: 9, lineHeight: 19 },
  changeRow: { marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: stroke.hairline },
  changeValues: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 3 },
  before: { textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  action: { flex: 1, overflow: 'hidden', borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  primaryAction: { borderWidth: 1, borderColor: stroke.onAccent },
  secondaryAction: { borderWidth: 1, borderColor: stroke.raised, backgroundColor: fill.muted },
  pressed: { transform: [{ scale: 0.97 }] },
});
