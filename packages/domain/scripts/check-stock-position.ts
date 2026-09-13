import {
  createPublicClient,
  createWalletClient,
  decodeFunctionResult,
  defineChain,
  encodeFunctionData,
  http,
  maxUint256,
  parseEther,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  aquaAbi,
  decodeMultiplierGuardFailure,
  stockTokenAbi,
  swapVmAbi,
} from "../src/contracts";
import {
  deployedStock,
  hackathonDeployment,
  requireLiveDeployment,
} from "../src/deployment";
import {
  buildDockCall,
  buildLivePeggedPosition,
  buildQuoteCall,
  buildSwapCall,
} from "../src/live-aqua";

const privateKey = process.env.STOCK_POSITION_CHECK_PRIVATE_KEY as Hex | undefined;
if (!privateKey) {
  throw new Error(
    "Set STOCK_POSITION_CHECK_PRIVATE_KEY to a funded test-only key. The script never prints it.",
  );
}

const deployment = requireLiveDeployment(hackathonDeployment);
const ticker = (process.env.STOCK_POSITION_CHECK_TICKER ?? "NVDA").toUpperCase();
const tokenA = deployedStock(deployment, `xstock-${ticker.toLowerCase()}`);
const tokenB = deployedStock(deployment, `ondo-${ticker.toLowerCase()}`);
const account = privateKeyToAccount(privateKey);
const chain = defineChain({
  id: deployment.chainId,
  name: deployment.chainName,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [deployment.rpcUrl] } },
  testnet: true,
});
const publicClient = createPublicClient({ chain, transport: http(deployment.rpcUrl) });
const walletClient = createWalletClient({
  account,
  chain,
  transport: http(deployment.rpcUrl),
});
const reserveA = parseEther("0.5");
const reserveB = parseEther("0.5");
const tradeAmount = parseEther("0.05");
const one = parseEther("1");

async function wait(hash: Hash) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${hash} reverted.`);
  return hash;
}

const readMultiplier = (token: typeof tokenA) =>
  publicClient.readContract({
    address: token.address,
    abi: stockTokenAbi,
    functionName: token.multiplierRead,
  });
const readBalance = (token: typeof tokenA) =>
  publicClient.readContract({
    address: token.address,
    abi: stockTokenAbi,
    functionName: "balanceOf",
    args: [account.address],
  });
const readRaw = (strategyHash: Hex, token: typeof tokenA) =>
  publicClient.readContract({
    address: deployment.contracts.aqua,
    abi: aquaAbi,
    functionName: "rawBalances",
    args: [
      account.address,
      deployment.contracts.aquaSwapVmRouter,
      strategyHash,
      token.address,
    ],
  });

const [liveMultiplierA, liveMultiplierB, balanceA, balanceB] = await Promise.all([
  readMultiplier(tokenA),
  readMultiplier(tokenB),
  readBalance(tokenA),
  readBalance(tokenB),
]);
if (balanceA < reserveA + tradeAmount || balanceB < reserveB) {
  throw new Error(
    `${account.address} needs at least 0.55 ${tokenA.symbol} and 0.5 ${tokenB.symbol}.`,
  );
}

for (const token of [tokenA, tokenB]) {
  await wait(
    await walletClient.sendTransaction({
      to: token.address,
      data: encodeFunctionData({
        abi: stockTokenAbi,
        functionName: "approve",
        args: [deployment.contracts.aqua, maxUint256],
      }),
      value: 0n,
    }),
  );
}

// A zero live multiplier cannot define a valid guard. Sign around 1x solely to
// prove the deployed guard rejects the uninitialized token, then dock cleanly.
const initialized = liveMultiplierA > 0n && liveMultiplierB > 0n;
const position = buildLivePeggedPosition({
  deployment,
  maker: account.address,
  tokenA,
  tokenB,
  reserveA,
  reserveB,
  multiplierA: initialized ? liveMultiplierA : one,
  multiplierB: initialized ? liveMultiplierB : one,
  guardToleranceBps: 500,
  feeBps: 30,
  salt: BigInt(Date.now()),
});
const shipHash = await wait(
  await walletClient.sendTransaction({
    to: position.ship.to,
    data: position.ship.data,
    value: position.ship.value,
  }),
);
const [registeredA, registeredB] = await Promise.all([
  readRaw(position.strategyHash, tokenA),
  readRaw(position.strategyHash, tokenB),
]);
if (registeredA[0] !== reserveA || registeredB[0] !== reserveB) {
  throw new Error("Aqua raw balances did not match the shipped stock position.");
}

const quote = buildQuoteCall({
  deployment,
  position,
  tokenIn: tokenA.address,
  tokenOut: tokenB.address,
  amount: tradeAmount,
});

let swapHash: Hash | undefined;
try {
  const quoteResult = await publicClient.call({
    account: account.address,
    to: quote.to,
    data: quote.data,
  });
  if (!quoteResult.data) throw new Error("SwapVM quote returned no data.");
  const [amountIn, amountOut] = decodeFunctionResult({
    abi: swapVmAbi,
    functionName: "quote",
    data: quoteResult.data,
  });
  await wait(
    await walletClient.sendTransaction({
      to: tokenA.address,
      data: encodeFunctionData({
        abi: stockTokenAbi,
        functionName: "approve",
        args: [deployment.contracts.aquaSwapVmRouter, maxUint256],
      }),
      value: 0n,
    }),
  );
  const swap = buildSwapCall({
    deployment,
    position,
    tokenIn: tokenA.address,
    tokenOut: tokenB.address,
    amount: tradeAmount,
  });
  swapHash = await wait(
    await walletClient.sendTransaction({
      to: swap.to,
      data: swap.data,
      value: swap.value,
    }),
  );
  const [tradedA, tradedB] = await Promise.all([
    readRaw(position.strategyHash, tokenA),
    readRaw(position.strategyHash, tokenB),
  ]);
  if (
    tradedA[0] !== registeredA[0] + amountIn ||
    tradedB[0] !== registeredB[0] - amountOut
  ) {
    throw new Error("Aqua raw balances did not move by the quoted stock trade.");
  }
  console.log(`✓ Filled ${amountIn} raw ${tokenA.symbol} -> ${amountOut} raw ${tokenB.symbol}`);
} catch (error) {
  const failure = decodeMultiplierGuardFailure(error);
  if (!failure || initialized) throw error;
  console.log(
    `✓ Guard protected the uninitialized pair: current ${failure.currentMultiplier}, allowed ${failure.minMultiplier}-${failure.maxMultiplier}`,
  );
}

const dock = buildDockCall({
  deployment,
  strategyHash: position.strategyHash,
  tokens: [tokenA.address, tokenB.address],
});
const dockHash = await wait(
  await walletClient.sendTransaction({ to: dock.to, data: dock.data, value: dock.value }),
);
console.log(`✓ Registered ${tokenA.symbol}/${tokenB.symbol}: ${shipHash}`);
if (swapHash) console.log(`✓ Swap: ${swapHash}`);
console.log(`✓ Docked test position: ${dockHash}`);
