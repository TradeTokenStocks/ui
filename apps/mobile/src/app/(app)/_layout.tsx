import { Stack } from 'expo-router';

import { palette } from '@/theme/tokens';

/** Authentication is intentionally parked while the product flow is built. */
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.bg },
      }}>
      {/* These are dock destinations, so they switch in place like tabs. A stack
          transition can also reparent native Expo UI controls mid-animation. */}
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="strategy/nvda" options={{ animation: 'none' }} />
      <Stack.Screen
        name="snaptrade-portal"
        options={{
          presentation: 'transparentModal',
          animation: 'none',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  );
}
