import {
  Address as AquaAddress,
  AquaProtocolContract,
  HexString as AquaHexString,
} from "@1inch/aqua-sdk";
import {
  Address,
  AquaProgramBuilder,
  HexString,
  MakerTraits,
  Order,
  SwapVMContract,
  TakerTraits,
  instructions,
} from "@1inch/swap-vm-sdk";

import type {
  ContractAddress,
  DeployedStockToken,
  LiveHackathonDeployment,
} from "./deployment";

export type EncodedCall = {
  to: ContractAddress;
  data: `0x${string}`;
  value: bigint;
};

export type LivePeggedPositionInput = {
  deployment: LiveHackathonDeployment;
  maker: ContractAddress;
  tokenA: DeployedStockToken;
  tokenB: DeployedStockToken;
  reserveA: bigint;
  reserveB: bigint;
  multiplierA: bigint;
  multiplierB: bigint;
  guardToleranceBps: number;
  feeBps: number;
  salt: bigint;
  /** PeggedSwap coefficient scaled by 1e27; defaults to the deployment profile. */
  linearWidth?: bigint;
};

export type LivePeggedPosition = {
  order: Order;
  encodedOrder: `0x${string}`;
  strategyHash: `0x${string}`;
  program: `0x${string}`;
  ship: EncodedCall;
  guards: readonly [EncodedMultiplierBounds, EncodedMultiplierBounds];
};

export type EncodedMultiplierBounds = {
  min: bigint;
  max: bigint;
};

const ZERO = BigInt(0);
const TEN = BigInt(10);
const BPS = BigInt(10_000);
const USD_SCALE = BigInt(1_000_000);

function checkedBps(
  value: number,
  name: string,
  maximumExclusive: number,
): bigint {
  if (!Number.isInteger(value) || value < 0 || value >= maximumExclusive) {
    throw new RangeError(
      `${name} must be an integer from 0 to ${maximumExclusive - 1}`,
    );
  }
  return BigInt(value);
}

export function multiplierBounds(
  multiplierE18: bigint,
  toleranceBps: number,
): EncodedMultiplierBounds {
  if (multiplierE18 <= ZERO)
    throw new RangeError("multiplierE18 must be greater than zero");
  const tolerance = checkedBps(toleranceBps, "guardToleranceBps", 10_000);
  return {
    min: (multiplierE18 * (BPS - tolerance)) / BPS,
    max: (multiplierE18 * (BPS + tolerance)) / BPS,
  };
}

/** Parse a human decimal without crossing a floating-point transaction boundary. */
export function parseDecimalUnits(value: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new RangeError("decimals must be an integer from 0 to 255");
  }
  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized))
    throw new Error(`Invalid decimal amount: ${value}`);
  const [whole = "0", fraction = ""] = normalized.split(".");
  if (fraction.length > decimals)
    throw new Error(`Amount has more than ${decimals} decimal places`);
  return (
    BigInt(whole) * TEN ** BigInt(decimals) +
    BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0")
  );
}

/**
 * Convert USD allocation into raw token units.
 * `priceUsdE6` is the underlying share price and multiplier is shares/token.
 */
export function usdAllocationToTokenUnits({
  amountUsd,
  priceUsdE6,
  multiplierE18,
  tokenDecimals,
}: {
  amountUsd: string;
  priceUsdE6: bigint;
  multiplierE18: bigint;
  tokenDecimals: number;
}): bigint {
  if (priceUsdE6 <= ZERO || multiplierE18 <= ZERO)
    throw new RangeError("price and multiplier must be positive");
  const amountUsdE6 = parseDecimalUnits(amountUsd, 6);
  return (
    (amountUsdE6 * TEN ** BigInt(tokenDecimals) * TEN ** BigInt(18)) /
    (priceUsdE6 * multiplierE18)
  );
}

function asCall(call: {
  to: string;
  data: string;
  value: bigint;
}): EncodedCall {
  return {
    to: call.to as ContractAddress,
    data: call.data as `0x${string}`,
    value: call.value,
  };
}

