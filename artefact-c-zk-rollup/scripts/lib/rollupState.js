// Off-chain L2 state and commitment logic for Artefact C.
// Must mirror circuits/distribute.circom exactly: 1024 balances packed as
// 512 field elements (two 120-bit lanes), Poseidon commitment 32 -> 2 -> 1.
const { buildPoseidon } = require("circomlibjs");

const CAP = 1024;
const LANE = 1n << 120n;

async function makeState() {
  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  function pack(balances) {
    const packed = new Array(512);
    for (let j = 0; j < 512; j++) {
      packed[j] = balances[2 * j] + balances[2 * j + 1] * LANE;
    }
    return packed;
  }

  function commit(balances) {
    const v = pack(balances);
    const l1 = [];
    for (let i = 0; i < 32; i++) l1.push(poseidon(v.slice(i * 16, i * 16 + 16)));
    const l2 = [poseidon(l1.slice(0, 16)), poseidon(l1.slice(16, 32))];
    return F.toObject(poseidon(l2)); // BigInt root
  }

  return {
    CAP,
    balances: new Array(CAP).fill(0n),
    pack,
    commit,
    root() { return commit(this.balances); },
    applyShares(shares) {
      for (let i = 0; i < CAP; i++) this.balances[i] += shares[i];
    },
  };
}

module.exports = { makeState, CAP };
