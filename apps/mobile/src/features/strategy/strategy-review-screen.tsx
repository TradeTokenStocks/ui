import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Display, Num } from '@/components/ui/text';
import { b20Symbol, bandMarket, formatNumber, formatUsd, projectBand, resolveCompany } from '@tradetoken/domain';
import { companyDetails } from '@tradetoken/domain/fixtures';
import { fill, ink, palette, radius, shadow, space, stroke } from '@/theme/tokens';
import { goBackOrHome } from '@/navigation/go-back';

const HOLD_DURATION = 1400;
const HOLD_TICK_MS = 16;

function numericParam(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function StrategyReviewScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ ticker?: string; allocation?: string; band?: string }>();
  const ticker = params.ticker?.toUpperCase() || 'NVDA';
  const company = resolveCompany(companyDetails, ticker, 'NVDA');
  const allocation = numericParam(params.allocation, 12000);
  const band = numericParam(params.band, 10);
  // Same projection the builder showed. Recomputed from the route params
  // rather than passed through, so a deep link into review is still correct.
  const projection = projectBand({
    priceUsd: company.priceUsd,
    allocationUsd: allocation,
    bandPct: band,
  });
  const market = bandMarket(company.ticker);

  const [hold, setHold] = useState(0);
  const [complete, setComplete] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeRef = useRef(false);
  const elapsedHoldMs = useRef(0);

  const clearHoldTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  // Unmount only. Without the empty dependency array this runs after every
  // render, so the first progress tick's re-render cleans up the interval that
  // produced it and the hold freezes a frame in.
  useEffect(
    () => () => {
      clearHoldTimer();
      if (navigateTimer.current) clearTimeout(navigateTimer.current);
    },
    [],
  );

  const startHolding = () => {
    if (completeRef.current || timer.current) return;
    elapsedHoldMs.current = 0;
    timer.current = setInterval(() => {
      elapsedHoldMs.current += HOLD_TICK_MS;
      const next = Math.min(100, (elapsedHoldMs.current / HOLD_DURATION) * 100);
      setHold(next);
      if (next >= 100) {
        completeRef.current = true;
        setComplete(true);
        clearHoldTimer();
        navigateTimer.current = setTimeout(
          () => router.replace(`/strategy/${ticker.toLowerCase()}`),
          700,
        );
      }
    }, HOLD_TICK_MS);
  };

  const stopHolding = () => {
    clearHoldTimer();
    if (!completeRef.current) setHold(0);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.preview, { paddingTop: insets.top + 18 }]}>
        <Body size={15} weight="semibold">
          Review strategy
        </Body>
        <Display size={34} style={styles.previewAmount}>
          {formatUsd(allocation)}
        </Display>
        <Num size={12.5} color={ink.tertiary} style={styles.previewMeta}>
          {market} · band {formatUsd(projection.lowerUsd, { digits: 2 })} — {formatUsd(projection.upperUsd, { digits: 2 })}
        </Num>
      </View>
      <Pressable
        onPress={() => {
          // Guard against dismissing out from under the auto-navigate that
          // fires once signing completes — same completion latch startHolding
          // uses, so a stray tap right at 100% can't race the replace() below.
          if (completeRef.current) return;
          goBackOrHome();
        }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={styles.scrim}
      />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.sheetSpecular} />
        <View style={styles.handle} />

        <View style={styles.walletRow}>
          <LinearGradient colors={[palette.cobalt, palette.violet]} style={styles.baseMark}>
            <Body size={11} weight="semibold" color="#fff">
              B
            </Body>
          </LinearGradient>
          <Num size={12} color={ink.secondary} style={styles.walletAddress}>
            Base · 0x7A4C…9E21
          </Num>
          <View style={styles.custodyChip}>
            <Body size={11} weight="semibold" color={palette.positive}>
              Self-custody
            </Body>
          </View>
        </View>

        <Display size={26} style={styles.title}>
          Two approvals to open
        </Display>

        <View style={styles.approvals}>
          <Approval
            index="1"
            title={`Allow Aqua to use ${formatNumber(projection.usdcSideUsd)} USDC`}
            detail="Spend cap, revocable any time"
            signed
          />
          <Approval
            index="2"
            title="Open the band"
            detail={`${formatNumber(projection.tokens, 1)} ${b20Symbol(company.ticker)} + ${formatNumber(projection.usdcSideUsd)} USDC`}
          />
        </View>

        <View style={styles.facts}>
          <Fact label="Aqua fee tier" value="0.30%" />
          <Fact label="Network fee" value="$0.04" />
          <Fact label="You can exit" value="Any time" />
        </View>

        <Pressable
          onPressIn={startHolding}
          onPressOut={stopHolding}
          accessibilityRole="button"
          accessibilityLabel="Hold to sign and open strategy"
          accessibilityHint="Requires a continuous press for 1.4 seconds"
          style={({ pressed }) => [styles.holdButton, pressed && styles.holdButtonPressed]}>
          <LinearGradient
            colors={[palette.cobalt, palette.cobaltDeep]}
            style={[styles.holdFill, { width: `${hold}%` }]}
          />
          <Body size={15} weight="semibold" style={styles.holdLabel}>
            {complete ? 'Strategy opened' : hold > 0 ? 'Keep holding…' : 'Hold to sign'}
          </Body>
        </Pressable>
        <Body size={11} color={ink.faint} style={styles.sandboxNote}>
          Sandbox — no real funds move
        </Body>
      </View>
    </View>
  );
}

