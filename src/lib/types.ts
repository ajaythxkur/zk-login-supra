// ...existing code...

export interface Asset {
    name: string;
    price: number;
    amount?: number;
}

export interface Token {
    symbol: string;
    name?: string;
    address?: string;
    icon: string;
    decimals?: number;
    price?: number;
}

export interface BridgeToken extends Token {
    chainId: string;
    isNative?: boolean;
}

export interface WalletData {
    asset: string;
    amount: number;
}

export interface ApiDataContextType {
    walletData: WalletData[];
    // Add other context properties here
}

// ...existing code...