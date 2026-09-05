import { router } from 'expo-router';

/** Back for normal navigation, home fallback for cold deep links. */
export function goBackOrHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
