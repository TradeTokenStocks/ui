import Link from 'next/link';

import { Display } from '@/components/primitives';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="text-center">
        <div className="num text-xs text-cobalt-text">404</div>
        <Display as="h1" className="mt-3 text-3xl">Nothing here</Display>
        <p className="mt-2 text-sm text-ink-tertiary">This route does not exist.</p>
        <Button asChild className="mt-6">
          <Link href="/">Back to portfolio</Link>
        </Button>
      </div>
    </main>
  );
}
