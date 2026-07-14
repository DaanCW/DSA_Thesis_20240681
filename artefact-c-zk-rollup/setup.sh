#!/bin/bash
# Artefact C — full regeneration from scratch (~45 min, one-time).
# Prerequisites: Node.js, circom 2.x (https://docs.circom.io/getting-started/installation/)
# NOTE: build/ already ships with a completed setup (pot16_final.ptau,
# distribute_final.zkey, wasm) — you only need this script to reproduce
# the ceremony yourself.
set -e
npm install
mkdir -p build
circom circuits/distribute.circom --r1cs --wasm --sym --O2 -o build
cd build
npx snarkjs powersoftau new bn128 16 pot16_0.ptau
npx snarkjs powersoftau contribute pot16_0.ptau pot16_1.ptau --name="local" -e="$(date +%s%N)"
npx snarkjs powersoftau prepare phase2 pot16_1.ptau pot16_final.ptau   # slow step (~30-40 min)
npx snarkjs groth16 setup distribute.r1cs pot16_final.ptau distribute_0000.zkey
npx snarkjs zkey contribute distribute_0000.zkey distribute_final.zkey --name="local-phase2" -e="$(date +%s%N)"
npx snarkjs zkey export verificationkey distribute_final.zkey verification_key.json
npx snarkjs zkey export solidityverifier distribute_final.zkey ../contracts/Groth16Verifier.sol
cd .. && npx hardhat compile
echo "Setup complete. Run: npx hardhat run scripts/measure.js"
