import { useEffect, useRef, useState } from 'react';
import { useLoginWithEmail } from '@privy-io/expo';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DitherField } from '@/components/dither-field';
import { PulseDot } from '@/components/ui/pulse-dot';
import { Body, Display } from '@/components/ui/text';
import { fill, font, ink, palette, radius, ramps, shadow, space, stroke } from '@/theme/tokens';

const FIELD_HEIGHT = 280;
const CODE_LENGTH = 6;
const RESEND_SECONDS = 24;

type Step = 'email' | 'code';

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const codeInputRef = useRef<TextInput>(null);
  const lastSubmittedCode = useRef('');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const { sendCode, loginWithCode, state: authState } = useLoginWithEmail();

  const sending = authState.status === 'sending-code';
  const verifying = authState.status === 'submitting-code';
  const busy = sending || verifying;
  const normalizedEmail = email.trim().toLowerCase();
  const validEmail = /^\S+@\S+\.\S+$/.test(normalizedEmail);

  useEffect(() => {
    if (step !== 'code' || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft, step]);

  const requestCode = async () => {
    if (!validEmail || busy) return;
    setError(null);
    try {
      await sendCode({ email: normalizedEmail });
      setStep('code');
      setCode('');
      lastSubmittedCode.current = '';
      setSecondsLeft(RESEND_SECONDS);
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  const verifyCode = async (value: string) => {
    if (busy || value.length !== CODE_LENGTH || lastSubmittedCode.current === value) return;
    lastSubmittedCode.current = value;
    setError(null);
    try {
      const user = await loginWithCode({ code: value, email: normalizedEmail });
      if (user) router.replace('/');
    } catch (caught) {
      lastSubmittedCode.current = '';
      setError(messageFrom(caught));
    }
  };

  const onCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length < CODE_LENGTH) lastSubmittedCode.current = '';
    if (digits.length === CODE_LENGTH) void verifyCode(digits);
  };

  const changeEmail = () => {
    setStep('email');
    setCode('');
    setError(null);
    lastSubmittedCode.current = '';
  };

  const statusLabel = sending
    ? 'Sending your secure code'
    : verifying
      ? 'Verifying your code'
      : step === 'code'
        ? 'Waiting for your code'
        : 'Private wallet infrastructure ready';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}>
      <View style={[styles.field, { height: FIELD_HEIGHT }]} pointerEvents="none">
        <DitherField width={width} height={FIELD_HEIGHT} ramp={ramps.signIn} intensity={0.8} />
        <LinearGradient
          colors={['rgba(10,11,13,0)', 'rgba(10,11,13,0.88)', palette.bg]}
          locations={[0, 0.55, 1]}
          style={styles.fieldFade}
        />
      </View>

      <View style={[styles.intro, { paddingTop: insets.top + 8 }]}>
        <View style={styles.chip}>
          <PulseDot />
          <Body size={11} weight="semibold" color={ink.secondary}>
            Sandbox build
          </Body>
        </View>

        <Display size={29} style={styles.title}>
          {step === 'email' ? 'Your stocks, one position' : 'Check your email'}
        </Display>
        <Body size={13.5} color={ink.secondary} style={styles.blurb}>
          {step === 'email' ? (
            'Sign in without a password. Your wallet is created privately in the background.'
          ) : (
            <>
              Six-digit code sent to{' '}
              <Body size={13.5} weight="semibold">
                {normalizedEmail}
              </Body>
              . It expires in 10 minutes.
            </>
          )}
        </Body>
      </View>

      {step === 'email' ? (
        <View style={styles.formBlock}>
          <Body size={11.5} weight="semibold" color={ink.tertiary} style={styles.inputLabel}>
            EMAIL ADDRESS
          </Body>
          <TextInput
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
            }}
            onSubmitEditing={() => void requestCode()}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="send"
            autoFocus
            placeholder="you@example.com"
            placeholderTextColor={ink.faint}
            selectionColor={palette.cobaltText}
            style={styles.emailInput}
            accessibilityLabel="Email address"
          />
          <Pressable
            disabled={!validEmail || busy}
            onPress={() => void requestCode()}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryButton,
              (!validEmail || busy) && styles.buttonDisabled,
              pressed && validEmail && !busy && styles.buttonPressed,
            ]}>
            <Body size={14} weight="bold">
              {sending ? 'Sending code…' : 'Continue with email'}
            </Body>
          </Pressable>
        </View>
      ) : (
        <View style={styles.codeBlock}>
          <TextInput
            ref={codeInputRef}
            value={code}
            onChangeText={onCodeChange}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus
            maxLength={CODE_LENGTH}
            caretHidden
            style={styles.hiddenInput}
            accessibilityLabel={`Six digit verification code sent to ${normalizedEmail}`}
          />

          <Pressable style={styles.digits} onPress={() => codeInputRef.current?.focus()}>
            {Array.from({ length: CODE_LENGTH }).map((_, index) => {
              const char = code[index] ?? '';
              const focused = index === code.length && !verifying;
              return (
                <View
                  key={index}
                  style={[
                    styles.digit,
                    { backgroundColor: char ? fill.muted : 'rgba(255,255,255,0.025)' },
                    focused ? styles.digitFocused : styles.digitIdle,
                  ]}>
                  <Display size={22}>{char}</Display>
                </View>
              );
            })}
          </Pressable>

          <View style={styles.codeMeta}>
            <Pressable onPress={changeEmail} accessibilityRole="button">
              <Body size={12} weight="semibold" color={palette.cobaltText}>
                Change email
              </Body>
            </Pressable>
            <Pressable
              disabled={secondsLeft > 0 || busy}
              onPress={() => void requestCode()}
              accessibilityRole="button">
              <Body
                size={12}
                weight="semibold"
                color={secondsLeft > 0 ? ink.quaternary : palette.cobaltText}>
                {secondsLeft > 0
                  ? `Resend in 0:${String(secondsLeft).padStart(2, '0')}`
                  : 'Resend code'}
              </Body>
            </Pressable>
          </View>
        </View>
      )}

      {error ? (
        <View style={styles.errorPanel} accessibilityRole="alert">
          <Body size={12.5} color={palette.amberBright} style={styles.errorText}>
            {error}
          </Body>
        </View>
      ) : null}

      <View style={[styles.status, { bottom: insets.bottom + 20 }]}>
        <View style={styles.panelSpecular} />
        <View style={styles.statusRow}>
          <PulseDot size={15} color="rgba(94,124,255,0.22)" duration={1400} />
          <Body size={13} weight="semibold" style={styles.statusLabel}>
            {statusLabel}
          </Body>
        </View>
        <Body size={11.5} color="rgba(242,243,245,0.46)" style={styles.statusNote}>
          A Base wallet is created as you sign in. No seed phrase, no extra step, and you can export
          the key whenever you want.
        </Body>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  field: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  fieldFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 },
  intro: { paddingHorizontal: space.gutter },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: fill.muted,
    borderWidth: 1,
    borderColor: stroke.raised,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  title: { marginTop: 26 },
  blurb: { marginTop: 8, lineHeight: 22, maxWidth: 370 },
  formBlock: { paddingHorizontal: space.gutter, marginTop: 28 },
  inputLabel: { marginBottom: 9, letterSpacing: 0.7 },
  emailInput: {
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: stroke.raised,
    backgroundColor: fill.subtle,
    color: palette.text,
    fontFamily: font.sansMedium,
    fontSize: 15,
    paddingHorizontal: 17,
  },
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: stroke.onAccent,
    backgroundColor: palette.cobaltDeep,
    ...shadow.accent,
  },
  buttonDisabled: { opacity: 0.42, shadowOpacity: 0, elevation: 0 },
  buttonPressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  codeBlock: { paddingHorizontal: space.gutter, marginTop: 24 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  digits: { flexDirection: 'row', gap: 8 },
  digit: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitIdle: { borderWidth: 1, borderColor: stroke.raised },
  digitFocused: { borderWidth: 1.5, borderColor: palette.cobalt },
  codeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  errorPanel: {
    marginHorizontal: space.gutter,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,176,102,0.2)',
    borderRadius: radius.sm,
    backgroundColor: 'rgba(224,163,60,0.07)',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  errorText: { lineHeight: 18 },
  status: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: stroke.hairline,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 17,
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
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  statusLabel: { flex: 1 },
  statusNote: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: stroke.hairline,
    lineHeight: 19,
  },
});
