import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { SelectionPicker } from '@/components/ui/selection-picker';
import { Body, Display } from '@/components/ui/text';
import { fill, ink, palette, radius, space, stroke } from '@/theme/tokens';
import { goBackOrHome } from '@/navigation/go-back';

const PRESETS = [500, 2500, 5000, 10000];
const METHODS = [
  { id: 'card', icon: '▱', title: 'Debit card', meta: 'Fastest · provider fees may apply' },
  { id: 'exchange', icon: '↗', title: 'From exchange', meta: 'Send USDC over Base' },
  { id: 'wallet', icon: '◇', title: 'From another wallet', meta: 'Copy your Base address' },
] as const;

export function AddFundsScreen() {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState(5000);
  const [method, setMethod] = useState<(typeof METHODS)[number]['id']>('card');
  const [continued, setContinued] = useState(false);
  const [copied, setCopied] = useState(false);

  const continueFlow = async () => {
    if (method === 'wallet') {
      await Clipboard.setStringAsync('0x7A4C18D2F37e65a9C3b92E49A8107D459B2C9E21');
      setCopied(true);
    }
    setContinued(true);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 150 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><BackButton onPress={goBackOrHome} /><Body size={14} weight="semibold">Add funds</Body><View style={styles.spacer} /></View>
        <View style={styles.amount}><Body size={12.5} color={ink.tertiary}>Amount</Body><Display size={52} style={styles.amountValue}>${amount.toLocaleString('en-US')}</Display><View style={styles.assetRow}><View style={styles.baseMark}><Body size={11} weight="bold" color="#fff">B</Body></View><Body size={13} weight="semibold">USDC on Base</Body><Body size={11.5} color={ink.faint}>Balance $0</Body></View></View>
        <View style={styles.presets}>{PRESETS.map((value) => <SecondaryButton key={value} label={`$${value.toLocaleString('en-US')}`} onPress={() => { setAmount(value); setContinued(false); }} accent={amount === value} style={styles.presetWrap} />)}</View>

        <Body size={10.5} weight="semibold" color={ink.faint} tracking={1.1} style={styles.label}>HOW</Body>
        <View style={styles.methods}>
          <SelectionPicker
            value={method}
            onChange={(next) => { setMethod(next); setContinued(false); }}
            options={METHODS.map((item) => ({ label: item.title, value: item.id }))}
            testID="funding-method-picker"
          />
          <View style={styles.methodSummary}><View style={styles.methodIcon}><Body size={17} color={palette.cobaltText}>{METHODS.find((item) => item.id === method)?.icon}</Body></View><View style={styles.flex}><Body size={13.5} weight="semibold">{METHODS.find((item) => item.id === method)?.title}</Body><Body size={11.5} color={ink.tertiary} style={styles.meta}>{METHODS.find((item) => item.id === method)?.meta}</Body></View></View>
        </View>
        <View style={styles.handoff}><Body size={12.5} weight="semibold">Secure provider handoff</Body><Body size={11.5} color={ink.tertiary} style={styles.handoffCopy}>In production, Privy opens the selected funding provider without exposing payment credentials to this app.</Body></View>
        {continued && <View style={styles.confirm}><Body size={13} weight="semibold" color={palette.positive}>Sandbox handoff ready</Body><Body size={11.5} color={ink.secondary} style={styles.meta}>{method === 'wallet' ? `${copied ? 'Base address copied. ' : ''}No transfer was created.` : `A live provider would now open for $${amount.toLocaleString('en-US')}. No payment was created.`}</Body></View>}
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 15) }]}><PrimaryButton label={`Continue with $${amount.toLocaleString('en-US')}`} onPress={continueFlow} /><Body size={10.5} color={ink.faint} style={styles.sandbox}>Sandbox · no real payment</Body></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg }, content: { paddingHorizontal: space.gutter }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, spacer: { width: 32 }, amount: { alignItems: 'center', marginTop: 42 }, amountValue: { marginTop: 8 }, assetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13 }, baseMark: { width: 25, height: 25, borderRadius: 13, backgroundColor: palette.cobalt, alignItems: 'center', justifyContent: 'center' }, presets: { flexDirection: 'row', gap: 7, marginTop: 32 }, presetWrap: { flex: 1 }, label: { marginTop: 29, marginBottom: 9, marginLeft: 2 }, methods: { borderRadius: radius.lg, backgroundColor: palette.surface, borderWidth: 1, borderColor: stroke.hairline, overflow: 'hidden', padding: 12 }, methodSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, paddingTop: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: stroke.hairline }, methodIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: fill.muted }, flex: { flex: 1 }, meta: { marginTop: 4, lineHeight: 16 }, handoff: { marginTop: 14, borderRadius: radius.md, padding: 14, backgroundColor: fill.subtle, borderWidth: 1, borderColor: stroke.hairline }, handoffCopy: { lineHeight: 17, marginTop: 6 }, confirm: { marginTop: 12, padding: 14, borderRadius: radius.md, backgroundColor: 'rgba(74,222,139,0.07)', borderWidth: 1, borderColor: 'rgba(74,222,139,0.16)' }, bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: space.gutter, paddingTop: 14, backgroundColor: 'rgba(10,11,13,0.97)', borderTopWidth: 1, borderTopColor: stroke.hairline }, sandbox: { textAlign: 'center', marginTop: 9 },
});
