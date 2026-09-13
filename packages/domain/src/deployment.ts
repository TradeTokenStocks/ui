export type ContractAddress = `0x${string}`;

export type MultiplierReadFunction = "multiplier" | "uiMultiplier";
export type MintFunction =
  | "mintTo"
  | "mint"
  | "faucetAmount"
  | "faucet"
  | "none";
export type MultiplierWriteFunction =
  | "setMultiplier"
  | "setUiMultiplier"
  | "updateMultiplier"
  | "none";

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

export type DeployedReferenceToken = {
  symbol: "WETH" | "USDC";
  address: ContractAddress;
  decimals: number;
};

export type HackathonInfrastructure = {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  contracts: {
    aqua: ContractAddress;
    aquaSwapVmRouter: ContractAddress;
  };
  referenceTokens: readonly DeployedReferenceToken[];
};

export type LiveHackathonDeployment = HackathonInfrastructure & {
  status: "live";
  deploymentBlock: bigint;
  swapVmCommit: string;
  strategy: {
    /** PeggedSwap linear coefficient, scaled by 1e27. */
    linearWidth: bigint;
  };
  stocks: readonly DeployedStockToken[];
};

export type PendingHackathonDeployment = HackathonInfrastructure & {
  status: "pending";
  expectedSwapVmCommit?: string;
  reason: string;
};

export type HackathonDeployment =
  | LiveHackathonDeployment
  | PendingHackathonDeployment;

/**
 * The only file that needs contract addresses when the team deploys.
 *
 * Keep this pending object valid until every address and ABI behavior has been
 * smoke-tested. Switching `status` to `live` enables the mobile contract path;
 * feature screens must not carry their own addresses.
 */
export const hackathonInfrastructure: HackathonInfrastructure = {
  chainId: 11_155_111,
  chainName: "Ethereum Sepolia",
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  explorerUrl: "https://sepolia.etherscan.io",
  contracts: {
    aqua: "0x4857835f6BCC99c059535edb71956F596D4057aa",
    aquaSwapVmRouter: "0x4614468C5B9C924d0732FADa9f97010778B0E5FA",
  },
  referenceTokens: [
    {
      symbol: "WETH",
      address: "0x7b79995e5f793a07bc00c21412e50ecae098e7f9",
      decimals: 18,
    },
    {
      symbol: "USDC",
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      decimals: 6,
    },
  ],
};

export const hackathonDeployment: HackathonDeployment = {
  ...hackathonInfrastructure,
  status: "live",
  deploymentBlock: BigInt(11_694_875),
  swapVmCommit: "a7f38df16b148e95d69725197836acc2459c603a",
  strategy: { linearWidth: BigInt(20) * BigInt(10) ** BigInt(27) },
  stocks: [
    {
      id: "xstock-nvda",
      underlying: "NVDA",
      issuer: "xStock",
      name: "NVIDIA xStock",
      symbol: "NVDAx",
      address: "0x3a4fCeF090332aFcf648b4A3aE448DF942eA122F",
      decimals: 18,
      multiplierRead: "multiplier",
      mintFunction: "mint",
      multiplierWrite: "updateMultiplier",
    },
    {
      id: "ondo-nvda",
      underlying: "NVDA",
      issuer: "Ondo",
      name: "NVIDIA (Ondo Tokenized)",
      symbol: "NVDAon",
      address: "0x9811d8A34E6A5aB3d58A7B2f6715B202a35397ee",
      decimals: 18,
      multiplierRead: "multiplier",
      mintFunction: "mint",
      multiplierWrite: "updateMultiplier",
    },
    {
      id: "xstock-aapl",
      underlying: "AAPL",
      issuer: "xStock",
      name: "Apple xStock",
      symbol: "AAPLx",
      address: "0xDCE0231bb5F5CA2AD0557cDba042D627Aaa56384",
      decimals: 18,
      multiplierRead: "multiplier",
      mintFunction: "mint",
      multiplierWrite: "updateMultiplier",
    },
    {
      id: "ondo-aapl",
      underlying: "AAPL",
      issuer: "Ondo",
      name: "Apple (Ondo Tokenized)",
      symbol: "AAPLon",
      address: "0x1cA92bE359377F1FC4754557e0E013dad593826C",
      decimals: 18,
      multiplierRead: "multiplier",
      mintFunction: "mint",
      multiplierWrite: "updateMultiplier",
    },
  ],
};

export function requireLiveDeployment(
  deployment: HackathonDeployment = hackathonDeployment,
): LiveHackathonDeployment {
  if (deployment.status !== "live") {
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
  deployment: Pick<HackathonDeployment, "explorerUrl">,
  transactionHash: string,
): string {
  return `${deployment.explorerUrl.replace(/\/$/, "")}/tx/${transactionHash}`;
}
