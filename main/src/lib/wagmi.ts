import { createConfig, http } from "wagmi";
import { abstractTestnet } from "viem/chains";
import { abstractWalletConnector } from "@abstract-foundation/agw-react/connectors";

export const config = createConfig({
  connectors: [abstractWalletConnector()],
  chains: [abstractTestnet],
  transports: {
    [abstractTestnet.id]: http(),
  },
  ssr: true,
});
