export declare enum SettlementMode {
    VERIFY_ONLY = "VERIFY_ONLY",
    VERIFY_AND_SETTLE = "VERIFY_AND_SETTLE",
    VERIFY_AND_DEFER_SETTLEMENT = "VERIFY_AND_DEFER_SETTLEMENT"
}
export interface SpendingLimits {
    maxCumulativeSpendBaseUnits: bigint;
    maxPerResourceSpendBaseUnits: bigint;
    timeWindowMs: number;
}
export interface PaymentPolicy {
    tenantId: string;
    acceptedAssets: string[];
    acceptedChainIds: number[];
    priceBaseUnits: bigint;
    recipient: string;
    maxPaymentBaseUnits: bigint;
    expirationWindowMs: number;
    settlementMode: SettlementMode;
    requiredConfirmations: number;
    spendingControls?: SpendingLimits;
}
export interface ResourceBinding {
    method: string;
    path: string;
}
