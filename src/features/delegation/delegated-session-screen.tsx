import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DitherField } from '@/components/dither-field';
import { BackButton } from '@/components/ui/back-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Body, Display, Num } from '@/components/ui/text';
import { Toggle } from '@/components/ui/toggle';
import { fill, ink, palette, radius, space, stroke } from '@/theme/tokens';
import { goBackOrHome } from '@/navigation/go-back';

export function DelegatedSessionScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [rescale, setRescale] = useState(true);
  const [claim, setClaim] = useState(false);
  const [closeOnBreak, setCloseOnBreak] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [granted, setGranted] = useState(false);

  return (
    <View style={styles.root}>
      <View style={styles.field} pointerEvents="none">
        <DitherField width={width} height={230} ramp={['#171135', '#3f2f8b', '#8E63FF']} />
        <LinearGradient colors={['rgba(10,11,13,0)', palette.bg]} style={styles.fade} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 9, paddingBottom: insets.bottom + 36 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><BackButton onPress={goBackOrHome} /><Body size={14} weight="semibold">Automatic repairs</Body><View style={styles.spacer} /></View>
        <View style={styles.hero}><Display size={36} style={styles.heroTitle}>A split at 4am shouldn’t cost you a position.</Display><Body size={13.5} color={ink.secondary} style={styles.heroCopy}>Grant a narrow, expiring session so predictable maintenance can happen without waking you up.</Body></View>

        <View style={styles.grantCard}>
          <Body size={10.5} weight="semibold" color={ink.faint} tracking={1.1}>THIS SESSION CAN</Body>
          <Permission title="Rescale bands after corporate actions" meta="Splits and symbol changes" value={rescale} onChange={setRescale} />
          <Permission title="Claim accrued fees weekly" meta="Returns proceeds to your wallet" value={claim} onChange={setClaim} />
          <Permission title="Close if the peg breaks" meta="Emergency exit only" value={closeOnBreak} onChange={setCloseOnBreak} last />
          <View style={styles.rules}>
            <Rule label="Spend ceiling" value="$2,500" /><Rule label="Network" value="Base only" /><Rule label="Expires" value="30 days" /><Rule label="Transfers out" value="Never permitted" />
          </View>
        </View>

        {granted && <View style={styles.success}><View style={styles.successDot} /><View style={styles.flex}><Body size={13.5} weight="semibold" color={palette.positive}>Sandbox policy granted until 5 Oct</Body><Body size={11.5} color={ink.secondary} style={styles.meta}>Preview only. No wallet signature was requested.</Body></View></View>}
        {explaining && <View style={styles.explainer}><Body size={12.5} color={ink.secondary} style={styles.explainCopy}>A real session is signed by your embedded wallet and constrained by server-enforced policy. It cannot transfer funds to another address, expands no permissions silently, and expires automatically.</Body></View>}

        <PrimaryButton label={granted ? 'Revoke sandbox grant' : 'Grant for 30 days'} onPress={() => setGranted((value) => !value)} style={styles.primary} />
        <View style={styles.secondaryRow}><Pressable onPress={goBackOrHome}><Body size={12.5} weight="semibold" color={ink.tertiary}>Not now</Body></Pressable><View style={styles.divider} /><Pressable onPress={() => setExplaining((value) => !value)}><Body size={12.5} weight="semibold" color={palette.cobaltText}>{explaining ? 'Hide details' : 'How this works'}</Body></Pressable></View>
        <Body size={10.5} color={ink.faint} style={styles.disclaimer}>Prototype only. The live version requires an authenticated Privy wallet signature and backend policy enforcement.</Body>
      </ScrollView>
    </View>
  );
}

function Permission({ title, meta, value, onChange, last = false }: { title: string; meta: string; value: boolean; onChange: (value: boolean) => void; last?: boolean }) { return <View style={[styles.permission, !last && styles.permissionBorder]}><View style={styles.flex}><Body size={13.5} weight="semibold">{title}</Body><Body size={11.5} color={ink.tertiary} style={styles.meta}>{meta}</Body></View><Toggle value={value} onChange={onChange} label={title} /></View>; }
function Rule({ label, value }: { label: string; value: string }) { return <View style={styles.rule}><Body size={11.5} color={ink.tertiary}>{label}</Body><Num size={11.5} color={ink.secondary}>{value}</Num></View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg }, field: { position: 'absolute', top: 0, left: 0, right: 0, height: 230, overflow: 'hidden' }, fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 }, content: { paddingHorizontal: space.gutter }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, spacer: { width: 32 }, hero: { marginTop: 45, maxWidth: 350 }, heroTitle: { lineHeight: 39 }, heroCopy: { lineHeight: 20, marginTop: 14 },
  grantCard: { marginTop: 28, padding: 16, borderRadius: radius.xl, backgroundColor: palette.surface, borderWidth: 1, borderColor: stroke.raised }, permission: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 }, permissionBorder: { borderBottomWidth: 1, borderBottomColor: stroke.hairline }, flex: { flex: 1 }, meta: { marginTop: 4, lineHeight: 16 }, rules: { marginTop: 7, padding: 13, borderRadius: radius.md, backgroundColor: fill.subtle, gap: 11 }, rule: { flexDirection: 'row', justifyContent: 'space-between' }, success: { flexDirection: 'row', gap: 11, alignItems: 'center', padding: 14, marginTop: 14, borderRadius: radius.md, backgroundColor: 'rgba(74,222,139,0.07)', borderWidth: 1, borderColor: 'rgba(74,222,139,0.16)' }, successDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.positive }, explainer: { marginTop: 12, padding: 14, borderRadius: radius.md, backgroundColor: fill.subtle, borderWidth: 1, borderColor: stroke.hairline }, explainCopy: { lineHeight: 18 }, primary: { marginTop: 18 }, secondaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, paddingVertical: 18 }, divider: { width: 1, height: 13, backgroundColor: stroke.raised }, disclaimer: { textAlign: 'center', lineHeight: 15, marginHorizontal: 20 },
});
