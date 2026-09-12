import type { Hash, PublicClient } from "viem";

/** Wait for a receipt and fail loudly when the transaction reverted onchain. */
export async function waitForSuccess(
  client: Pick<PublicClient, "waitForTransactionReceipt">,
  hash: Hash,
) {
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success")
    throw new Error(`Transaction ${hash.slice(0, 10)}… reverted onchain.`);
  return receipt;
}
