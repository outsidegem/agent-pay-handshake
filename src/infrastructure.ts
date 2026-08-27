import { randomUUID } from 'node:crypto';

export class AuditLogger {
  public log(event: string, context: Record<string, any>) {
    // Strips raw signatures/secrets before logging
    const safeContext = { ...context };
    delete safeContext.signature;
    delete safeContext.privateKey;
    console.log(JSON.stringify({ timestamp: Date.now(), event, ...safeContext }));
  }
}

export class IdempotencyCache {
  private cache = new Map<string, { status: string; timestamp: number }>();

  public checkOrLock(paymentId: string): boolean {
    if (this.cache.has(paymentId)) return false;
    this.cache.set(paymentId, { status: 'LOCKED', timestamp: Date.now() });
    return true;
  }
}

export class RateLimiter {
  private usage = new Map<string, { count: number; resetAt: number }>();
  
  constructor(private maxRequests: number, private windowMs: number) {}

  public checkLimit(identity: string): boolean {
    const now = Date.now();
    const record = this.usage.get(identity);
    if (!record || now > record.resetAt) {
      this.usage.set(identity, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (record.count >= this.maxRequests) return false;
    record.count++;
    return true;
  }
}
