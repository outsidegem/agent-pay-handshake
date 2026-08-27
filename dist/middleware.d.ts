import { Context, Next } from 'hono';
import { PaymentPolicy, SettlementMode } from './policy.js';
import { HardenedPaymentVerifier } from './verifier.js';
import { AuditLogger, IdempotencyCache, RateLimiter } from './infrastructure.js';
import { PaymentSettlement } from './settlement.js';
import { CircuitBreaker } from './resilience.js';
import { PaymentApprovalProvider, ExecutionReceiptProvider } from './hooks.js';
export interface EnterpriseHandshakeConfig {
    policy: PaymentPolicy;
    verifier: HardenedPaymentVerifier;
    settlement?: PaymentSettlement;
    approvalProvider?: PaymentApprovalProvider;
    receiptProvider?: ExecutionReceiptProvider;
    logger: AuditLogger;
    idempotency: IdempotencyCache;
    rateLimiter: RateLimiter;
    circuitBreaker: CircuitBreaker;
}
export declare const agentPayHandshake: (config: EnterpriseHandshakeConfig) => (c: Context, next: Next) => Promise<(Response & import("hono").TypedResponse<{
    error: string;
}, 429, "json">) | (Response & import("hono").TypedResponse<{
    error: string;
    policy: {
        tenantId: string;
        acceptedAssets: string[];
        acceptedChainIds: number[];
        priceBaseUnits: never;
        recipient: string;
        maxPaymentBaseUnits: never;
        expirationWindowMs: number;
        settlementMode: SettlementMode;
        requiredConfirmations: number;
        spendingControls?: {
            maxCumulativeSpendBaseUnits: never;
            maxPerResourceSpendBaseUnits: never;
            timeWindowMs: number;
        } | undefined;
    };
}, 402, "json">) | (Response & import("hono").TypedResponse<{
    error: string;
}, 403, "json">) | (Response & import("hono").TypedResponse<{
    error: string;
}, 409, "json">) | (Response & import("hono").TypedResponse<{
    error: string;
}, 202, "json">) | (Response & import("hono").TypedResponse<{
    error: string;
    detail: any;
}, 502, "json">) | undefined>;
