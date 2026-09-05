import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DitherField } from '@/components/dither-field';
import { BackButton } from '@/components/ui/back-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Body, Display, Num } from '@/components/ui/text';
import { ValueSlider } from '@/components/ui/value-slider';
import {
  allocationCeilingUsd,
  bandMarket,
  executableTotalUsd,
  formatUsd,
  projectBand,
  resolveCompany,
} from '@tradetoken/domain';
import { companyDetails } from '@tradetoken/domain/fixtures';
import { fill, ink, palette, radius, ramps, shadow, space, stroke } from '@/theme/tokens';

const CHART_HEIGHT = 132;

export function StrategyBuilderScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { ticker: tickerParam } = useLocalSearchParams<{ ticker?: string }>();
  const ticker = tickerParam?.toUpperCase() || 'NVDA';
  const company = resolveCompany(companyDetails, ticker, 'NVDA');
  const price = company.priceUsd;
  const executable = executableTotalUsd(company);
  const walletMaximum = allocationCeilingUsd(executable);
  const [allocation, setAllocation] = useState(() => Math.min(12000, walletMaximum));
  const [band, setBand] = useState(10);

  const projection = projectBand({ priceUsd: price, allocationUsd: allocation, bandPct: band });

  // Chart geometry only: how far the highlighted band is inset, and how fast
  // the Skia field drifts behind it. Presentation, so it stays in the client.
  const edge = Math.max(10, 46 - band * 0.9);
  const auraSpeed = 0.02 + (40 - band) * 0.004;

  const market = bandMarket(company.ticker);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.headerCopy}>
            <Body size={15} weight="semibold">
              Concentrated band
            </Body>
            <Num size={11.5} color={ink.quaternary} style={styles.headerSub}>
              {market} · 1inch Aqua
            </Num>
          </View>
        </View>

        <View style={styles.allocation}>
          <Body size={12.5} weight="medium" color={ink.tertiary}>
            Allocate from wallet
          </Body>
          <View style={styles.amountRow}>
            <Display size={38}>{formatUsd(allocation)}</Display>
            <Num size={12} color={ink.quaternary}>
              of {formatUsd(executable)}
            </Num>
          </View>
          <ValueSlider
            value={allocation}
            minimumValue={1000}
            maximumValue={walletMaximum}
            step={500}
            onValueChange={setAllocation}
            accessibilityLabel="Strategy allocation in dollars"
          />
        </View>

        <View style={styles.bandPanel}>
          <View style={styles.panelSpecular} />
          <View style={styles.bandTitleRow}>
            <Body size={13} weight="semibold">
              Price band
            </Body>
            <Num size={12.5} weight="medium" color={palette.cobaltText}>
              {formatUsd(projection.lowerUsd, { digits: 2 })} — {formatUsd(projection.upperUsd, { digits: 2 })}
            </Num>
          </View>

          <View style={styles.chart}>
            <DitherField
              width={width - 62}
              height={CHART_HEIGHT}
              ramp={ramps.strategy}
              bg={palette.surfaceSunken}
              speed={auraSpeed}
              levels={4}
              cell={2}
              contour={0.7}
              intensity={0.62}
            />
            <View
              style={[
                styles.selectedBand,
                { left: `${edge}%`, right: `${edge}%` },
              ]}
            />
            <View style={styles.priceLine} />
            <Num size={11} weight="medium" color={palette.bg} style={styles.priceTag}>
              {formatUsd(price, { digits: 2 })}
            </Num>
            <Body size={11} weight="medium" color={ink.quaternary} style={styles.stockLabel}>
              all stock
            </Body>
            <Body size={11} weight="medium" color={ink.quaternary} style={styles.usdcLabel}>
              all USDC
            </Body>
          </View>

          <ValueSlider
            value={band}
            minimumValue={3}
            maximumValue={40}
            step={1}
            onValueChange={setBand}
            accessibilityLabel="Price band width in percent"
          />
          <View style={styles.sliderLegend}>
            <Body size={11} weight="medium" color={ink.faint}>
              Tight · more fills
            </Body>
            <Body size={11} weight="medium" color={ink.faint}>
              Wide · less drift
            </Body>
          </View>
        </View>

        <View style={styles.outcomes}>
          <Body size={13} weight="semibold">
            What you&apos;d be holding
          </Body>
          <View style={styles.outcomeRow}>
            <View style={[styles.outcomeCard, styles.outcomeStock]}>
              <Num size={11.5} color={ink.tertiary}>
                at {formatUsd(projection.lowerUsd, { digits: 2 })}
              </Num>
              <Num size={18} weight="medium" color={palette.cobaltText} style={styles.outcomeValue}>
                100% stock
              </Num>
              <Body size={11.5} color={ink.quaternary} style={styles.outcomeNote}>
                bought all the way down
              </Body>
            </View>
            <View style={styles.outcomeCard}>
              <Num size={11.5} color={ink.tertiary}>
                at {formatUsd(projection.upperUsd, { digits: 2 })}
              </Num>
              <Num size={18} weight="medium" style={styles.outcomeValue}>
                100% USDC
              </Num>
              <Body size={11.5} color={ink.quaternary} style={styles.outcomeNote}>
                sold all the way up
              </Body>
            </View>
          </View>

          <View style={styles.stats}>
            <Stat label="Fills / day" value={String(projection.fillsPerDay)} />
            <Stat label="Fees / day" value={formatUsd(projection.feesPerDayUsd, { digits: 2 })} />
            <Stat
              label="Drift risk"
              value={projection.driftRisk}
              color={projection.driftRisk === 'High' ? palette.amber : palette.text}
            />
          </View>
          <Body size={11} color={ink.faint} style={styles.disclaimer}>
            Estimated from sandbox fill history. Not a yield forecast.
          </Body>
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + 18 }]}>
        <PrimaryButton
          label="Review strategy"
          onPress={() =>
            router.push({
              pathname: '/strategy/review',
              params: { ticker: company.ticker, allocation, band },
            })
          }
        />
      </View>
    </View>
  );
}

