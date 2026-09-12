export type ContractAddress = `0x${string}`;

export type MultiplierReadFunction = 'multiplier' | 'uiMultiplier';
export type MintFunction = 'mintTo' | 'mint' | 'faucetAmount' | 'faucet' | 'none';
export type MultiplierWriteFunction = 'setMultiplier' | 'setUiMultiplier' | 'none';

export type DeployedStockToken = {
  id: string;
  underlying: string;
  issuer: string;
  name: string;
  symbol: string;
  address: ContractAddress;
  decimals: number;
  multiplierRead: MultiplierReadFunction;
  mintFunction: MintFunction;
  multiplierWrite: MultiplierWriteFunction;
};

export type LiveHackathonDeployment = {
  status: 'live';
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  deploymentBlock: bigint;
  swapVmCommit: string;
  contracts: {
    aqua: ContractAddress;
    aquaSwapVmRouter: ContractAddress;
  };
  strategy: {
    /** PeggedSwap linear coefficient, scaled by 1e27. */
    linearWidth: bigint;
  };
  stocks: readonly DeployedStockToken[];
};

export type PendingHackathonDeployment = {
  status: 'pending';
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  expectedSwapVmCommit?: string;
  reason: string;
};

export type HackathonDeployment = LiveHackathonDeployment | PendingHackathonDeployment;

/**
 * The only file that needs contract addresses when the team deploys.
 *
 * Keep this pending object valid until every address and ABI behavior has been
 * smoke-tested. Switching `status` to `live` enables contract reads and writes
 * in both clients; feature screens must not carry their own addresses.
 */
export const hackathonDeployment: HackathonDeployment = {
  status: 'pending',
  chainId: 46_630,
  chainName: 'Robinhood Chain Testnet',
  rpcUrl: 'https://rpc.testnet.chain.robinhood.com',
  explorerUrl: 'https://explorer.testnet.chain.robinhood.com',
  expectedSwapVmCommit: 'a7f38df16b148e95d69725197836acc2459c603a',
  reason: 'Waiting for the verified Aqua, Swap-VM, and stock-token deployment manifest.',
};

export function requireLiveDeployment(
  deployment: HackathonDeployment = hackathonDeployment,
): LiveHackathonDeployment {
  if (deployment.status !== 'live') {
    throw new Error(deployment.reason);
  }

  return deployment;
}

export function deployedStock(
  deployment: LiveHackathonDeployment,
  stockId: string,
): DeployedStockToken {
  const stock = deployment.stocks.find((candidate) => candidate.id === stockId);
  if (!stock) throw new Error(`No deployed token configured for ${stockId}.`);
  return stock;
}

export function explorerTransactionUrl(
  deployment: Pick<HackathonDeployment, 'explorerUrl'>,
  transactionHash: string,
): string {
  return `${deployment.explorerUrl.replace(/\/$/, '')}/tx/${transactionHash}`;
}
