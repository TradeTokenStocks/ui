import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { PrivyProvider } from '@privy-io/expo';

import { palette } from '@/theme/tokens';

function requirePublicEnv(value: string | undefined, name: string) {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const privyAppId = requirePublicEnv(
  process.env.EXPO_PUBLIC_PRIVY_APP_ID,
  'EXPO_PUBLIC_PRIVY_APP_ID',
);
const privyClientId = requirePublicEnv(
  process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID,
  'EXPO_PUBLIC_PRIVY_CLIENT_ID',
);

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  /**
   * Held on the splash until the faces are in memory. Every number on the home
   * screen is monospaced for alignment, so a fallback-font first paint would
   * reflow the entire balance block a frame later.
   */
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });

  useEffect(() => {
    // Hide on error too — a missing font should degrade to the system face,
    // not strand the user on a splash screen forever.
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <PrivyProvider
      appId={privyAppId}
      clientId={privyClientId}
      config={{
        embedded: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
      }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
        }}
      />
    </PrivyProvider>
  );
}
