// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RenewableToken is ERC20, Ownable {
    uint256 public constant TOKEN_PRICE = 1 ether; // 1 token = 1 ETH (represents €1 in our model)
    uint256 public constant MAX_SUPPLY = 100_000_000; // Solar project capped at 1 million tokens

    constructor() ERC20("RenewableToken", "RET") Ownable(msg.sender) {}

    // Only the project owner can mint tokens to investors
    function mint(address investor, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY * 10**decimals(), "Max supply exceeded");
        _mint(investor, amount);
    }
}