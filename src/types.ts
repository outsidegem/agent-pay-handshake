export enum PaymentState {
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  PAYMENT_PRESENT = 'PAYMENT_PRESENT',
  PAYMENT_AUTHENTIC = 'PAYMENT_AUTHENTIC',
  PAYMENT_VERIFIED = 'PAYMENT_VERIFIED',
  PAYMENT_SETTLED = 'PAYMENT_SETTLED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED'
}

export interface PaymentRequirements {
  scheme: 'x402' | string;
  network: string;
  chainId: number;
  asset: string;
  amountBaseUnits: bigint;
  recipient: string;
  resource: string;
  description: string;
  expirationWindowMs: number;
}

export interface PaymentPayload {
  nonce: string;
  signature: string;
  payer: string;
  transactionHash: string;
  timestamp: number;
  resource?: string;
  amountBaseUnits?: string;
  asset?: string;
  chainId?: number;
  recipient?: string;
}

export interface VerificationResult {
  state: PaymentState;
  reason?: string;
  payload?: PaymentPayload;
}
