import { Address, AquaProgramBuilder, instructions } from '@1inch/swap-vm-sdk';

export type GuardedPeggedToken = {
  address: `0x${string}`;
  decimals: number;
  reserve: bigint;
  multiplierE18: bigint;
};

export type GuardedPeggedProgramInput = {
  tokenA: GuardedPeggedToken;
  tokenB: GuardedPeggedToken;
  guardToleranceBps?: number;
  /** Curve coefficient scaled by 1e27. Defaults to 0.8e27. */
  linearWidth?: bigint;
};

export type GuardedPeggedProgram = {
  program: `0x${string}`;
  guards: readonly [EncodedMultiplierBounds, EncodedMultiplierBounds];
};

export type EncodedMultiplierBounds = {
  min: bigint;
  max: bigint;
};

const BPS = BigInt(10_000);
const DEFAULT_LINEAR_WIDTH = BigInt('800000000000000000000000000');

function multiplierBounds(multiplierE18: bigint, toleranceBps: number): EncodedMultiplierBounds {
  if (!Number.isInteger(toleranceBps) || toleranceBps < 0 || toleranceBps >= 10_000) {
    throw new RangeError('guardToleranceBps must be an integer from 0 to 9999');
  }

  const tolerance = BigInt(toleranceBps);
  return {
    min: (multiplierE18 * (BPS - tolerance)) / BPS,
    max: (multiplierE18 * (BPS + tolerance)) / BPS,
  };
}

/**
 * Encodes the forked Aqua program used by the app: guard both tokenized-stock
 * multipliers first, then execute the same-stock pegged curve.
 *
 * Contract addresses and live reserves are deliberately supplied at runtime;
 * the deployment manifest from the contract team remains the source of truth.
 */
export function buildGuardedPeggedProgram({
  tokenA,
  tokenB,
  guardToleranceBps = 500,
  linearWidth = DEFAULT_LINEAR_WIDTH,
}: GuardedPeggedProgramInput): GuardedPeggedProgram {
  const addressA = new Address(tokenA.address);
  const addressB = new Address(tokenB.address);
  const guardA = multiplierBounds(tokenA.multiplierE18, guardToleranceBps);
  const guardB = multiplierBounds(tokenB.multiplierE18, guardToleranceBps);
  const curve = instructions.peggedSwap.PeggedSwapArgs.fromTokens(
    { address: addressA, decimals: tokenA.decimals, reserve: tokenA.reserve },
    { address: addressB, decimals: tokenB.decimals, reserve: tokenB.reserve },
    linearWidth,
  );

  const program = new AquaProgramBuilder()
    .checkStockMultiplierRange({ token: addressA, minMultiplier: guardA.min, maxMultiplier: guardA.max })
    .checkStockMultiplierRange({ token: addressB, minMultiplier: guardB.min, maxMultiplier: guardB.max })
    .peggedSwapGrowPriceRange2D(curve)
    .build()
    .toString() as `0x${string}`;

  return { program, guards: [guardA, guardB] };
}
