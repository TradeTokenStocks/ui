# Integration notes — screens → calls

Companion to `Tokenized Stock Strategy App v3 Dark.dc.html`, turn 5.

## Whose UI is whose

| Surface | Theirs or ours | Why |
| --- | --- | --- |
| Brokerage connect | **SnapTrade's** | The Connection Portal is their hosted widget. Brokerage selection, OAuth, passwords and MFA all happen inside it. Do not rebuild. |
| Accounts, holdings, transactions, connection health | **Ours** | SnapTrade ships no components for these — the API returns JSON only. |
| Login | **Ours** | Privy has a default modal, but headless hooks per method let us own it. |
| Signing / sending | **Ours** | `showWalletUIs: false`, or keep Privy's modal with `uiConfig` copy. Either is supported. |
| Export private key | **Privy's, mandatory** | The key is assembled on a different origin inside Privy's iframe. We can only place the button. |
| Recovery setup, MFA enrolment, funding, delegation consent | **Either** | Privy ships default modals; headless equivalents exist. Default modals are the faster path. |
| External wallet actions (MetaMask etc.) | **The wallet's** | Confirmed in the extension or app; not customisable by us or Privy. |

## Stack (Expo)

`PrivyProvider` (appId + clientId) → `PrivyElements` mounted once at root → `useLoginWithEmail` sendCode/loginWithCode → embedded wallet auto-created on login → `useFundWallet` from `@privy-io/expo/ui`.

Expo-specific notes that change the designs:

- **No Privy signing modals on mobile.** Transactions go through the embedded wallet provider directly, so the hold-to-sign sheet in 4a-4 is ours by necessity, not by choice. Good — it's the better surface anyway.
- **Key export is web-only.** The 5a-2 export row has to open a minimal Privy-React web page in a WebView. Keep the row; expect the jump.
- **`PrivyElements` is what renders the funding sheet** in 5a-6 and any other native Privy UI. One mount at root, above your navigator.
- Worth adding for bounty surface area: `useLoginWithOAuth` / `useLoginWithPasskey` alongside email, account linking so a user can add a second login method, and `useHeadlessDelegatedActions` for 5a-5.

## Privy

**5a-1 Login + wallet creation.** Whitelabel: `useLoginWithEmail({onSendCodeSuccess, onLoginSuccess, onError})` → `sendCode({email})`, `loginWithCode({code, email})`; `useLoginWithOAuth()` and `useLoginWithPasskey()` for the three alternates. Wallet auto-created via the provider's `embedded.ethereum.createOnLogin: 'users-without-wallets'`, so there is no wallet step in the flow. The status card is just the code-verification state. Do not narrate key sharding or enclave provisioning as user-facing progress steps: the wallet is there when login resolves, the TEE is standing infrastructure, and recovery selection is a separate opt-in flow (5a-2). "2 of 3" in particular must never appear as a progress counter — it is the Shamir threshold.

**5a-6 Funding.** `useFundWallet` from `@privy-io/expo/ui`; our screen collects the amount, Privy's sheet (rendered by `PrivyElements`) collects the payment. Fund with USDC on Base so the money lands in the asset strategies actually use — funding in ETH means a swap the user didn't ask for.

**5a-2 Wallet & security.** `useWallets()` for address/chain; `exportWallet()` behind the export row; recovery methods (password, iCloud/Drive share) set via the SDK's recovery flows; MFA (passkey / TOTP / SMS) enrolled through the MFA hooks and required per-action by passing MFA-required ui options above the $5,000 threshold. Fills inside an open Aqua band do not prompt — the position was authorised when it opened.

**Signing (turn 4, 4a-4).** Set `embeddedWallets.showWalletUIs: false` (or per-call in `uiConfig`) so the hold-to-sign sheet is ours. If you keep Privy's modal instead, pass `uiConfig: {header, description, buttonText}` — the header should name the strategy, not the contract.

**5a-5 Delegated session.** `useHeadlessDelegatedActions().delegateWallet({address, chainType:'ethereum'})`, backed by a registered key quorum + server policies (spend ceiling, Base only, no transfers out, 30-day expiry). Grant must be user-initiated and stays revocable; surface a revoke row next to it in settings.

## SnapTrade

**5a-3 Connection Portal.** `registerUser` → `loginSnapTradeUser({userId, userSecret, connectionType:'read'})` returns `redirectURI`; render with `<SnapTradeReact loginLink isOpen close/>` and handle `useWindowMessage` SUCCESS / ERROR / ABANDONED / CLOSED. Pass `broker:'SANDBOX'` to skip the institution list while testing. Keep SnapTrade's own chrome — it is their iframe and the user should see whose form it is.

Sandbox is on non-production keys only, flagged **For testing only**, pinned to the top of the list on commercial test keys. Scenarios: Self-directed (2 funded accounts), Cash only, No transactions, No accounts; failures: Invalid credentials, Account locked, Rate limited. Read-only — no trading, and it will not appear in trade-only sessions.

**5a-4 Connections & freshness.** `listBrokerageAuthorizations` → per connection `listBrokerageAuthorizationAccounts`, whose `sync_status` gives `holdings.last_successful_sync` (timestamp) and `transactions.last_successful_sync` (date fully synced through). Transactions are cached, daily, one day behind — no intraday. Webhooks `ACCOUNT_HOLDINGS_UPDATED` / `ACCOUNT_TRANSACTIONS_UPDATED` drive the "Live" chip. "Refresh holdings" is `refreshBrokerageAuthorization` (Daily plans; may be billable). A disabled connection re-opens the portal with `reconnect: <authorizationId>`.

## Rule that holds the two together

SnapTrade data is observed and lagging; wallet data is executable and instant. Anything drawn as accent-filled is onchain and can be allocated. Anything drawn as a hairline outline came from a brokerage connection and cannot.
