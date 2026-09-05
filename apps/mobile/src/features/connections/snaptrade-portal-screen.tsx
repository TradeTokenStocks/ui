import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@expo/ui';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/primary-button';
import { SelectionPicker } from '@/components/ui/selection-picker';
import { Body, Display } from '@/components/ui/text';
import { fill, ink, palette, radius, shadow, space, stroke } from '@/theme/tokens';
import { goBackOrHome } from '@/navigation/go-back';

const SCENARIOS = [
  { id: 'self-directed', title: 'Self-directed', meta: '2 funded accounts · positions and history' },
  { id: 'cash-only', title: 'Cash only', meta: '1 cash account · no holdings' },
  { id: 'no-transactions', title: 'No transactions', meta: 'Positions · no activity history' },
  { id: 'invalid', title: 'Invalid credentials', meta: 'Connection fails · repair flow' },
] as const;

type ScenarioId = (typeof SCENARIOS)[number]['id'];

export function SnapTradePortalScreen() {
  const insets = useSafeAreaInsets();
  const [presented, setPresented] = useState(true);
  const [scenario, setScenario] = useState<ScenarioId>('self-directed');
  const [institution, setInstitution] = useState('alpaca');
  const [failed, setFailed] = useState(false);
  const selected = SCENARIOS.find((item) => item.id === scenario);
  if (!selected) throw new Error(`Unknown SnapTrade scenario: ${scenario}`);

  const connect = () => {
    if (scenario === 'invalid') {
      setFailed(true);
      return;
    }
    router.replace({ pathname: '/connections', params: { scenario } });
  };

  return (
    <View style={styles.host}>
      <BottomSheet
        isPresented={presented}
        onDismiss={goBackOrHome}
        snapPoints={['full']}
        contentPadding={0}
        containerColor={palette.bg}
        scrimColor="rgba(0,0,0,0.72)"
        shouldDismissOnClickOutside>
        <View style={[styles.sheet, { paddingTop: insets.top + 9 }]}>
        <View style={styles.header}>
          <View style={styles.brandMark}><Body size={12} weight="bold" color="#08131c">S</Body></View>
          <Body size={15} weight="bold">SnapTrade</Body>
          <View style={styles.flex} />
          <Pressable accessibilityRole="button" accessibilityLabel="Close portal" onPress={() => setPresented(false)} style={styles.close}><Body size={20} color={ink.secondary}>×</Body></Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Display size={30}>Connect a brokerage</Display>
          <Body size={13.5} color={ink.secondary} style={styles.intro}>Choose a test institution and account shape. Access is read-only: holdings and transactions, never trading.</Body>

          <View style={styles.sandboxCard}>
            <View style={styles.sandboxDot} />
            <View style={styles.flex}><Body size={13} weight="semibold" color={palette.amberBright}>Sandbox simulation</Body><Body size={11.5} color={ink.secondary} style={styles.rowMeta}>For testing only · no institution login</Body></View>
          </View>

          {failed && <View style={styles.error}><Body size={13} weight="semibold" color={palette.amberBright}>Connection failed as expected</Body><Body size={12} color={ink.secondary} style={styles.rowMeta}>This fixture exercises expired credentials. Pick another scenario or close the portal.</Body></View>}

          <Label>TEST SCENARIO</Label>
          <View style={styles.pickerCard}>
            <SelectionPicker
              value={scenario}
              onChange={(next) => { setScenario(next); setFailed(false); }}
              options={SCENARIOS.map((item) => ({ label: item.title, value: item.id }))}
              testID="scenario-picker"
            />
            <Body size={11.5} color={ink.tertiary} style={styles.pickerMeta}>{selected.meta}</Body>
          </View>

          <Label>INSTITUTION</Label>
          <View style={styles.pickerCard}>
            <SelectionPicker
              value={institution}
              onChange={setInstitution}
              options={[
                { label: 'Alpaca Paper', value: 'alpaca' },
                { label: 'Robinhood', value: 'robinhood' },
                { label: 'Schwab', value: 'schwab' },
              ]}
              testID="institution-picker"
            />
            <Body size={11.5} color={ink.tertiary} style={styles.pickerMeta}>Sandbox institution · no credentials requested</Body>
          </View>

        </ScrollView>

        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <PrimaryButton label={`Connect · ${selected.title}`} onPress={connect} />
          <Body size={10.5} color={ink.faint} style={styles.legal}>Read-only access · production portal hosted by SnapTrade</Body>
        </View>
        </View>
      </BottomSheet>
    </View>
  );
}

function Label({ children }: { children: string }) { return <Body size={10.5} weight="semibold" color={ink.faint} tracking={1.15} style={styles.label}>{children}</Body>; }

const styles = StyleSheet.create({
  host: { flex: 1, backgroundColor: 'transparent' }, sheet: { flex: 1, minHeight: 760, backgroundColor: palette.bg, overflow: 'hidden', ...shadow.card },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.gutter, borderBottomWidth: 1, borderBottomColor: stroke.hairline }, brandMark: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8fefcf', marginRight: 9 }, flex: { flex: 1 }, close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: fill.muted },
  content: { paddingHorizontal: space.gutter, paddingTop: 24, paddingBottom: 150 }, intro: { lineHeight: 20, marginTop: 10 }, sandboxCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, padding: 14, borderRadius: radius.md, backgroundColor: 'rgba(224,163,60,0.08)', borderWidth: 1, borderColor: 'rgba(224,163,60,0.2)' }, sandboxDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.amber }, rowMeta: { marginTop: 4, lineHeight: 16 },
  label: { marginTop: 25, marginBottom: 9, marginLeft: 2 }, pickerCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: stroke.hairline, backgroundColor: palette.surface, padding: 12 }, pickerMeta: { marginTop: 4, marginLeft: 4 }, error: { marginTop: 18, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(224,163,60,0.2)', backgroundColor: 'rgba(224,163,60,0.07)' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.gutter, paddingTop: 14, backgroundColor: 'rgba(10,11,13,0.97)', borderTopWidth: 1, borderTopColor: stroke.hairline }, legal: { textAlign: 'center', marginTop: 10 },
});
