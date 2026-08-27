# @digital-mineral/agent-pay-handshake 🛑

**Enterprise Agent Payment Gateway and x402 Security Boundary.**

Autonomous AI agents require specialized infrastructure to interact with paid APIs, inference models, and edge compute resources. This package operates as an HTTP 402 middleware "Toll Booth," strictly enforcing the **x402 payment protocol** while providing server-side spending controls to prevent agent bankruptcy.

### 🚀 Core Capabilities
* **Zero-Trust Verification:** Natively parses and cryptographically verifies agent signatures (ECDSA/Ed25519 via `viem`) before granting resource access.
* **Autonomous Agent Safety:** Hard-coded server-side spending limits prevent infinite agent execution loops from draining wallets. Agents cannot override these policies.
* **Idempotency & Replay Protection:** Guaranteed exactly-once execution mapping transaction hashes to localized Redis/Memory locks.
* **Resource Binding:** Cryptographically binds a signed payment proof specifically to the requested endpoint URL and method, eliminating cross-resource substitution attacks.

### 🔌 Enterprise Integrations (The Titan Stack)
This gateway serves as the ingress controller for the broader Digital Mineral DePIN ecosystem:
1. **Agent Escrow Hook:** Interfaces with `@digital-mineral/agent-escrow` to halt payments exceeding risk thresholds for 1-bit human approval.
2. **Telemetry Witness Hook:** Hands off verified payloads to `@digital-mineral/telemetry-witness` to generate cryptographic Proof-of-Compute receipts post-execution.

### ⚠️ Security Limitations & Support
* **Supported Networks:** Currently strictly validates EVM-compatible networks (Optimized for Base / Base Sepolia).
* **Key Management:** This middleware operates purely on public verification. It does **not** manage private keys. Integrations with AWS KMS, HashiCorp Vault, or physical HSMs must be handled by the external settlement provider.

**Built with vision by Outside Gem.**
