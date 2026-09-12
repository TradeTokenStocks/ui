import type { PrivyEmbeddedWalletProvider } from "@privy-io/expo";
import type { HackathonDeployment } from "@tradetoken/domain";

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
