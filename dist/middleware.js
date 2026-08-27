import { PaymentState } from './types.js';
import { SettlementMode } from './policy.js';
import { ApprovalDecision } from './hooks.js';
const spendTracker = new Map();
export const agentPayHandshake = (config) => {
    return async (c, next) => {
        const ip = c.req.header('x-forwarded-for') || 'unknown';
        const agentId = c.req.header('x-agent-id') || 'anonymous';
        if (!config.rateLimiter.checkLimit(ip)) {
            config.logger.log('RATE_LIMIT_VIOLATION', { ip, tenant: config.policy.tenantId });
            return c.json({ error: 'RATE_LIMIT_EXCEEDED' }, 429);
        }
        const proof = c.req.header('X-Payment-Proof');
        if (!proof) {
            c.header('WWW-Authenticate', `x402 realm="${config.policy.tenantId}"`);
            return c.json({ error: 'PAYMENT_REQUIRED', policy: config.policy }, 402);
        }
        const result = await config.verifier.verify(proof, config.policy, { method: c.req.method, path: c.req.path });
        if (result.state !== PaymentState.PAYMENT_VERIFIED || !result.payload) {
            config.logger.log('PAYMENT_REJECTED', { reason: result.reason, tenant: config.policy.tenantId });
            return c.json({ error: 'INVALID_PAYMENT', reason: result.reason }, 403);
        }
        if (config.policy.spendingControls) {
            const spendKey = `${config.policy.tenantId}:${agentId}`;
            let record = spendTracker.get(spendKey);
            const now = Date.now();
            if (!record || now > record.resetAt) {
                record = { total: 0n, resetAt: now + config.policy.spendingControls.timeWindowMs };
            }
            const requestedAmount = BigInt(result.payload.amountBaseUnits || 0);
            if (record.total + requestedAmount > config.policy.spendingControls.maxCumulativeSpendBaseUnits) {
                config.logger.log('SPEND_LIMIT_EXCEEDED', { agentId });
                return c.json({ error: 'AGENT_SPEND_LIMIT_EXCEEDED' }, 403);
            }
            record.total += requestedAmount;
            spendTracker.set(spendKey, record);
        }
        if (!config.idempotency.checkOrLock(result.payload.transactionHash)) {
            return c.json({ error: 'DUPLICATE_SETTLEMENT_ATTEMPT' }, 409);
        }
        if (config.approvalProvider) {
            const decision = await config.approvalProvider.evaluateRisk(result.payload, config.policy);
            if (decision === ApprovalDecision.DENY) {
                return c.json({ error: 'PAYMENT_REJECTED_BY_POLICY_ENGINE' }, 403);
            }
            if (decision === ApprovalDecision.REQUIRE_HUMAN) {
                return c.json({ error: 'PAYMENT_STAGED_AWAITING_HUMAN_APPROVAL' }, 202);
            }
        }
        if (config.policy.settlementMode === SettlementMode.VERIFY_AND_SETTLE && config.settlement) {
            try {
                await config.circuitBreaker.execute(() => config.settlement.settle(result.payload.transactionHash, BigInt(result.payload.amountBaseUnits), config.policy.recipient));
            }
            catch (e) {
                return c.json({ error: 'SETTLEMENT_FAILED', detail: e.message }, 502);
            }
        }
        c.set('paymentPayload', result.payload);
        await next();
        if (config.receiptProvider) {
            const receipt = await config.receiptProvider.issueReceipt(result.payload, { status: c.res.status });
            c.res.headers.set('x-execution-receipt', receipt);
        }
        // Explicit return to satisfy TypeScript strict mode
        return;
    };
};
