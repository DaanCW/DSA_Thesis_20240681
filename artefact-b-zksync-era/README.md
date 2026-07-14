# Artefact B — zkSync Era Sepolia (Production ZK-Rollup)

The same workload as Artefact A deployed unmodified (aside from toolchain
adjustments) to zkSync Era Sepolia, a production ZK-rollup testnet. This
artefact measures what a retail platform gains by adopting existing rollup
infrastructure without controlling it.

## Contracts

Identical three-contract design to Artefact A (`RenewableToken.sol`,
`InvestorRegistry.sol`, `RevenueDistributor.sol`), compiled with zksolc for
the zkSync Era VM.

## Setup

A funded zkSync Era Sepolia account is required (faucet ETH suffices).

```bash
npm install
cp .env.example .env   # then paste your testnet private key into .env
```

## Run

```bash
npx hardhat compile
npx hardhat run deploy/deploy.js        # deploys the three contracts
npx hardhat run scripts/measure.js      # onboarding + distribution measurements
```

The network defaults to zkSync Era Sepolia (`hardhat.config.js`). Measured
results used in the thesis are in `gas-results-b.json`.