import { VerificationResult } from './types.js';
import { PaymentPolicy, ResourceBinding } from './policy.js';
export declare class HardenedPaymentVerifier {
    private seenNonces;
    verify(payloadRaw: string | undefined | null, policy: PaymentPolicy, binding: ResourceBinding): Promise<VerificationResult>;
}
export { HardenedPaymentVerifier as PaymentVerifier };
