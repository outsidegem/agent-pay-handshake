export declare class AuditLogger {
    log(event: string, context: Record<string, any>): void;
}
export declare class IdempotencyCache {
    private cache;
    checkOrLock(paymentId: string): boolean;
}
export declare class RateLimiter {
    private maxRequests;
    private windowMs;
    private usage;
    constructor(maxRequests: number, windowMs: number);
    checkLimit(identity: string): boolean;
}
