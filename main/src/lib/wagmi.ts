import { createConfig, http } from "wagmi";
import { abstract } from "viem/chains";
import { abstractWalletConnector } from "@abstract-foundation/agw-react/connectors";

export const config = createConfig({
  connectors: [abstractWalletConnector()],
  chains: [abstract],
  transports: {
    [abstract.id]: http(),
  },
  ssr: true,
});
