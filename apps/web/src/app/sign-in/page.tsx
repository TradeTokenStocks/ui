import type { Metadata } from 'next';

import { SignInScreen } from '@/features/auth/sign-in-screen';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return <SignInScreen />;
}