export function buildLivePeggedPosition({
  deployment,
  maker,
  tokenA,
  tokenB,
  reserveA,
  reserveB,
  multiplierA,
  multiplierB,
  guardToleranceBps,
  feeBps,
  salt,
  linearWidth = deployment.strategy.linearWidth,
}: LivePeggedPositionInput): LivePeggedPosition {
  if (tokenA.underlying !== tokenB.underlying)
    throw new Error("Pegged positions require the same underlying stock");
  if (tokenA.address === tokenB.address)
    throw new Error("Pegged positions require two distinct token contracts");
  if (reserveA <= ZERO || reserveB <= ZERO)
    throw new RangeError("Both reserves must be greater than zero");
  checkedBps(feeBps, "feeBps", 10_000);

  const addressA = new Address(tokenA.address);
  const addressB = new Address(tokenB.address);
  const guardA = multiplierBounds(multiplierA, guardToleranceBps);
  const guardB = multiplierBounds(multiplierB, guardToleranceBps);
  const curve = instructions.peggedSwap.PeggedSwapArgs.fromTokens(
    { address: addressA, decimals: tokenA.decimals, reserve: reserveA },
    { address: addressB, decimals: tokenB.decimals, reserve: reserveB },
    linearWidth,
  );

  const builder = new AquaProgramBuilder()
    .checkStockMultiplierRange({
      token: addressA,
      minMultiplier: guardA.min,
      maxMultiplier: guardA.max,
    })
    .checkStockMultiplierRange({
      token: addressB,
      minMultiplier: guardB.min,
      maxMultiplier: guardB.max,
    });

  if (feeBps > 0)
    builder.flatFeeAmountInXD(instructions.fee.FlatFeeArgs.fromBps(feeBps));

  const program = builder
    .peggedSwapGrowPriceRange2D(curve)
    .salt({ salt })
    .build();
  const order = Order.new({
    maker: new Address(maker),
    traits: MakerTraits.default(),
    program,
  });
  const encodedOrder = order.encode();
  // Aqua SDK 0.3.4 and Swap-VM SDK 0.4.4 currently pin adjacent sdk-core
  // versions. Recreate the value-domain objects at this package boundary so
  // their private fields never cross between the two SDK copies.
  const aquaOrder = new AquaHexString(encodedOrder.toString());
  const aqua = new AquaProtocolContract(
    new AquaAddress(deployment.contracts.aqua),
  );
  const ship = aqua.ship({
    app: new AquaAddress(deployment.contracts.aquaSwapVmRouter),
    strategy: aquaOrder,
    amountsAndTokens: [
      { token: new AquaAddress(tokenA.address), amount: reserveA },
      { token: new AquaAddress(tokenB.address), amount: reserveB },
    ],
  });

  return {
    order,
    encodedOrder: encodedOrder.toString(),
    strategyHash:
      AquaProtocolContract.calculateStrategyHash(aquaOrder).toString(),
    program: program.toString(),
    ship: asCall(ship),
    guards: [guardA, guardB],
  };
}

export function buildSwapCall({
  deployment,
  position,
  tokenIn,
  tokenOut,
  amount,
}: {
  deployment: LiveHackathonDeployment;
  position: Pick<LivePeggedPosition, "order">;
  tokenIn: ContractAddress;
  tokenOut: ContractAddress;
  amount: bigint;
}): EncodedCall {
  const router = new SwapVMContract(
    new Address(deployment.contracts.aquaSwapVmRouter),
  );
  return asCall(
    router.swap({
      order: position.order,
      tokenIn: new Address(tokenIn),
      tokenOut: new Address(tokenOut),
      amount,
      takerTraits: TakerTraits.default(),
    }),
  );
}

export function decodeLiveOrder(encodedOrder: `0x${string}`): Order {
  return Order.decode(new HexString(encodedOrder));
}

export function buildQuoteCall({
  deployment,
  position,
  tokenIn,
  tokenOut,
  amount,
}: {
  deployment: LiveHackathonDeployment;
  position: Pick<LivePeggedPosition, "order">;
  tokenIn: ContractAddress;
  tokenOut: ContractAddress;
  amount: bigint;
}): EncodedCall {
  const router = new SwapVMContract(
    new Address(deployment.contracts.aquaSwapVmRouter),
  );
  return asCall(
    router.quote({
      order: position.order,
      tokenIn: new Address(tokenIn),
      tokenOut: new Address(tokenOut),
      amount,
      takerTraits: TakerTraits.default(),
    }),
  );
}

export const contractUnits = {
  bps: BPS,
  multiplier: TEN ** BigInt(18),
  peggedLinearWidth: TEN ** BigInt(27),
  usd: USD_SCALE,
} as const;
