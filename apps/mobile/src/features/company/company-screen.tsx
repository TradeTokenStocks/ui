import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DitherField } from '@/components/dither-field';
import { BackButton } from '@/components/ui/back-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Body, Display, Num } from '@/components/ui/text';
import {
  executableTotalUsd,
  formatNumber,
  formatPercent,
  formatUsd,
  isGain,
  splitUsd,
  type Representation,
} from '@tradetoken/domain';
import { companyDetails } from '@tradetoken/domain/fixtures';
import { fill, ink, palette, radius, ramps, shadow, space, stroke } from '@/theme/tokens';

const FIELD_HEIGHT = 340;

const TINTS: Record<Representation['tint'], { color: string; glow?: string }> = {
  cobalt: { color: palette.cobalt, glow: 'rgba(94,124,255,0.5)' },
  violet: { color: palette.violet, glow: 'rgba(142,99,255,0.45)' },
  outline: { color: 'transparent' },
};

export function CompanyScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const company = companyDetails[ticker?.toUpperCase() ?? ''];

  if (!company) {
    return (
      <View style={[styles.root, styles.empty, { paddingTop: insets.top + 40 }]}>
        <BackButton onPress={() => router.back()} />
        <Body size={14} color={ink.tertiary} style={styles.emptyText}>
          No exposure data for {ticker}.
        </Body>
      </View>
    );
  }

  const total = splitUsd(company.totalUsd);
  // Derived, not stored: adding a representation moves the ceiling with it
  // instead of silently disagreeing with the list above the button.
  const executable = formatUsd(executableTotalUsd(company));

  return (
    <View style={styles.root}>
      <View style={[styles.field, { height: FIELD_HEIGHT }]} pointerEvents="none">
        <DitherField
          width={width}
          height={FIELD_HEIGHT}
          ramp={ramps.company}
          speed={0.04}
          levels={5}
          contour={0.5}
        />
        <LinearGradient
          colors={['rgba(10,11,13,0)', 'rgba(10,11,13,0.85)', palette.bg]}
          locations={[0, 0.5, 1]}
          style={styles.fieldFade}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.headerTitle}>
            <Body size={15} weight="semibold">
              {company.name}
            </Body>
            <Num size={11.5} color={ink.quaternary} style={styles.headerSub}>
              {company.ticker} · {formatUsd(company.priceUsd, { digits: 2 })}
            </Num>
          </View>
          <Num
            size={12.5}
            weight="medium"
            color={isGain(company.changePct) ? palette.positive : ink.quaternary}>
            {formatPercent(company.changePct)}
          </Num>
        </View>

        <View style={styles.summary}>
          <Body size={12.5} weight="medium" color={ink.tertiary}>
            Exposure across {company.representations.length} representations
          </Body>
          <Display size={46} style={styles.total}>
            {total.whole}
            <Display size={46} style={styles.cents}>
              {total.cents}
            </Display>
          </Display>
          {/* Share-equivalents, not token counts. One B20 token is not one
              share once a multiplier has moved, so the headline figure is
              always expressed in the unit that survives a corporate action. */}
          <Num size={12.5} weight="medium" color={ink.quaternary} style={styles.shareEq}>
            {`${formatNumber(company.shareEquivalents, 1)} share-equivalents`}
          </Num>

          <View style={styles.stack}>
            {company.representations.map((rep) => (
              <View
                key={rep.id}
                style={[
                  styles.stackSegment,
                  { flexGrow: rep.sharePct },
                  rep.tint === 'outline'
                    ? styles.stackOutline
                    : { backgroundColor: TINTS[rep.tint].color },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelSpecular} />
          {company.representations.map((rep, i) => (
            <RepresentationRow key={rep.id} rep={rep} first={i === 0} />
          ))}
        </View>

        <View style={styles.note}>
          <View style={styles.noteBox}>
            <Body size={12.5} weight="semibold">
              Why the counts differ
            </Body>
            <Body size={12.5} color={ink.secondary} style={styles.noteBody}>
              B20 tokens carry a multiplier that moves on splits and cash dividends, so one token
              is not always one share. Totals are always shown in share-equivalents.
            </Body>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient
          colors={['rgba(10,11,13,0)', palette.bg]}
          locations={[0, 0.55]}
          pointerEvents="none"
          style={styles.ctaFade}
        />
        <PrimaryButton
          label={`Allocate ${executable} executable`}
          onPress={() =>
            router.push({ pathname: '/strategy/type', params: { ticker: company.ticker } })
          }
          accessibilityHint="Only onchain balances can be allocated. Brokerage holdings are excluded."
        />
        {/* Stated rather than implied. The button's figure is smaller than the
            headline total and the user is owed the reason. */}
        <Body size={11.5} weight="medium" color={ink.faint} style={styles.ctaNote}>
          Brokerage holdings can&apos;t be allocated
        </Body>
      </View>
    </View>
  );
}

function RepresentationRow({ rep, first }: { rep: Representation; first: boolean }) {
  const tint = TINTS[rep.tint];
  return (
    <View
      style={[styles.row, !first && styles.rowDivided]}
      accessible
      accessibilityLabel={`${rep.label}. ${rep.detail}. ${formatUsd(rep.valueUsd)}. ${
        rep.executable ? 'Executable onchain' : 'Observed only, cannot be allocated'
      }.`}>
      <View
        style={[
          styles.repBar,
          rep.tint === 'outline'
            ? styles.repBarOutline
            : {
                backgroundColor: tint.color,
                shadowColor: tint.color,
                shadowOpacity: 0.55,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
                elevation: 4,
              },
        ]}
      />
      <View style={styles.rowBody}>
        <Body size={13.5} weight="semibold">
          {rep.label}
        </Body>
        <Num size={11.5} color={ink.quaternary} style={styles.rowSub}>
          {rep.detail}
        </Num>
      </View>
      <Num size={13.5} weight="medium">
        {formatUsd(rep.valueUsd)}
      </Num>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  empty: { paddingHorizontal: space.gutter, gap: 20 },
  emptyText: { marginTop: 8 },
  field: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  fieldFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 170 },

  header: {
    paddingHorizontal: space.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: { flex: 1 },
  headerSub: { marginTop: 1 },

  summary: { paddingHorizontal: space.gutter, marginTop: 34 },
  total: { marginTop: 4 },
  cents: { opacity: 0.3 },
  shareEq: { marginTop: 8 },
  stack: { flexDirection: 'row', gap: 5, height: 11, marginTop: 18 },
  stackSegment: { borderRadius: 6 },
  stackOutline: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  panel: {
    marginHorizontal: 12,
    marginTop: 22,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: stroke.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 8,
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 12, paddingVertical: 15 },
  rowDivided: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.055)' },
  rowBody: { flex: 1 },
  rowSub: { marginTop: 3 },
  repBar: { width: 9, height: 32, borderRadius: 5 },
  repBarOutline: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },

  note: { paddingHorizontal: space.gutter, marginTop: 16 },
  noteBox: {
    backgroundColor: fill.subtle,
    borderWidth: 1,
    borderColor: stroke.hairline,
    borderRadius: radius.segment,
    paddingHorizontal: 17,
    paddingVertical: 15,
  },
  noteBody: { marginTop: 6, lineHeight: 21 },

  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.gutter },
  ctaFade: { position: 'absolute', left: 0, right: 0, bottom: 0, top: -60 },
  ctaNote: { textAlign: 'center', marginTop: 10 },
});
