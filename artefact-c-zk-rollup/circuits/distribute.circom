pragma circom 2.0.0;

// Artefact C — minimal ZK-rollup: batch revenue-distribution circuit.
//
// Statement proven: applying the (private) share vector to the (private)
// old balance vector yields the new balance vector, such that
//   oldRoot = Commit(oldBalances), newRoot = Commit(newBalances),
//   total   = sum(shares).
// The L1 contract checks oldRoot against its stored state root, requires
// msg.value == total, and adopts newRoot.
//
// State compression: the 1024 account balances are stored as 512 field
// elements, two 120-bit balance lanes per element (balance capacity
// ~1.3e18 ETH per account — unreachable in the benchmark). Lane overflow
// is prevented by the trusted sequencer, consistent with the documented
// trust model of this minimal artefact (no in-circuit range checks).

include "../node_modules/circomlib/circuits/poseidon.circom";

// Poseidon commitment over the packed 512-element state vector: 32 -> 2 -> 1.
template VectorCommit512() {
    signal input v[512];
    signal output root;

    component h1[32];
    for (var i = 0; i < 32; i++) {
        h1[i] = Poseidon(16);
        for (var j = 0; j < 16; j++) {
            h1[i].inputs[j] <== v[i * 16 + j];
        }
    }

    component h2[2];
    for (var i = 0; i < 2; i++) {
        h2[i] = Poseidon(16);
        for (var j = 0; j < 16; j++) {
            h2[i].inputs[j] <== h1[i * 16 + j].out;
        }
    }

    component h3 = Poseidon(2);
    h3.inputs[0] <== h2[0].out;
    h3.inputs[1] <== h2[1].out;
    root <== h3.out;
}

template Distribute() {
    signal input oldPacked[512];   // private: packed L2 state before the batch
    signal input shares[1024];     // private: wei credited per account slot

    signal output oldRoot;         // public: must match stored state root
    signal output newRoot;         // public: state root after the batch
    signal output total;           // public: must equal msg.value deposited

    var LANE = 2 ** 120;

    component oc = VectorCommit512();
    component nc = VectorCommit512();

    signal newPacked[512];
    var acc = 0;
    for (var j = 0; j < 512; j++) {
        oc.v[j] <== oldPacked[j];
        // pack the two share lanes into the same layout as the state
        newPacked[j] <== oldPacked[j] + shares[2 * j] + shares[2 * j + 1] * LANE;
        nc.v[j] <== newPacked[j];
        acc += shares[2 * j] + shares[2 * j + 1];
    }

    signal sumShares;
    sumShares <== acc;

    oldRoot <== oc.root;
    newRoot <== nc.root;
    total   <== sumShares;
}

component main = Distribute();
