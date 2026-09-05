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
      {/* index switches the two dock destinations in place (see home-screen), so
          nothing here animates. A stack transition can also reparent native
          Expo UI controls mid-animation.

          strategy/[ticker] has two different entry points that want two
          different transitions: a real drill-down from the Strategies list
          (router.push, wants the normal slide-in) and a review-completion
          landing (router.replace, wants to feel like a reveal rather than a
          push). animationTypeForReplace scopes the "no push feel" to only
          the replace() case, so the list tap keeps a normal animated push. */}
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="strategy/[ticker]" options={{ animationTypeForReplace: 'pop' }} />
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
