export interface SettlementResult {
    success: boolean;
    transactionHash: string;
    error?: string;
}
export interface PaymentSettlement {
    settle(transactionHash: string, amount: bigint, recipient: string): Promise<SettlementResult>;
}