function Approval({
  index,
  title,
  detail,
  signed = false,
}: {
  index: string;
  title: string;
  detail: string;
  signed?: boolean;
}) {
  return (
    <View style={[styles.approval, index === '2' && styles.approvalDivided]}>
      <View style={[styles.approvalNumber, signed && styles.approvalNumberSigned]}>
        <Body size={11} weight="semibold" color={signed ? '#fff' : ink.secondary}>
          {index}
        </Body>
      </View>
      <View style={styles.approvalCopy}>
        <Body size={13.5} weight="semibold">
          {title}
        </Body>
        <Num size={11.5} color={ink.quaternary} style={styles.approvalDetail}>
          {detail}
        </Num>
      </View>
      {signed ? (
        <Body size={11.5} weight="semibold" color={palette.positive}>
          Signed
        </Body>
      ) : null}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Body size={12.5} color={ink.tertiary}>
        {label}
      </Body>
      <Num size={12.5} weight="medium">
        {value}
      </Num>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  preview: { paddingHorizontal: space.gutter, opacity: 0.24 },
  previewAmount: { marginTop: 22 },
  previewMeta: { marginTop: 8 },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(6,7,9,0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingTop: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: palette.surface,
    ...shadow.card,
  },
  sheetSpecular: { position: 'absolute', left: 26, right: 26, top: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  handle: { width: 38, height: 4, borderRadius: 2, marginHorizontal: 'auto', marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.14)' },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  baseMark: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  walletAddress: { flex: 1 },
  custodyChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(74,222,139,0.22)', backgroundColor: 'rgba(74,222,139,0.1)' },
  title: { marginTop: 16 },
  approvals: { marginTop: 18 },
  approval: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  approvalDivided: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: stroke.hairline },
  approvalNumber: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  approvalNumberSigned: { borderColor: palette.cobalt, backgroundColor: palette.cobalt },
  approvalCopy: { flex: 1 },
  approvalDetail: { marginTop: 3 },
  facts: { gap: 9, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: stroke.hairline },
  fact: { flexDirection: 'row', justifyContent: 'space-between' },
  holdButton: { position: 'relative', overflow: 'hidden', marginTop: 18, paddingVertical: 18, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(94,124,255,0.4)', backgroundColor: fill.muted, alignItems: 'center' },
  holdButtonPressed: { transform: [{ scale: 0.975 }] },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  holdLabel: { position: 'relative' },
  sandboxNote: { textAlign: 'center', marginTop: 11 },
});
