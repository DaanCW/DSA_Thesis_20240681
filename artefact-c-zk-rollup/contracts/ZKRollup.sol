// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGroth16Verifier {
    function verifyProof(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint[3] calldata publicSignals
    ) external view returns (bool);
}

/// @title ZKRollup — Artefact C settlement contract (minimal from-scratch ZK-rollup)
/// @notice Holds the L2 state root and the escrowed revenue. A batch is accepted
///         only with a valid Groth16 proof that the new root follows from the old
///         root under the published share vector total. The sequencer (contract
///         owner) is trusted for share computation, eligibility, and data
///         availability of the full share vector, which is published as calldata
///         for off-chain reconstruction but not cryptographically bound on-chain
///         (documented design simplification of this minimal artefact).
contract ZKRollup {
    IGroth16Verifier public immutable verifier;
    address public immutable sequencer;

    uint256 public stateRoot;   // Poseidon commitment to the L2 balance vector
    uint256 public batchCount;
    uint256 public totalEscrowed;

    event BatchSubmitted(
        uint256 indexed batchNumber,
        uint256 oldRoot,
        uint256 newRoot,
        uint256 distributedTotal,
        uint256 recipients
    );

    constructor(address _verifier, uint256 _genesisRoot) {
        verifier = IGroth16Verifier(_verifier);
        sequencer = msg.sender;
        stateRoot = _genesisRoot;
    }

    /// @param a,b,c        Groth16 proof points
    /// @param newRoot      state root after applying the batch
    /// @param total        sum of all shares in the batch (must equal msg.value)
    /// @param shares       full share vector for the batch, published as calldata
    ///                     for data availability (recipients = leading non-zero span)
    function submitBatch(
        uint[2] calldata a,
        uint[2][2] calldata b,
        uint[2] calldata c,
        uint256 newRoot,
        uint256 total,
        uint256[] calldata shares
    ) external payable {
        require(msg.sender == sequencer, "Only sequencer");
        require(msg.value == total, "Deposit must equal distributed total");

        // Public signals, in circuit output order: [oldRoot, newRoot, total]
        require(
            verifier.verifyProof(a, b, c, [stateRoot, newRoot, total]),
            "Invalid validity proof"
        );

        uint256 old = stateRoot;
        stateRoot = newRoot;
        batchCount += 1;
        totalEscrowed += msg.value;

        emit BatchSubmitted(batchCount, old, newRoot, total, shares.length);
    }
}
