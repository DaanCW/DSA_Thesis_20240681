require("dotenv").config();
const { Wallet, Provider } = require("zksync-ethers");
const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");
const hre = require("hardhat");
const fs = require("fs");

async function measureTx(provider, tx, label) {
  const receipt = await provider.getTransactionReceipt(tx.hash);
  const gasUsed = receipt.gasUsed;
  const gasPrice = receipt.gasPrice || tx.gasPrice;
  console.log(`  ${label}: ${gasUsed.toString()} gas`);
  return Number(gasUsed);
}

async function main() {
  const provider = new Provider("https://sepolia.era.zksync.dev");
  const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
  const deployer = new Deployer(hre, wallet);

  console.log("=== Artefact B — zkSync Era Testnet Gas Measurements ===\n");

  const results = {
    timestamp: new Date().toISOString(),
    artefact: "B",
    scenario: 1,
    description: "ZK rollup smart contracts — fungible token, quarterly distribution",
    network: "zkSync Era Sepolia Testnet",
    deployment: {},
    onboarding: [],
    distribution: []
  };

  // ── Deploy contracts ────────────────────────────────────────────
  console.log("--- Deployment Gas ---");

  const registryArtifact = await deployer.loadArtifact("InvestorRegistry");
  const registryTx = await deployer.deploy(registryArtifact, []);
  const registryReceipt = await registryTx.deploymentTransaction().wait();
  const registryGas = Number(registryReceipt.gasUsed);
  const registryAddress = await registryTx.getAddress();
  console.log(`  InvestorRegistry: ${registryGas} gas → ${registryAddress}`);

  const tokenArtifact = await deployer.loadArtifact("RenewableToken");
  const tokenTx = await deployer.deploy(tokenArtifact, []);
  const tokenReceipt = await tokenTx.deploymentTransaction().wait();
  const tokenGas = Number(tokenReceipt.gasUsed);
  const tokenAddress = await tokenTx.getAddress();
  console.log(`  RenewableToken:   ${tokenGas} gas → ${tokenAddress}`);

  const distributorArtifact = await deployer.loadArtifact("RevenueDistributor");
  const distributorTx = await deployer.deploy(distributorArtifact, [
    tokenAddress, registryAddress
  ]);
  const distributorReceipt = await distributorTx.deploymentTransaction().wait();
  const distributorGas = Number(distributorReceipt.gasUsed);
  const distributorAddress = await distributorTx.getAddress();
  console.log(`  RevenueDistributor: ${distributorGas} gas → ${distributorAddress}`);

  results.deployment = {
    investorRegistry: { gas: registryGas, address: registryAddress },
    renewableToken: { gas: tokenGas, address: tokenAddress },
    revenueDistributor: { gas: distributorGas, address: distributorAddress }
  };

  // ── Onboarding measurements ─────────────────────────────────────
  console.log("\n--- Onboarding Gas (register + mint per investor) ---");

  const registry = await hre.ethers.getContractAt(
    "InvestorRegistry", registryAddress, wallet
  );
  const token = await hre.ethers.getContractAt(
    "RenewableToken", tokenAddress, wallet
  );
  const distributor = await hre.ethers.getContractAt(
    "RevenueDistributor", distributorAddress, wallet
  );

  // Use a small set of test addresses derived from wallet
  const testAddresses = Array.from({length: 800}, (_, i) => {
    const testWallet = Wallet.createRandom();
    return testWallet.address;
  });

  let registerGasTotal = 0;
  let mintGasTotal = 0;
  const onboardCount = 10;

  for (let i = 0; i < onboardCount; i++) {
    const addr = testAddresses[i];

    const regTx = await registry.registerInvestor(addr, true, true);
    const regReceipt = await regTx.wait();
    registerGasTotal += Number(regReceipt.gasUsed);

    const mintTx = await token.mint(addr, hre.ethers.parseEther("1000"));
    const mintReceipt = await mintTx.wait();
    mintGasTotal += Number(mintReceipt.gasUsed);
  }

  const avgRegister = Math.round(registerGasTotal / onboardCount);
  const avgMint = Math.round(mintGasTotal / onboardCount);

  console.log(`  Avg register gas: ${avgRegister}`);
  console.log(`  Avg mint gas:     ${avgMint}`);
  console.log(`  Total onboarding: ${avgRegister + avgMint}`);

  results.onboarding.push({
    investors: onboardCount,
    avgRegisterGas: avgRegister,
    avgMintGas: avgMint,
    avgTotalGas: avgRegister + avgMint
  });

  // ── Distribution measurements ───────────────────────────────────
  console.log("\n--- Distribution Gas ---");

  const registeredAddresses = testAddresses.slice(0, 10);
  const counts = [1, 5, 10, 20, 50, 100, 200, 400, 800];

  // Fast-forward time constraint — use low-level call to bypass interval
  // On testnet we deploy a fresh distributor per measurement
  for (const count of counts) {
    // Deploy fresh contracts for each measurement
    const freshRegistry = await deployer.deploy(registryArtifact, []);
    await freshRegistry.deploymentTransaction().wait();
    const freshToken = await deployer.deploy(tokenArtifact, []);
    await freshToken.deploymentTransaction().wait();
    const freshDistributor = await deployer.deploy(distributorArtifact, [
      await freshToken.getAddress(),
      await freshRegistry.getAddress()
    ]);
    await freshDistributor.deploymentTransaction().wait();

    const freshReg = await hre.ethers.getContractAt(
      "InvestorRegistry", await freshRegistry.getAddress(), wallet
    );
    const freshTok = await hre.ethers.getContractAt(
      "RenewableToken", await freshToken.getAddress(), wallet
    );
    const freshDist = await hre.ethers.getContractAt(
      "RevenueDistributor", await freshDistributor.getAddress(), wallet
    );

    const investors = testAddresses.slice(0, count);

    let regGasTotal = 0;
    let mintGasTotal = 0;
    for (const addr of investors) {
      const regR = await (await freshReg.registerInvestor(addr, true, true)).wait();
      regGasTotal += Number(regR.gasUsed);
      const mintR = await (await freshTok.mint(addr, hre.ethers.parseEther("1000"))).wait();
      mintGasTotal += Number(mintR.gasUsed);
    }

    // record onboarding at THIS count
    results.onboarding.push({
      investors: count,
      avgRegisterGas: Math.round(regGasTotal / count),
      avgMintGas: Math.round(mintGasTotal / count),
      avgTotalGas: Math.round((regGasTotal + mintGasTotal) / count)
    });

    // Wait for the 90-day interval — we bypass this by checking
    // the contract allows distribution immediately after deploy
    const distTx = await freshDist.distributeRevenue(
      investors, { value: hre.ethers.parseEther("0.001") }
    );

    const distReceipt = await distTx.wait();
    const gasUsed = Number(distReceipt.gasUsed);

    const txHash = distReceipt.hash;

    // --- calldata byte capture ---
    // distTx.data is the exact input data sent to the contract (the 0x... string).
    const calldataHex = distTx.data;
    const calldataBytes = (calldataHex.length - 2) / 2;  // strip "0x", 2 hex chars = 1 byte

    // gas-per-pubdata: how much gas zkSync charged per byte of L1 data
    const gasPerPubdata = distReceipt.gasPerPubdata ? Number(distReceipt.gasPerPubdata) : null;

    console.log(`  ${count} investors: ${gasUsed} L2 gas | calldata: ${calldataBytes} bytes | gasPerPubdata: ${gasPerPubdata} | tx: ${txHash}`);
    results.distribution.push({
      investors: count,
      totalGas: gasUsed,
      gasPerInvestor: Math.round(gasUsed / count),
      txHash: txHash,
      calldataBytes: calldataBytes,
      gasPerPubdata: gasPerPubdata
    });
  }

  // Save results
  fs.writeFileSync("gas-results-b.json", JSON.stringify(results, null, 2));
  console.log("\nResults saved to gas-results-b.json");
}

main().catch(console.error);