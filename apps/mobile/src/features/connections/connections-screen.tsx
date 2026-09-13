import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatNumber, formatSyncedAt, formatUsd } from '@tradetoken/domain';

import { BackButton } from '@/components/ui/back-button';
import { DitherField } from '@/components/dither-field';
import { Body, Display, Num } from '@/components/ui/text';
import { PulseDot } from '@/components/ui/pulse-dot';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { useBrokerageHoldings } from '@/features/connections/hooks/use-brokerage-holdings';
import { fill, ink, palette, radius, ramps, space, stroke } from '@/theme/tokens';
import { goBackOrHome } from '@/navigation/go-back';

const scenarioNames: Record<string, string> = { 'self-directed': 'self-directed', 'cash-only': 'cash only', 'no-transactions': 'no transactions' };
const FIELD_HEIGHT = 220;

export function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { scenario } = useLocalSearchParams<{ scenario?: string }>();
  const holdings = useBrokerageHoldings();
  const [refreshing, setRefreshing] = useState(false);
  const [holdingsTime, setHoldingsTime] = useState('18:42 UTC');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    timer.current = setTimeout(() => { setRefreshing(false); setHoldingsTime('Just now'); }, 900);
  };

  // Arriving with a scenario means the simulated portal sent us here, so the
  // fixture card is what was asked for. Otherwise the card reads the real
  // sandbox connection.
  const profile = scenarioNames[scenario ?? ''] ?? 'self-directed';
  const simulated = Boolean(scenario);
  const repairs = holdings.needsReconnect ? 1 : 0;

  return (
    <View style={styles.root}>
      <View style={[styles.field, { height: FIELD_HEIGHT }]} pointerEvents="none">
        <DitherField width={width} height={FIELD_HEIGHT} ramp={ramps.connections} />
        <LinearGradient
          colors={['rgba(10,11,13,0)', 'rgba(10,11,13,0.85)', palette.bg]}
          locations={[0, 0.55, 1]}
          style={styles.fieldFade}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><BackButton onPress={goBackOrHome} /><Display size={28}>Connections</Display><View style={[styles.statusBadge, repairs === 0 && styles.statusHealthy]}><Body size={10.5} weight="semibold" color={repairs > 0 ? palette.amberBright : palette.positive}>{repairs > 0 ? `${repairs} ${repairs === 1 ? 'needs' : 'need'} repair` : 'All healthy'}</Body></View></View>
        <Body size={12.5} color={ink.tertiary} style={styles.subtitle}>Read-only brokerage data · SnapTrade sandbox</Body>

        {simulated ? (
          <ConnectionCard title="SnapTrade Sandbox" meta={`Fixture · ${profile}`} live>
            <View style={styles.accountRow}><View><Body size={12} weight="semibold">2 accounts</Body><Body size={11} color={ink.tertiary} style={styles.rowMeta}>Positions and activity · simulated</Body></View><Body size={11} weight="semibold" color={palette.positive}>Live</Body></View>
            <View style={styles.freshness}>
              <Freshness label="Holdings" value={holdingsTime} meta="last daily sync" />
              <Freshness label="Transactions" value="3 Sep" meta="fully synced through" />
            </View>
            <Body size={11.5} color={ink.tertiary} style={styles.lag}>Holdings refresh daily. Transactions can arrive one business day behind.</Body>
            <View style={styles.actions}><Action label={refreshing ? 'Syncing…' : 'Refresh holdings'} onPress={refresh} /><Action label="Manage" onPress={() => router.push('/snaptrade-portal')} /></View>
          </ConnectionCard>
        ) : holdings.needsReconnect ? (
          <ConnectionCard title="SnapTrade" meta="Access expired">
            <View style={styles.expiredRow}><View style={styles.warning}><Body size={13} weight="bold" color={palette.amberBright}>!</Body></View><View style={styles.flex}><Body size={12.5} weight="semibold" color={palette.amberBright}>Reconnect required</Body><Body size={11.5} color={ink.tertiary} style={styles.rowMeta}>Holdings stay out of your exposure until access is granted again</Body></View></View>
            <View style={styles.actions}><Action label="Reconnect" onPress={() => router.push({ pathname: '/snaptrade-portal', params: { mode: 'reconnect' } })} accent /></View>
          </ConnectionCard>
        ) : holdings.connected ? (
          <ConnectionCard title={holdings.institution ?? 'SnapTrade'} meta="Read-only · positions and balances" live>
            <View style={styles.accountRow}><View><Body size={12} weight="semibold">{formatNumber(holdings.accountCount)} {holdings.accountCount === 1 ? 'account' : 'accounts'}</Body><Body size={11} color={ink.tertiary} style={styles.rowMeta}>{formatNumber(holdings.positions.length)} positions observed</Body></View><Body size={11} weight="semibold" color={palette.positive}>Live</Body></View>
            <View style={styles.freshness}>
              <Freshness label="Holdings" value={formatSyncedAt(holdings.syncedAt)} meta="last sync from the brokerage" />
              <Freshness label="Observed value" value={formatUsd(holdings.totalValueUsd)} meta="cash and positions" />
            </View>
            <Body size={11.5} color={ink.tertiary} style={styles.lag}>Holdings refresh daily. Nothing here can settle a fill.</Body>
            {holdings.error ? <Body size={11.5} color={palette.amberBright} style={styles.lag}>{holdings.error}</Body> : null}
            <View style={styles.actions}><Action label={holdings.isLoading ? 'Syncing…' : 'Refresh holdings'} onPress={holdings.refetch} /><Action label="Manage" onPress={() => router.push('/snaptrade-portal')} /></View>
          </ConnectionCard>
        ) : (
          <ConnectionCard title="SnapTrade" meta={holdings.isLoading ? 'Checking for a linked brokerage…' : 'No brokerage linked'}>
            <Body size={11.5} color={ink.tertiary} style={styles.lag}>Link a sandbox brokerage to see traditional holdings beside your onchain ones. Access is read-only: positions and balances, never trading.</Body>
            {holdings.error ? <Body size={11.5} color={palette.amberBright} style={styles.lag}>{holdings.error}</Body> : null}
            <View style={styles.actions}><Action label="Connect brokerage" onPress={() => router.push('/snaptrade-portal')} accent /></View>
          </ConnectionCard>
        )}

        <Body size={10.5} weight="semibold" color={ink.faint} tracking={1.1} style={styles.legendTitle}>UPDATE CADENCE</Body>
        <View style={styles.legend}><Legend color={palette.positive} title="Real time" meta="Connection health" /><Legend color={palette.cobalt} title="Daily" meta="Holdings snapshots" /><Legend color={palette.amber} title="Daily +1" meta="Transaction history" /></View>
      </ScrollView>
    </View>
  );
}

