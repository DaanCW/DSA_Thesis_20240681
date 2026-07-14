require("@nomicfoundation/hardhat-toolbox");

// Offline-environment escape hatch: if SOLC_PATH is set, use a local solc
// binary instead of downloading. Has no effect in normal use.
if (process.env.SOLC_PATH) {
  const { subtask } = require("hardhat/config");
  const {
    TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
  } = require("hardhat/builtin-tasks/task-names");
  subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
    if (args.solcVersion === "0.8.28") {
      return {
        compilerPath: process.env.SOLC_PATH,
        isSolcJs: false,
        version: "0.8.28",
        longVersion: "0.8.28+commit.7893614a",
      };
    }
    return runSuper(args);
  });
}

/** Artefact C — same local EVM configuration family as Artefact A. */
module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      blockGasLimit: 30_000_000, // Ethereum mainnet's long-standing default
    },
  },
};
