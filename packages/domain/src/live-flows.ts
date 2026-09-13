import {
  createPublicClient,
  defineChain,
  encodeFunctionData,
  http,
  maxUint256,
  type Hash,
  type PublicClient,
} from "viem";

import {
  aquaAbi,
  decodeMultiplierGuardFailure,
  multiplierUpdateCall,
  stockMintCall,
  stockTokenAbi,
  type ContractFunctionCall,
  type MultiplierGuardFailure,
} from "./contracts";
import {
  deployedStock,
  type ContractAddress,
  type DeployedStockToken,
  type LiveHackathonDeployment,
} from "./deployment";
import {
  buildDockCall,
  buildLivePeggedPosition,
  buildQuoteCall,
  buildSwapCall,
  contractUnits,
  decodeLiveOrder,
  multiplierBounds,
  parseDecimalUnits,
  tokenUnitsToUsdE6,
  usdAllocationToTokenUnits,
  type EncodedCall,
} from "./live-aqua";

/**
 * Client-agnostic contract flows shared by web and mobile.
 *
 * Each app only supplies the connected account and a `send` function bound to
 * its wallet (Privy on mobile, wagmi on web), after switching to the
 * deployment chain. Reads go straight to the deployment RPC.
 */
export type LiveSigner = {
  account: ContractAddress;
  send: (transaction: EncodedCall) => Promise<Hash>;
};

export type LiveStrategyRecord = {
  id: string;
  ticker: string;
  maker: ContractAddress;
  chainId: number;
  strategyHash: `0x${string}`;
  shipTransactionHash: `0x${string}`;
  encodedOrder: `0x${string}`;
  tokenA: LiveStrategyToken;
  tokenB: LiveStrategyToken;
  allocationUsd: number;
  feeBps: number;
  guardToleranceBps: number;
  createdAt: string;
  status?: "open" | "closed";
  dockTransactionHash?: `0x${string}`;
  closedAt?: string;
};

export type LiveStrategyToken = {
  address: ContractAddress;
  symbol: string;
  decimals: number;
  reserve: string;
  multiplier: string;
};

export type LivePositionState = {
  /** Aqua virtual balances reserved for this strategy. */
  strategy: { a: bigint; b: bigint };
  /** Maker ERC-20 wallet balances. */
  wallet: { a: bigint; b: bigint };
  multipliers: { a: bigint; b: bigint };
};

export type WalletStockHolding = {
  id: string;
  symbol: string;
  underlying: string;
  units: bigint;
  valueUsd: number;
};

const ZERO = BigInt(0);

function livePublicClient(deployment: LiveHackathonDeployment): PublicClient {
  return createPublicClient({
    chain: defineChain({
      id: deployment.chainId,
      name: deployment.chainName,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [deployment.rpcUrl] } },
    }),
    transport: http(deployment.rpcUrl),
  });
}

/** Human-readable message from a viem or wallet error. */
export function transactionErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "shortMessage" in error &&
    typeof error.shortMessage === "string"
  )
    return error.shortMessage;
  return error instanceof Error ? error.message : fallback;
}

/** Wait for a receipt and fail loudly when the transaction reverted onchain. */
export async function waitForSuccess(client: PublicClient, hash: Hash) {
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success")
    throw new Error(`Transaction ${hash.slice(0, 10)}… reverted onchain.`);
  return receipt;
}

function encodeStockCall(call: ContractFunctionCall): EncodedCall {
  return {
    to: call.address,
    data: encodeFunctionData({
      abi: stockTokenAbi,
      functionName: call.functionName,
      args: call.args as never,
    }),
    value: ZERO,
  };
}

function approveCall(
  token: ContractAddress,
  spender: ContractAddress,
): EncodedCall {
  return {
    to: token,
    data: encodeFunctionData({
      abi: stockTokenAbi,
      functionName: "approve",
      args: [spender, maxUint256],
    }),
    value: ZERO,
  };
}

function readMultiplier(
  client: PublicClient,
  token: Pick<DeployedStockToken, "address" | "multiplierRead">,
) {
  return client.readContract({
    address: token.address,
    abi: stockTokenAbi,
    functionName: token.multiplierRead,
  });
}

function readBalance(
  client: PublicClient,
  token: ContractAddress,
  owner: ContractAddress,
) {
  return client.readContract({
    address: token,
    abi: stockTokenAbi,
    functionName: "balanceOf",
    args: [owner],
  });
}

/**
 * Resolve a record token against the manifest by address so records never
 * depend on ids that may be renamed between deployments.
 */
function manifestToken(
  deployment: LiveHackathonDeployment,
  token: LiveStrategyToken,
) {
  return deployment.stocks.find(
    (stock) => stock.address.toLowerCase() === token.address.toLowerCase(),
  );
}

