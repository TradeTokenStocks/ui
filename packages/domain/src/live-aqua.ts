import {
  Address as AquaAddress,
  AquaProtocolContract,
  HexString as AquaHexString,
} from "@1inch/aqua-sdk";
import {
  Address,
  AquaProgramBuilder,
  AquaXYCAmmStrategy,
  MakerTraits,
  SwapVmProgram,
  TakerTraits,
  instructions,
} from "@1inch/swap-vm-sdk";
import {
  concatHex,
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  sliceHex,
  type Hex,
} from "viem";

import { swapVmAbi } from "./contracts";
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
  order: DeployedSwapVmOrder;
  encodedOrder: `0x${string}`;
  strategyHash: `0x${string}`;
  program: `0x${string}`;
  ship: EncodedCall;
  guards: readonly [EncodedMultiplierBounds, EncodedMultiplierBounds];
};

export type LiveConcentratedPositionInput = {
  deployment: Pick<LiveHackathonDeployment, "contracts">;
  maker: ContractAddress;
  tokenA: Pick<DeployedStockToken, "address" | "decimals">;
  tokenB: Pick<DeployedStockToken, "address" | "decimals">;
  reserveA: bigint;
  reserveB: bigint;
  /** Raw P = token with greater address / token with lower address, scaled 1e18. */
  rawPriceMin: bigint;
  rawPriceMax: bigint;
  /** Optional uniqueness for repeatable test/demo positions. */
  salt?: bigint;
};

export type LiveConcentratedPosition = {
  order: DeployedSwapVmOrder;
  encodedOrder: `0x${string}`;
  strategyHash: `0x${string}`;
  program: `0x${string}`;
  ship: EncodedCall;
};

export type EncodedMultiplierBounds = {
  min: bigint;
  max: bigint;
};

const ZERO = BigInt(0);
const TEN = BigInt(10);
const BPS = BigInt(10_000);
const USD_SCALE = BigInt(1_000_000);
const TOKEN_PAIR_BYTES = 40;
const ORDER_DATA_OFFSET_SHIFT = BigInt(160);
const TAKER_DIRECTION_FLAG = BigInt(0x80);

const deployedSwapVmOrderAbi = {
  type: "tuple",
  components: [
    { name: "maker", type: "address" },
    { name: "traits", type: "uint256" },
    { name: "data", type: "bytes" },
  ],
} as const;

type BuiltDeployedSwapVmOrder = {
  maker: ContractAddress;
  traits: bigint;
  data: Hex;
};

/** Order shape used by the TradeTokenStocks fork deployed on Sepolia. */
export type DeployedSwapVmOrder = {
  maker: ContractAddress;
  traits: bigint;
  tokenA: ContractAddress;
  tokenB: ContractAddress;
  program: SwapVmProgram;
  build(): BuiltDeployedSwapVmOrder;
  encode(): AquaHexString;
};

function orderedPair(
  first: ContractAddress,
  second: ContractAddress,
): readonly [ContractAddress, ContractAddress] {
  if (first.toLowerCase() === second.toLowerCase()) {
    throw new Error("SwapVM orders require two distinct tokens");
  }
  return BigInt(first) < BigInt(second) ? [first, second] : [second, first];
}

function createDeployedSwapVmOrder({
  maker,
  tokenA,
  tokenB,
  program,
  traits,
}: {
  maker: ContractAddress;
  tokenA: ContractAddress;
  tokenB: ContractAddress;
  program: SwapVmProgram;
  traits?: bigint;
}): DeployedSwapVmOrder {
  const [lowerToken, higherToken] = orderedPair(tokenA, tokenB);
  // The fork prepends tokenA/tokenB to Order.data. With no hooks, all four
  // hook boundaries point at byte 40, where the VM program begins.
  const dataOffsets =
    (BigInt(40) |
      (BigInt(40) << BigInt(16)) |
      (BigInt(40) << BigInt(32)) |
      (BigInt(40) << BigInt(48))) <<
    ORDER_DATA_OFFSET_SHIFT;
  const encodedTraits =
    traits ??
    MakerTraits.default().encode(new Address(maker)).traits | dataOffsets;
  const built: BuiltDeployedSwapVmOrder = {
    maker,
    traits: encodedTraits,
    data: concatHex([lowerToken, higherToken, program.toString() as Hex]),
  };

  return {
    maker,
    traits: encodedTraits,
    tokenA: lowerToken,
    tokenB: higherToken,
    program,
    build: () => built,
    encode: () =>
      new AquaHexString(encodeAbiParameters([deployedSwapVmOrderAbi], [built])),
  };
}

function forkTakerTraits(
  order: DeployedSwapVmOrder,
  tokenIn: ContractAddress,
  tokenOut: ContractAddress,
): Hex {
  const input = tokenIn.toLowerCase();
  const output = tokenOut.toLowerCase();
  const isAToB = input === order.tokenA.toLowerCase();
  const validPair = isAToB
    ? output === order.tokenB.toLowerCase()
    : input === order.tokenB.toLowerCase() &&
      output === order.tokenA.toLowerCase();
  if (!validPair) throw new Error("Swap tokens do not match the position pair");

  const encoded = TakerTraits.default().encode().toString() as Hex;
  // The fork added isAToB at bit 7 of the 22-byte taker-traits header. Keep
  // the SDK's remaining flags and slices intact while setting the direction.
  const headerEnd = 2 + 22 * 2;
  const header = BigInt(`0x${encoded.slice(2, headerEnd)}`);
  const directedHeader = (header | (isAToB ? TAKER_DIRECTION_FLAG : ZERO))
    .toString(16)
    .padStart(44, "0");
  return `0x${directedHeader}${encoded.slice(headerEnd)}`;
}

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

