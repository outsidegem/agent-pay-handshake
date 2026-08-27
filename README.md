# @digital-mineral/agent-pay-handshake

An x402-compliant middleware designed for the 2026 agentic economy. 

This package allows developers to easily monetize their Edge compute, APIs, and AI infrastructure by requiring autonomous AI agents to perform micro-transactions before accessing resources. Optimized for the Base network and lightweight edge devices.

## Features
- **x402 Protocol Native:** Standardized HTTP 402 "Payment Required" handshakes.
- **Agent-Ready:** Designed for M2M (Machine-to-Machine) commerce via Smart Wallets.
- **Edge Optimized:** Built with Hono for maximum performance on ARM64 architectures and edge nodes.

## Installation
\`\`\`bash
npm install @digital-mineral/agent-pay-handshake
\`\`\`

## Quick Start
Wrap your endpoints to require a micro-transaction before execution.

\`\`\`typescript
import { Hono } from 'hono';
import { agentPayHandshake } from '@digital-mineral/agent-pay-handshake';

const app = new Hono();

app.use('/v1/secure-data', agentPayHandshake({
  recipientAddress: '0xYourWalletAddress',
  priceUsdc: '0.005',
  chainId: 8453 // Base Network
}));

app.post('/v1/secure-data', (c) => {
  return c.json({ data: "Highly valuable, verified data." });
});
\`\`\`

## Powered By
Developed by **Digital Mineral Solutions LLC**. 
Building sovereign infrastructure for the DePIN and AI agent ecosystem.