function requireMaker(record: LiveStrategyRecord, signer: LiveSigner) {
  if (signer.account.toLowerCase() !== record.maker.toLowerCase())
    throw new Error("Connect the wallet that opened this strategy.");
}

export type MintStockPairStage = "reading" | "mint-a" | "mint-b" | "confirming";

/** Mint both representations of one stock, half the USD amount each. */
export async function mintStockPair({
  deployment,
  signer,
  tokenAId,
  tokenBId,
  amountUsd,
  priceUsd,
  onStage,
}: {
  deployment: LiveHackathonDeployment;
  signer: LiveSigner;
  tokenAId: string;
  tokenBId: string;
  amountUsd: string;
  priceUsd: number;
  onStage: (stage: MintStockPairStage) => void;
}) {
  const client = livePublicClient(deployment);
  const tokenA = deployedStock(deployment, tokenAId);
  const tokenB = deployedStock(deployment, tokenBId);

  onStage("reading");
  const [multiplierA, multiplierB] = await Promise.all([
    readMultiplier(client, tokenA),
    readMultiplier(client, tokenB),
  ]);
  const halfUsd = (Number(amountUsd) / 2).toFixed(6);
  const priceUsdE6 = parseDecimalUnits(priceUsd.toFixed(6), 6);
  const amountA = usdAllocationToTokenUnits({
    amountUsd: halfUsd,
    priceUsdE6,
    multiplierE18: multiplierA,
    tokenDecimals: tokenA.decimals,
  });
  const amountB = usdAllocationToTokenUnits({
    amountUsd: halfUsd,
    priceUsdE6,
    multiplierE18: multiplierB,
    tokenDecimals: tokenB.decimals,
  });

  const mintA = stockMintCall(tokenA, signer.account, amountA);
  const mintB = stockMintCall(tokenB, signer.account, amountB);
  if (mintA) {
    onStage("mint-a");
    await waitForSuccess(client, await signer.send(encodeStockCall(mintA)));
  }
  if (mintB) {
    onStage("mint-b");
    await waitForSuccess(client, await signer.send(encodeStockCall(mintB)));
  }

  onStage("confirming");
  const [balanceA, balanceB] = await Promise.all([
    readBalance(client, tokenA.address, signer.account),
    readBalance(client, tokenB.address, signer.account),
  ]);
  if (balanceA < amountA || balanceB < amountB) {
    throw new Error(
      `The wallet still needs ${balanceA < amountA ? tokenA.symbol : tokenB.symbol}. Use its official faucet, then retry.`,
    );
  }
  return { balanceA, balanceB };
}

export type OpenPeggedPositionInput = {
  ticker: string;
  tokenAId: string;
  tokenBId: string;
  amountAUsd: string;
  amountBUsd: string;
  priceUsd: number;
  feeBps: number;
  guardToleranceBps: number;
  curve: "straight" | "curved";
};

export type OpenPeggedPositionStage =
  | "balances"
  | "approve-a"
  | "approve-b"
  | "ship"
  | "confirming";

