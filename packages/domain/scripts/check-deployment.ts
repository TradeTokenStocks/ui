import { createPublicClient, defineChain, http } from "viem";

import { hackathonDeployment } from "../src/deployment";
import { stockTokenAbi } from "../src/contracts";

if (hackathonDeployment.status !== "live") {
  console.error(`Deployment is pending: ${hackathonDeployment.reason}`);
  console.error(
    "Paste the verified contract manifest into packages/domain/src/deployment.ts, then rerun this check.",
  );
  process.exit(1);
}

const deployment = hackathonDeployment;
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
  ...deployment.stocks.map(
    (stock) => [`${stock.issuer} ${stock.symbol}`, stock.address] as const,
  ),
] as const;

for (const [label, address] of contracts) {
  const bytecode = await client.getCode({ address });
  if (!bytecode || bytecode === "0x")
    throw new Error(`${label} has no bytecode at ${address}.`);
  console.log(`✓ ${label}: ${address}`);
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
