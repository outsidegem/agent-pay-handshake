import { PaymentState } from './types.js';
import { verifyMessage } from 'viem';
export class HardenedPaymentVerifier {
    seenNonces = new Set();
    async verify(payloadRaw, policy, binding) {
        if (!payloadRaw) {
            return { state: PaymentState.PAYMENT_REQUIRED, reason: 'Missing X-Payment-Proof header' };
        }
        let payload;
        try {
            payload = JSON.parse(Buffer.from(payloadRaw, 'base64').toString('utf-8'));
        }
        catch {
            return { state: PaymentState.PAYMENT_REJECTED, reason: 'INVALID_PAYMENT_ENCODING' };
        }
        if (!payload.nonce || !payload.signature || !payload.payer || !payload.transactionHash) {
            return { state: PaymentState.PAYMENT_REJECTED, reason: 'INCOMPLETE_PAYMENT_PAYLOAD' };
        }
        if (this.seenNonces.has(payload.nonce)) {
            return { state: PaymentState.PAYMENT_REJECTED, reason: 'REPLAY_ATTACK_DETECTED' };
        }
        if (payload.resource !== binding.path) {
            return { state: PaymentState.PAYMENT_REJECTED, reason: 'RESOURCE_SUBSTITUTION_ATTEMPT' };
        }
        if (!policy.acceptedChainIds.includes(payload.chainId ?? 0)) {
            return { state: PaymentState.PAYMENT_REJECTED, reason: 'WRONG_NETWORK' };
        }
        if (!policy.acceptedAssets.includes(payload.asset ?? '')) {
            return { state: PaymentState.PAYMENT_REJECTED, reason: 'UNSUPPORTED_ASSET' };
        }
        const payloadAmount = BigInt(payload.amountBaseUnits || 0);
        if (payloadAmount < policy.priceBaseUnits) {
            return { state: PaymentState.PAYMENT_REJECTED, reason: 'INSUFFICIENT_PAYMENT' };
        }
        if (payloadAmount > policy.maxPaymentBaseUnits) {
            return { state: PaymentState.PAYMENT_REJECTED, reason: 'PAYMENT_EXCEEDS_MAXIMUM' };
        }
        if (payload.recipient !== policy.recipient) {
            return { state: PaymentState.PAYMENT_REJECTED, reason: 'WRONG_RECIPIENT' };
        }
        if (Date.now() - payload.timestamp > policy.expirationWindowMs) {
            return { state: PaymentState.PAYMENT_REJECTED, reason: 'EXPIRED_PAYMENT' };
        }
        const message = JSON.stringify({
            recipient: payload.recipient,
            amountBaseUnits: payloadAmount.toString(),
            asset: payload.asset,
            chainId: payload.chainId,
            nonce: payload.nonce,
            transactionHash: payload.transactionHash,
            resource: payload.resource,
            timestamp: payload.timestamp
        });
        try {
            const isValid = await verifyMessage({
                address: payload.payer,
                message,
                signature: payload.signature
            });
            if (!isValid)
                return { state: PaymentState.PAYMENT_REJECTED, reason: 'INVALID_SIGNATURE' };
        }
        catch {
            return { state: PaymentState.PAYMENT_REJECTED, reason: 'SIGNATURE_VERIFICATION_FAILED' };
        }
        this.seenNonces.add(payload.nonce);
        return { state: PaymentState.PAYMENT_VERIFIED, payload };
    }
}
export { HardenedPaymentVerifier as PaymentVerifier };