/** Approve Aqua for both legs as needed, then ship the guarded pegged order. */
export async function openPeggedPosition({
  deployment,
  signer,
  input,
  onStage,
}: {
  deployment: LiveHackathonDeployment;
  signer: LiveSigner;
  input: OpenPeggedPositionInput;
  onStage: (stage: OpenPeggedPositionStage) => void;
}): Promise<LiveStrategyRecord> {
  const client = livePublicClient(deployment);
  const maker = signer.account;
  const tokenA = deployedStock(deployment, input.tokenAId);
  const tokenB = deployedStock(deployment, input.tokenBId);

  onStage("balances");
  const [multiplierA, multiplierB, balanceA, balanceB, allowanceA, allowanceB] =
    await Promise.all([
      readMultiplier(client, tokenA),
      readMultiplier(client, tokenB),
      readBalance(client, tokenA.address, maker),
      readBalance(client, tokenB.address, maker),
      client.readContract({
        address: tokenA.address,
        abi: stockTokenAbi,
        functionName: "allowance",
        args: [maker, deployment.contracts.aqua],
      }),
      client.readContract({
        address: tokenB.address,
        abi: stockTokenAbi,
        functionName: "allowance",
        args: [maker, deployment.contracts.aqua],
      }),
    ]);
  const priceUsdE6 = parseDecimalUnits(input.priceUsd.toFixed(6), 6);
  const reserveA = usdAllocationToTokenUnits({
    amountUsd: input.amountAUsd,
    priceUsdE6,
    multiplierE18: multiplierA,
    tokenDecimals: tokenA.decimals,
  });
  const reserveB = usdAllocationToTokenUnits({
    amountUsd: input.amountBUsd,
    priceUsdE6,
    multiplierE18: multiplierB,
    tokenDecimals: tokenB.decimals,
  });

  if (balanceA < reserveA || balanceB < reserveB) {
    throw new Error(
      `Insufficient ${balanceA < reserveA ? tokenA.symbol : tokenB.symbol} balance. Add the stock pair first.`,
    );
  }

  if (allowanceA < reserveA) {
    onStage("approve-a");
    await waitForSuccess(
      client,
      await signer.send(approveCall(tokenA.address, deployment.contracts.aqua)),
    );
  }
  if (allowanceB < reserveB) {
    onStage("approve-b");
    await waitForSuccess(
      client,
      await signer.send(approveCall(tokenB.address, deployment.contracts.aqua)),
    );
  }

  const position = buildLivePeggedPosition({
    deployment,
    maker,
    tokenA,
    tokenB,
    reserveA,
    reserveB,
    multiplierA,
    multiplierB,
    guardToleranceBps: input.guardToleranceBps,
    feeBps: input.feeBps,
    salt: BigInt(Date.now()),
    linearWidth:
      input.curve === "straight"
        ? BigInt(100) * contractUnits.peggedLinearWidth
        : deployment.strategy.linearWidth,
  });

  onStage("ship");
  const shipTransactionHash = await signer.send(position.ship);
  onStage("confirming");
  await waitForSuccess(client, shipTransactionHash);

  return {
    id: `${deployment.chainId}:${position.strategyHash}`,
    ticker: input.ticker,
    maker,
    chainId: deployment.chainId,
    strategyHash: position.strategyHash,
    shipTransactionHash,
    encodedOrder: position.encodedOrder,
    tokenA: {
      address: tokenA.address,
      symbol: tokenA.symbol,
      decimals: tokenA.decimals,
      reserve: reserveA.toString(),
      multiplier: multiplierA.toString(),
    },
    tokenB: {
      address: tokenB.address,
      symbol: tokenB.symbol,
      decimals: tokenB.decimals,
      reserve: reserveB.toString(),
      multiplier: multiplierB.toString(),
    },
    allocationUsd: Number(input.amountAUsd) + Number(input.amountBUsd),
    feeBps: input.feeBps,
    guardToleranceBps: input.guardToleranceBps,
    createdAt: new Date().toISOString(),
    status: "open",
  };
}

/** Aqua strategy balances, maker wallet balances, and live multipliers. */
export async function readLivePosition(
  deployment: LiveHackathonDeployment,
  record: LiveStrategyRecord,
): Promise<LivePositionState> {
  const client = livePublicClient(deployment);
  const readRaw = (token: ContractAddress) =>
    client.readContract({
      address: deployment.contracts.aqua,
      abi: aquaAbi,
      functionName: "rawBalances",
      args: [
        record.maker,
        deployment.contracts.aquaSwapVmRouter,
        record.strategyHash,
        token,
      ],
    });
  const multiplierOf = (token: LiveStrategyToken) =>
    readMultiplier(client, {
      address: token.address,
      multiplierRead:
        manifestToken(deployment, token)?.multiplierRead ?? "multiplier",
    });

  const [rawA, rawB, walletA, walletB, multiplierA, multiplierB] =
    await Promise.all([
      readRaw(record.tokenA.address),
      readRaw(record.tokenB.address),
      readBalance(client, record.tokenA.address, record.maker),
      readBalance(client, record.tokenB.address, record.maker),
      multiplierOf(record.tokenA),
      multiplierOf(record.tokenB),
    ]);

  return {
    strategy: { a: rawA[0], b: rawB[0] },
    wallet: { a: walletA, b: walletB },
    multipliers: { a: multiplierA, b: multiplierB },
  };
}

export type LiveTradeStage = "quoting" | "approving" | "swapping" | "confirming";

export type LiveTradeResult =
  | { status: "filled"; hash: Hash }
  | { status: "protected"; symbol: string; failure: MultiplierGuardFailure }
  | { status: "unquoted"; message: string };

/**
 * Quote first so a multiplier-guard rejection never reaches the wallet, then
 * approve the router if needed and swap 5% of the original input leg.
 */
