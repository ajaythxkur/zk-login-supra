import React, { createContext, useState, useEffect, ReactNode, useRef, useContext } from "react";
import { pollSupraPrice, getCatalogTradingPairPrices, type PriceUpdate } from "@/components/API/api";
import { getSupraStarkeyConnect } from "supra-starkey-connect";
import axios from "axios";

// Network Configuration
export const RPC_URL = "https://rpc-testnet.supra.com";
export const POLLING_INTERVAL = 30000; // 30 seconds

// Bridge Configuration
export interface BridgeConfig {
  chains: {
    [key: string]: {
      id: string;
      name: string;
      rpcUrl: string;
      explorer: string;
    };
  };
  minAmount: string;
  fee: number;
  estimatedTime: string;
}

export const BRIDGE_CONFIG = {
  ETH: {
    chains: {
      ethereum: {
        id: '0x1',
        name: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/your-project-id',
        explorer: 'https://etherscan.io'
      },
      supra: {
        id: '0x1',
        name: 'Supra Network',
        rpcUrl: RPC_URL,
        explorer: 'https://suprascan.com'
      }
    },
    minAmount: '0.01',
    fee: 0.001, // 0.1%
    estimatedTime: '15 minutes'
  }
} as const;

// Smart Contract Modules
export const OBLIGATION_MODULE =
  "0x0def22a2edf770d05f912e8543c84d0b57a042ba9f47ea2c7ae4221c8cccc927::obligation::view_obligation";
export const LENDING_MARKET_MODULE =
  "0xe073d6f934185e23038e27fdff87b8829b68232280d8f38e218effaf019c6c6f::lending_market::view_pool_metrics";

// Asset Types
export const HUSDC_TYPE =
  "0x6c4a3aa30f7b1f40e5e5e9c0091b0897775afc8076ebe5d63e2d3dcca48c994f::hyper_coin::HyperUsdcCoin";
export const COIN_TYPES = {
  HUSDC: HUSDC_TYPE,
  SUP: "0x1::supra_coin::SupraCoin",
  ETH: "0x8ede5b689d5ac487c3ee48ceabe28ae061be74071c86ffe523b7f42acda2fcb7::test_eth::TestETH",
  WSUP: "0xc2897d119fb2a69e7e2cec7ec16e65aac5ee9751a8b75150468f7dd3e9ff13e::WSupraCoin::WSupraCoin",
  SUSD: "0x1::sUSD::Supra_USD",
} as const;

// CoinStore Types for Balance Fetching
export const COIN_STORE_TYPES = [
  '0x1::coin::CoinStore<0x1::supra_coin::SupraCoin>',
  '0x1::coin::CoinStore<0x8ede5b689d5ac487c3ee48ceabe28ae061be74071c86ffe523b7f42acda2fcb7::test_eth::TestETH>',
  '0x1::coin::CoinStore<0x1::coin::CoinStore<0xc2897d119fb2a69e7e2cec7ec16e65aac5ee9751a8b75150468f7dd3e9ff13e::WSupraCoin::WSupraCoin>',
  '0x1::coin::CoinStore<0x8ede5b689d5ac487c3ee48ceabe28ae061be74071c86ffe523b7f42acda2fcb7::test_usdt::TestUSDT>'
];

// Asset Logos
export const ASSET_LOGOS: Record<string, string> = {
  SUP: "https://supra.com/images/brand/SupraOracles-Red-Light-Symbol.svg",
  WSUP: "/WsupLogoBig.svg",
  ETH: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
  HUSDC: "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg",
  SUSD: "/sUSD.svg",
  DEFAULT: "https://cryptologos.cc/logos/generic-coin-logo.svg",
};

// Types
export interface WalletBalance {
  asset: string;
  amount: number;
  usdPrice: number;
  totalValue: number;
  borrowed: number;
}

export interface AssetData {
  name: string;
  price: string;
  // Add other asset properties as needed
}

