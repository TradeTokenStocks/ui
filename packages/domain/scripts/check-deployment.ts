import { createPublicClient, defineChain, http, zeroAddress } from "viem";

import { hackathonDeployment } from "../src/deployment";
import { aquaAbi, stockTokenAbi, swapVmAbi } from "../src/contracts";

const deployment = hackathonDeployment;
const infrastructureOnly = process.argv.includes("--infrastructure-only");
const chain = defineChain({
  id: deployment.chainId,
  name: deployment.chainName,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [deployment.rpcUrl] } },
  blockExplorers: {
    default: {
      name: `${deployment.chainName} explorer`,
      url: deployment.explorerUrl,
    },
  },
  testnet: true,
});
const client = createPublicClient({
  chain,
  transport: http(deployment.rpcUrl),
});

const deployedChainId = await client.getChainId();
if (deployedChainId !== deployment.chainId) {
  throw new Error(
    `RPC returned chain ${deployedChainId}; expected ${deployment.chainId}.`,
  );
}

const contracts = [
  ["Aqua", deployment.contracts.aqua],
  ["Aqua Swap-VM router", deployment.contracts.aquaSwapVmRouter],
  ...deployment.referenceTokens.map(
    (token) => [token.symbol, token.address] as const,
  ),
  ...(deployment.status === "live"
    ? deployment.stocks.map(
        (stock) => [`${stock.issuer} ${stock.symbol}`, stock.address] as const,
      )
    : []),
] as const;

for (const [label, address] of contracts) {
  const bytecode = await client.getCode({ address });
  if (!bytecode || bytecode === "0x")
    throw new Error(`${label} has no bytecode at ${address}.`);
  console.log(`✓ ${label}: ${address}`);
}

const configuredAqua = await client.readContract({
  address: deployment.contracts.aquaSwapVmRouter,
  abi: swapVmAbi,
  functionName: "AQUA",
});
if (configuredAqua.toLowerCase() !== deployment.contracts.aqua.toLowerCase()) {
  throw new Error(
    `SwapVM points to Aqua ${configuredAqua}, not ${deployment.contracts.aqua}.`,
  );
}
console.log(`✓ SwapVM.AQUA(): ${configuredAqua}`);

const [referenceToken] = deployment.referenceTokens;
if (!referenceToken)
  throw new Error("At least one reference token is required.");
await client.readContract({
  address: deployment.contracts.aqua,
  abi: aquaAbi,
  functionName: "rawBalances",
  args: [
    zeroAddress,
    deployment.contracts.aquaSwapVmRouter,
    `0x${"00".repeat(32)}`,
    referenceToken.address,
  ],
});
console.log("✓ Aqua.rawBalances(): ABI compatible");

for (const token of deployment.referenceTokens) {
  const [symbol, decimals] = await Promise.all([
    client.readContract({
      address: token.address,
      abi: stockTokenAbi,
      functionName: "symbol",
    }),
    client.readContract({
      address: token.address,
      abi: stockTokenAbi,
      functionName: "decimals",
    }),
  ]);
  if (symbol !== token.symbol || decimals !== token.decimals) {
    throw new Error(
      `${token.symbol} metadata mismatch: received ${symbol}/${decimals} decimals.`,
    );
  }
  console.log(`✓ ${token.symbol} metadata: ${symbol}/${decimals} decimals`);
}

if (deployment.status !== "live") {
  console.error(
    `Protocol infrastructure passed; deployment is pending: ${deployment.reason}`,
  );
  if (infrastructureOnly) process.exit(0);
  process.exit(1);
}

for (const stock of deployment.stocks) {
  const multiplier = await client.readContract({
    address: stock.address,
    abi: stockTokenAbi,
    functionName: stock.multiplierRead,
  });
  if (multiplier <= 0n)
    throw new Error(`${stock.symbol}.${stock.multiplierRead}() returned zero.`);
  console.log(`✓ ${stock.symbol}.${stock.multiplierRead}(): ${multiplier}`);
}

console.log(`Deployment smoke check passed on chain ${deployment.chainId}.`);
