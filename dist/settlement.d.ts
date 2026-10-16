export declare const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export interface SettlementOptions {
    /** `'ETH'` / `'native'` for native ETH, or the 0x-prefixed ERC-20 contract address on Base. */
    asset?: string;
    /** Minimum block confirmations required. Overrides constructor default when provided. */
    requiredConfirmations?: number;
}
export interface SettlementResult {
    success: boolean;
    transactionHash: string;
    error?: string;
    blockNumber?: bigint;
    confirmations?: bigint;
    status?: 'success' | 'reverted';
    chainId?: number;
    asset?: string;
    settledAmount?: bigint;
    recipient?: string;
}
export interface PaymentSettlement {
    settle(transactionHash: string, amount: bigint, recipient: string, options?: SettlementOptions): Promise<SettlementResult>;
}
export interface BaseL2SettlementConfig {
    rpcUrl?: string;
    requiredConfirmations?: number;
    timeoutMs?: number;
    /** Optional default asset (`'ETH'` or ERC-20 token contract address). Defaults to `'ETH'`. */
    asset?: string;
    client?: any;
}
export declare class BaseL2PaymentSettlement implements PaymentSettlement {
    private config;
    readonly chainId = 8453;
    private client;
    private requiredConfirmations;
    private defaultAsset;
    constructor(config?: BaseL2SettlementConfig);
    settle(transactionHash: string, amount: bigint, recipient: string, options?: SettlementOptions): Promise<SettlementResult>;
}
