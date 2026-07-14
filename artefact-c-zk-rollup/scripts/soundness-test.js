// Soundness check: the L1 contract must REJECT (1) a tampered state root,
// (2) a deposit that does not match the proven total, (3) a reused proof
// against the wrong pre-state. Run: npx hardhat run scripts/soundness-test.js
const hre = require("hardhat");
const { newSequencer } = require("./lib/sequencer");

async function main() {
  const seq = await newSequencer();
  const Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  const Rollup = await hre.ethers.getContractFactory("ZKRollup");
  const rollup = await Rollup.deploy(await verifier.getAddress(), seq.state.root());

  const batch = await seq.proveDistribution(5, hre.ethers.parseEther("1"));
  const shares5 = batch.shares.slice(0, 5);

  // 1. Tampered newRoot must revert
  try {
    await rollup.submitBatch(batch.a, batch.b, batch.c,
      BigInt(batch.newRoot) + 1n, batch.total, shares5, { value: batch.total });
    console.log("FAIL: tampered root accepted");
  } catch { console.log("PASS: tampered state root rejected"); }

  // 2. Wrong deposit must revert
  try {
    await rollup.submitBatch(batch.a, batch.b, batch.c,
      batch.newRoot, batch.total, shares5, { value: batch.total - 1n });
    console.log("FAIL: wrong deposit accepted");
  } catch { console.log("PASS: mismatched deposit rejected"); }

  // 3. Valid batch accepted, then same proof cannot re-apply (old root moved)
  await (await rollup.submitBatch(batch.a, batch.b, batch.c,
    batch.newRoot, batch.total, shares5, { value: batch.total })).wait();
  console.log("PASS: valid batch accepted, root =", (await rollup.stateRoot()).toString().slice(0, 12) + "...");
  try {
    await rollup.submitBatch(batch.a, batch.b, batch.c,
      batch.newRoot, batch.total, shares5, { value: batch.total });
    console.log("FAIL: replayed proof accepted");
  } catch { console.log("PASS: replayed proof rejected (pre-state no longer matches)"); }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
