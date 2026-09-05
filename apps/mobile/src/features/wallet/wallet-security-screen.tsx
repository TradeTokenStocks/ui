import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back-button';
import { Body, Display } from '@/components/ui/text';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { Toggle } from '@/components/ui/toggle';
import { fill, ink, palette, radius, shadow, space, stroke } from '@/theme/tokens';
import { goBackOrHome } from '@/navigation/go-back';

const ADDRESS = '0x7A4C18D2F37e65a9C3b92E49A8107D459B2C9E21';

export function WalletSecurityScreen() {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [passkey, setPasskey] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const copyAddress = async () => {
    await Clipboard.setStringAsync(ADDRESS);
    setCopied(true);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton onPress={goBackOrHome} />
          <Body size={14} weight="semibold">Wallet & security</Body>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.walletCard}>
          <LinearGradient colors={[palette.cobalt, palette.violet]} style={styles.walletAvatar}>
            <Body size={18} weight="bold" color="#fff">B</Body>
          </LinearGradient>
          <View style={styles.walletCopy}>
            <Display size={22}>0x7A4C…9E21</Display>
            <Body size={12} color="rgba(255,255,255,0.66)" style={styles.walletMeta}>Base · embedded wallet</Body>
          </View>
          <View style={styles.custody}><Body size={10.5} weight="semibold" color="#fff">Self-custody</Body></View>
          <View style={styles.walletActions}>
            <SmallButton label={copied ? 'Copied' : 'Copy address'} onPress={copyAddress} />
            <SmallButton label="Add funds" onPress={() => router.push('/funding')} filled />
          </View>
        </View>

        <SectionLabel>RECOVERY</SectionLabel>
        <View style={styles.panel}>
          <SettingRow title="Recovery password" meta="Set 4 Sep · re-enter on a new device" trailing="On" />
          <SettingRow title="iCloud backup share" meta="Recommended second method" trailing="Add" onPress={() => setNotice('Backup setup needs an authenticated wallet. Login is currently parked.')} />
          <SettingRow title="Export private key" meta="Always available — this wallet is yours to take" trailing="Privy  ›" onPress={() => setNotice('Private-key export is locked until login is restored. No key is stored in this prototype.')} last />
        </View>

        {notice && <Pressable onPress={() => setNotice(null)} style={styles.notice}><Body size={12.5} color={ink.secondary}>{notice}</Body><Body size={11} weight="semibold" color={palette.cobaltText}>Dismiss</Body></Pressable>}

        <SectionLabel>APPROVALS</SectionLabel>
        <View style={styles.approvalCard}>
          <View style={styles.approvalTop}>
            <View style={styles.flex}>
              <Body size={15} weight="semibold">Passkey check above $5,000</Body>
              <Body size={12.5} color={ink.secondary} style={styles.leading}>Face ID before a strategy above this threshold opens or closes. Fills never interrupt you.</Body>
            </View>
            <Toggle value={passkey} onChange={setPasskey} label="Passkey approval threshold" />
          </View>
          <View style={styles.pills}>
            {['Passkey', 'Authenticator', 'SMS'].map((item, index) => <View key={item} style={[styles.pill, index === 0 && styles.pillActive]}><Body size={11.5} weight="semibold" color={index === 0 ? palette.cobaltText : ink.tertiary}>{item}</Body></View>)}
          </View>
        </View>

        <SectionLabel>CONTROL</SectionLabel>
        <View style={styles.panel}>
          <SettingRow title="Brokerage connections" meta="Read-only sandbox data and sync health" trailing="Open  ›" onPress={() => router.push('/connections')} />
          <SettingRow title="Automatic repairs" meta="Scoped, expiring delegated permissions" trailing="Review  ›" onPress={() => router.push('/delegation')} last />
        </View>

        <Body size={11.5} color={ink.faint} style={styles.footer}>Your key is sharded across this device, Privy, and a secure enclave. No single party can reconstruct it.</Body>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) { return <Body size={10.5} weight="semibold" color={ink.faint} tracking={1.2} style={styles.sectionLabel}>{children}</Body>; }

function SettingRow({ title, meta, trailing, onPress, last = false }: { title: string; meta: string; trailing: string; onPress?: () => void; last?: boolean }) {
  const content = <><View style={styles.flex}><Body size={13.5} weight="semibold">{title}</Body><Body size={11.5} color={ink.tertiary} style={styles.rowMeta}>{meta}</Body></View><Body size={12} weight="semibold" color={onPress ? palette.cobaltText : ink.secondary}>{trailing}</Body></>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => [styles.settingRow, !last && styles.rowBorder, pressed && styles.pressed]}>{content}</Pressable> : <View style={[styles.settingRow, !last && styles.rowBorder]}>{content}</View>;
}

function SmallButton({ label, onPress, filled = false }: { label: string; onPress: () => void; filled?: boolean }) { return <SecondaryButton label={label} onPress={onPress} accent={filled} style={styles.smallButtonWrap} />; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg }, content: { paddingHorizontal: space.gutter, paddingBottom: 42 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, headerSpacer: { width: 32 },
  walletCard: { backgroundColor: palette.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: stroke.raised, padding: 18, overflow: 'hidden', ...shadow.card },
  walletAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, walletCopy: { marginTop: 16 }, walletMeta: { marginTop: 5 },
  custody: { position: 'absolute', top: 18, right: 18, backgroundColor: 'rgba(94,124,255,0.22)', borderWidth: 1, borderColor: 'rgba(141,162,255,0.35)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  walletActions: { flexDirection: 'row', gap: 9, marginTop: 20 }, smallButtonWrap: { flex: 1 }, pressed: { opacity: 0.65 },
  sectionLabel: { marginTop: 27, marginBottom: 9, marginLeft: 3 }, panel: { backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: stroke.hairline, overflow: 'hidden' },
  settingRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 15, paddingVertical: 12 }, rowBorder: { borderBottomWidth: 1, borderBottomColor: stroke.hairline }, flex: { flex: 1 }, rowMeta: { marginTop: 4, lineHeight: 16 },
  notice: { marginTop: 10, padding: 14, gap: 8, borderRadius: radius.md, backgroundColor: 'rgba(224,163,60,0.08)', borderWidth: 1, borderColor: 'rgba(224,163,60,0.18)' },
  approvalCard: { backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: stroke.hairline, padding: 16 }, approvalTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, leading: { lineHeight: 18, marginTop: 7 }, pills: { flexDirection: 'row', gap: 7, marginTop: 16 }, pill: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: fill.muted, borderWidth: 1, borderColor: stroke.hairline }, pillActive: { borderColor: 'rgba(141,162,255,0.26)', backgroundColor: 'rgba(94,124,255,0.1)' },
  footer: { lineHeight: 17, textAlign: 'center', marginHorizontal: 14, marginTop: 22 },
});
