import React from "react";
import { ConnectKitButton } from "connectkit";

export function SignInButton() {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, hide, address, ensName, chain }) => {
        return (
          <button
            onClick={show}
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] hover:text-white hover:cursor-pointer dark:hover:bg-[#e0e0e0] dark:hover:text-black text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 font-[family-name:var(--font-roobert)]"
          >
            {isConnecting ? (
              <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                {isConnected ? "Connected" : "Connect Wallet"}
              </>
            )}
          </button>
        );
      }}
    </ConnectKitButton.Custom>
  );
}
