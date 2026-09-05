---
name: Privy
description: Use when building wallet infrastructure, authentication systems, or financial applications. Reach for Privy when you need to create embedded wallets, manage user authentication, control wallet permissions with policies, execute transactions, or integrate with blockchain networks. Use for consumer apps, trading platforms, treasury management, AI agents, and fintech products.
metadata:
    mintlify-proj: privy
    version: "1.0"
---

# Privy Skill Reference

## Product summary

Privy is a programmable wallet infrastructure platform that provides secure, high-performance wallet creation, authentication, and transaction management across 50+ blockchains including Ethereum, Solana, Tempo, and Bitcoin. Agents use Privy to build embedded wallets for users, authenticate users with multiple login methods, control wallet permissions via policies, and execute transactions. Key resources: **App ID and App Secret** (from Privy Dashboard), **REST API** at `https://api.privy.io/v1`, **Client SDKs** for React, React Native, Node.js, Go, Java, Rust, Ruby, Swift, Android, Flutter, and Unity. Primary docs: https://docs.privy.io

## When to use

Reach for Privy when:
- Building embedded wallets for users (non-custodial or custodial)
- Authenticating users via email, SMS, social login, passkeys, or wallet-based auth
- Creating wallets for organizations, treasuries, or AI agents
- Executing transactions, swaps, transfers, or yield operations
- Enforcing spending limits or transaction policies on wallets
- Managing multi-sig or quorum-based wallet approvals
- Integrating external wallets (MetaMask, Phantom, etc.) into your app
- Handling user onboarding flows with wallet provisioning
- Building financial products (payments, trading, lending, card spend)
- Setting up webhooks to react to wallet events in real time

Do not use Privy for: pure authentication without wallet needs (use Auth0, Firebase), blockchain indexing (use The Graph), or smart contract development (use Foundry, Hardhat).

## Quick reference

### Essential API endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/wallets` | POST | Create a new wallet |
| `/v1/wallets/{wallet_id}` | GET | Retrieve wallet details |
| `/v1/wallets/{wallet_id}/rpc` | POST | Execute RPC method (sign, send transaction) |
| `/v1/users` | POST | Create a user |
| `/v1/users/{user_id}` | GET | Retrieve user details |
| `/v1/policies` | POST | Create a policy to control wallet actions |
| `/v1/intents/wallets/{wallet_id}/rpc` | POST | Create async intent for approval workflows |

### Authentication headers (all API requests)

```
Authorization: Basic base64(app_id:app_secret)
privy-app-id: your-app-id
Content-Type: application/json
```

### SDK initialization (React example)

```tsx
import {PrivyProvider} from '@privy-io/react-auth';

<PrivyProvider
  appId="your-privy-app-id"
  clientId="your-app-client-id"
  config={{
    embeddedWallets: {
      ethereum: { createOnLogin: 'users-without-wallets' }
    }
  }}
>
  {children}
</PrivyProvider>
```

### Common wallet control models

| Model | Owner | Signers | Use case |
|-------|-------|---------|----------|
| User-owned | User | None | Self-custodial consumer wallets |
| User + server | User | Server (scoped) | Automated trading, limit orders |
| App-owned | App key | None | Treasury, bots, agents |
| Custodial | Custodian | None | Regulated accounts (Bridge provider) |

### Wallet action types

- **Transfer**: Move crypto between addresses with optional bridging
- **Swap**: Exchange tokens via integrated DEX aggregators
- **Earn**: Deposit/withdraw from yield protocols (Aave, Morpho, Veda)
- **RPC**: Low-level signing (eth_sendTransaction, personal_sign, etc.)

## Decision guidance

### When to use embedded vs external wallets

| Scenario | Embedded | External |
|----------|----------|----------|
| New user onboarding | ✓ | ✗ |
| User has existing wallet | ✗ | ✓ |
| Non-custodial requirement | ✓ | ✓ |
| Custodial/regulated | ✓ | ✗ |
| Seamless UX priority | ✓ | ✗ |
| Power user with MetaMask | ✗ | ✓ |

### When to use wallet actions vs RPC

| Approach | Complexity | Use case |
|----------|-----------|----------|
| Wallet actions | Low | Transfers, swaps, earn, standard flows |
| RPC | High | Custom contracts, batch calls, low-level control |
| Intents | Medium | Async approvals, multi-party workflows |

### When to use policies

| Condition | Apply policy |
|-----------|--------------|
| Spending limits needed | Yes |
| Allowlist recipients | Yes |
| Restrict contract interactions | Yes |
| Time-bound transactions | Yes |
| No restrictions | No |

## Workflow

### 1. Set up your app

- Create app in Privy Dashboard and obtain **App ID** and **App Secret**
- Configure login methods (email, SMS, social, passkeys, wallet)
- Set up app clients for different environments (web, mobile, staging, production)
- Configure allowed domains and OAuth redirect URIs

### 2. Authenticate users

**Client-side (React)**:
```tsx
const {login, ready} = usePrivy();
if (ready) {
  login(); // Opens login modal
}
```

