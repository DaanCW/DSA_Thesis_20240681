// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./RenewableToken.sol";
import "./InvestorRegistry.sol";

contract RevenueDistributor is Ownable {

    RenewableToken public token;
    InvestorRegistry public registry;

    // Minimum tokens required to receive distribution
    uint256 public constant MIN_HOLDING = 1_000 * 10**18;

    // Track last distribution timestamp
    uint256 public lastDistribution;

    // Quarterly interval (90 days in seconds)
    uint256 public constant DISTRIBUTION_INTERVAL = 90 days;

    event RevenueDistributed(uint256 totalAmount, uint256 investorCount);

    constructor(address tokenAddress, address registryAddress) Ownable(msg.sender) {
        token = RenewableToken(tokenAddress);
        registry = InvestorRegistry(registryAddress);
        lastDistribution = block.timestamp;
    }

    function distributeRevenue(address[] calldata investors) external payable onlyOwner {
        require(msg.value > 0, "No ETH sent");
        require(investors.length > 0, "No investors provided");

        uint256 totalSupply = token.totalSupply();
        require(totalSupply > 0, "No tokens in circulation");

        uint256 investorCount = 0;

        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];

            // Skip if not eligible
            if (!registry.isEligible(investor)) continue;

            uint256 balance = token.balanceOf(investor);

            // Skip if below minimum holding threshold
            if (balance < MIN_HOLDING) continue;

            // Calculate proportional share
            uint256 share = (msg.value * balance) / totalSupply;
            if (share == 0) continue;

            investorCount++;

            // Send ETH to investor
            (bool success, ) = payable(investor).call{value: share}("");
            require(success, "Transfer failed");
        }

        lastDistribution = block.timestamp;
        emit RevenueDistributed(msg.value, investorCount);
    }
}