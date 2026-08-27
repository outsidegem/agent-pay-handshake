export declare class CircuitBreaker {
    private failures;
    private lastFailureTime;
    private readonly THRESHOLD;
    private readonly COOLDOWN_MS;
    execute<T>(action: () => Promise<T>): Promise<T>;
}
