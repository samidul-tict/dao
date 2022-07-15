//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

import "hardhat/console.sol";
import "./INFTMarketPlace.sol";

/**
 * @dev this contract was created just for testing, so logic has not been implemented properly 
 * and console.sol is being used.
 */

contract NFTMarketPlace is INFTMarketPlace {

    address public owner;
    uint256 public NFTPrice = 5 ether;
    
    function getPrice(address nftContract, uint256 nftId) external view override returns (uint256 price) {
        console.log("getPrice method called: NFTPrice", NFTPrice);
        return NFTPrice;
    }

    function buy(address nftContract, uint256 nftId) external payable override returns (bool success) {
        require(msg.value == NFTPrice, "PROVIDE_EXACT_PRICE");
        //safeTransferFrom(nftContract, msg.sender, nftId);
        success = true;
        console.log("buy method was called: safeTransferFrom occurred", msg.sender);
        return success;
    }
}