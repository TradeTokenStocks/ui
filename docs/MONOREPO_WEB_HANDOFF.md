# TradeTokenStocks: mobile + web monorepo handoff

Status: approved direction, not yet implemented  
Prepared: 2026-09-05  
Hackathon: ETHOnline 2026, submission deadline 2026-09-13 12:00 EDT

## Objective

Turn the existing working Expo application into a Bun-workspace Turborepo with two first-class clients:

- a native mobile product using Expo and `@privy-io/expo`;
- a deployable web product using Next.js and `@privy-io/react-auth`.

The web product is the frictionless judging surface. It should be a real responsive desktop application, not the existing phone UI stretched across a browser or placed in a decorative phone frame. The mobile app remains the clearest expression of the end-user product.

Do not attempt to make Privy Expo run in a browser. Privy's React Native SDK officially supports iOS and Android only. Use the React SDK on web.

## Read this before changing anything

1. Read the repository `AGENTS.md` in full.
2. Read the `frontend-design` skill before implementing web UI.
3. Re-read the current Expo SDK 57 documentation before touching Expo, Metro, Expo Router, or EAS configuration:
   - <https://docs.expo.dev/versions/v57.0.0/>
   - <https://docs.expo.dev/llms.txt>
   - <https://docs.expo.dev/guides/monorepos/>
4. Read current Privy documentation before implementing either adapter:
   - <https://docs.privy.io/basics/get-started/platforms>
   - <https://docs.privy.io/basics/react-native/installation>
   - <https://docs.privy.io/basics/react/installation>
   - <https://docs.privy.io/basics/get-started/dashboard/app-clients>
5. Inspect `git status` and the complete diff. The working mobile implementation is currently spread across modified and untracked files. Do not begin a bulk move until it has been reviewed and checkpointed.

## Current baseline

The current repository root is a functioning Expo SDK 57 application:

- Expo `~57.0.20`
- React Native `0.86.3`
- React `19.2.3`
- Expo Router `~57.0.19`
- Privy Expo `^0.72.0`
- Bun lockfile present
- Android package: `com.jayp011.TradeTokenStocks`
- URL scheme: `tradetokenstocks`
- web output currently configured as `static`

The native app has been typechecked, linted, rebuilt, and smoke-tested on Android. Portfolio/strategy dock switching, strategy filters, and the strategy review flow were clean at the end of the prior session.

Important stability decisions already made:

- Dock destinations use `router.navigate`, not `router.replace`.
- Dock route screens use `animation: 'none'` because native Expo UI views can be reparented during a stack transition.
- Do not attach Reanimated worklets to controls that immediately navigate. Previous versions produced Fabric `RetryableMountingLayerException` warnings after the old surface unmounted.
- Primary and secondary actions use Expo UI universal `Button` inside `Host`.
- Segments use `@react-native-segmented-control/segmented-control`; Expo UI's Compose segmented control previously caused a Fabric `addViewAt` failure.
- Expo UI controls require measured numeric widths on Android; percentage widths previously crashed.
- The custom Metro resolver in `metro.config.js` is required by Privy's current Expo dependency graph. Preserve it exactly unless current Privy documentation says otherwise.

The existing `android/` directory is generated, ignored, and local. It is not source of truth. Do not manually edit native projects. Preserve it outside the repository if a rollback artifact is desired, then regenerate from app configuration after the move.

The current Expo web export can emit static files and 25 routes, but the resulting page throws a browser runtime exception and renders blank. This is expected: the root imports the native-only Privy SDK and the app contains native-oriented UI dependencies. Do not spend time trying to patch that Expo web export into the production web client.

## Architecture decision

Use Turborepo on top of Bun workspaces.

```text
TradeTokenStocks/
├── apps/
│   ├── mobile/                  # existing Expo app, moved intact
│   │   ├── src/
│   │   ├── assets/
│   │   ├── app.json
│   │   ├── entrypoint.js
│   │   ├── metro.config.js
│   │   ├── eslint.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── web/                     # new Next.js App Router application
│       ├── src/app/
│       ├── src/components/
│       ├── src/features/
│       ├── src/lib/
│       └── package.json
├── packages/
│   ├── domain/                  # pure TypeScript business model and fixtures
│   ├── chain/                   # viem chains, ABIs, addresses, encoding
│   ├── design-tokens/           # raw semantic tokens, no RN/CSS objects
│   └── typescript-config/       # optional shared strict TS presets
├── design/                      # existing reference designs; keep at root
├── docs/
├── package.json                 # workspace scripts and Turbo only
├── turbo.json
└── bun.lock
```

