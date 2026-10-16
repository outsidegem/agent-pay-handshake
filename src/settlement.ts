import { createPublicClient, http, type Hash } from 'viem';
import { base } from 'viem/chains';

export const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface SettlementOptions {
  /** `'ETH'` / `'native'` for native ETH, or the 0x-prefixed ERC-20 contract address on Base. */
  asset?: string;
  /** Minimum block confirmations required. Overrides constructor default when provided. */
  requiredConfirmations?: number;
}

export interface SettlementResult {
  success: boolean;
  transactionHash: string;
  error?: string;
  blockNumber?: bigint;
  confirmations?: bigint;
  status?: 'success' | 'reverted';
  chainId?: number;
  asset?: string;
  settledAmount?: bigint;
  recipient?: string;
}

export interface PaymentSettlement {
  settle(
    transactionHash: string,
    amount: bigint,
    recipient: string,
    options?: SettlementOptions
  ): Promise<SettlementResult>;
}

export interface BaseL2SettlementConfig {
  rpcUrl?: string;
  requiredConfirmations?: number;
  timeoutMs?: number;
  /** Optional default asset (`'ETH'` or ERC-20 token contract address). Defaults to `'ETH'`. */
  asset?: string;
  client?: any;
}

function isValidHexAddress(addr: string): boolean {
  return typeof addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(addr) && !/^0x0{40}$/.test(addr);
}

