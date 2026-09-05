# TradeTokenStocks

TradeTokenStocks is a sandbox portfolio experience for understanding one company position across two custody models: onchain holdings that can be allocated to a strategy, and brokerage holdings that are visible but read-only.

The repository is a Bun/Turborepo monorepo with two clients:

- `apps/mobile` — Expo SDK 57 and Expo Router
- `apps/web` — Next.js 16 App Router
- `packages/domain` — platform-neutral types, fixtures, formatting, and strategy math
- `packages/design-tokens` — shared semantic colour, spacing, typography, and motion values
- `packages/typescript-config` — strict TypeScript defaults for shared packages

All balances, positions, events, and transactions currently shown in the product are deterministic sandbox fixtures. No brokerage or blockchain is queried.

## Requirements

- [Bun](https://bun.sh/) 1.3.14 or compatible
- Node.js 20 or newer for the underlying Expo and Next.js toolchains
- A development build for mobile features that rely on native modules

## Setup

Install the workspace dependencies from the repository root:

```bash
bun install
```

Copy the environment templates only for the clients you plan to run:

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
cp apps/web/.env.example apps/web/.env.local
```

The public Privy identifiers enable real authentication. The web app remains usable in sandbox mode without them. Never place secrets or private keys in a `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variable.

## Development

```bash
bun run dev          # both clients
bun run dev:mobile   # Expo development server
bun run dev:web      # Next.js at http://localhost:3000
```

Useful mobile commands live in `apps/mobile/package.json`, including `android`, `ios`, and `doctor`. The project uses Expo Continuous Native Generation, so `apps/mobile/ios` and `apps/mobile/android` are generated and must not be edited or committed.

## Quality checks

```bash
bun run check        # generated tokens, lint, and strict typechecking
bun run build        # production builds
bun run verify       # check followed by build
```

Run `bun run tokens` after changing `packages/design-tokens`. The generated web CSS is committed so token drift is visible in review; `bun run check` verifies that it is current.

## Architecture rules

- Keep route files in `apps/mobile/src/app` and `apps/web/src/app`; put components, features, hooks, and utilities outside route directories.
- Shared packages must remain platform-neutral. They cannot import React, React Native, Expo, Next.js, browser globals, or either Privy SDK.
- Keep authentication adapters platform-local: `@privy-io/expo` on mobile and `@privy-io/react-auth` on web.
- Preserve the visual semantics: cobalt means onchain/actionable, while the quiet outlined treatment means brokerage/observed.
- Add dependency and workflow commands to the relevant `package.json`; do not rely on undocumented one-off scripts.

## Status

The repository is an active ETHOnline 2026 prototype. Product flows are implemented against fixtures; live brokerage synchronization, settlement, and strategy execution are not yet connected.
