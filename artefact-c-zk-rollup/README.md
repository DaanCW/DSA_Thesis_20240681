# Artefact C — Minimal ZK-Rollup Built From Scratch

A from-scratch zero-knowledge rollup for the thesis's revenue-distribution
workload, in which the author operates the entire rollup stack: off-chain
state, sequencer, Groth16 proving, and L1 settlement.

## Architecture

- **L2 state**: 1,024 investor balance slots held off-chain by the sequencer,
  packed two 120-bit balances per field element (512 elements) and committed
  with a 3-level Poseidon hash (32 -> 2 -> 1). Only the root lives on L1.
- **Circuit** (`circuits/distribute.circom`, 42,102 constraints): proves that
  applying a share vector to the old balances yields the new state root and
  that the credited total equals the L1 deposit.
- **Prover**: Groth16 via snarkjs, local powers-of-tau ceremony (2^16).
- **L1 contracts**: `Groth16Verifier.sol` (auto-generated) and `ZKRollup.sol`,
  which escrows the deposited revenue and adopts a new state root only with a
  valid validity proof. Deployed on a local Hardhat EVM — the same L1
  environment family as Artefact A, so gas is directly comparable.
- **Sequencer** (`scripts/lib/`): builds distribution batches, generates
  proofs (~3.4 s each on a laptop), publishes the share vector as calldata for
  data availability, and submits batches.

## Documented simplifications (thesis §3.4, trust model)

Trusted sequencer (no in-circuit signatures, eligibility, or range checks on
the packed lanes); calldata published but not cryptographically bound to the
proof; withdrawals out of scope; single-participant trusted setup. Safety of
the state transition itself is enforced by the proof: see
`scripts/soundness-test.js` (tampered roots, wrong deposits, and replayed
proofs are all rejected on-chain).

## Run

```bash
./setup.sh                                # one-time, ~45 min: circuit build,
                                          # ceremony, and proving key
npm install
npx hardhat run scripts/measure.js        # nine investor counts -> gas-results-c.json
npx hardhat run scripts/soundness-test.js # negative tests
```

`setup.sh` reproduces the full ceremony from scratch and produces a
functionally identical proving key; gas results are unaffected.