function normalizeHash(rawHash: string): Hash | null {
  if (typeof rawHash !== 'string' || rawHash.trim() === '') return null;
  const prefixed = rawHash.trim().startsWith('0x') ? rawHash.trim() : `0x${rawHash.trim()}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(prefixed)) return null;
  return prefixed as Hash;
}

function parseTopicAddress(topic: string | undefined): string | null {
  if (!topic || typeof topic !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(topic)) {
    return null;
  }
  return `0x${topic.slice(26).toLowerCase()}`;
}

export class BaseL2PaymentSettlement implements PaymentSettlement {
  public readonly chainId = 8453;
  private client: any;
  private requiredConfirmations: number;
  private defaultAsset: string;

  constructor(private config: BaseL2SettlementConfig = {}) {
    this.requiredConfirmations = Math.max(1, Math.floor(config.requiredConfirmations ?? 1));
    this.defaultAsset = config.asset ?? 'ETH';
    if (config.client) {
      this.client = config.client;
    } else {
      const rpcUrl = config.rpcUrl || process.env.BASE_RPC_URL || 'https://mainnet.base.org';
      const timeout = Math.max(1000, Math.floor(config.timeoutMs ?? 10000));
      this.client = createPublicClient({
        chain: base,
        transport: http(rpcUrl, { timeout })
      });
    }
  }

  async settle(
    transactionHash: string,
    amount: bigint,
    recipient: string,
    options?: SettlementOptions
  ): Promise<SettlementResult> {
    const hash = normalizeHash(transactionHash);
    if (!hash) {
      return {
        success: false,
        transactionHash: String(transactionHash),
        error: 'Malformed transaction hash: must be a 32-byte hexadecimal string.'
      };
    }

    if (typeof amount !== 'bigint' || amount <= 0n) {
      return {
        success: false,
        transactionHash: hash,
        error: 'Invalid settlement amount: must be a positive bigint.'
      };
    }

    if (!isValidHexAddress(recipient)) {
      return {
        success: false,
        transactionHash: hash,
        error: 'Invalid recipient address: must be a non-zero 20-byte EVM hex address.'
      };
    }

    const expectedRecipient = recipient.toLowerCase();
    const asset = (options?.asset ?? this.defaultAsset ?? 'ETH').trim();
    const isErc20 = asset.toUpperCase() !== 'ETH' && asset.toLowerCase() !== 'native';
    if (isErc20 && !isValidHexAddress(asset)) {
      return {
        success: false,
        transactionHash: hash,
        error: `Invalid ERC-20 token contract address: ${asset}`
      };
    }

    const minConfirmations = Math.max(
      1,
      Math.floor(options?.requiredConfirmations ?? this.requiredConfirmations)
    );

    try {
      // 1. Verify RPC chain identity if getChainId is supported
      if (typeof this.client.getChainId === 'function') {
        const rpcChainId = Number(await this.client.getChainId());
        if (rpcChainId !== this.chainId) {
          return {
            success: false,
            transactionHash: hash,
            error: `Chain ID mismatch: expected ${this.chainId}, got ${rpcChainId}`
          };
        }
      }

      // 2. Fetch transaction receipt
      const receipt = await this.client.getTransactionReceipt({ hash });
      if (!receipt) {
        return {
          success: false,
          transactionHash: hash,
          error: 'Transaction receipt not found on Base L2'
        };
      }

      if (receipt.status !== 'success') {
        return {
          success: false,
          transactionHash: hash,
          error: `Transaction failed with status: ${receipt.status}`,
          status: receipt.status
        };
      }

      // 3. Check block confirmations when required
      let confirmations = 1n;
      if (minConfirmations > 1 || typeof this.client.getBlockNumber === 'function') {
        if (typeof this.client.getBlockNumber === 'function' && receipt.blockNumber !== undefined) {
          const latestBlock = BigInt(await this.client.getBlockNumber());
          confirmations = latestBlock >= receipt.blockNumber ? latestBlock - receipt.blockNumber + 1n : 0n;
          if (confirmations < BigInt(minConfirmations)) {
            return {
              success: false,
              transactionHash: hash,
              error: `Insufficient confirmations: required ${minConfirmations}, got ${confirmations.toString()}`
            };
          }
        } else if (minConfirmations > 1) {
          return {
            success: false,
            transactionHash: hash,
            error: `Unable to verify required confirmations (${minConfirmations})`
          };
        }
      }

      // 4. Verify ERC-20 vs Native ETH settlement
      if (isErc20) {
        const expectedToken = asset.toLowerCase();
        if (typeof this.client.getTransaction === 'function') {
          const tx = await this.client.getTransaction({ hash });
          if (tx && tx.chainId !== undefined && Number(tx.chainId) !== this.chainId) {
            return {
              success: false,
              transactionHash: hash,
              error: `Chain ID mismatch: expected ${this.chainId}, got ${tx.chainId}`
            };
          }
        }

        const logs: any[] = Array.isArray(receipt.logs) ? receipt.logs : [];
        const transferLogs = logs.filter(
          (log) =>
            Array.isArray(log?.topics) &&
            typeof log.topics[0] === 'string' &&
            log.topics[0].toLowerCase() === ERC20_TRANSFER_TOPIC
        );

        if (transferLogs.length === 0) {
          return {
            success: false,
            transactionHash: hash,
            error: 'No ERC-20 Transfer event found in transaction receipt logs'
          };
        }

        const tokenMatchedLogs = transferLogs.filter(
          (log) => typeof log.address === 'string' && log.address.toLowerCase() === expectedToken
        );
        if (tokenMatchedLogs.length === 0) {
          return {
            success: false,
            transactionHash: hash,
            error: `ERC-20 contract mismatch: expected ${expectedToken}`
          };
        }

        const recipientMatchedLogs = tokenMatchedLogs.filter(
          (log) => parseTopicAddress(log.topics[2]) === expectedRecipient
        );
        if (recipientMatchedLogs.length === 0) {
          return {
            success: false,
            transactionHash: hash,
            error: `Recipient mismatch in ERC-20 Transfer log: expected ${expectedRecipient}`
          };
        }

        let transferredTotal = 0n;
        for (const log of recipientMatchedLogs) {
          if (typeof log.data === 'string' && /^0x[0-9a-fA-F]+$/.test(log.data)) {
            transferredTotal += BigInt(log.data);
          }
        }

        if (transferredTotal < amount) {
          return {
            success: false,
            transactionHash: hash,
            error: `ERC-20 amount insufficient: expected >= ${amount.toString()}, got ${transferredTotal.toString()}`
          };
        }

        return {
          success: true,
          transactionHash: hash,
          status: receipt.status,
          blockNumber: receipt.blockNumber,
          confirmations,
          chainId: this.chainId,
          asset: expectedToken,
          settledAmount: transferredTotal,
          recipient: expectedRecipient
        };
      }

      // Native ETH settlement verification requires transaction details
      if (typeof this.client.getTransaction !== 'function') {
        return {
          success: false,
          transactionHash: hash,
          error: 'RPC client does not support getTransaction for native transfer verification'
        };
      }

      const tx = await this.client.getTransaction({ hash });
      if (!tx) {
        return {
          success: false,
          transactionHash: hash,
          error: 'Transaction details not found on Base L2'
        };
      }

      if (tx.chainId !== undefined && Number(tx.chainId) !== this.chainId) {
        return {
          success: false,
          transactionHash: hash,
          error: `Chain ID mismatch: expected ${this.chainId}, got ${tx.chainId}`
        };
      }

      const actualTo = typeof tx.to === 'string' ? tx.to.toLowerCase() : '';
      if (actualTo !== expectedRecipient) {
        return {
          success: false,
          transactionHash: hash,
          error: `Recipient mismatch: expected ${expectedRecipient}, got ${actualTo || 'null'}`
        };
      }

      const txValue = typeof tx.value === 'bigint' ? tx.value : BigInt(tx.value ?? 0);
      if (txValue < amount) {
        return {
          success: false,
          transactionHash: hash,
          error: `Amount insufficient: expected >= ${amount.toString()}, got ${txValue.toString()}`
        };
      }

      return {
        success: true,
        transactionHash: hash,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        confirmations,
        chainId: this.chainId,
        asset: 'ETH',
        settledAmount: txValue,
        recipient: expectedRecipient
      };
    } catch (err: any) {
      return {
        success: false,
        transactionHash: hash,
        error: err?.message || 'Error settling transaction on Base L2'
      };
    }
  }
}