Start with `domain` and `design-tokens`. Create `chain` only when real ABIs/configuration are ready to move into it. Do not create empty abstraction packages merely to match the diagram.

### What is shared

- domain types such as `Provenance`, `CompanyExposure`, `LedgerRow`, `Representation`, and `CompanyDetail`;
- strategy math, formatting-independent calculations, validation schemas, and state-machine types;
- simulated fixtures, clearly named and marked as sandbox data;
- chain IDs, contract addresses, ABIs, transaction builders, and query types;
- raw semantic design values: colours, radii, spacing scale, typography family names, motion timings;
- API request/response schemas once an API exists.

Shared packages must be platform-neutral TypeScript. They must not import React, React Native, Next.js, Expo, browser globals, or either Privy client SDK.

### What is not shared

- screen/page components;
- navigation and routing;
- buttons, drawers, sheets, dialogs, segmented controls, sliders, or pickers;
- Privy providers and hooks;
- storage/session implementations;
- layout-specific styling;
- platform-specific wallet and deep-link behavior.

Do not pursue maximum component reuse. Native Expo UI and accessible desktop web controls have different lifecycles, layout expectations, and interaction semantics. Share truth and behavior, not rendering.

## Privy boundary

Use one Privy app ID so the clients belong to the same application and users can access the same Privy identity/wallet when they authenticate consistently. Configure separate app clients for platform-specific behavior.

### Mobile

- Package: `@privy-io/expo`
- Environment:
  - `EXPO_PUBLIC_PRIVY_APP_ID`
  - `EXPO_PUBLIC_PRIVY_CLIENT_ID`
- Native allowlist:
  - Android package `com.jayp011.TradeTokenStocks`
  - the final iOS bundle identifier once added
- Allowed URL scheme: `tradetokenstocks`
- Preserve the required polyfill ordering in `entrypoint.js`.
- Preserve the targeted Metro resolver fallbacks for `isows`, `zustand`, and `jose` until verified unnecessary against current docs.

### Web

- Package: `@privy-io/react-auth`
- Environment:
  - `NEXT_PUBLIC_PRIVY_APP_ID`
  - `NEXT_PUBLIC_PRIVY_CLIENT_ID` if a web app client is used
