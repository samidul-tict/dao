https://github.com/0xMacro/student.samidul-tict/tree/0d538d6e55052745da94df2f3ae7caa2dcabafb3/dao

Audited By: Brandon Junus

# General Comments

Excellent work on your project corrections- you cleaned up a ton of issues! The rest of these general comments still stand. I added an L-1 for the membership joining logic, a Technical Mistake for the lack of onERC721Received, and a single code-quality level issue. Over all the project is looking great!

Couple of quick comments:

1. CollectorDao looks like its designed to have 1 vote / member, making it more "fair" for members with less ETH.

However, consider that user can create multiple addresses and therefore memberships for 1 ETH each. It feels like this would defeat the purpose of your design, as users with more ETH can beat the system.

Mostly just wanted to point this out as I'm not sure the best way to "fix" this, - one way would be a quadratic voting system, but a clever user could simply make multiple accounts again to get around that as well.

2. "Abstaining" in your system is counted as an "opposition"

To me, "abstain" means that you have considered the proposal, and are okay with EITHER success or failure- in other words its a neutral vote. This is contrasted with simply not voting, which would means the vote is never even considered.

Since abstaining is considered an opposition, proposals are more likely to fail, and members don't have a way to vote as "neutral".

This is just my opinion though based on how I understand the meaning of the word "abstain" as it relates to voting. I think if you deployed this CollectorDAO and put in the docs online that "abstaining" would be counted as an opposition vote to make sure that users are on the same page before becoming members, it should be fine.

# Design Exercise

Great job on these. I would add that for #2 there is a possibility of an extremely long chain (imagine delegating A->B->C... ->Z x 100 or something) which could result in an out of gas error.

# Issues

**[L-1]** Members may pay more than 1 ETH when joining DAO

In your DAO membership join function you have a greater-than-or-equal-to check for msg.value. This means a user could accidentally supply something like 10 ETH when join the DAO, and they would still only buy 1 membership token. In order to prevent this footgun entirely, that check should be a strict equality (==).

Consider checking that prospective members have contributed exactly 1 ETH in order to be considered a member.

**[Technical Mistake]** DAO contract doesn’t implement onERC721Received

The ERC721 spec contains a `safeTransferFrom` function that will fail if the recipient address does not implement the `onERC721Received` callback function. This means it's possible for the DAO to pass a Proposal for purchasing an NFT, but then have that transaction fail because the NftMarketplace used `safeTransferFrom`.

Consider implementing ERC721.onERC721Received, see the OZ contract for more info: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/utils/ERC721Holder.sol


**[Q-1]** buyNFT uses low level call function when it could just use buy

Buy NFT uses the low level function call below:

```
// (bool _success, ) = address(nftMarketPlace).call{value: _value}(
//     abi.encodeWithSignature(
//         "buy(address,uint256)",
//         _nftContract,
//         _nftId
//     )
// );
```

Consider replacing it with the actual buy function instead:

```
bool _success = nftMarketPlace.buy{value: _value}(_nftContract, _nftId);
```

# Nitpicks

1. Its really confusing that there's proposal.proposalState and getPropostalState(). Should probably just use one or the other.

# Score

| Reason                     | Score |
| -------------------------- | ----- |
| Late                       | -     |
| Unfinished features        | -     |
| Extra features             | 0     |
| Vulnerability              | 1     |
| Unanswered design exercise | -     |
| Insufficient tests         | -     |
| Technical mistake          | 1     |

Total: 2

Great Job!

```

```
