import { ABI } from "@1inch/aqua-sdk";
import { decodeErrorResult } from "viem";

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

export const aquaAbi = ABI.AQUA_ABI;

export const multiplierGuardErrorAbi = [
  {
    type: "error",
    name: "CurrentMultiplierIsNotInRange",
    inputs: [
      { name: "taker", type: "address" },
      { name: "token", type: "address" },
      { name: "currentMultiplier", type: "uint256" },
      { name: "minMultiplier", type: "uint256" },
      { name: "maxMultiplier", type: "uint256" },
    ],
  },
] as const;

export type MultiplierGuardFailure = {
  token: ContractAddress;
  currentMultiplier: bigint;
  minMultiplier: bigint;
  maxMultiplier: bigint;
};

function decodedGuardFailure(value: unknown): MultiplierGuardFailure | null {
  if (!value || typeof value !== "object") return null;
  if (
    "errorName" in value &&
    value.errorName === "CurrentMultiplierIsNotInRange" &&
    "args" in value &&
    Array.isArray(value.args)
  ) {
    const [, token, currentMultiplier, minMultiplier, maxMultiplier] = value.args;
    if (
      typeof token === "string" &&
      typeof currentMultiplier === "bigint" &&
      typeof minMultiplier === "bigint" &&
      typeof maxMultiplier === "bigint"
    ) {
      return {
        token: token as ContractAddress,
        currentMultiplier,
        minMultiplier,
        maxMultiplier,
      };
    }
  }
  return null;
}

/** Extract only the fork's multiplier circuit-breaker error from a viem error chain. */
export function decodeMultiplierGuardFailure(error: unknown): MultiplierGuardFailure | null {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const direct = decodedGuardFailure(current);
    if (direct) return direct;

    if ("data" in current) {
      const data = current.data;
      const decoded = decodedGuardFailure(data);
      if (decoded) return decoded;
      if (typeof data === "string" && /^0x[0-9a-f]+$/i.test(data)) {
        try {
          const result = decodeErrorResult({ abi: multiplierGuardErrorAbi, data: data as `0x${string}` });
          const failure = decodedGuardFailure(result);
          if (failure) return failure;
        } catch {
          // This revert belongs to another contract error; keep walking causes.
        }
      }
    }
    current = "cause" in current ? current.cause : null;
  }

  return null;
}

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
