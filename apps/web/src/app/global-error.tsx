'use client';

import { Display } from '@/components/primitives';
import { Button } from '@/components/ui/button';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-ink-primary">
        <main className="grid min-h-dvh place-items-center px-5">
          <div className="text-center">
            <Display as="h1" className="text-3xl">Something went wrong</Display>
            <p className="mt-2 text-sm text-ink-tertiary">The app could not finish loading this screen.</p>
            <Button className="mt-6" onClick={reset}>Try again</Button>
          </div>
        </main>
      </body>
    </html>
  );
}