export const getAssetLogo = (assetName: string): string => {
  const key = assetName.toUpperCase();
  return ASSET_LOGOS[key] || ASSET_LOGOS.DEFAULT;
};

export const formatCurrency = (value: number, compact = true): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...(compact && {
      notation: "compact",
      compactDisplay: "short",
    }),
  }).format(value);
};

// Constant for truncating SUP price decimals in the UI
export const PRICE_TRUNCATION_DECIMALS = 4;

// API Data Context Provider
export interface ApiDataContextType {
  priceUpdate: PriceUpdate | null;
  priceDirection: "up" | "down" | null;
  walletAccount: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  isConnecting: boolean;
  poolMetrics: Record<string, PoolMetrics>;
  fetchPoolMetrics: () => Promise<void>;
}

export const ApiDataContext = createContext<ApiDataContextType>({
  priceUpdate: null,
  priceDirection: null,
  walletAccount: null,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  isConnecting: false,
  poolMetrics: {},
  fetchPoolMetrics: async () => {},
});

interface ApiDataProviderProps {
  children: ReactNode;
}

export const ApiDataProvider = ({ children }: ApiDataProviderProps) => {
  const [priceUpdate, setPriceUpdate] = useState<PriceUpdate | null>(null);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | null>(null);
  const priceHistoryRef = useRef<PriceUpdate[]>([]);

  // Wallet connection states
  const [walletAccount, setWalletAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const sscRef = useRef<any>(null); // Replace 'any' with the correct type if available

  // Pool metrics state
  const [poolMetrics, setPoolMetrics] = useState<Record<string, PoolMetrics>>({});

  // Wallet connection functions
  const connectWallet = async () => {
    const ssc = getSupraStarkeyConnect();
    if (!ssc || (typeof ssc.isStarKeyAvailable === "function" && !ssc.isStarKeyAvailable())) {
      console.error("StarKey wallet not available.");
      return;
    }
    sscRef.current = ssc;
    setIsConnecting(true);
    try {
      console.log("Attempting to connect to Supra wallet...");
      await ssc.init();
      const acc = await ssc.connect();
      console.log("Connected successfully:", acc);
      setWalletAccount(acc);
      localStorage.setItem("walletAccount", acc);
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      localStorage.removeItem("walletAccount");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (sscRef.current && typeof sscRef.current.disconnect === "function") {
      await sscRef.current.disconnect();
    }
    setWalletAccount(null);
    localStorage.removeItem("walletAccount");
  };

  useEffect(() => {
    if (walletAccount) {
      console.log("Current wallet address:", walletAccount);
    }
  }, [walletAccount]);

  useEffect(() => {
    let isMounted = true;

    // Immediately fetch the latest price
    async function fetchInitialPrice() {
      try {
        const now = new Date();
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const input = {
          instrumentTypeId: "1",
          instrumentId: "1009",
          doraType: "2",
          instrumentPairDisplayName: "SUPRA/USDT",
          createdAtStart: oneMonthAgo.toISOString(),
          createdAtEnd: now.toISOString(),
          interval: 7200,
          providerId: "20",
          forceUpdate: false,
        };
        const response = await getCatalogTradingPairPrices(input);
        if (response.catalogTradingPairPricesGraph.length > 0 && isMounted) {
          const latestPrice = response.catalogTradingPairPricesGraph[0];
          setPriceUpdate({
            timestamp: latestPrice.timestamp,
            average: latestPrice.average,
            median: latestPrice.median,
            high: latestPrice.high,
            low: latestPrice.low,
            catalogInfo: {
              pair: "SUPRA/USDT",
              index: "1009",
              provider: "Supra Premium",
            },
          });
        }
      } catch (error) {
        console.error("Initial price fetch failed:", error);
      }
    }

    fetchInitialPrice();

    let stopPolling: () => void;
    pollSupraPrice((update: PriceUpdate) => {
      setPriceUpdate(update);

      const now = new Date();
      priceHistoryRef.current.push(update);
      priceHistoryRef.current = priceHistoryRef.current.filter(
        (pu) => now.getTime() - new Date(pu.timestamp).getTime() <= 300000
      );

      if (priceHistoryRef.current.length > 0) {
        const oldest = priceHistoryRef.current[0];
        const latest = update;
        const latestPrice = Number(latest.average);
        const oldestPrice = Number(oldest.average);
        if (latestPrice > oldestPrice) {
          setPriceDirection("up");
        } else if (latestPrice < oldestPrice) {
          setPriceDirection("down");
        } else {
          setPriceDirection(null);
        }
      }
    })
      .then((stop) => {
        stopPolling = stop;
      })
      .catch((error) => {
        console.error("Error polling price:", error);
      });

    return () => {
      isMounted = false;
      if (stopPolling) stopPolling();
    };
  }, []);

  // Add this function to fetch pool metrics
  const fetchPoolMetrics = async () => {
    try {
      const metricsPromises = Object.entries(COIN_TYPES).map(async ([coinName, coinType]) => {
        try {
          const response = await axios.post(`${RPC_URL}/rpc/v1/view`, {
            function: LENDING_MARKET_MODULE,
            type_arguments: [coinType],
            arguments: []
          });

          if (response.data?.result) {
            const [deposits, borrows, ltv, bw] = response.data.result;
            const decimals = coinName === 'HUSDC' ? 6 : 8;
            
            return {
              coinName,
              metrics: {
                deposits: Number(deposits) / Math.pow(10, decimals),
                borrows: Number(borrows) / Math.pow(10, decimals),
                ltv: Number(ltv) / 1e18, // Convert from 18 decimal fixed-point
                bw: Number(bw) / 1e18 // Convert from 18 decimal fixed-point
              }
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching pool metrics for ${coinName}:`, error);
          return null;
        }
      });

      const results = await Promise.all(metricsPromises);
      const newPoolMetrics: Record<string, PoolMetrics> = {};
      
      results.forEach(result => {
        if (result) {
          newPoolMetrics[result.coinName] = result.metrics;
        }
      });

      setPoolMetrics(newPoolMetrics);
      console.log("Fetched pool metrics:", newPoolMetrics);
    } catch (err) {
      console.error("Error fetching pool metrics:", err);
    }
  };

  // Add this useEffect to fetch pool metrics on mount
  useEffect(() => {
    fetchPoolMetrics();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchPoolMetrics, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <ApiDataContext.Provider
      value={{
        priceUpdate,
        priceDirection,
        walletAccount,
        connectWallet,
        disconnectWallet,
        isConnecting,
        poolMetrics,
        fetchPoolMetrics
      }}
    >
      {children}
    </ApiDataContext.Provider>
  );
};

// ===== Wallet Context Setup =====

// Add these types
interface ObligationData {
  collateralAmount: number;
  debtAmount: number;
  ltv: number;
  liquidationThreshold: number;
}

export interface WalletContextType {
  isWalletConnected: boolean;
  account: string | null;
  sscUtilsReady: boolean;
  isConnecting: boolean;
  obligations: Record<string, ObligationData>;
  walletData: WalletBalance[];
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  sendRawTransaction: (
    moduleAddress: string,
    moduleName: string,
    functionName: string,
    params: any[],
    runTimeParams?: any[],
    txExpiryTime?: number
  ) => Promise<string | undefined>;
  // Twitter login functionality
  twitterUser: string | null;
  connectTwitter: () => Promise<void>;
  disconnectTwitter: () => Promise<void>;
  // Convenience function to connect both at once
  connectWalletAndTwitter: () => Promise<void>;
}

// Add RawTxPayload type at the top with other interfaces
export interface RawTxPayload {
  from: string;
  gas?: string;
  gasPrice?: string;
  to?: string;
  value?: string;
  data?: string;
  chainId?: string;
}

// Create the WalletContext
export const WalletContext = createContext<WalletContextType>({} as WalletContextType);

// Create and export the WalletProvider component
export const WalletProvider = ({ children }: { children: ReactNode }) => {
  // Read the wallet and twitter info from localStorage if available.
  const initialAccountRaw =
    typeof window !== "undefined" ? localStorage.getItem("walletAccount") : null;
  const initialAccount =
    initialAccountRaw && initialAccountRaw !== "undefined" ? initialAccountRaw : null;

  const initialTwitterUserRaw =
    typeof window !== "undefined" ? localStorage.getItem("twitterUser") : null;
  const initialTwitterUser =
    initialTwitterUserRaw && initialTwitterUserRaw !== "undefined"
      ? initialTwitterUserRaw
      : null;

  const [account, setAccount] = useState<string | null>(initialAccount);
  const [isWalletConnected, setIsWalletConnected] = useState(!!initialAccount);
  const [sscUtilsReady, setSscUtilsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedChainId] = useState<string>("6");
  const [obligations, setObligations] = useState<Record<string, ObligationData>>({});
  const [walletData, setWalletData] = useState<WalletBalance[]>([]);
  const [twitterUser, setTwitterUser] = useState<string | null>(initialTwitterUser);

  // Rehydration is done synchronously with the initial state

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      const ssc = getSupraStarkeyConnect();
      if (!ssc) {
        console.error("SupraStarkeyConnect not available.");
        return;
      }
      await ssc.init();
      if (!ssc.isStarKeyAvailable()) {
        ssc.promptInstall();
        return;
      }
      const connectedAccount = await ssc.connect();
      if (!connectedAccount || connectedAccount === "undefined") {
        console.error("Invalid account returned from ssc.connect()");
        setAccount(null);
        setIsWalletConnected(false);
      } else {
        console.log("Connected wallet address:", connectedAccount);
        setAccount(connectedAccount);
        localStorage.setItem("walletAccount", connectedAccount);
        setIsWalletConnected(true);
      }
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setIsWalletConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    setIsConnecting(true);
    try {
      const ssc = getSupraStarkeyConnect();
      if (ssc) {
        await ssc.disconnect();
      }
      setAccount(null);
      setIsWalletConnected(false);
      localStorage.removeItem("walletAccount");
      // Also clear stored Twitter info.
      setTwitterUser(null);
      localStorage.removeItem("twitterUser");
    } catch (err: any) {
      console.error("Failed to disconnect wallet", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectTwitter = async () => {
    if (!account) {
      console.error("Connect wallet before connecting Twitter.");
      return;
    }
    // Do nothing if already connected.
    if (twitterUser) {
      console.log("Twitter already connected:", twitterUser);
      return;
    }
    try {
      // Insert your Twitter OAuth integration code here.
      // For this example, we simulate a Twitter user based on the wallet address.
      const dummyTwitterUser = "twitter_user_" + account.slice(-6);
      setTwitterUser(dummyTwitterUser);
      localStorage.setItem("twitterUser", dummyTwitterUser);
      console.log("Connected Twitter as:", dummyTwitterUser);
    } catch (error) {
      console.error("Twitter login error:", error);
    }
  };

  const disconnectTwitter = async () => {
    setTwitterUser(null);
    localStorage.removeItem("twitterUser");
  };

  // connectWalletAndTwitter calls connectWallet then connectTwitter if the wallet is connected.
  const connectWalletAndTwitter = async () => {
    await connectWallet();
    // Read the latest wallet from state or localStorage.
    const updatedAccount =
      account ||
      (typeof window !== "undefined" ? localStorage.getItem("walletAccount") : null);
    if (updatedAccount) {
      await connectTwitter();
    }
  };

  const sendRawTransaction = async (
    moduleAddress: string,
    moduleName: string,
    functionName: string,
    params: any[],
    runTimeParams: any[] = [],
    txExpiryTime: number = Math.ceil(Date.now() / 1000) + 30
  ) => {
    const ssc = getSupraStarkeyConnect();
    if (!account || !moduleAddress || !moduleName || !functionName || !ssc) return;
    try {
      const data = await ssc.createRawTransactionData([
        account,
        0, // sequenceNumber
        moduleAddress,
        moduleName,
        functionName,
        runTimeParams,
        params,
        { txExpiryTime },
      ]);
      console.log("Raw transaction data:", data);
      const txHash = await ssc.sendTransaction({
        data,
        from: account,
        to: moduleAddress,
        chainId: selectedChainId,
        value: "",
      });
      return txHash;
    } catch (error) {
      console.error("sendRawTransaction error:", error);
      throw error;
    }
  };

  useEffect(() => {
    if (account) {
      const fetchWalletData = async () => {
        try {
          // Fetch coin balances for the account
          const balancePromises = Object.entries(COIN_TYPES).map(async ([coinName, coinType]) => {
            const response = await axios.post(`${RPC_URL}/rpc/v1/view`, {
              function: "0x1::coin::balance",
              type_arguments: [coinType],
              arguments: [account]
            });

            const decimals = coinName === 'HUSDC' ? 6 : 8;
            
            let balance = 0;
            if (response.data?.result?.[0]) {
              balance = Number(BigInt(response.data.result[0])) / Math.pow(10, decimals);
            }

            return {
              asset: coinName,
              amount: balance,
              usdPrice: 0,
              totalValue: balance,
              borrowed: 0
            };
          });

          // Fetch obligations for each supported asset
          const obligationPromises = Object.entries(COIN_TYPES).map(async ([coinName, coinType]) => {
            try {
              const response = await axios.post(`${RPC_URL}/rpc/v1/view`, {
                function: OBLIGATION_MODULE,
                type_arguments: [coinType],
                arguments: [account]
              });

              if (response.data?.result) {
                const [collateralAmount, debtAmount, ltv, liquidationThreshold] = response.data.result;
                const decimals = coinName === 'HUSDC' ? 6 : 8;

                return {
                  asset: coinName,
                  data: {
                    collateralAmount: Number(collateralAmount) / Math.pow(10, decimals),
                    debtAmount: Number(debtAmount) / Math.pow(10, decimals),
                    ltv: Number(ltv) / 100, // Assuming LTV comes in basis points
                    liquidationThreshold: Number(liquidationThreshold) / 100
                  }
                };
              }
              return null;
            } catch (error) {
              console.error(`Error fetching obligation for ${coinName}:`, error);
              return null;
            }
          });

          // Wait for all promises to resolve
          const [balances, obligationResults] = await Promise.all([
            Promise.all(balancePromises),
            Promise.all(obligationPromises)
          ]);

          // Update obligations state
          const newObligations: Record<string, ObligationData> = {};
          obligationResults.forEach(result => {
            if (result) {
              newObligations[result.asset] = result.data;
            }
          });
          setObligations(newObligations);

          // Update wallet balances with obligation data
          const updatedBalances = balances.map(balance => {
            const obligation = newObligations[balance.asset];
            if (obligation) {
              return {
                ...balance,
                borrowed: obligation.debtAmount,
                deposited: obligation.collateralAmount
              };
            }
            return balance;
          });

          setWalletData(updatedBalances);
          console.log("Fetched wallet data:", updatedBalances);
          console.log("Fetched obligations:", newObligations);

        } catch (err) {
          console.error("Error fetching wallet data:", err);
        }
      };

      fetchWalletData();
    }
  }, [account]);

  const value: WalletContextType = {
    isWalletConnected,
    account,
    sscUtilsReady,
    isConnecting,
    obligations,
    walletData,
    connectWallet,
    disconnectWallet,
    sendRawTransaction,
    twitterUser,
    connectTwitter,
    disconnectTwitter,
    connectWalletAndTwitter,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

// Export the useWallet hook
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

// Add this interface to describe pool metrics
export interface PoolMetrics {
  deposits: number;
  borrows: number;
  ltv: number;
  bw: number;
}
