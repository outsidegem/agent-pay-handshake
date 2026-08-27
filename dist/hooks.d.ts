import { PaymentPayload, PaymentRequirements } from './types.js';
export declare enum ApprovalDecision {
    ALLOW = "ALLOW",
    DENY = "DENY",
    REQUIRE_HUMAN = "REQUIRE_HUMAN"
}
export interface PaymentApprovalProvider {
    evaluateRisk(payload: PaymentPayload, requirements: PaymentRequirements): Promise<ApprovalDecision>;
}
export interface ExecutionReceiptProvider {
    issueReceipt(payload: PaymentPayload, executionMetrics: any): Promise<string>;
}
