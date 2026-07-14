const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");
const { Wallet } = require("zksync-ethers");
const hre = require("hardhat");

async function main() {
  // Your wallet private key — we'll add this via .env next
  const wallet = new Wallet(process.env.PRIVATE_KEY);
  const deployer = new Deployer(hre, wallet);

  console.log("Deploying contracts to zkSync Era Testnet...\n");

  // Deploy InvestorRegistry
  const registryArtifact = await deployer.loadArtifact("InvestorRegistry");
  const registry = await deployer.deploy(registryArtifact, []);
  console.log(`InvestorRegistry deployed to: ${await registry.getAddress()}`);

  // Deploy RenewableToken
  const tokenArtifact = await deployer.loadArtifact("RenewableToken");
  const token = await deployer.deploy(tokenArtifact, []);
  console.log(`RenewableToken deployed to:   ${await token.getAddress()}`);

  // Deploy RevenueDistributor
  const distributorArtifact = await deployer.loadArtifact("RevenueDistributor");
  const distributor = await deployer.deploy(distributorArtifact, [
    await token.getAddress(),
    await registry.getAddress()
  ]);
  console.log(`RevenueDistributor deployed to: ${await distributor.getAddress()}`);

  console.log("\nAll contracts deployed successfully!");
}

main().catch(console.error);