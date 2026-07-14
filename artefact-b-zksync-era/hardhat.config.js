require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@matterlabs/hardhat-zksync-solc");
require("@matterlabs/hardhat-zksync-deploy");

module.exports = {
  zksolc: {
    version: "1.3.21",
    settings: {},
  },
  solidity: "0.8.23",
  defaultNetwork: "zkSyncTestnet",
  networks: {
    zkSyncTestnet: {
      url: "https://sepolia.era.zksync.dev",
      ethNetwork: "sepolia",
      zksync: true,
      chainId: 300,
    },
    hardhat: {
      zksync: false,
    }
  },
};