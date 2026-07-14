# Thesis Artefacts: Blockchain Architectures for Tokenized Retail Renewable-Energy Investment

MSc thesis, NOVA Information Management School (NOVA IMS).
Author: [Your full name] · Supervisor: Ian James Scott

This repository contains the three software artefacts developed for the thesis
and the comparative analysis of their measurements. The artefacts implement the
same workload, tokenized investor onboarding and quarterly revenue
distribution for a renewable-energy asset, at three increasing levels of
infrastructure control:

| Folder | Artefact | Description |
|---|---|---|
| `artefact-a-evm-baseline/` | A | Conventional smart contracts on a local Hardhat EVM (baseline) |
| `artefact-b-zksync-era/` | B | The same contracts deployed on zkSync Era Sepolia, a production ZK-rollup |
| `artefact-c-zk-rollup/` | C | A minimal ZK-rollup built from scratch (Circom circuit, Groth16 proving, custom settlement contract) |
| `comparison-analysis/` | — | Jupyter notebook, source-of-truth tables, and figures for the three-way cost comparison |

Each artefact folder has its own README with architecture notes and run
instructions. All benchmarks use the same scenario: 1–800 investors (nine
counts) and 40 quarterly distributions over a 10-year asset lifetime.

Requirements: Node.js (all artefacts); circom 2.x additionally for Artefact C.
