import React from "react";
import { ConnectKitButton } from "connectkit";

export function SignInButton() {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, address}) => {
        return (
          <button
            onClick={show}
            className="w-full py-4 px-2 flex items-center justify-center gap-2.5 transition-colors hover:opacity-80 cursor-pointer font-[family-name:var(--font-martian-mono)] text-sm font-light leading-[150%] tracking-[0%] text-center"
            style={{
              backgroundColor: 'rgba(0, 255, 251, 1)',
              color: 'rgba(1, 27, 35, 1)'
            }}
          >
            {isConnecting ? (
              <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <>
                {isConnected ? (
                  <>
                    CONNECTED
                    <span className="text-xs opacity-70">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </>
                ) : (
                  "CONNECT WALLET"
                )}
              </>
            )}
          </button>
        );
      }}
    </ConnectKitButton.Custom>
  );
}
