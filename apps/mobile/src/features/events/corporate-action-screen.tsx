import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DitherField } from '@/components/dither-field';
import { Body, Display, Num } from '@/components/ui/text';
import { useSplitRescaled } from '@/features/strategy/split-review-store';
import { fill, ink, palette, radius, ramps, shadow, space, stroke } from '@/theme/tokens';

/**
 * What happened, not what to do about it: rescaling an affected band is the
 * strategy owner's call, so it lives on the strategy detail and this feed
 * only links there.
 */
export function CorporateActionScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const rescaled = useSplitRescaled();

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Display size={27}>Events</Display>
          <View style={styles.reviewChip}>
            <Body size={11.5} weight="semibold" color={palette.amber}>
              {rescaled ? '1 needs review' : '2 need review'}
            </Body>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.warmField}>
            <DitherField
              width={width - 24}
              height={104}
              ramp={ramps.corporateAction}
              bg="#12100E"
              speed={0.1}
              levels={5}
              cell={3}
              contour={0.6}
              intensity={1.15}
            />
            <LinearGradient
              colors={['rgba(16,18,22,0)', 'rgba(16,18,22,0.92)']}
              style={styles.warmFade}
            />
            <View style={styles.heroHeading}>
              <Body size={11.5} weight="semibold" color={ink.secondary}>
                Stock split · effective 11 Sep
              </Body>
              <Display size={27} style={styles.heroTitle}>
                Nvidia 10-for-1
              </Display>
            </View>
          </View>

          <View style={styles.explanation}>
            <Body size={13} color={ink.secondary} style={styles.explanationText}>
              Your token count doesn&apos;t change. The B20 multiplier does, so each token will
              represent ten times the shares it does today.
            </Body>
            <ChangeRow
              label="Multiplier"
              before="1.0000"
              after="10.0000"
              accentAfter
            />
            <ChangeRow label="Your exposure" before="236.4 sh" after="2,364 sh" />
          </View>

          <Pressable
            onPress={() => router.push('/strategy/nvda')}
            accessibilityRole="button"
            accessibilityLabel={`One open strategy affected. ${rescaled ? 'Band rescaled.' : 'Halted, needs review in Strategies.'}`}
            style={({ pressed }) => [styles.affected, pressed && { backgroundColor: fill.press }]}>
            <View style={styles.affectedCopy}>
              <Body size={13} weight="semibold">
                One open strategy affected
              </Body>
              <Num size={12} color={ink.secondary} style={styles.affectedMeta}>
                {rescaled ? 'Band rescaled · trading resumed' : 'Halted by its guard · review in Strategies'}
              </Num>
            </View>
            <View style={rescaled ? styles.onchainChip : styles.reviewChip}>
              <Body size={11.5} weight="semibold" color={rescaled ? palette.cobaltText : palette.amber}>
                {rescaled ? 'Rescaled' : 'Review'}
              </Body>
            </View>
            <Body size={17} color={ink.faint}>
              ›
            </Body>
          </Pressable>
        </View>

        <View style={styles.dividend}>
          <Body size={11.5} weight="semibold" color={ink.quaternary}>
            Cash dividend · paid 29 Aug
          </Body>
          <Body size={15} weight="semibold" style={styles.dividendTitle}>
            Apple · $0.25 per share
          </Body>
          <Body size={12.5} color={ink.secondary} style={styles.dividendCopy}>
            B20 pays dividends by raising the multiplier instead of sending cash — your 11.5 aapl
            tokens now represent 11.53 shares. Brokerage shares paid cash.
          </Body>
          <View style={styles.chips}>
            <View style={styles.onchainChip}>
              <Num size={11.5} weight="medium" color={palette.cobaltText}>
                Onchain · 1.0026
              </Num>
            </View>
            <View style={styles.observedChip}>
              <Num size={11.5} weight="medium" color={ink.secondary}>
                Brokerage · $35.50
              </Num>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ChangeRow({
  label,
  before,
  after,
  accentAfter = false,
}: {
  label: string;
  before: string;
  after: string;
  accentAfter?: boolean;
}) {
  return (
    <View style={styles.changeRow}>
      <ValueCard label={label} value={before} />
      <Body size={14} color={ink.faint}>
        →
      </Body>
      <ValueCard label={label} value={after} accent={accentAfter} />
    </View>
  );
}

function ValueCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.valueCard, accent && styles.valueCardAccent]}>
      <Body size={11.5} weight="medium" color={ink.quaternary}>
        {label}
      </Body>
      <Num size={17.5} weight="medium" color={accent ? palette.cobaltText : palette.text} style={styles.value}>
        {value}
      </Num>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: { paddingHorizontal: space.gutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(224,163,60,0.24)', backgroundColor: 'rgba(224,163,60,0.1)', paddingHorizontal: 11, paddingVertical: 6 },
  hero: { marginHorizontal: 12, marginTop: 20, overflow: 'hidden', borderRadius: 26, borderWidth: 1, borderColor: stroke.raised, backgroundColor: palette.surface, ...shadow.card },
  warmField: { height: 104, overflow: 'hidden' },
  warmFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  heroHeading: { position: 'absolute', left: 18, right: 18, bottom: 15 },
  heroTitle: { marginTop: 2 },
  explanation: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 },
  explanationText: { lineHeight: 21 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  valueCard: { flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: stroke.hairline, backgroundColor: fill.subtle, padding: 13 },
  valueCardAccent: { borderColor: 'rgba(94,124,255,0.28)', backgroundColor: 'rgba(94,124,255,0.1)' },
  value: { marginTop: 3 },
  affected: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, borderTopWidth: 1, borderTopColor: stroke.hairline, backgroundColor: 'rgba(255,255,255,0.02)' },
  affectedCopy: { flex: 1 },
  affectedMeta: { marginTop: 3 },
  dividend: { marginHorizontal: 12, marginTop: 12, paddingHorizontal: 16, paddingVertical: 15, borderRadius: 22, borderWidth: 1, borderColor: stroke.hairline, backgroundColor: fill.subtle },
  dividendTitle: { marginTop: 3 },
  dividendCopy: { marginTop: 6, lineHeight: 20 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 11 },
  onchainChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(94,124,255,0.26)', backgroundColor: 'rgba(94,124,255,0.1)', paddingHorizontal: 11, paddingVertical: 7 },
  observedChip: { borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 11, paddingVertical: 7 },
});
