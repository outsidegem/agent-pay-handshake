import { describe, it, expect } from 'vitest';
import { HardenedPaymentVerifier } from '../src/verifier.js';
import { IdempotencyCache } from '../src/infrastructure.js';
import { PaymentPolicy, SettlementMode } from '../src/policy.js';
import { PaymentState } from '../src/types.js';

describe('Phase 3 Red Team Bypass Mitigations', () => {
  const policy: PaymentPolicy = {
    acceptedAssets: ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'], // USDC
    acceptedChainIds: [8453], // Base
    priceBaseUnits: 1000n, // 0.001 USDC
    maxPaymentBaseUnits: 50000n,
    recipient: 'smurrison.eth.base',
    expirationWindowMs: 60000,
    settlementMode: SettlementMode.VERIFY_ONLY,
    requiredConfirmations: 1
  };
  const verifier = new HardenedPaymentVerifier();

  // Baseline payload to satisfy the incomplete payload check
  const basePayload = {
    payer: '0xuser',
    nonce: 'mock-nonce',
    transactionHash: '0xtxmock',
    timestamp: Date.now(),
    signature: '0xmock'
  };

  it('blocks cross-resource substitution replays', async () => {
    const payload = {
      ...basePayload,
      resource: '/api/v1/cheap-endpoint',
      amountBaseUnits: '1000',
      asset: policy.acceptedAssets[0],
      chainId: 8453,
      recipient: policy.recipient
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    
    const result = await verifier.verify(encoded, policy, { method: 'POST', path: '/api/v1/expensive-endpoint' });
    expect(result.state).toBe(PaymentState.PAYMENT_REJECTED);
    expect(result.reason).toBe('RESOURCE_SUBSTITUTION_ATTEMPT');
  });

  it('blocks underpayment via exact BigInt constraints', async () => {
    const payload = {
      ...basePayload,
      resource: '/api/v1/compute',
      amountBaseUnits: '999', // 1 unit short
      asset: policy.acceptedAssets[0],
      chainId: 8453,
      recipient: policy.recipient
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const result = await verifier.verify(encoded, policy, { method: 'POST', path: '/api/v1/compute' });
    expect(result.reason).toBe('INSUFFICIENT_PAYMENT');
  });

  it('enforces exact chain substitution protection', async () => {
    const payload = {
      ...basePayload,
      resource: '/api/v1/compute',
      amountBaseUnits: '1000',
      asset: policy.acceptedAssets[0],
      chainId: 1, // Ethereum Mainnet (not Base)
      recipient: policy.recipient
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const result = await verifier.verify(encoded, policy, { method: 'POST', path: '/api/v1/compute' });
    expect(result.reason).toBe('WRONG_NETWORK');
  });

  it('prevents concurrent idempotency bypasses', () => {
    const cache = new IdempotencyCache();
    expect(cache.checkOrLock('0xTx123')).toBe(true);
    expect(cache.checkOrLock('0xTx123')).toBe(false);
  });
});
