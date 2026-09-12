import { describe, expect, test } from "bun:test";
import { AquaProgramBuilder } from "@1inch/swap-vm-sdk";

import type { DeployedStockToken, LiveHackathonDeployment } from "./deployment";
import { stockMintCall } from "./contracts";
import {
  buildLivePeggedPosition,
  buildQuoteCall,
  buildSwapCall,
  decodeLiveOrder,
  multiplierBounds,
  parseDecimalUnits,
  usdAllocationToTokenUnits,
} from "./live-aqua";

const tokenA: DeployedStockToken = {
  id: "dinari-nvda",
  underlying: "NVDA",
  issuer: "Dinari",
  name: "Dinari Nvidia",
  symbol: "dNVDA",
  address: "0x1000000000000000000000000000000000000001",
  decimals: 18,
  multiplierRead: "multiplier",
  mintFunction: "mintTo",
  multiplierWrite: "setMultiplier",
};

const tokenB: DeployedStockToken = {
  ...tokenA,
  id: "xstock-nvda",
  issuer: "xStock",
  name: "xStock Nvidia",
  symbol: "xNVDA",
  address: "0x2000000000000000000000000000000000000002",
};

const deployment: LiveHackathonDeployment = {
  status: "live",
  chainId: 46_630,
  chainName: "Robinhood Chain Testnet",
  rpcUrl: "https://rpc.testnet.chain.robinhood.com",
  explorerUrl: "https://explorer.testnet.chain.robinhood.com",
  deploymentBlock: 1n,
  swapVmCommit: "a7f38df16b148e95d69725197836acc2459c603a",
  contracts: {
    aqua: "0x3000000000000000000000000000000000000003",
    aquaSwapVmRouter: "0x4000000000000000000000000000000000000004",
  },
  strategy: { linearWidth: 20n * 10n ** 27n },
  stocks: [tokenA, tokenB],
};

describe("live Aqua integration", () => {
  test("parses decimal amounts without floating-point conversion", () => {
    expect(parseDecimalUnits("12.3456", 6)).toBe(12_345_600n);
    expect(() => parseDecimalUnits("1.0000001", 6)).toThrow();
  });

  test("converts economic USD allocation using the stock multiplier", () => {
    const raw = usdAllocationToTokenUnits({
      amountUsd: "356.80",
      priceUsdE6: 178_400_000n,
      multiplierE18: 1n * 10n ** 18n,
      tokenDecimals: 18,
    });
    expect(raw).toBe(2n * 10n ** 18n);
  });

  test("encodes symmetric multiplier bounds", () => {
    expect(multiplierBounds(10n ** 18n, 500)).toEqual({
      min: 950_000_000_000_000_000n,
      max: 1_050_000_000_000_000_000n,
    });
  });

  test("maps each configured faucet shape without guessing an ABI", () => {
    expect(stockMintCall(tokenA, tokenB.address, 12n)).toEqual({
      address: tokenA.address,
      functionName: "mintTo",
      args: [tokenB.address, 12n],
    });
    expect(
      stockMintCall({ ...tokenA, mintFunction: "none" }, tokenB.address, 12n),
    ).toBeNull();
  });

  test("builds a decodable guarded, fee-bearing pegged order and Aqua ship call", () => {
    const position = buildLivePeggedPosition({
      deployment,
      maker: "0x5000000000000000000000000000000000000005",
      tokenA,
      tokenB,
      reserveA: 2n * 10n ** 18n,
      reserveB: 2n * 10n ** 18n,
      multiplierA: 10n ** 18n,
      multiplierB: 10n ** 18n,
      guardToleranceBps: 500,
      feeBps: 30,
      salt: 42n,
    });

    const decoded = AquaProgramBuilder.decode(position.order.program);
    expect(decoded.build().toString()).toBe(position.program);
    expect(position.program.startsWith("0x24")).toBeTrue();
    expect(position.encodedOrder.length).toBeGreaterThan(
      position.program.length,
    );
    expect(position.strategyHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(position.ship.to).toBe(deployment.contracts.aqua);
    expect(position.ship.data.startsWith("0x")).toBeTrue();
    expect(position.ship.value).toBe(0n);
    expect(decodeLiveOrder(position.encodedOrder).encode().toString()).toBe(
      position.encodedOrder,
    );
    const swap = buildSwapCall({
      deployment,
      position,
      tokenIn: tokenA.address,
      tokenOut: tokenB.address,
      amount: 1n,
    });
    const quote = buildQuoteCall({
      deployment,
      position,
      tokenIn: tokenA.address,
      tokenOut: tokenB.address,
      amount: 1n,
    });
    expect(swap.to).toBe(deployment.contracts.aquaSwapVmRouter);
    expect(quote.to).toBe(deployment.contracts.aquaSwapVmRouter);
    expect(swap.data).not.toBe(quote.data);
  });
});
