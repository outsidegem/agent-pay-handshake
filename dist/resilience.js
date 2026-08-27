export class CircuitBreaker {
    failures = 0;
    lastFailureTime = 0;
    THRESHOLD = 3;
    COOLDOWN_MS = 30000;
    async execute(action) {
        if (this.failures >= this.THRESHOLD && Date.now() - this.lastFailureTime < this.COOLDOWN_MS) {
            throw new Error('RPC_CIRCUIT_OPEN: Provider currently degraded.');
        }
        try {
            const result = await action();
            this.failures = 0; // Reset on success
            return result;
        }
        catch (error) {
            this.failures++;
            this.lastFailureTime = Date.now();
            throw error;
        }
    }
}
