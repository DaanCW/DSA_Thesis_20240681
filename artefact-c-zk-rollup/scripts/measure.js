// Artefact C measurement: one revenue distribution at each of the nine
// investor counts used for Artefacts A and B. Fresh contracts per count.
// Records total L1 gas, calldata bytes, proving time, and the fixed
// verification baseline. Output: gas-results-c.json
const hre = require("hardhat");
const fs = require("fs");
const { newSequencer } = require("./lib/sequencer");

const COUNTS = [1, 5, 10, 20, 50, 100, 200, 400, 800];
const DEPOSIT = hre.ethers.parseEther("1"); // same 1 ETH per distribution as Artefact A

async function main() {
  const results = { artefact: "C (from-scratch ZK-rollup, local L1 settlement)",
                    timestamp: new Date().toISOString(), distribution: [] };

  for (const n of COUNTS) {
    // Fresh rollup per measurement (same methodology as Artefacts A and B)
    const seq = await newSequencer();
    const genesisRoot = seq.state.root();

    const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    const Rollup = await hre.ethers.getContractFactory("ZKRollup");
    const rollup = await Rollup.deploy(await verifier.getAddress(), genesisRoot);
    await rollup.waitForDeployment();

    const deployGasVerifier = (await verifier.deploymentTransaction().wait()).gasUsed;
    const deployGasRollup = (await rollup.deploymentTransaction().wait()).gasUsed;

    // Sequencer builds and proves the batch
    const batch = await seq.proveDistribution(n, DEPOSIT);

    // Publish only the leading n shares as calldata (per-investor data availability)
    const sharesCalldata = batch.shares.slice(0, n);

    const tx = await rollup.submitBatch(
      batch.a, batch.b, batch.c, batch.newRoot, batch.total, sharesCalldata,
      { value: batch.total }
    );
    const rcpt = await tx.wait();
    seq.finalize(batch.shares);

    // Sanity: L1 adopted the proven root
    const onChainRoot = await rollup.stateRoot();
    if (onChainRoot.toString() !== BigInt(batch.newRoot).toString()) {
      throw new Error(`Root mismatch at N=${n}`);
    }

    const calldataBytes = (tx.data.length - 2) / 2;
    results.distribution.push({
      investors: n,
      totalGas: Number(rcpt.gasUsed),
      gasPerInvestor: Math.round(Number(rcpt.gasUsed) / n),
      calldataBytes,
      provingTimeMs: batch.provingTimeMs,
      deployGasVerifier: Number(deployGasVerifier),
      deployGasRollup: Number(deployGasRollup),
      newRoot: batch.newRoot.toString(),
      txHash: rcpt.hash,
    });
    console.log(
      `N=${String(n).padStart(3)}  L1 gas=${rcpt.gasUsed}  ` +
      `calldata=${calldataBytes}B  proof=${(batch.provingTimeMs / 1000).toFixed(1)}s`
    );
  }

  fs.writeFileSync("gas-results-c.json", JSON.stringify(results, null, 2));
  console.log("\nSaved gas-results-c.json");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
