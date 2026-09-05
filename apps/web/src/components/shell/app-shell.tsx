'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';

import { NavRail } from '@/components/shell/nav-rail';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

/**
 * The application shell: a persistent rail on the left, a readable content
 * column, and an optional context rail that only appears when there is room
 * for it.
 *
 * On narrow screens the rail becomes a sheet. Focus trapping and restoration
 * come from Radix rather than being hand-rolled.
 */
export function AppShell({
  children,
  context,
}: {
  children: React.ReactNode;
  context?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[228px] shrink-0 border-r border-stroke-hairline bg-surface-sunken lg:block">
        <NavRail />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Narrow-screen header. Hidden once the rail is permanent. */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stroke-hairline bg-bg/85 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="isolate w-[264px] border-stroke-raised p-0 shadow-[18px_0_48px_rgba(0,0,0,0.7)]"
              style={{ backgroundColor: '#0C0E12' }}>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <NavRail onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="text-[13.5px] font-semibold">TradeTokenStocks</span>
          <span className="ml-auto rounded-pill border border-amber/25 bg-amber/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-bright">
            Sandbox
          </span>
        </header>

        <div className="flex min-w-0 flex-1">
          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-[860px] px-5 py-8 sm:px-8 lg:py-12">
              {children}
            </div>
          </main>

          {context ? (
            <aside className="sticky top-0 hidden h-dvh w-[300px] shrink-0 overflow-y-auto border-l border-stroke-hairline px-5 py-12 2xl:block">
              {context}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
