// Artefact C sequencer: the rollup operator role.
// Builds a distribution batch, generates the Groth16 validity proof,
// and submits (proof, newRoot, total, shares) to the L1 rollup contract.
const path = require("path");
const snarkjs = require("snarkjs");
const { makeState, CAP } = require("./rollupState");

const WASM = path.join(__dirname, "../../build/distribute_js/distribute.wasm");
const ZKEY = path.join(__dirname, "../../build/distribute_final.zkey");

async function newSequencer() {
  const state = await makeState();

  return {
    state,

    /// Distribute `totalWei` equally across the first `n` account slots
    /// (benchmark scenario: every investor holds the same token amount,
    /// mirroring Artefacts A and B).
    async proveDistribution(n, totalWei) {
      const shares = new Array(CAP).fill(0n);
      const per = totalWei / BigInt(n);
      let total = 0n;
      for (let i = 0; i < n; i++) { shares[i] = per; total += per; }

      const input = {
        oldPacked: state.pack(state.balances).map(String),
        shares: shares.map(String),
      };

      const t0 = Date.now();
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY);
      const provingTimeMs = Date.now() - t0;

      // publicSignals order = circuit outputs: [oldRoot, newRoot, total]
      const calldata = JSON.parse(
        "[" + (await snarkjs.groth16.exportSolidityCallData(proof, publicSignals)) + "]"
      );
      const [a, b, c, signals] = calldata;

      return { a, b, c, oldRoot: signals[0], newRoot: signals[1],
               total, shares, provingTimeMs };
    },

    /// Apply the batch to local L2 state after L1 acceptance.
    finalize(shares) { state.applyShares(shares); },
  };
}

module.exports = { newSequencer, CAP };
