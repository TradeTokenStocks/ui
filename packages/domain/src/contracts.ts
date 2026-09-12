import type {
  ContractAddress,
  DeployedStockToken,
  MultiplierWriteFunction,
} from "./deployment";

export const stockTokenAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "multiplier",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "uiMultiplier",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "mintTo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "faucetAmount",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "faucet",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "setMultiplier",
    stateMutability: "nonpayable",
    inputs: [{ name: "nextMultiplier", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setUiMultiplier",
    stateMutability: "nonpayable",
    inputs: [{ name: "nextMultiplier", type: "uint256" }],
    outputs: [],
  },
] as const;

export type ContractFunctionCall = {
  address: ContractAddress;
  functionName:
    | "mintTo"
    | "mint"
    | "faucetAmount"
    | "faucet"
    | "setMultiplier"
    | "setUiMultiplier";
  args: readonly unknown[];
};

export function stockMintCall(
  stock: DeployedStockToken,
  recipient: ContractAddress,
  amount: bigint,
): ContractFunctionCall | null {
  if (amount <= BigInt(0))
    throw new RangeError("Mint amount must be greater than zero");

  switch (stock.mintFunction) {
    case "mintTo":
    case "mint":
      return {
        address: stock.address,
        functionName: stock.mintFunction,
        args: [recipient, amount],
      };
    case "faucetAmount":
      return {
        address: stock.address,
        functionName: stock.mintFunction,
        args: [amount],
      };
    case "faucet":
      return {
        address: stock.address,
        functionName: stock.mintFunction,
        args: [],
      };
    case "none":
      return null;
  }
}

export function multiplierUpdateCall(
  stock: Pick<DeployedStockToken, "address" | "multiplierWrite">,
  nextMultiplier: bigint,
): ContractFunctionCall | null {
  if (nextMultiplier <= BigInt(0))
    throw new RangeError("Multiplier must be greater than zero");
  if (stock.multiplierWrite === "none") return null;

  return {
    address: stock.address,
    functionName: stock.multiplierWrite as Exclude<
      MultiplierWriteFunction,
      "none"
    >,
    args: [nextMultiplier],
  };
}
