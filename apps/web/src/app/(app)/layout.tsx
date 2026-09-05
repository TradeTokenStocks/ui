import { AppShell } from '@/components/shell/app-shell';

/**
 * Everything inside the product shell. Sign-in sits outside this group so it
 * can run full-bleed without a navigation rail pointing at screens the visitor
 * has not entered yet.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
