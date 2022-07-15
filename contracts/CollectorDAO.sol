//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.9;

import "./INFTMarketPlace.sol";
import "./ICollectorDAO.sol";
import "./CollectorDAOLib.sol";

contract CollectorDAO is ICollectorDAO {

    INFTMarketPlace nftMarketPlace;

    address public immutable owner;
    address public treasury;
    uint256 public totalDAOFund;
    uint256 public currentBalance;
    uint256 public totalDAOMembers;
    uint256 public totalProposals;

    // available proposals
    mapping(uint256 => Proposal) public proposals;

    // store the total contribution of each person
    mapping (address => uint256) totalSubscriptionByMember;

    // list of DAO members
    mapping(address => bool) public daoMembers;

    // joining time for each member
    mapping(address => uint256) public joiningTimeForMember;    
    
    constructor(address _treasury, address _nftMarketPlace) {
        owner = msg.sender;
        treasury = _treasury;
        nftMarketPlace = INFTMarketPlace(_nftMarketPlace);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyMember() {
        require(daoMembers[msg.sender], "NOT_A_MEMBER");
        _;
    }

    function _validateParams(address[] memory targets, uint256[] memory values, bytes[] memory calldatas) internal pure {
        uint256 targetLen = targets.length;

        require(targetLen > 0, "EMPTY_PROPOSAL");
        require(targetLen == values.length && targetLen == calldatas.length, "INVALID_PROPOSAL_LENGTH");        
    }

    function _hashProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(targets, values, calldatas, descriptionHash)));
    }

    function _subscribeToDAO(address _member, uint256 _amount) internal {
        require(_amount > 0, "NOT_A_VALID_AMOUNT");

        totalDAOFund += _amount;
        currentBalance = totalDAOFund;
        totalSubscriptionByMember[_member] += _amount;

        if(!daoMembers[_member] && totalSubscriptionByMember[_member] >= CollectorDAOLib.DAO_MEMBERSHIP_FEE) {
            // set joining time
            daoMembers[_member] = true;
            joiningTimeForMember[_member] = block.timestamp;
            ++totalDAOMembers;
        }
        emit Subscribed(_member, _amount);
    }

    function _castVote(uint256 proposalID, address _voter, uint8 _support) internal {

        require(getProposalState(proposalID) == ProposalState.ACTIVE, "NOT_AN_ACTIVE_PROPOSAL");
        require(joiningTimeForMember[_voter] <= proposals[proposalID].createdAt, "CANNOT_VOTE_FOR_THIS_PROPOSAL");
        require(!proposals[proposalID].hasVoted[_voter], "ALREADY_VOTED");
        require(_support >= 0 && _support <= 2, "NOT_A_VALID_CHOICE");

        if(_support == 0) {
            ++proposals[proposalID].againstVotes;
        } else if (_support == 1) {
            ++proposals[proposalID].abstainVotes;
        } else {
            ++proposals[proposalID].forVotes;
        }
        proposals[proposalID].hasVoted[msg.sender] = true;

        emit VoteCasted(msg.sender, proposalID);
    }

    function _verifyCallResult(bool success, bytes memory returndata, string memory errorMessage) internal pure 
    returns(bytes memory) {
        if (success) {
            return returndata;
        } else {
            // Look for revert reason and bubble it up if present
            if (returndata.length > 0) {
                // The easiest way to bubble the revert reason is using memory via assembly
                /// @solidity memory-safe-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }
    }

    function _execute(address _target, uint _value, bytes memory _calldata) internal {
        string memory errorMessage;
        (bool success, bytes memory returndata) = _target.call{value: _value}(_calldata);
        _verifyCallResult(success, returndata, errorMessage);
    }

    function buyNFT(address _nftContract, uint256 _nftId, uint256 _maxAllowedValue) public {
        require(msg.sender == address(this), "CALL_VIA_EXECUTE_FUNCTION");
        uint256 _value = nftMarketPlace.getPrice(_nftContract, _nftId);
        require(currentBalance >= _value, "DOES_NOT_HAVE_ENOUGH_BALANCE");
        require(_maxAllowedValue >= _value, "DOES_NOT_HAVE_ENOUGH_ALLOWANCE");

        currentBalance -= _value;
        (bool _success, ) = address(nftMarketPlace).call{value: _value}(abi.encodeWithSignature(
            "buy(address,uint256)", _nftContract, _nftId)
        );
        require(_success, "UNABLE_TO_BUY_NFT");
    }

    function getProposalState(uint256 proposalID) public view returns(ProposalState _state) {
        
        Proposal storage proposal = proposals[proposalID];

        if(proposal.proposalState == ProposalState.EXECUTED) {
            _state = proposal.proposalState;
        } else {
            if(block.timestamp < proposal.createdAt + CollectorDAOLib.VOTING_DELAY) {
                _state = ProposalState.DRAFT;
            } else if(block.timestamp >= proposal.createdAt + CollectorDAOLib.VOTING_DELAY
             && block.timestamp < proposal.createdAt + CollectorDAOLib.VOTING_DELAY + CollectorDAOLib.VOTING_PERIOD) {
                _state = ProposalState.ACTIVE;
            } else if(block.timestamp >= proposal.createdAt + CollectorDAOLib.VOTING_DELAY + CollectorDAOLib.VOTING_PERIOD
             + CollectorDAOLib.EXECUTION_PERIOD) {
                _state = ProposalState.EXPIRED;
            } else {
                uint256 _totalVoted = 100 * (proposal.forVotes + proposal.againstVotes + proposal.abstainVotes);
                uint256 _oppositionCount = proposal.againstVotes + proposal.abstainVotes;
                uint256 _quorum = proposal.totalVoters * CollectorDAOLib.QUORUM;
                if(_totalVoted >= _quorum && proposal.forVotes > _oppositionCount) {
                    _state = ProposalState.SUCCEEDED;
                } else {
                    _state = ProposalState.DEFEATED;
                }
            }
        }
        return _state;
    }

    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) external payable override onlyMember() returns(uint256) {

        _validateParams(targets, values, calldatas);
        uint256 proposalID = _hashProposal(targets, values, calldatas, descriptionHash);
        
        require(getProposalState(proposalID) == ProposalState.SUCCEEDED, "NOT_READY_TO_BE_EXECUTED");

        Proposal storage proposal = proposals[proposalID];
        proposal.proposalState = ProposalState.EXECUTED;
        uint256 targetsLength = targets.length;

        for (uint256 i = 0; i < targetsLength; ++i) {
            _execute(targets[i], values[i], calldatas[i]);
        }

        emit ProposalExecuted(proposalID);
        return proposalID;
    }

    function createProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) external override onlyMember() returns(uint256 proposalID) {

        _validateParams(targets, values, calldatas);
        proposalID = _hashProposal(targets, values, calldatas, keccak256(bytes(description)));
        Proposal storage proposal = proposals[proposalID];

        require(proposal.proposer == address(0), "PROPOSAL_ALREADY_EXIST");

        proposal.proposer = msg.sender;
        proposal.createdAt = block.timestamp;
        proposal.totalVoters = totalDAOMembers;
        proposal.proposalState = ProposalState.DRAFT;
        ++totalProposals;

        emit ProposalCreated(proposalID, msg.sender, proposal.createdAt + CollectorDAOLib.VOTING_DELAY,
         proposal.createdAt + CollectorDAOLib.VOTING_DELAY + CollectorDAOLib.VOTING_PERIOD, description
        );
        return proposalID;
    }

    function castVote(uint256 proposalID, uint8 _support) external override onlyMember() {
        _castVote(proposalID, msg.sender, _support);
    }

    function castVoteBySig(Ballot memory _ballot, uint8 _v, bytes32 _r, bytes32 _s) public {

        bytes32 DOMAIN_SEPARATOR = keccak256(abi.encode(
            CollectorDAOLib.DOMAIN_TYPEHASH,
            keccak256(bytes(CollectorDAOLib.NAME)),
            1,
            address(this)
            )
        );
        bytes32 hashStruct = keccak256(abi.encode(
            CollectorDAOLib.BALLOT_TYPEHASH,
            _ballot.proposalID,
            _ballot.voter,
            _ballot.support
            )
        );
        bytes32 _digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hashStruct));
        address _signer = ecrecover(_digest, _v, _r, _s);
        require(_signer != address(0), "ECDSA_INVALID_SIGNATURE");
        require(_signer == _ballot.voter, "INVALID_SIGNATURE");
        require(daoMembers[_signer], "NOT_A_MEMBER");

        _castVote(_ballot.proposalID, _ballot.voter, _ballot.support);
    }

    function castVoteBySigInBulk(Ballot[] memory _ballots, uint8[] memory _vs, bytes32[] memory _rs, bytes32[] memory _ss) 
    external override {
        
        uint256 i = 0;
        uint256 ballotLength = _ballots.length;

        for ( ; i < ballotLength; ) {
            castVoteBySig(_ballots[i], _vs[i], _rs[i], _ss[i]);
            ++i;
        }
    }

    function subscribeToDAO() external payable override {
        _subscribeToDAO(msg.sender, msg.value);
    }

    receive() external payable {
        _subscribeToDAO(msg.sender, msg.value);
    }

    fallback() external payable {
        _subscribeToDAO(msg.sender, msg.value);
    }
}