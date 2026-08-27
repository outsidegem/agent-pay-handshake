export class AuditLogger {
    log(event, context) {
        // Strips raw signatures/secrets before logging
        const safeContext = { ...context };
        delete safeContext.signature;
        delete safeContext.privateKey;
        console.log(JSON.stringify({ timestamp: Date.now(), event, ...safeContext }));
    }
}
export class IdempotencyCache {
    cache = new Map();
    checkOrLock(paymentId) {
        if (this.cache.has(paymentId))
            return false;
        this.cache.set(paymentId, { status: 'LOCKED', timestamp: Date.now() });
        return true;
    }
}
export class RateLimiter {
    maxRequests;
    windowMs;
    usage = new Map();
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
    checkLimit(identity) {
        const now = Date.now();
        const record = this.usage.get(identity);
        if (!record || now > record.resetAt) {
            this.usage.set(identity, { count: 1, resetAt: now + this.windowMs });
            return true;
        }
        if (record.count >= this.maxRequests)
            return false;
        record.count++;
        return true;
    }
}
