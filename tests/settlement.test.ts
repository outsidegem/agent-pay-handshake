import { describe, it, expect, vi } from 'vitest';
import { BaseL2PaymentSettlement, ERC20_TRANSFER_TOPIC } from '../src/settlement.js';
import type { Hash } from 'viem';

function padAddressTopic(address: string): string {
  return `0x000000000000000000000000${address.replace(/^0x/i, '').toLowerCase()}`;
}

function encodeUint256Hex(value: bigint): string {
  return `0x${value.toString(16).padStart(64, '0')}`;
}

describe('BaseL2PaymentSettlement (Native ETH & ERC-20 Verification Suite)', () => {
  const dummyTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hash;
  const sender = '0x1111111111111111111111111111111111111111';
  const recipient = '0x2222222222222222222222222222222222222222';
  const baseUsdc = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  it('1. settles successfully for native ETH transfer on Base L2 (chainId 8453)', async () => {
    const mockClient = {
      getChainId: vi.fn().mockResolvedValue(8453),
      getBlockNumber: vi.fn().mockResolvedValue(1234570n),
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 1234567n,
        transactionHash: dummyTxHash
      }),
      getTransaction: vi.fn().mockResolvedValue({
        chainId: 8453,
        to: recipient,
        value: 1000n
      })
    };

    const settlement = new BaseL2PaymentSettlement({ client: mockClient, requiredConfirmations: 3 });
    const result = await settlement.settle(dummyTxHash, 1000n, recipient);

    expect(result.success).toBe(true);
    expect(result.status).toBe('success');
    expect(result.blockNumber).toBe(1234567n);
    expect(result.confirmations).toBe(4n);
    expect(result.chainId).toBe(8453);
    expect(result.asset).toBe('ETH');
    expect(result.settledAmount).toBe(1000n);
  });

  it('2. settles successfully for ERC-20 (Base USDC) Transfer log matching contract, recipient, and amount', async () => {
    const mockClient = {
      getChainId: vi.fn().mockResolvedValue(8453),
      getBlockNumber: vi.fn().mockResolvedValue(100n),
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 100n,
        transactionHash: dummyTxHash,
        logs: [
          {
            address: baseUsdc,
            topics: [ERC20_TRANSFER_TOPIC, padAddressTopic(sender), padAddressTopic(recipient)],
            data: encodeUint256Hex(5_000_000n) // 5 USDC (6 decimals)
          }
        ]
      }),
      getTransaction: vi.fn().mockResolvedValue({
        chainId: 8453,
        to: baseUsdc,
        value: 0n
      })
    };

    const settlement = new BaseL2PaymentSettlement({ client: mockClient, asset: baseUsdc });
    const result = await settlement.settle(dummyTxHash, 5_000_000n, recipient);

    expect(result.success).toBe(true);
    expect(result.asset).toBe(baseUsdc.toLowerCase());
    expect(result.settledAmount).toBe(5_000_000n);
  });

  it('3. fails when transaction receipt is missing', async () => {
    const mockClient = {
      getTransactionReceipt: vi.fn().mockResolvedValue(null)
    };
    const settlement = new BaseL2PaymentSettlement({ client: mockClient });
    const result = await settlement.settle(dummyTxHash, 1000n, recipient);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Transaction receipt not found');
  });

  it('4. fails when transaction receipt has reverted status', async () => {
    const mockClient = {
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 'reverted',
        blockNumber: 1234567n,
        transactionHash: dummyTxHash
      })
    };
    const settlement = new BaseL2PaymentSettlement({ client: mockClient });
    const result = await settlement.settle(dummyTxHash, 1000n, recipient);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Transaction failed with status: reverted');
  });

  it('5. fails when chainId does not match Base Mainnet (8453)', async () => {
    const mockClient = {
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 1234567n
      }),
      getTransaction: vi.fn().mockResolvedValue({
        chainId: 1,
        to: recipient,
        value: 1000n
      })
    };
    const settlement = new BaseL2PaymentSettlement({ client: mockClient });
    const result = await settlement.settle(dummyTxHash, 1000n, recipient);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Chain ID mismatch');
  });

  it('6. fails when native transfer recipient does not match', async () => {
    const mockClient = {
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 1234567n
      }),
      getTransaction: vi.fn().mockResolvedValue({
        chainId: 8453,
        to: '0x3333333333333333333333333333333333333333',
        value: 1000n
      })
    };
    const settlement = new BaseL2PaymentSettlement({ client: mockClient });
    const result = await settlement.settle(dummyTxHash, 1000n, recipient);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Recipient mismatch');
  });

  it('7. fails when native transfer amount is less than required', async () => {
    const mockClient = {
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 1234567n
      }),
      getTransaction: vi.fn().mockResolvedValue({
        chainId: 8453,
        to: recipient,
        value: 500n
      })
    };
    const settlement = new BaseL2PaymentSettlement({ client: mockClient });
    const result = await settlement.settle(dummyTxHash, 1000n, recipient);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Amount insufficient');
  });

  it('8. fails when ERC-20 token contract does not match expected asset', async () => {
    const fakeToken = '0x9999999999999999999999999999999999999999';
    const mockClient = {
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 100n,
        logs: [
          {
            address: fakeToken,
            topics: [ERC20_TRANSFER_TOPIC, padAddressTopic(sender), padAddressTopic(recipient)],
            data: encodeUint256Hex(5_000_000n)
          }
        ]
      }),
      getTransaction: vi.fn().mockResolvedValue({ chainId: 8453, to: fakeToken, value: 0n })
    };

    const settlement = new BaseL2PaymentSettlement({ client: mockClient, asset: baseUsdc });
    const result = await settlement.settle(dummyTxHash, 5_000_000n, recipient);
    expect(result.success).toBe(false);
    expect(result.error).toContain('ERC-20 contract mismatch');
  });

  it('9. fails when ERC-20 transfer amount or recipient is wrong', async () => {
    const mockClient = {
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 100n,
        logs: [
          {
            address: baseUsdc,
            topics: [ERC20_TRANSFER_TOPIC, padAddressTopic(sender), padAddressTopic(recipient)],
            data: encodeUint256Hex(1_000_000n) // Only 1 USDC instead of 5 USDC
          }
        ]
      }),
      getTransaction: vi.fn().mockResolvedValue({ chainId: 8453, to: baseUsdc, value: 0n })
    };

    const settlement = new BaseL2PaymentSettlement({ client: mockClient, asset: baseUsdc });
    const result = await settlement.settle(dummyTxHash, 5_000_000n, recipient);
    expect(result.success).toBe(false);
    expect(result.error).toContain('ERC-20 amount insufficient');
  });

  it('10. fails when confirmations are insufficient or RPC times out or inputs are malformed', async () => {
    const unconfirmedClient = {
      getBlockNumber: vi.fn().mockResolvedValue(100n),
      getTransactionReceipt: vi.fn().mockResolvedValue({
        status: 'success',
        blockNumber: 100n
      }),
      getTransaction: vi.fn().mockResolvedValue({ chainId: 8453, to: recipient, value: 1000n })
    };
    const settlement = new BaseL2PaymentSettlement({ client: unconfirmedClient, requiredConfirmations: 5 });
    const unconfirmedRes = await settlement.settle(dummyTxHash, 1000n, recipient);
    expect(unconfirmedRes.success).toBe(false);
    expect(unconfirmedRes.error).toContain('Insufficient confirmations');

    const timeoutClient = {
      getTransactionReceipt: vi.fn().mockRejectedValue(new Error('HTTP request timed out after 5000ms'))
    };
    const timeoutSettlement = new BaseL2PaymentSettlement({ client: timeoutClient });
    const timeoutRes = await timeoutSettlement.settle(dummyTxHash, 1000n, recipient);
    expect(timeoutRes.success).toBe(false);
    expect(timeoutRes.error).toContain('timed out');

    const malformedHashRes = await timeoutSettlement.settle('0xnotahash', 1000n, recipient);
    expect(malformedHashRes.success).toBe(false);
    expect(malformedHashRes.error).toContain('Malformed transaction hash');

    const badRecipientRes = await timeoutSettlement.settle(dummyTxHash, 1000n, '0x0000000000000000000000000000000000000000');
    expect(badRecipientRes.success).toBe(false);
    expect(badRecipientRes.error).toContain('Invalid recipient address');
  });
});
