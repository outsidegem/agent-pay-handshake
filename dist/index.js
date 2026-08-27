"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentPayHandshake = void 0;
const agentPayHandshake = (config) => {
    return async (c, next) => {
        const paymentProof = c.req.header('X-Payment-Proof');
        if (!paymentProof) {
            c.header('X-Payment-Instructions', JSON.stringify({
                recipient: config.recipientAddress,
                amount: config.priceUsdc,
                currency: 'USDC',
                chain: 'base'
            }));
            return c.json({ error: 'Payment Required', message: 'x402 handshake required' }, 402);
        }
        console.log(`Verifying proof: ${paymentProof}`);
        await next();
    };
};
exports.agentPayHandshake = agentPayHandshake;
