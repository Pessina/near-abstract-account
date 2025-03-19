"use client";

import { useState, useMemo, ReactNode, useEffect } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";

import "@solana/wallet-adapter-react-ui/styles.css";

import { createContext, useContext } from "react";

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: true,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const DEVNET_ENDPOINT =
  "https://devnet.helius-rpc.com/?api-key=" +
  process.env.NEXT_PUBLIC_HELIUS_API_KEY;

function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const initialDarkMode = savedTheme ? savedTheme === "dark" : true;
    setIsDarkMode(initialDarkMode);

    if (initialDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      if (newMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      return newMode;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const wallets = useMemo(
    () => [new SolflareWalletAdapter({ network: WalletAdapterNetwork.Devnet })],
    []
  );

  const connectionConfig = useMemo(
    () => ({
      commitment: "confirmed" as const,
      confirmTransactionInitialTimeout: 60000,
      disableRetryOnRateLimit: false,
      wsEndpoint:
        "wss://devnet.helius-rpc.com/?api-key=" +
        process.env.NEXT_PUBLIC_HELIUS_API_KEY,
      httpHeaders: {
        "X-API-Client": "solana-web-app",
        "Content-Type": "application/json",
      },
    }),
    []
  );

  return (
    <ThemeProvider>
      <ConnectionProvider endpoint={DEVNET_ENDPOINT} config={connectionConfig}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Header />
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ThemeProvider>
  );
}

function Header() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className="absolute top-4 right-4 z-10 flex items-center">
      <div className="px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg border border-gray-300 dark:border-gray-700 mr-4">
        Devnet
      </div>

      <button
        onClick={toggleTheme}
        className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg mr-4 text-gray-800 dark:text-gray-200"
        aria-label="Toggle theme"
      >
        {isDarkMode ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
      </button>

      <WalletMultiButton />
    </div>
  );
}
