import { Context, Next } from 'hono';
export declare const agentPayHandshake: (config: {
    recipientAddress: string;
    priceUsdc: string;
    chainId: number;
}) => (c: Context, next: Next) => Promise<(Response & import("hono").TypedResponse<{
    error: string;
    message: string;
}, 402, "json">) | undefined>;
