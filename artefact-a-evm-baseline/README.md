# Artefact A — Conventional Smart Contracts on a Local EVM (Baseline)

The baseline artefact: a conventional (non-rollup) smart-contract
implementation of the thesis workload, measured on a local Hardhat EVM.
Every investor balance update is an individual L1 state write, which makes
this the reference point against which the two ZK-rollup artefacts (B and C)
are compared.

## Contracts

- `RenewableToken.sol` — ERC-20 token representing fractional ownership of the
  renewable-energy asset (OpenZeppelin-based).
- `InvestorRegistry.sol` — on-chain whitelist of KYC-approved investor
  addresses (Design Objective 2).
- `RevenueDistributor.sol` — distributes quarterly revenue pro-rata to
  registered token holders.

## Run

```bash
npm install
npx hardhat test
```

`test/RenewableSystem.test.js` exercises deployment, investor onboarding, and
quarterly distributions across the benchmark investor counts. The Hardhat gas
reporter writes `gas-report.txt`; the consolidated measurements used in the
thesis are in `gas-results.json`, and `gas_analysis.ipynb` contains the
per-artefact analysis.