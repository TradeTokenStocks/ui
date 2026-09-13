# Contract deployment handoff

The UI is wired so the contract handoff is a manifest update, not a feature rewrite. Until that manifest is complete, mobile and web stay on their existing sandbox behavior.

## What the contract teammate sends

- Robinhood testnet chain ID, RPC URL, explorer URL, and deployment block.
- Aqua protocol address and the forked Aqua Swap-VM router address.
- The exact Swap-VM fork commit deployed. The UI currently expects `a7f38df16b148e95d69725197836acc2459c603a` or a reviewed successor.
- For every Dinari/xStock pair: address, decimals, underlying ticker, issuer, and which multiplier getter it exposes: `multiplier()` or `uiMultiplier()`.
- For demo mocks: the mint method (`mintTo`, `mint`, `faucetAmount`, `faucet`, or none) and multiplier update method (`setMultiplier`, `setUiMultiplier`, or none).
- Confirmation that the deployed stock-multiplier guard calls the configured getter for each token. Declaring an interface alone is insufficient if the guard still executes `multiplier()` against a token that only implements `uiMultiplier()`.

## Plug-in sequence

1. Replace the pending object in `packages/domain/src/deployment.ts` with a `status: 'live'` manifest.
2. Set the tested PeggedSwap `linearWidth`. The current LST-like demo default is `20n * 10n ** 27n`.
3. Run `bun run deployment:check`. This verifies the RPC chain ID, bytecode at every address, and the configured multiplier getter on every stock token.
4. Run `bun run check`, then test Add stock → Create strategy → Review → Hold to sign on the mobile emulator.

## Example live manifest

```ts
export const hackathonDeployment: HackathonDeployment = {
  status: "live",
  chainId: 46_630,
  chainName: "Robinhood Chain Testnet",
  rpcUrl: "https://rpc.testnet.chain.robinhood.com",
  explorerUrl: "https://explorer.testnet.chain.robinhood.com",
  deploymentBlock: 0n,
  swapVmCommit: "DEPLOYED_COMMIT",
  contracts: {
    aqua: "0xAQUA",
    aquaSwapVmRouter: "0xROUTER",
  },
  strategy: { linearWidth: 20n * 10n ** 27n },
  stocks: [
    {
      id: "dinari-nvda",
      underlying: "NVDA",
      issuer: "dinari",
      name: "NVIDIA Dinari",
      symbol: "dNVDA",
      address: "0xTOKEN_A",
      decimals: 18,
      multiplierRead: "multiplier",
      mintFunction: "mintTo",
      multiplierWrite: "setMultiplier",
    },
    {
      id: "xstock-nvda",
      underlying: "NVDA",
      issuer: "xstock",
      name: "NVIDIA xStock",
      symbol: "xNVDA",
      address: "0xTOKEN_B",
      decimals: 18,
      multiplierRead: "uiMultiplier",
      mintFunction: "none",
      multiplierWrite: "none",
    },
  ],
};
```

Replace every placeholder; do not mark the manifest live with zero or guessed addresses.

## Demo path after deployment

Add stock splits the requested USD allocation equally across the two issuer representations. Configured mock mint methods are called; official non-mintable tokens are balance-checked. Creating a position then reads both live multipliers, calculates raw reserves without floating-point transaction math, verifies balances and allowances, approves Aqua only when needed, builds a fee-bearing PeggedSwap order with a guard on both tokens, and ships it to Aqua.

The strategy is saved only after the ship transaction confirms, then appears immediately at the top of the mobile Strategies tab. Changing a mock token multiplier beyond its configured guard should make subsequent swaps revert, demonstrating stale-price/arbitrage protection.
