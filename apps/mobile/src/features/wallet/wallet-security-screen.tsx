import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DitherField } from '@/components/dither-field';
import { BackButton } from '@/components/ui/back-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { Body, Display } from '@/components/ui/text';
import { Toggle } from '@/components/ui/toggle';
import { defaultChain, supportedChains } from '@/lib/chains';
import { goBackOrHome } from '@/navigation/go-back';
import { fill, ink, palette, radius, ramps, shadow, space, stroke } from '@/theme/tokens';
import { useEmbeddedEthereumWallet, usePrivy } from '@privy-io/expo';

const FIELD_HEIGHT = 240;

function parseChainId(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;

  const chainId = Number.parseInt(value, value.startsWith('0x') ? 16 : 10);
  return Number.isNaN(chainId) ? null : chainId;
}

export function WalletSecurityScreen() {
  const insets = useSafeAreaInsets();
  const {wallets} = useEmbeddedEthereumWallet();
  const {user, logout} = usePrivy();
  const embeddedWallet = wallets[0];
  const activeAddress = embeddedWallet?.address;
  const shortAddress = activeAddress
    ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
    : user
      ? 'Creating wallet…'
      : 'Sign in to create wallet';
  const { width } = useWindowDimensions();
  const [copied, setCopied] = useState(false);
  const [passkey, setPasskey] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeChainId, setActiveChainId] = useState<number>(defaultChain.id);
  const [switchingChainId, setSwitchingChainId] = useState<number | null>(null);
  const activeChain = supportedChains.find((c) => c.id === activeChainId) ?? defaultChain;

  const emailAccount = user?.linked_accounts?.find((acc) => acc.type === 'email');
  const userEmail = emailAccount?.type === 'email' ? emailAccount.address : null;
  const userInitial = userEmail ? (userEmail[0]?.toUpperCase() ?? 'W') : 'W';

  useEffect(() => {
    let cancelled = false;

    const syncActiveChain = async () => {
      if (!embeddedWallet) {
        setActiveChainId(defaultChain.id);
        return;
      }

      try {
        const provider = await embeddedWallet.getProvider();
        const providerChainId = parseChainId(await provider.request({ method: 'eth_chainId' }));

        if (
          !cancelled &&
          providerChainId !== null &&
          supportedChains.some((chain) => chain.id === providerChainId)
        ) {
          setActiveChainId(providerChainId);
        }
      } catch (error) {
        console.warn('Failed to read the active chain:', error);
      }
    };

    void syncActiveChain();

    return () => {
      cancelled = true;
    };
  }, [embeddedWallet]);

  const copyAddress = async () => {
    if (!activeAddress) return;
    await Clipboard.setStringAsync(activeAddress);
    setCopied(true);
  };

  const handleSwitchChain = async (chainId: number) => {
    if (!embeddedWallet || switchingChainId !== null || chainId === activeChainId) return;

    setNotice(null);
    setSwitchingChainId(chainId);

    try {
      const provider = await embeddedWallet.getProvider();
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      setActiveChainId(chainId);
    } catch (error) {
      console.warn('Failed to switch chain:', error);
      setNotice('Network switch failed. Your wallet remains on the previous network.');
    } finally {
      setSwitchingChainId(null);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.field, { height: FIELD_HEIGHT }]} pointerEvents="none">
        <DitherField width={width} height={FIELD_HEIGHT} ramp={ramps.wallet} />
        <LinearGradient
          colors={['rgba(10,11,13,0)', 'rgba(10,11,13,0.85)', palette.bg]}
          locations={[0, 0.55, 1]}
          style={styles.fieldFade}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BackButton onPress={goBackOrHome} />
          <Body size={14} weight="semibold">Wallet & security</Body>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.walletCard}>
          <LinearGradient colors={[palette.cobalt, palette.violet]} style={styles.walletAvatar}>
            <Body size={18} weight="bold" color="#fff">{userInitial}</Body>
          </LinearGradient>
          <View style={styles.walletCopy}>
            <Display size={22}>{shortAddress}</Display>
            <Body size={12} color="rgba(255,255,255,0.66)" style={styles.walletMeta}>
              {embeddedWallet
                ? `${activeChain.name} · embedded wallet`
                : user
                  ? 'Provisioning your embedded wallet'
                  : 'Authentication required'}
            </Body>
          </View>
          {embeddedWallet && (
            <>
              <View style={styles.custody}><Body size={10.5} weight="semibold" color="#fff">Self-custody</Body></View>
              <View style={styles.chainPills}>
                {supportedChains.map((chain) => {
                  const isCurrent = chain.id === activeChainId;
                  const isSwitching = chain.id === switchingChainId;
                  const pillLabel = chain.name.includes('RobinHood') ? 'Robinhood' : chain.name;
                  return (
                    <Pressable
                      key={chain.id}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: switchingChainId !== null, selected: isCurrent }}
                      disabled={switchingChainId !== null}
                      onPress={() => handleSwitchChain(chain.id)}
                      style={[
                        styles.chainPill,
                        isCurrent && styles.chainPillActive,
                        switchingChainId !== null && styles.chainPillDisabled,
                      ]}>
                      <Body
                        size={11.5}
                        weight="semibold"
                        color={isCurrent ? palette.cobaltText : ink.tertiary}>
                        {isSwitching ? 'Switching…' : pillLabel}
                      </Body>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.walletActions}>
                <SmallButton label={copied ? 'Copied' : 'Copy address'} onPress={copyAddress} />
                <SmallButton label="Add funds" onPress={() => router.push('/funding')} filled />
              </View>
            </>
          )}
          <View style={{marginTop: 10}}>
            {user ? (<SecondaryButton label='Sign out' onPress={logout}/>) : (<SecondaryButton label='Sign in with Privy' onPress={() => router.push('/sign-in')}/>)}
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
  field: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' }, fieldFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 170 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, headerSpacer: { width: 32 },
  walletCard: { backgroundColor: palette.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: stroke.raised, padding: 18, overflow: 'hidden', ...shadow.card },
  walletAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, walletCopy: { marginTop: 16 }, walletMeta: { marginTop: 5 },
  custody: { position: 'absolute', top: 18, right: 18, backgroundColor: 'rgba(94,124,255,0.22)', borderWidth: 1, borderColor: 'rgba(141,162,255,0.35)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  walletActions: { flexDirection: 'row', gap: 9, marginTop: 20 }, smallButtonWrap: { flex: 1 }, pressed: { opacity: 0.65 },
  sectionLabel: { marginTop: 27, marginBottom: 9, marginLeft: 3 }, panel: { backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: stroke.hairline, overflow: 'hidden' },
  settingRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 15, paddingVertical: 12 }, rowBorder: { borderBottomWidth: 1, borderBottomColor: stroke.hairline }, flex: { flex: 1 }, rowMeta: { marginTop: 4, lineHeight: 16 },
  notice: { marginTop: 10, padding: 14, gap: 8, borderRadius: radius.md, backgroundColor: 'rgba(224,163,60,0.08)', borderWidth: 1, borderColor: 'rgba(224,163,60,0.18)' },
  approvalCard: { backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: stroke.hairline, padding: 16 }, approvalTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, leading: { lineHeight: 18, marginTop: 7 }, pills: { flexDirection: 'row', gap: 7, marginTop: 16 }, pill: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: fill.muted, borderWidth: 1, borderColor: stroke.hairline }, pillActive: { borderColor: 'rgba(141,162,255,0.26)', backgroundColor: 'rgba(94,124,255,0.1)' },
  chainPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  chainPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: fill.muted,
    borderWidth: 1,
    borderColor: stroke.hairline,
  },
  chainPillActive: {
    borderColor: 'rgba(141,162,255,0.35)',
    backgroundColor: 'rgba(94,124,255,0.15)',
  },
  chainPillDisabled: { opacity: 0.65 },
  footer: { lineHeight: 17, textAlign: 'center', marginHorizontal: 14, marginTop: 22 },
});
