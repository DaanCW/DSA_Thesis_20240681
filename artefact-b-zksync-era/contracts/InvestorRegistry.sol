// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract InvestorRegistry is Ownable {

    struct Investor {
        bool isRegistered;
        bool isEUResident;
        bool isAdult;
    }

    mapping(address => Investor) private investors;

    event InvestorRegistered(address indexed investor);
    event InvestorRemoved(address indexed investor);

    constructor() Ownable(msg.sender) {}

    // Owner registers an investor after off-chain verification
    function registerInvestor(address investor, bool isEUResident, bool isAdult) external onlyOwner {
        require(!investors[investor].isRegistered, "Already registered");
        require(isEUResident, "Must be EU resident");
        require(isAdult, "Must be 18 or older");

        investors[investor] = Investor(true, isEUResident, isAdult);
        emit InvestorRegistered(investor);
    }

    // Remove an investor if needed
    function removeInvestor(address investor) external onlyOwner {
        require(investors[investor].isRegistered, "Not registered");
        delete investors[investor];
        emit InvestorRemoved(investor);
    }

    // Check if a wallet is eligible
    function isEligible(address investor) external view returns (bool) {
        Investor memory i = investors[investor];
        return i.isRegistered && i.isEUResident && i.isAdult;
    }
}