import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { supportedChains } from "./chains";

export const wagmiConfig = createConfig({
    chains: supportedChains,
    transports: {
        [supportedChains[0].id]: http(),
        [supportedChains[1].id]: http(),
        [supportedChains[2].id]: http(),
    }
});