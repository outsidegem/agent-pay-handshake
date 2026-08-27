import { Context, Next } from 'hono';

export const agentPayHandshake = (config: {
  recipientAddress: string;
  priceUsdc: string;
  chainId: number; 
}) => {
  return async (c: Context, next: Next) => {
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
