# Design Exercises - 1:

Per project specs there is no vote delegation; it's not possible for Alice to delegate her voting power to Bob, so that when Bob votes he does so with the voting power of both himself and Alice in a single transaction. This means for someone's vote to count, that person must sign and broadcast their own transaction every time. How would you design your contract to allow for non-transitive vote delegation?

We can do this in two different ways:
1. time bound delegation: A can delegate her/ his vote to B for a specific period of time. During this period B can vote on behalf of A for any proposal. This is a simple but efficient way of delegating task/ vote. We can take a mapping to store these details. mapping (address(A) => struct {address(B), startDate, endDate}).

2. project specific delegation: this is relatively complex but provides more granular control over delegation. A can delegate voting rights for one proposal to B and for another to C at the same point of time. In this way delegatee will not be overloaded. This can be achieved either using a data structure or via user signature.
A can sign and provide B & C the authority to cast vote on behalf of him.
Alternatively, we can maintain two map value to store the details. for example:
mapping (address(A) => [proposal1, proposal2, proposal3, ...])
mapping (proposal1 => address(B), mapping (proposal2 => address(C).

# Design Exercises - 2:

What are some problems with implementing transitive vote delegation on-chain? (Transitive means: If A delegates to B, and B delegates to C, then C gains voting power from both A and B, while B has no voting power).

Transitive vote delegation can cause following problems:
1. circular dependency which may lead to a deadlock.
2. highly unexpected outcome, because A & C may not be related to each other hence C might not cast the vote responsibly.
3. all the voting power may end up to few addresses only and they can manupulate the result.

# Voting Mechanism:

I have implemented 1 vote/ address concept. Members who was enrolled on or before the proposal creation will have the oppurtunity to vote. User can cast vote their vote in three different ways i.e. for/ against/ abstain.

Once proposal will be created then user will have 2 days to discuss and then voting process will be started and the same will continue for next 3 days. During this tenure user can cast their vote themselves or sign the ballot and provide to an external entity to pass the signed ballot.

When voting process with ends, system will calculate the result based on the following criteria:
if forVotes > (againstVotes + abstainVotes) and totalVoted >= quorum then it will be considered as SUCCEEDED, otherwise DEFEATED.
totalVoted = forVotes + againstVotes + abstainVotes
quorum = (total member during proposal creation * 25) / 100

If SUCCEEDED then there will be a 2 days window to execute the proposal. Any member can do the same. Beyond this 2 days period proposal will be marked as EXPIRED and the purpose will not be fulfilled.

# Risks & trade offs:
1. 1 vote/ member: every member will be treated equally which is good, but member will large shares will not have any extra
    power to take decision which might demotivate them and they can sell their shares.
    to avoid this issue, we can add another parameter in castVote [i.e. weight] and multiply the vote with that.
2. user may miss one/ few proposals in their busy schedule.
    we can provide vote delegation functionality to avoid this issue.
3. sometimes members may not vote on time or quorum may not reach. in that case proposal will fail.
    in this scenario, we can set proposal = SUCCESS during creation members will have the goal to oppose it. in that way people may vote if they cares.
4. we are taking the snapshot of all the available members during proposal creation. problem with this approach is, we have  less member to vote.

------------------------------------- Errors Corrected --------------------------------------
1. **[H-1]** CollectorDAO.sol has a "buyNFT", allows draining of funds. Implemented the buyNFT() function properly in CollectorDAO.sol contract.
2. **[H-2]** CollectorDAO.sol "execute" function has potential for reenterncy. Fixed the issue by placing the following line before the low lavel call() function in CollectorDAO.sol contract.
proposal.proposalState = ProposalState.EXECUTED;
3. **[Technical Mistake]** Proposer can extend the vote time for a proposal indefinitely. Fixed the issue by using the following line in CollectorDAO.sol contract.
require(proposal.proposer == address(0), "PROPOSAL_ALREADY_EXIST");
4. **[L-1]** Quorum calculation for DAO with a small number of members is incorrect. Fixed the qorum calculation for small number of voters. Please refer step-152 to 155 in CollectorDAO.sol contract.
5. **[Extra Feature - 1]** Cancel Function for Proposal. Removed CancelProposal() function from CollectorDAO.sol contract.
6. **[Q-1]** Proposal object has a lot of variables unnecessarily saved to state (which wastes a lot of gas!). Please refer the updated Proposal struct in ICollectorDAO.sol interface. Also refer getProposalState() function in CollectorDAO.sol contract.
7. **[Q-2]** Prefer "external" to "public" for execute function. Updated as suggested in CollectorDAO.sol contract.
8. **[Q-4]** No event for execution. Added the event at line 185 in CollectorDAO.sol contract.
--------------------------------------------- END -------------------------------------------