export async function tradeLiveStrategy({
  deployment,
  signer,
  record,
  aToB,
  onStage,
}: {
  deployment: LiveHackathonDeployment;
  signer: LiveSigner;
  record: LiveStrategyRecord;
  aToB: boolean;
  onStage: (stage: LiveTradeStage) => void;
}): Promise<LiveTradeResult> {
  if (record.status === "closed") throw new Error("This strategy is closed.");
  requireMaker(record, signer);
  const client = livePublicClient(deployment);
  const tokenIn = aToB ? record.tokenA : record.tokenB;
  const tokenOut = aToB ? record.tokenB : record.tokenA;
  const amount = BigInt(tokenIn.reserve) / BigInt(20) || BigInt(1);
  const swapInput = {
    deployment,
    position: { order: decodeLiveOrder(record.encodedOrder) },
    tokenIn: tokenIn.address,
    tokenOut: tokenOut.address,
    amount,
  };

  onStage("quoting");
  const quote = buildQuoteCall(swapInput);
  try {
    await client.call({
      account: signer.account,
      to: quote.to,
      data: quote.data,
    });
  } catch (quoteError) {
    const failure = decodeMultiplierGuardFailure(quoteError);
    if (!failure)
      return {
        status: "unquoted",
        message: transactionErrorMessage(quoteError, "Quote failed."),
      };
    const symbol =
      failure.token.toLowerCase() === tokenIn.address.toLowerCase()
        ? tokenIn.symbol
        : tokenOut.symbol;
    return { status: "protected", symbol, failure };
  }

  const allowance = await client.readContract({
    address: tokenIn.address,
    abi: stockTokenAbi,
    functionName: "allowance",
    args: [signer.account, deployment.contracts.aquaSwapVmRouter],
  });
  if (allowance < amount) {
    onStage("approving");
    await waitForSuccess(
      client,
      await signer.send(
        approveCall(tokenIn.address, deployment.contracts.aquaSwapVmRouter),
      ),
    );
  }

  onStage("swapping");
  const hash = await signer.send(buildSwapCall(swapInput));
  onStage("confirming");
  await waitForSuccess(client, hash);
  return { status: "filled", hash };
}

export function canSetDemoMultiplier(
  deployment: LiveHackathonDeployment,
  record: LiveStrategyRecord,
) {
  return (
    (manifestToken(deployment, record.tokenB)?.multiplierWrite ?? "none") !==
    "none"
  );
}

/**
 * Demo a corporate action on token B: push its mock multiplier just outside
 * the signed guard range, or restore the multiplier captured at creation.
 */
export async function setDemoMultiplier({
  deployment,
  signer,
  record,
  mode,
}: {
  deployment: LiveHackathonDeployment;
  signer: LiveSigner;
  record: LiveStrategyRecord;
  mode: "break" | "restore";
}) {
  requireMaker(record, signer);
  const token = manifestToken(deployment, record.tokenB);
  if (!token)
    throw new Error(`${record.tokenB.symbol} is not in the deployment.`);
  const signed = BigInt(record.tokenB.multiplier);
  const next =
    mode === "restore"
      ? signed
      : multiplierBounds(signed, record.guardToleranceBps + 100).max;
  const call = multiplierUpdateCall(token, next);
  if (!call)
    throw new Error(`${token.symbol} does not expose a demo multiplier setter.`);

  const hash = await signer.send(encodeStockCall(call));
  await waitForSuccess(livePublicClient(deployment), hash);
  return hash;
}

/** Withdraw the strategy's Aqua balances for both tokens. */
export async function dockLiveStrategy({
  deployment,
  signer,
  record,
}: {
  deployment: LiveHackathonDeployment;
  signer: LiveSigner;
  record: LiveStrategyRecord;
}) {
  requireMaker(record, signer);
  const hash = await signer.send(
    buildDockCall({
      deployment,
      strategyHash: record.strategyHash,
      tokens: [record.tokenA.address, record.tokenB.address],
    }),
  );
  await waitForSuccess(livePublicClient(deployment), hash);
  return hash;
}

/**
 * Every deployed stock token an account holds, valued at the supplied price
 * times the token's live multiplier. Aqua strategies never escrow, so wallet
 * balances already include liquidity committed to open strategies.
 */
export async function readWalletStockHoldings({
  deployment,
  account,
  priceUsdFor,
}: {
  deployment: LiveHackathonDeployment;
  account: ContractAddress;
  priceUsdFor: (underlying: string) => number | undefined;
}): Promise<WalletStockHolding[]> {
  const client = livePublicClient(deployment);
  return Promise.all(
    deployment.stocks.map(async (stock) => {
      const [units, multiplier] = await Promise.all([
        readBalance(client, stock.address, account),
        readMultiplier(client, stock),
      ]);
      const price = priceUsdFor(stock.underlying);
      const valueUsdE6 =
        price && units > ZERO && multiplier > ZERO
          ? tokenUnitsToUsdE6({
              tokenUnits: units,
              priceUsdE6: parseDecimalUnits(price.toFixed(6), 6),
              multiplierE18: multiplier,
              tokenDecimals: stock.decimals,
            })
          : ZERO;
      return {
        id: stock.id,
        symbol: stock.symbol,
        underlying: stock.underlying,
        units,
        valueUsd: Number(valueUsdE6) / 1e6,
      };
    }),
  );
}