- Add localhost and the final HTTPS deployment domain to Privy's web allowed origins.
- Put `PrivyProvider` in a small client component mounted by the root layout.
- Never import `@privy-io/expo` anywhere reachable from the web dependency graph.
- Never expose a Privy app secret, authorization private key, SnapTrade secret, or RPC secret through a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` variable.

Keep the provider code platform-local. If consumers need a common shape, share only interfaces/data types in `packages/domain`; adapt each SDK to those types inside its own app.

### Judge access

The deployed web app should offer both:

- `Sign in with Privy`, exercising the real email authentication and embedded-wallet path;
- `Explore sandbox`, entering the deterministic fixture experience without email friction.

Sandbox mode must remain visibly labeled. It must never imply that fixture balances, brokerage connections, fills, or transactions are real.

## Web product direction

Tone: precise, editorial financial infrastructure. Dark, controlled, and materially layered rather than a generic crypto dashboard. Preserve the existing cobalt = executable/onchain and outline = observed/brokerage semantics.

The memorable interaction should be the consolidated-exposure model: a judge immediately sees one company position composed of allocatable onchain representations and read-only brokerage exposure, then opens a strategy against only the executable portion.

### Desktop shell

- Persistent left navigation rail: Portfolio, Strategies, Events, Connections.
- Account/wallet and sandbox state at the bottom of the rail.
- Main content column with a maximum readable width, but no fake phone frame.
- Optional right context rail on wide screens for composition, execution constraints, or recent activity.
- Collapse into an accessible sheet navigation on narrow screens.
- Responsive behavior must work at desktop, tablet, and mobile-web widths.

Use established web primitives. Recommended stack:

- Next.js App Router;
- Tailwind CSS for layout and tokens;
- shadcn/ui backed by Radix primitives for dialogs, sheets, dropdowns, tabs, tooltips, and form controls;
- a maintained chart library only where a chart communicates real data;
- CSS transitions for ordinary hover/focus states and Motion only for meaningful orchestrated transitions.

Do not hand-roll focus traps, dialogs, drawers, dropdown behavior, sliders, or segmented controls. Do not add decorative animation to transaction-triggering controls. Honor `prefers-reduced-motion`.

Typography should preserve the current hierarchy:

- Bricolage Grotesque for display balances and headings;
- Instrument Sans for UI copy;
- Geist Mono for comparable values, addresses, quantities, and timestamps.

Load them through `next/font` when supported rather than relying on Expo font packages.

### Web routes and flow mapping

Recommended stable routes:

| Web route | Purpose | Native source to reference |
| --- | --- | --- |
| `/` | Consolidated portfolio dashboard | `home-screen.tsx` |
| `/sign-in` | Privy email authentication | `sign-in-screen.tsx` |
| `/companies/[ticker]` | Company exposure and representations | `company-screen.tsx` |
| `/strategies` | Strategy list/active strategy overview | `active-strategy-screen.tsx` |
| `/strategies/new` | Strategy builder | `strategy-builder-screen.tsx` |
| `/strategies/review` | Review and two approvals | `strategy-review-screen.tsx` |
| `/events/nvda-split` | Corporate-action review | `corporate-action-screen.tsx` |
| `/wallet` | Wallet and security | `wallet-security-screen.tsx` |
| `/funding` | Add-funds setup and provider handoff | `add-funds-screen.tsx` |
| `/connections` | Brokerage health and freshness | `connections-screen.tsx` |
| `/connections/snaptrade` | Hosted portal handoff | `snaptrade-portal-screen.tsx` |
| `/automation` | Delegated/automatic repair permissions | `delegated-session-screen.tsx` |

The web information architecture may combine mobile screens into panels where that improves desktop comprehension. Preserve the domain rules and complete demo path; do not copy mobile layout line-for-line.

### Canonical demo journey

The deployed site and video should make this path deterministic:

1. Enter the visibly labeled sandbox or authenticate through Privy.
2. See total exposure split into wallet-allocatable and brokerage-observed balances.
3. Open Nvidia and inspect brokerage, B20, and partner-mint representations.
4. Start a concentrated NVDA/USDC band using only executable exposure.
5. Adjust the allocation/range with maintained controls.
6. Review the two explicit approvals and open the strategy.
7. Inspect live strategy composition, fills, and fees.
8. Review the Nvidia 10-for-1 corporate action and show multiplier-based rescaling.
9. Open Connections to explain observed data freshness and the SnapTrade boundary.
10. Open Wallet/Automation to show self-custody, export, MFA threshold, and scoped delegation.

No primary demo control may be a dead end. If an integration is not live yet, use a deterministic sandbox result with an honest label and an explanation of the real handoff.

## Migration sequence

Execute in this order. Each numbered phase ends with a green build and a small commit. Do not combine the migration and web implementation in one large commit.

### Phase 0: preserve the known-good state

1. Inspect all modified/untracked files and confirm they belong to the current mobile implementation.
2. Run from the current root:
   - `bunx tsc --noEmit`
   - `bunx expo lint`
   - `git diff --check`
3. Smoke-test the current Android build.
4. Create a checkpoint commit before structural moves. Do not discard or overwrite existing user changes.
5. If preserving the ignored generated `android/` directory, copy/move it to a clearly named temporary location outside the repository. Do not commit it.

Suggested commit: `checkpoint: working Expo mobile prototype`

### Phase 1: establish Bun workspaces and move mobile intact

1. Create the root workspace manifest with:
   - `private: true`
   - `packageManager` pinned to the actual Bun version in use
   - `workspaces: ["apps/*", "packages/*"]`
   - scripts for `dev`, `build`, `lint`, `typecheck`, and focused app commands
2. Add Turborepo and a minimal `turbo.json`:
   - `dev`: persistent, uncached
   - `build`: depends on upstream builds, caches outputs
   - `lint`: depends on upstream lint
   - `typecheck`: depends on upstream typecheck
3. Move the existing Expo source and app-local configuration into `apps/mobile` using history-preserving moves:
   - `src/`, `assets/`, `app.json`, `entrypoint.js`, `metro.config.js`, `eslint.config.js`, `tsconfig.json`, and Expo-specific scripts/configuration.
4. Create `apps/mobile/package.json` from the current application manifest. Keep native runtime dependencies in the mobile package, not the workspace root.
5. Keep `design/`, `docs/`, `AGENTS.md`, license, and the main README at repository root.
6. Update `.gitignore` for nested `.expo`, `dist`, generated `android`, generated `ios`, and per-app local environment files.
7. Split environment examples into `apps/mobile/.env.example` and later `apps/web/.env.example`.
8. Run `bun install` once from the repository root and retain a single root `bun.lock`.
9. Clear Metro once after the move, as recommended for monorepo migration.
10. Regenerate the native project through Expo tooling rather than editing it manually.

Run Expo and EAS commands from `apps/mobile`, not the repository root.

### Phase 2: prove mobile did not regress

Before creating the web app:

- run mobile typecheck and lint;
- run `bunx expo-doctor` from `apps/mobile`;
- build/install Android with the SDK-compatible Expo command;
- cold-launch the exact package `com.jayp011.TradeTokenStocks`;
- test Portfolio ↔ Strategies repeatedly;
- test Holdings/Events/Activity segments;
- test company → strategy builder → review → active strategy;
- test strategy activity filters;
- check logs for Fabric mounting errors, native module errors, and fatal exceptions.

Do not proceed until this phase is green.

Suggested commit: `chore: move Expo app into Bun workspace`

### Phase 3: extract only proven shared code

1. Move raw domain types and fixture data into `packages/domain`.
2. Remove display formatting from domain values where practical; store numeric values and format within each client. Keep fixture IDs and provenance semantics stable.
3. Move raw semantic design values into `packages/design-tokens`.
4. Keep React Native shadow/style objects inside mobile. Web should derive CSS variables from shared raw values.
5. Export packages through explicit package `exports` maps.
6. Consume the packages from mobile and rerun all mobile checks.

Avoid broad mechanical extraction. If code is used by only one client, leave it in that client.

Suggested commit: `refactor: extract platform-neutral domain and design tokens`

### Phase 4: scaffold the web client

1. Verify the current supported Next.js/create-next-app/Bun commands before scaffolding.
2. Create `apps/web` with TypeScript, App Router, ESLint, Tailwind, and a `src` directory.
3. Initialize shadcn/ui and install only the primitives needed by implemented screens.
4. Configure strict typechecking and workspace package imports.
5. Set up local fonts, global semantic CSS variables, metadata, favicon, error boundary, loading state, and not-found page.
6. Add a client-side Privy provider using `@privy-io/react-auth`.
7. Implement sandbox entry separately from authenticated state.
8. Build the persistent responsive application shell.

Suggested commit: `feat(web): scaffold responsive Next.js client`

### Phase 5: implement the web demo vertically

Build the canonical journey in usable slices rather than creating eleven static pages first:

1. Portfolio + company detail.
2. Strategy builder + review + active strategy.
3. Corporate action.
4. Connections + SnapTrade handoff representation.
5. Wallet, funding, and automation.
6. Privy sign-in and authenticated wallet state.

After each slice, verify keyboard operation, narrow-screen behavior, browser console, and production build.

### Phase 6: integration and deployment

- Add a distinct Privy web app client/allowed origins without changing the mobile client configuration.
- Use the same Privy app ID across web and mobile.
- Verify that the same login identity resolves consistently across platforms.
- Add real chain/client modules through `packages/chain` as integrations become functional.
- Deploy `apps/web` to Vercel with its root directory configured correctly.
- Treat preview URLs carefully in Privy's allowed-origin configuration; do not use unsafe global wildcards.
- Produce an EAS development/internal-distribution build for mobile as an optional judge artifact.
- Update the root README with architecture, local setup for both clients, environment variables, live URL, demo video, contract addresses, integration status, and explicit AI/pre-existing-work disclosures required by ETHGlobal.

## Root scripts expected at completion

Names may vary slightly, but there must be an obvious root workflow equivalent to:

```json
{
  "scripts": {
    "dev": "turbo dev",
    "dev:mobile": "turbo dev --filter=@tradetoken/mobile",
    "dev:web": "turbo dev --filter=@tradetoken/web",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck"
  }
}
```

Do not blindly paste this manifest. Confirm task syntax against the installed Turbo version and ensure Expo's persistent task behaves correctly.

## Quality gates

### Every phase

- no secrets committed;
- `git diff --check` passes;
- changed packages typecheck and lint;
- no unrelated user changes overwritten;
- one focused, reviewable commit;
- README/setup commands remain truthful.

### Mobile acceptance

- Android cold launch succeeds from the monorepo;
- fonts and Skia dither field load;
- Privy provider initializes when valid environment values exist;
- existing routes and deep links still resolve;
- native sheets dismiss using their library-provided backdrop behavior;
- repeated dock switching produces no Fabric exceptions;
- no `RNSkiaModule`, `ExpoClipboard`, `addViewAt`, or Reanimated surface errors.

### Web acceptance

- production `build`, `lint`, and `typecheck` pass;
- deployed URL loads without authentication required for sandbox exploration;
- no runtime or hydration errors in the console;
- no native-only packages appear in the web bundle;
- real Privy email login works through `@privy-io/react-auth`;
- desktop, tablet, and narrow/mobile layouts are intentionally designed;
- complete keyboard navigation and visible focus states;
- dialogs/sheets trap and restore focus through their component-library primitives;
- reduced-motion preference is honored;
- every canonical demo step works after a clean reload;
- sandbox states remain visibly labeled;
- public pages have useful metadata and link previews.

### Submission acceptance

- public repository and clear README;
- live HTTPS web URL;
- optional installable Android build link;
- narrated 2–4 minute video, at least 720p, captured directly from screen/emulator rather than filming a phone;
- architecture diagram showing mobile/web SDK separation and shared domain/chain packages;
- testnet/mainnet addresses and transaction evidence where applicable;
- integrations and simulated portions distinguished explicitly;
- AI-tool use and any pre-existing work disclosed.

## Risks and guardrails

| Risk | Guardrail |
| --- | --- |
| Monorepo move breaks Metro resolution | Preserve the Privy resolver, use Expo's SDK 57 workspace support, clear Metro, and validate Android before web work. |
| Bun hoisting/isolated install exposes duplicate React | Keep React versions aligned, inspect dependency graph, and do not add app runtime dependencies at root. |
| Native SDK leaks into web | Separate app manifests/providers and prohibit `@privy-io/expo` in shared packages. |
| Premature universal UI consumes the week | Share domain/chain/tokens only; build platform-native presentation layers. |
| Web sandbox looks like a real financial account | Persistent Sandbox label and explicit fixture language. |
| Auth blocks asynchronous judges | Keep `Explore sandbox` available while demonstrating real Privy login separately. |
| Migration buries useful git history | Checkpoint first and use small `git mv`-based commits. |
| Generated native folders get committed | Keep nested native output ignored and use CNG/EAS configuration as source of truth. |
| Platform clients accidentally share unsafe configuration | Same app ID, distinct app clients, correct native identifiers and web allowed origins. |

## Explicit non-goals

- Do not make `@privy-io/expo` work on web.
- Do not replace the finished mobile design with a universal component system.
- Do not ship a fake phone-frame website as the primary web experience.
- Do not hand-roll component-library primitives.
- Do not present simulated trades or brokerage data as live.
- Do not move secrets or server signing keys into a client package.
- Do not re-enable authentication gating in mobile merely as part of the repository move; treat that as a separate tested feature.
- Do not rewrite the existing native application during the migration.

## First prompt for the next coding session

Use this verbatim if useful:

> Read `AGENTS.md` and `docs/MONOREPO_WEB_HANDOFF.md` completely. Execute only phases 0–2 first: checkpoint the current working Expo app, migrate it intact into a Bun-workspace Turborepo under `apps/mobile`, and prove the Android app still builds and passes the documented smoke tests. Do not scaffold or implement the web client until the mobile migration is green. Preserve all existing user changes and the current Privy Metro resolver. Report the exact checks and emulator evidence before proceeding.

