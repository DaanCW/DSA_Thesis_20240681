const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const fs = require("fs");
const path = require("path");

describe("Renewable Energy Token System", function () {

  async function deploySystem() {
    const [owner, ...accounts] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("InvestorRegistry");
    const registry = await Registry.deploy();
    const Token = await ethers.getContractFactory("RenewableToken");
    const token = await Token.deploy();
    const Distributor = await ethers.getContractFactory("RevenueDistributor");
    const distributor = await Distributor.deploy(
      await token.getAddress(),
      await registry.getAddress()
    );
    return { owner, accounts, registry, token, distributor };
  }

  async function setupInvestors(registry, token, owner, accounts, count) {
    const investors = [];
    for (let i = 0; i < count; i++) {
      const investor = accounts[i % accounts.length];
      await registry.connect(owner).registerInvestor(investor.address, true, true);
      await token.connect(owner).mint(investor.address, ethers.parseEther("1000"));
      investors.push(investor.address);
    }
    return investors;
  }

  // ─── Deployment Tests ────────────────────────────────────────────

  describe("Deployment", function () {
    it("Should deploy all three contracts", async function () {
      const { registry, token, distributor } = await deploySystem();
      expect(await registry.getAddress()).to.be.properAddress;
      expect(await token.getAddress()).to.be.properAddress;
      expect(await distributor.getAddress()).to.be.properAddress;
    });

    it("Should set correct token name and symbol", async function () {
      const { token } = await deploySystem();
      expect(await token.name()).to.equal("RenewableToken");
      expect(await token.symbol()).to.equal("RET");
    });
  });

  // ─── Investor Registry Tests ──────────────────────────────────────

  describe("InvestorRegistry", function () {
    it("Should register an eligible investor", async function () {
      const { owner, accounts, registry } = await deploySystem();
      await registry.connect(owner).registerInvestor(accounts[0].address, true, true);
      expect(await registry.isEligible(accounts[0].address)).to.equal(true);
    });

    it("Should reject non-EU investor", async function () {
      const { owner, accounts, registry } = await deploySystem();
      await expect(
        registry.connect(owner).registerInvestor(accounts[0].address, false, true)
      ).to.be.revertedWith("Must be EU resident");
    });

    it("Should reject investor under 18", async function () {
      const { owner, accounts, registry } = await deploySystem();
      await expect(
        registry.connect(owner).registerInvestor(accounts[0].address, true, false)
      ).to.be.revertedWith("Must be 18 or older");
    });
  });

  // ─── Token Tests ──────────────────────────────────────────────────

  describe("RenewableToken", function () {
    it("Should mint tokens to a registered investor", async function () {
      const { owner, accounts, registry, token } = await deploySystem();
      await registry.connect(owner).registerInvestor(accounts[0].address, true, true);
      await token.connect(owner).mint(accounts[0].address, ethers.parseEther("1000"));
      expect(await token.balanceOf(accounts[0].address)).to.equal(ethers.parseEther("1000"));
    });

    it("Should not exceed max supply", async function () {
      const { owner, accounts, token } = await deploySystem();
      await expect(
        token.connect(owner).mint(accounts[0].address, ethers.parseEther("100000001"))
      ).to.be.revertedWith("Max supply exceeded");
    });
  });

  // ─── Gas Measurements ─────────────────────────────────────────────

  describe("Gas Measurements", function () {

    it("DO1/DO2/DO3/DO6 — Full gas dataset", async function () {
      const { owner, accounts } = await deploySystem();
      const counts = [1, 5, 10, 20, 50, 100, 200, 400, 800];

      const distributionResults = [];
      const onboardingResults = [];

      console.log("\n    --- Distribution Gas ---");
      for (const count of counts) {
        const Registry = await ethers.getContractFactory("InvestorRegistry");
        const freshRegistry = await Registry.deploy();
        const Token = await ethers.getContractFactory("RenewableToken");
        const freshToken = await Token.deploy();
        const Distributor = await ethers.getContractFactory("RevenueDistributor");
        const freshDistributor = await Distributor.deploy(
          await freshToken.getAddress(),
          await freshRegistry.getAddress()
        );

        const investors = await setupInvestors(freshRegistry, freshToken, owner, accounts, count);
        await time.increase(90 * 24 * 60 * 60);

        const tx = await freshDistributor.connect(owner).distributeRevenue(
          investors, { value: ethers.parseEther("1") }
        );
        const receipt = await tx.wait();
        const gasUsed = Number(receipt.gasUsed);

        distributionResults.push({ investors: count, totalGas: gasUsed, gasPerInvestor: Math.round(gasUsed / count) });
        console.log(`    ${count.toString().padStart(4)} investors: ${gasUsed.toString().padStart(10)} gas | per investor: ${Math.round(gasUsed/count).toString().padStart(7)} gas`);
      }

      console.log("\n    --- Onboarding Gas (Register + Mint) ---");
      for (const count of counts) {
        const Registry = await ethers.getContractFactory("InvestorRegistry");
        const freshRegistry = await Registry.deploy();
        const Token = await ethers.getContractFactory("RenewableToken");
        const freshToken = await Token.deploy();

        let totalRegisterGas = 0;
        let totalMintGas = 0;

        for (let i = 0; i < count; i++) {
          const investor = accounts[i];
          const regTx = await freshRegistry.connect(owner).registerInvestor(investor.address, true, true);
          const regReceipt = await regTx.wait();
          totalRegisterGas += Number(regReceipt.gasUsed);

          const mintTx = await freshToken.connect(owner).mint(investor.address, ethers.parseEther("1000"));
          const mintReceipt = await mintTx.wait();
          totalMintGas += Number(mintReceipt.gasUsed);
        }

        const avgRegister = Math.round(totalRegisterGas / count);
        const avgMint = Math.round(totalMintGas / count);
        const avgTotal = avgRegister + avgMint;

        onboardingResults.push({ investors: count, avgRegisterGas: avgRegister, avgMintGas: avgMint, avgTotalGas: avgTotal });
        console.log(`    ${count.toString().padStart(4)} investors: register=${avgRegister.toString().padStart(7)} | mint=${avgMint.toString().padStart(7)} | total=${avgTotal.toString().padStart(7)}`);
      }

      // Write results to JSON
      const results = {
        timestamp: new Date().toISOString(),
        artefact: "A",
        scenario: 1,
        description: "Conventional smart contracts — fungible token, quarterly distribution",
        distribution: distributionResults,
        onboarding: onboardingResults
      };

      const outputPath = path.join(__dirname, "../gas-results.json");
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`\n    Results written to gas-results.json`);
    });

  });

});