function Stat({ label, value, color = palette.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Body size={11.5} weight="medium" color={ink.quaternary}>
        {label}
      </Body>
      <Num size={16.5} weight="medium" color={color} style={styles.statValue}>
        {value}
      </Num>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: { paddingHorizontal: space.gutter, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1 },
  headerSub: { marginTop: 1 },
  allocation: { paddingHorizontal: space.gutter, marginTop: 22 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9, marginTop: 2 },
  bandPanel: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: stroke.hairline,
    borderRadius: radius.xl,
    backgroundColor: palette.surface,
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
  bandTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  chart: {
    height: CHART_HEIGHT,
    marginTop: 14,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.055)',
    backgroundColor: palette.surfaceSunken,
  },
  selectedBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: palette.cobalt,
    backgroundColor: 'rgba(94,124,255,0.15)',
  },
  priceLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: palette.text,
  },
  priceTag: {
    position: 'absolute',
    left: '50%',
    bottom: 10,
    transform: [{ translateX: -31 }],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: palette.text,
  },
  stockLabel: { position: 'absolute', left: 11, top: 10 },
  usdcLabel: { position: 'absolute', right: 11, top: 10 },
  sliderLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -2 },
  outcomes: { paddingHorizontal: space.gutter, marginTop: 18 },
  outcomeRow: { flexDirection: 'row', gap: 10, marginTop: 11 },
  outcomeCard: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: stroke.raised,
    borderRadius: radius.segment,
    backgroundColor: fill.subtle,
  },
  outcomeStock: { borderColor: 'rgba(94,124,255,0.26)', backgroundColor: 'rgba(94,124,255,0.09)' },
  outcomeValue: { marginTop: 6 },
  outcomeNote: { marginTop: 3 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: stroke.hairline },
  stat: { flex: 1 },
  statValue: { marginTop: 2 },
  disclaimer: { marginTop: 12, lineHeight: 18 },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.gutter, paddingTop: 40, backgroundColor: 'rgba(10,11,13,0.96)' },
});