function ConnectionCard({ title, meta, live = false, children }: { title: string; meta: string; live?: boolean; children: React.ReactNode }) { return <View style={styles.card}><View style={styles.cardHeader}><View style={[styles.logo, live && styles.logoLive]}>{live ? <PulseDot /> : <Body size={13} weight="bold" color={palette.amber}>A</Body>}</View><View style={styles.flex}><Body size={14.5} weight="semibold">{title}</Body><Body size={11.5} color={ink.tertiary} style={styles.rowMeta}>{meta}</Body></View></View>{children}</View>; }
function Freshness({ label, value, meta }: { label: string; value: string; meta: string }) { return <View style={styles.freshCard}><Body size={10.5} color={ink.tertiary}>{label}</Body><Num size={13} style={styles.freshValue}>{value}</Num><Body size={10} color={ink.faint}>{meta}</Body></View>; }
function Action({ label, onPress, accent = false }: { label: string; onPress: () => void; accent?: boolean }) { return <SecondaryButton label={label} onPress={onPress} accent={accent} style={styles.actionWrap} />; }
function Legend({ color, title, meta }: { color: string; title: string; meta: string }) { return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><View><Body size={11.5} weight="semibold">{title}</Body><Body size={10.5} color={ink.tertiary} style={styles.rowMeta}>{meta}</Body></View></View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg }, content: { paddingHorizontal: space.gutter, paddingBottom: 42 }, field: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' }, fieldFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 }, header: { flexDirection: 'row', alignItems: 'center', gap: 13 }, subtitle: { marginTop: 9, marginLeft: 45 }, statusBadge: { marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(224,163,60,0.09)', borderWidth: 1, borderColor: 'rgba(224,163,60,0.18)' }, statusHealthy: { backgroundColor: 'rgba(74,222,139,0.08)', borderColor: 'rgba(74,222,139,0.18)' },
  card: { marginTop: 20, padding: 16, borderRadius: radius.lg, backgroundColor: palette.surface, borderWidth: 1, borderColor: stroke.hairline }, cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' }, logo: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(224,163,60,0.1)', alignItems: 'center', justifyContent: 'center' }, logoLive: { backgroundColor: 'rgba(74,222,139,0.07)' }, flex: { flex: 1 }, rowMeta: { marginTop: 3 }, accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: stroke.hairline }, freshness: { flexDirection: 'row', gap: 8, marginTop: 14 }, freshCard: { flex: 1, borderRadius: radius.md, padding: 12, backgroundColor: fill.subtle, borderWidth: 1, borderColor: stroke.hairline }, freshValue: { marginTop: 7, marginBottom: 5 }, lag: { lineHeight: 17, marginTop: 12 }, actions: { flexDirection: 'row', gap: 8, marginTop: 14 }, actionWrap: { flex: 1 }, expiredRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: stroke.hairline }, warning: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(224,163,60,0.12)', alignItems: 'center', justifyContent: 'center' },
  legendTitle: { marginTop: 27, marginBottom: 10, marginLeft: 2 }, legend: { borderRadius: radius.lg, backgroundColor: fill.subtle, borderWidth: 1, borderColor: stroke.hairline, padding: 14, gap: 14 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 11 }, legendDot: { width: 7, height: 7, borderRadius: 4 },
});
