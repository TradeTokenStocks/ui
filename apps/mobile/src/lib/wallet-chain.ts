import type {
  PrivyEmbeddedWalletProvider,
  useEmbeddedEthereumWallet,
} from "@privy-io/expo";
import type {
  HackathonDeployment,
  LiveHackathonDeployment,
  LiveSigner,
} from "@tradetoken/domain";
import { createWalletClient, custom, defineChain, type Address } from "viem";

export async function switchOrAddDeploymentChain(
  provider: PrivyEmbeddedWalletProvider,
  deployment: Pick<
    HackathonDeployment,
    "chainId" | "chainName" | "rpcUrl" | "explorerUrl"
  >,
) {
  const chainId = `0x${deployment.chainId.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? Number(error.code)
        : null;
    if (code !== 4902) throw error;

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: deployment.chainName,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [deployment.rpcUrl],
          blockExplorerUrls: [deployment.explorerUrl],
        },
      ],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  }
}

type EmbeddedWallet = ReturnType<
  typeof useEmbeddedEthereumWallet
>["wallets"][number];

/** Switch the embedded wallet to the deployment chain and bind a signer. */
export async function connectLiveSigner(
  wallet: EmbeddedWallet | undefined,
  deployment: LiveHackathonDeployment,
): Promise<LiveSigner> {
  if (!wallet)
    throw new Error("Sign in and create your embedded wallet first.");
  const account = wallet.address as Address;
  const provider = await wallet.getProvider();
  await switchOrAddDeploymentChain(provider, deployment);
  const walletClient = createWalletClient({
    account,
    chain: defineChain({
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
    }),
    transport: custom(provider),
  });
  return {
    account,
    send: (transaction) => walletClient.sendTransaction(transaction),
  };
}
