export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly THRESHOLD = 3;
  private readonly COOLDOWN_MS = 30000;

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    if (this.failures >= this.THRESHOLD && Date.now() - this.lastFailureTime < this.COOLDOWN_MS) {
      throw new Error('RPC_CIRCUIT_OPEN: Provider currently degraded.');
    }
    try {
      const result = await action();
      this.failures = 0; // Reset on success
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      throw error;
    }
  }
}