/** Convert raw token units back to USD with six decimal places of precision. */
export function tokenUnitsToUsdE6({
  tokenUnits,
  priceUsdE6,
  multiplierE18,
  tokenDecimals,
}: {
  tokenUnits: bigint;
  priceUsdE6: bigint;
  multiplierE18: bigint;
  tokenDecimals: number;
}): bigint {
  if (tokenUnits < ZERO) throw new RangeError("tokenUnits cannot be negative");
  if (priceUsdE6 <= ZERO || multiplierE18 <= ZERO)
    throw new RangeError("price and multiplier must be positive");
  return (
    (tokenUnits * priceUsdE6 * multiplierE18) /
    (TEN ** BigInt(tokenDecimals) * TEN ** BigInt(18))
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
  const order = createDeployedSwapVmOrder({
    maker,
    tokenA: tokenA.address,
    tokenB: tokenB.address,
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

/** Build a standard concentrated XYC strategy for volatile pairs such as WETH/USDC. */
export function buildLiveConcentratedPosition({
  deployment,
  maker,
  tokenA,
  tokenB,
  reserveA,
  reserveB,
  rawPriceMin,
  rawPriceMax,
  salt,
}: LiveConcentratedPositionInput): LiveConcentratedPosition {
  if (tokenA.address === tokenB.address)
    throw new Error("Concentrated positions require two distinct tokens");
  if (reserveA <= ZERO || reserveB <= ZERO)
    throw new RangeError("Both reserves must be greater than zero");
  if (rawPriceMin <= ZERO || rawPriceMax <= rawPriceMin)
    throw new RangeError("Raw price bounds must be positive and increasing");

  const strategy = AquaXYCAmmStrategy.newConcentrate({
    rawPriceMin,
    rawPriceMax,
  });
  if (salt !== undefined) strategy.withSalt(salt);
  const program = strategy.build();
  const order = createDeployedSwapVmOrder({
    maker,
    tokenA: tokenA.address,
    tokenB: tokenB.address,
    program,
  });
  const encodedOrder = order.encode();
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
  };
}

export function buildSwapCall({
  deployment,
  position,
  tokenIn,
  tokenOut,
  amount,
}: {
  deployment: Pick<LiveHackathonDeployment, "contracts">;
  position: Pick<LivePeggedPosition, "order">;
  tokenIn: ContractAddress;
  tokenOut: ContractAddress;
  amount: bigint;
}): EncodedCall {
  if (amount <= ZERO) throw new RangeError("Swap amount must be positive");
  return {
    to: deployment.contracts.aquaSwapVmRouter,
    data: encodeFunctionData({
      abi: swapVmAbi,
      functionName: "swap",
      args: [
        position.order.build(),
        amount,
        forkTakerTraits(position.order, tokenIn, tokenOut),
      ],
    }),
    value: ZERO,
  };
}

export function decodeLiveOrder(
  encodedOrder: `0x${string}`,
): DeployedSwapVmOrder {
  const [built] = decodeAbiParameters([deployedSwapVmOrderAbi], encodedOrder);
  const programOffset = Number((built.traits >> BigInt(208)) & BigInt(0xffff));
  if (
    programOffset < TOKEN_PAIR_BYTES ||
    built.data.length < 2 + 2 * programOffset
  ) {
    throw new Error("Invalid deployed SwapVM order data");
  }
  return createDeployedSwapVmOrder({
    maker: built.maker,
    tokenA: sliceHex(built.data, 0, 20),
    tokenB: sliceHex(built.data, 20, 40),
    program: new SwapVmProgram(sliceHex(built.data, programOffset)),
    traits: built.traits,
  });
}

export function buildDockCall({
  deployment,
  strategyHash,
  tokens,
}: {
  deployment: Pick<LiveHackathonDeployment, "contracts">;
  strategyHash: `0x${string}`;
  tokens: readonly ContractAddress[];
}): EncodedCall {
  if (tokens.length === 0) throw new Error("Dock requires at least one token");
  const aqua = new AquaProtocolContract(
    new AquaAddress(deployment.contracts.aqua),
  );
  return asCall(
    aqua.dock({
      app: new AquaAddress(deployment.contracts.aquaSwapVmRouter),
      strategyHash: new AquaHexString(strategyHash),
      tokens: tokens.map((token) => new AquaAddress(token)),
    }),
  );
}

export function buildQuoteCall({
  deployment,
  position,
  tokenIn,
  tokenOut,
  amount,
}: {
  deployment: Pick<LiveHackathonDeployment, "contracts">;
  position: Pick<LivePeggedPosition, "order">;
  tokenIn: ContractAddress;
  tokenOut: ContractAddress;
  amount: bigint;
}): EncodedCall {
  if (amount <= ZERO) throw new RangeError("Quote amount must be positive");
  return {
    to: deployment.contracts.aquaSwapVmRouter,
    data: encodeFunctionData({
      abi: swapVmAbi,
      functionName: "quote",
      args: [
        position.order.build(),
        amount,
        forkTakerTraits(position.order, tokenIn, tokenOut),
      ],
    }),
    value: ZERO,
  };
}

export const contractUnits = {
  bps: BPS,
  multiplier: TEN ** BigInt(18),
  peggedLinearWidth: TEN ** BigInt(27),
  usd: USD_SCALE,
} as const;
