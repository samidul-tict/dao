//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

interface ICollectorDAO {

    enum ProposalState {
        DRAFT,      // 0
        ACTIVE,     // 1
        DEFEATED,   // 2
        SUCCEEDED,  // 3
        EXPIRED,    // 4
        EXECUTED    // 5
    }

    struct Proposal {
        uint256 proposalID;
        address proposer;
        uint256 createdAt;
        uint256 againstVotes; // select 0
        uint256 abstainVotes; // // select 1
        uint256 forVotes; // select 2
        uint256 totalVoters; // during proposal creation
        ProposalState proposalState;
        mapping(address => bool) hasVoted; // keep track of vote by member's address
    }

    struct Ballot {
        uint256 proposalID;
        address voter;
        uint8 support;
    }

    event ProposalCreated(
        uint256 proposalID,
        address indexed proposer,
        uint256 startTime,
        uint256 endTime,
        string description
    );

    // Emitted when a proposal is executed.
    event ProposalExecuted(uint256 proposalID);

    // Emitted when a vote is cast without params.
    event VoteCasted(address indexed voter, uint256 proposalID);

    // Emitted when a person subscribe to the DAO
    event Subscribed(address indexed _member, uint256 _amount);

    function subscribeToDAO() external payable;

    function castVote(uint256 proposalID, uint8 _support) external;

    function castVoteBySigInBulk(Ballot[] memory _ballots, uint8[] memory _vs, bytes32[] memory _rs, bytes32[] memory _ss) external;
    
    function createProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) external returns(uint256 proposalID);

    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) external payable returns(uint256);

}