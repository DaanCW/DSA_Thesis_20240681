require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.28",
  gasReporter: {
    enabled: true,
    currency: "EUR",
    outputFile: "gas-report.txt",
    noColors: true,
  },
  networks: {
    hardhat: {
      accounts: {
        count: 10001,
      },
      blockGasLimit: 1_000_000_000,
    }
  }
};