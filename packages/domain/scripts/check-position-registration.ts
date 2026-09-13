import {
  createPublicClient,
  createWalletClient,
  decodeFunctionResult,
  defineChain,
  encodeFunctionData,
  http,
  maxUint256,
  parseEther,
  parseUnits,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { aquaAbi, stockTokenAbi, swapVmAbi } from "../src/contracts";
import {
  hackathonInfrastructure,
  type ContractAddress,
} from "../src/deployment";
import {
  buildDockCall,
  buildLiveConcentratedPosition,
  buildQuoteCall,
  buildSwapCall,
} from "../src/live-aqua";

const privateKey = process.env.POSITION_CHECK_PRIVATE_KEY as Hex | undefined;
if (!privateKey) {
  throw new Error(
    "Set POSITION_CHECK_PRIVATE_KEY to a funded test-only key. The script never prints it.",
  );
}

const infrastructure = {
  ...hackathonInfrastructure,
  rpcUrl: process.env.POSITION_CHECK_RPC_URL ?? hackathonInfrastructure.rpcUrl,
};
const configuredWeth = infrastructure.referenceTokens.find(
  (token) => token.symbol === "WETH",
);
const configuredUsdc = infrastructure.referenceTokens.find(
  (token) => token.symbol === "USDC",
);
if (!configuredWeth || !configuredUsdc) {
  throw new Error("WETH and USDC must be configured.");
}
const weth = {
  ...configuredWeth,
  address:
    (process.env.POSITION_CHECK_WETH_ADDRESS as ContractAddress | undefined) ??
    configuredWeth.address,
};
const usdc = {
  ...configuredUsdc,
  address:
    (process.env.POSITION_CHECK_USDC_ADDRESS as ContractAddress | undefined) ??
    configuredUsdc.address,
  decimals: process.env.POSITION_CHECK_USDC_DECIMALS
    ? Number(process.env.POSITION_CHECK_USDC_DECIMALS)
    : configuredUsdc.decimals,
};
if (
  !Number.isInteger(usdc.decimals) ||
  usdc.decimals < 0 ||
  usdc.decimals > 255
) {
  throw new Error(
    "POSITION_CHECK_USDC_DECIMALS must be an integer from 0 to 255.",
  );
}

const chain = defineChain({
  id: infrastructure.chainId,
  name: infrastructure.chainName,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [infrastructure.rpcUrl] } },
  testnet: true,
});
const account = privateKeyToAccount(privateKey);
const publicClient = createPublicClient({
  chain,
  transport: http(infrastructure.rpcUrl),
});
const walletClient = createWalletClient({
  account,
  chain,
  transport: http(infrastructure.rpcUrl),
});
const reserveWeth = parseEther("0.1");
const reserveUsdc = parseUnits("250", usdc.decimals);
const priceScale = 10n ** 18n;
const wethIsTokenA = BigInt(weth.address) < BigInt(usdc.address);
const rawPriceMin = wethIsTokenA ? 1_500n * priceScale : priceScale / 3_500n;
const rawPriceMax = wethIsTokenA ? 3_500n * priceScale : priceScale / 1_500n;

async function wait(hash: Hash) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${hash} reverted.`);
  return hash;
}

for (const [token, amount] of [
  [weth, reserveWeth],
  [usdc, reserveUsdc],
] as const) {
  const balance = await publicClient.readContract({
    address: token.address,
    abi: stockTokenAbi,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (balance < amount) {
    throw new Error(
      `${account.address} needs ${amount} raw ${token.symbol}; balance is ${balance}.`,
    );
  }
  await wait(
    await walletClient.sendTransaction({
      to: token.address,
      data: encodeFunctionData({
        abi: stockTokenAbi,
        functionName: "approve",
        args: [infrastructure.contracts.aqua, maxUint256],
      }),
      value: 0n,
    }),
  );
}

const position = buildLiveConcentratedPosition({
  deployment: infrastructure,
  maker: account.address,
  tokenA: weth,
  tokenB: usdc,
  reserveA: reserveWeth,
  reserveB: reserveUsdc,
  rawPriceMin,
  rawPriceMax,
  salt: BigInt(Date.now()),
});
const shipHash = await wait(
  await walletClient.sendTransaction({
    to: position.ship.to,
    data: position.ship.data,
    value: position.ship.value,
  }),
);

const readRaw = (token: typeof weth) =>
  publicClient.readContract({
    address: infrastructure.contracts.aqua,
    abi: aquaAbi,
    functionName: "rawBalances",
    args: [
      account.address,
      infrastructure.contracts.aquaSwapVmRouter,
      position.strategyHash,
      token.address,
    ],
  });
const [registeredWeth, registeredUsdc] = await Promise.all([
  readRaw(weth),
  readRaw(usdc),
]);
if (
  registeredWeth[0] !== reserveWeth ||
  registeredUsdc[0] !== reserveUsdc ||
  registeredWeth[1] !== 2 ||
  registeredUsdc[1] !== 2
) {
  throw new Error("Aqua raw balances did not match the shipped position.");
}

const quote = buildQuoteCall({
  deployment: infrastructure,
  position,
  tokenIn: usdc.address,
  tokenOut: weth.address,
  amount: parseUnits("10", usdc.decimals),
});
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
    to: usdc.address,
    data: encodeFunctionData({
      abi: stockTokenAbi,
      functionName: "approve",
      args: [infrastructure.contracts.aquaSwapVmRouter, maxUint256],
    }),
    value: 0n,
  }),
);
const swap = buildSwapCall({
  deployment: infrastructure,
  position,
  tokenIn: usdc.address,
  tokenOut: weth.address,
  amount: parseUnits("10", usdc.decimals),
});
const swapHash = await wait(
  await walletClient.sendTransaction({
    to: swap.to,
    data: swap.data,
    value: swap.value,
  }),
);
const [tradedWeth, tradedUsdc] = await Promise.all([
  readRaw(weth),
  readRaw(usdc),
]);
if (
  tradedWeth[0] !== registeredWeth[0] - amountOut ||
  tradedUsdc[0] !== registeredUsdc[0] + amountIn
) {
  throw new Error(
    "Aqua raw balances did not move by the quoted trade amounts.",
  );
}

console.log(`✓ Shipped WETH/USDC position: ${shipHash}`);
console.log(
  `✓ Pair: ${weth.address} / ${usdc.address} (${usdc.decimals} decimals)`,
);
console.log(`✓ Strategy registered: ${position.strategyHash}`);
console.log(
  `✓ Aqua raw balances: ${registeredWeth[0]} WETH / ${registeredUsdc[0]} USDC`,
);
console.log(`✓ Quote: ${amountIn} raw USDC -> ${amountOut} raw WETH`);
console.log(`✓ Traded at the quote and updated Aqua balances: ${swapHash}`);
console.log(
  `✓ Post-trade balances: ${tradedWeth[0]} WETH / ${tradedUsdc[0]} USDC`,
);

if (process.env.POSITION_CHECK_KEEP !== "1") {
  const dock = buildDockCall({
    deployment: infrastructure,
    strategyHash: position.strategyHash,
    tokens: [weth.address, usdc.address],
  });
  const dockHash = await wait(
    await walletClient.sendTransaction({
      to: dock.to,
      data: dock.data,
      value: dock.value,
    }),
  );
  const [dockedWeth, dockedUsdc] = await Promise.all([
    readRaw(weth),
    readRaw(usdc),
  ]);
  if (dockedWeth[0] !== 0n || dockedUsdc[0] !== 0n) {
    throw new Error("Aqua balances remained after docking.");
  }
  console.log(`✓ Docked and cleared position: ${dockHash}`);
}
