import { describe, it, expect, beforeEach } from 'vitest';
import { HardenedPaymentVerifier } from '../src/verifier.js';
import { PaymentPolicy, SettlementMode } from '../src/policy.js';
import { PaymentState } from '../src/types.js';

describe('x402 Payment Verifier', () => {
  let verifier: HardenedPaymentVerifier;
  const mockPolicy: PaymentPolicy = {
    acceptedAssets: ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'],
    acceptedChainIds: [8453],
    priceBaseUnits: 1000n,
    maxPaymentBaseUnits: 50000n,
    recipient: 'smurrison.eth.base',
    expirationWindowMs: 60000,
    settlementMode: SettlementMode.VERIFY_ONLY,
    requiredConfirmations: 1
  };
  const mockBinding = { method: 'POST', path: '/api/v1/compute' };

  beforeEach(() => {
    verifier = new HardenedPaymentVerifier();
  });

  it('rejects completely missing payment proofs', async () => {
    const result = await verifier.verify(undefined, mockPolicy, mockBinding);
    expect(result.state).toBe(PaymentState.PAYMENT_REQUIRED);
  });

  it('rejects malformed base64 payloads', async () => {
    const result = await verifier.verify('invalid-base64-string', mockPolicy, mockBinding);
    expect(result.state).toBe(PaymentState.PAYMENT_REJECTED);
    expect(result.reason).toBe('INVALID_PAYMENT_ENCODING');
  });

  it('rejects expired nonces (Replay Protection)', async () => {
    const payloadData = {
      nonce: 'used-nonce-123',
      signature: '0xmock',
      payer: '0xuser',
      transactionHash: '0xtx',
      resource: '/api/v1/compute',
      amountBaseUnits: '1000',
      asset: mockPolicy.acceptedAssets[0],
      chainId: 8453,
      recipient: mockPolicy.recipient,
      timestamp: Date.now() - 10000
    };
    
    (verifier as any).seenNonces.add('used-nonce-123');
    
    const encoded = Buffer.from(JSON.stringify(payloadData)).toString('base64');
    const result = await verifier.verify(encoded, mockPolicy, mockBinding);
    expect(result.state).toBe(PaymentState.PAYMENT_REJECTED);
    expect(result.reason).toBe('REPLAY_ATTACK_DETECTED');
  });

  it('rejects payloads strictly older than expiration window', async () => {
    const payloadData = {
      nonce: 'fresh-nonce',
      signature: '0xmock',
      payer: '0xuser',
      transactionHash: '0xtx',
      resource: '/api/v1/compute',
      amountBaseUnits: '1000',
      asset: mockPolicy.acceptedAssets[0],
      chainId: 8453,
      recipient: mockPolicy.recipient,
      timestamp: Date.now() - 120000
    };
    const encoded = Buffer.from(JSON.stringify(payloadData)).toString('base64');
    const result = await verifier.verify(encoded, mockPolicy, mockBinding);
    expect(result.state).toBe(PaymentState.PAYMENT_REJECTED);
    expect(result.reason).toBe('EXPIRED_PAYMENT');
  });
});
