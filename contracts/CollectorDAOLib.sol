//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

library CollectorDAOLib {
    
    string public constant NAME = "Collector DAO";
    uint256 public constant DAO_MEMBERSHIP_FEE = 1 ether;
    uint256 public constant QUORUM = 25;
    uint256 public constant VOTING_DELAY = 2 days;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant EXECUTION_PERIOD = 2 days;
 
    /// @notice The EIP-712 typehash for the contract's domain
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

    /// @notice The EIP-712 typehash for the ballot struct used by the contract
    bytes32 public constant BALLOT_TYPEHASH = keccak256("Ballot(uint256 proposalID,address voter,uint8 support)");
}