**Server-side (Node.js)**:
```javascript
const user = await privy.users.create({
  email: 'user@example.com'
});
```

### 3. Create or retrieve wallets

**Auto-create on login** (React config):
```tsx
embeddedWallets: {
  ethereum: { createOnLogin: 'users-without-wallets' }
}
```

**Manual creation** (API):
```bash
curl -X POST https://api.privy.io/v1/wallets \
  -u "app_id:app_secret" \
  -H "privy-app-id: app_id" \
  -d '{"chain_type": "ethereum", "owner": {"user_id": "user_123"}}'
```

### 4. Set up policies (if needed)

Create a policy to restrict wallet actions:
```bash
curl -X POST https://api.privy.io/v1/policies \
  -u "app_id:app_secret" \
  -H "privy-app-id: app_id" \
  -d '{
    "rules": [{
      "type": "spending_limit",
      "amount": "1000000000000000000",
      "asset": "usdc",
      "chain": "base"
    }]
  }'
```

Attach to wallet during creation or update.

### 5. Execute transactions

**Simple transfer** (wallet action):
```bash
curl -X POST https://api.privy.io/v1/wallets/{wallet_id}/transfer \
  -u "app_id:app_secret" \
  -H "privy-app-id: app_id" \
  -d '{
    "amount": "100000000",
    "source": {"asset": "usdc", "chain": "base"},
    "destination": {"address": "0x..."}
  }'
```

**Custom RPC** (low-level):
```bash
curl -X POST https://api.privy.io/v1/wallets/{wallet_id}/rpc \
  -u "app_id:app_secret" \
  -H "privy-app-id: app_id" \
  -d '{
    "method": "eth_sendTransaction",
    "caip2": "eip155:8453",
    "params": {"transaction": {...}}
  }'
```

### 6. Set up webhooks

Subscribe to events in Dashboard > Configuration > Webhooks. Handle events:
```javascript
app.post('/webhooks/privy', (req, res) => {
  const event = req.body;
  if (event.type === 'wallet.funds_deposited') {
    // React to deposit
  }
  res.status(200).send('OK');
});
```

### 7. Verify and test

- Check wallet creation in Dashboard > Wallets
- Test transactions in sandbox environment
- Verify webhook delivery in Dashboard logs
- Monitor gas sponsorship credits if using gas sponsorship

## Common gotchas

- **HTTPS required**: Embedded wallets only work in secure contexts (https://). Localhost is treated as secure by browsers, but http:// deployments will fail silently.
- **Rate limits**: API endpoints are rate-limited. Implement exponential backoff on 429 responses. Batch requests where possible.
- **Policy violations**: Transactions blocked by policies return `policy_violation` error. Review policy rules before retrying.
- **Insufficient funds**: Check both wallet balance and gas sponsorship credits. Wallet needs native token for gas unless gas sponsorship is enabled.
- **Authorization signatures**: Requests to certain endpoints require signing with authorization keys. Ensure `privy-authorization-signature` header is included.
- **User session keys expire**: User signing keys are time-bound. Request fresh keys before they expire; SDKs handle this automatically.
- **Idempotency keys**: Use `privy-idempotency-key` header to prevent duplicate wallet creation on retries.
- **External wallet setup**: OAuth providers require URL scheme configuration on mobile. Without it, social login fails silently.
- **Webhook verification**: Always verify webhook signatures before processing. Privy signs payloads; validate the signature.
- **Chain mismatches**: Ensure wallet chain type (ethereum/solana) matches the transaction chain. Mismatches cause silent failures.

## Verification checklist

Before submitting work with Privy:

- [ ] App ID and App Secret are correctly configured in environment variables
- [ ] PrivyProvider wraps the app at the root level (React)
- [ ] `ready` state is checked before consuming Privy hooks
- [ ] Wallet creation is tested in both sandbox and production environments
- [ ] Policies are reviewed and attached to wallets if spending limits are needed
- [ ] Transactions are tested with small amounts first
- [ ] Webhook endpoints are registered and receiving events
- [ ] Error handling covers `policy_violation`, `insufficient_funds`, and `request_expired`
- [ ] Authorization signatures are included for endpoints that require them
- [ ] Rate limit handling (exponential backoff) is implemented
- [ ] HTTPS is enforced for production deployments
- [ ] Gas sponsorship credits are monitored if using gas sponsorship
- [ ] User authentication flow is tested end-to-end
- [ ] External wallet connectors are configured if using MetaMask/Phantom

## Resources

**Comprehensive navigation**: https://docs.privy.io/llms.txt

**Critical documentation pages**:
1. [Key Concepts](https://docs.privy.io/basics/key-concepts) — Understand authentication, wallets, and controls
2. [API Reference Introduction](https://docs.privy.io/api-reference/introduction) — REST API setup and rate limits
3. [React SDK Setup](https://docs.privy.io/basics/react/setup) — Client-side integration guide

---

> For additional documentation and navigation, see: https://docs.privy.io/llms.txt