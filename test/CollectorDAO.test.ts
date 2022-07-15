import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber, Signature } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CollectorDAO, NFTMarketPlace, CollectorDAO__factory, NFTMarketPlace__factory } from "../typechain/";

const SECONDS_IN_DAY: number = 60 * 60 * 24;

describe("Collector DAO", function () {
  let collectorDAO: CollectorDAO;
  let collectorDAOFactory: CollectorDAO__factory;
  let nftMarketPlace: NFTMarketPlace;
  let nftMarketPlaceFactory: NFTMarketPlace__factory;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let aliceSignature: Signature;
  let bobSignature: Signature;
  let targets: string[];
  let values: BigNumber[];
  let votersList: string[];
  let calldata: string[];
  let secs: number;
  let description: string;
  let proposalID: BigNumber;
  let ballotType: any;
  let domain: any;
  let aliceBallot: any;
  let bobBallot: any;

  ballotType = {
    Ballot: [
      { name: "proposalID", type: "uint256" },
      { name: "voter", type: "address" },
      { name: "support", type: "uint8" },
    ],
  };

  this.beforeEach(async function () {
    [owner, treasury, alice, bob, ...addrs] = await ethers.getSigners();

    votersList = [
      addrs[0].address,
      addrs[1].address,
      addrs[2].address,
      addrs[3].address,
      addrs[4].address,
      addrs[5].address,
      addrs[6].address,
      addrs[7].address,
      addrs[8].address,
      addrs[9].address,
    ];

    nftMarketPlaceFactory = await ethers.getContractFactory("NFTMarketPlace");
    nftMarketPlace = (await nftMarketPlaceFactory.deploy()) as NFTMarketPlace;
    await nftMarketPlace.deployed();
    console.log("NFT contract address: ", nftMarketPlace.address);

    collectorDAOFactory = await ethers.getContractFactory("CollectorDAO");
    collectorDAO = (await collectorDAOFactory.connect(owner).deploy(treasury.address, nftMarketPlace.address)) as CollectorDAO;
    await collectorDAO.deployed();
    console.log("DAO contract address: ", collectorDAO.address);

    domain = {
      name: "Collector DAO",
      chainId: 1,
      verifyingContract: collectorDAO.address,
    };
  });

  describe("contribute to DAO", function () {
    it("deposit once and become member", async function () {
      expect(await collectorDAO.totalDAOMembers()).to.equal("0");
      await expect(
        collectorDAO
          .connect(alice)
          .subscribeToDAO({ value: ethers.utils.parseEther("10") })
      )
        .to.emit(collectorDAO, "Subscribed")
        .withArgs(alice.address, ethers.utils.parseEther("10"));
      expect(await collectorDAO.totalDAOMembers()).to.equal("1");
    });
    it("deposit small amount for multiple times and become member", async function () {
      expect(await collectorDAO.totalDAOMembers()).to.equal("0");
      await expect(
        collectorDAO
          .connect(alice)
          .subscribeToDAO({ value: ethers.utils.parseEther("0.5") })
      )
        .to.emit(collectorDAO, "Subscribed")
        .withArgs(alice.address, ethers.utils.parseEther("0.5"));
      expect(await collectorDAO.totalDAOMembers()).to.equal("0");
      await expect(
        collectorDAO
          .connect(alice)
          .subscribeToDAO({ value: ethers.utils.parseEther("0.5") })
      )
        .to.emit(collectorDAO, "Subscribed")
        .withArgs(alice.address, ethers.utils.parseEther("0.5"));
      expect(await collectorDAO.totalDAOMembers()).to.equal("1");
    });
    it("deposit and check the member count if already a member", async function () {
      await expect(
        collectorDAO
          .connect(alice)
          .subscribeToDAO({ value: ethers.utils.parseEther("2") })
      )
        .to.emit(collectorDAO, "Subscribed")
        .withArgs(alice.address, ethers.utils.parseEther("2"));
      expect(await collectorDAO.totalDAOMembers()).to.equal("1");
      await expect(
        collectorDAO
          .connect(alice)
          .subscribeToDAO({ value: ethers.utils.parseEther("2") })
      )
        .to.emit(collectorDAO, "Subscribed")
        .withArgs(alice.address, ethers.utils.parseEther("2"));
      expect(await collectorDAO.totalDAOMembers()).to.equal("1");
    });
  });

  describe("create a proprosal", function () {
    beforeEach(async function () {
      // first, become a member
      await collectorDAO
        .connect(alice)
        .subscribeToDAO({ value: ethers.utils.parseEther("10") });

      targets = [nftMarketPlace.address];
      values = [ethers.utils.parseEther("0")];
      calldata = [nftMarketPlace.interface.encodeFunctionData("getPrice", [bob.address,123])];
      description = "First Proposal";
    });
    it("try to create an empty proposal, by a member", async function () {
      targets = [];
      await expect(
        collectorDAO
          .connect(alice)
          .createProposal(targets, values, calldata, description)
      ).to.be.revertedWith("EMPTY_PROPOSAL");
    });
    it("try to create an invalid proposal, by a member", async function () {
      values = [];
      await expect(
        collectorDAO
          .connect(alice)
          .createProposal(targets, values, calldata, description)
      ).to.be.revertedWith("INVALID_PROPOSAL_LENGTH");
    });
    it("create a proprosal, by a member", async function () {
      await collectorDAO
        .connect(alice)
        .createProposal(targets, values, calldata, description);
    });
    it("create same proprosal twice, by a member", async function () {
      await collectorDAO
        .connect(alice)
        .createProposal(targets, values, calldata, description);

      await expect(
        collectorDAO
          .connect(alice)
          .createProposal(targets, values, calldata, description)
      ).to.be.revertedWith("PROPOSAL_ALREADY_EXIST");
    });
    it("create same proprosal twice, by another member", async function () {
      await collectorDAO
        .connect(alice)
        .createProposal(targets, values, calldata, description);

      await collectorDAO
        .connect(bob)
        .subscribeToDAO({ value: ethers.utils.parseEther("10") });
      await expect(
        collectorDAO
          .connect(bob)
          .createProposal(targets, values, calldata, description)
      ).to.be.revertedWith("PROPOSAL_ALREADY_EXIST");
    });
    it("create a proprosal, by someone other than member", async function () {
      await expect(
        collectorDAO
          .connect(bob)
          .createProposal(targets, values, calldata, description)
      ).to.be.revertedWith("NOT_A_MEMBER");
    });
  });

  describe("cast vote", function () {
    beforeEach(async function () {
      // first, become a member
      await collectorDAO
        .connect(alice)
        .subscribeToDAO({ value: ethers.utils.parseEther("10") });
      await collectorDAO
        .connect(addrs[0])
        .subscribeToDAO({ value: ethers.utils.parseEther("10") });

      targets = [nftMarketPlace.address];
      values = [ethers.utils.parseEther("0")];
      calldata = [
        nftMarketPlace.interface.encodeFunctionData("getPrice", [
          bob.address,
          123
        ])
      ];
      description = "First Proposal";

      //create a proposal
      const txReceipt = await collectorDAO
        .connect(alice)
        .createProposal(targets, values, calldata, description);
      const resolvedReceipt = await txReceipt.wait();
      proposalID = resolvedReceipt.events?.find(
        (event) => event.event === "ProposalCreated"
      )?.args![0];
    });
    describe("cast vote in your own", function () {
      describe("cast vote by member", function () {
        it("vote a proposal which is in DRAFT stage", async function () {
          await expect(
            collectorDAO.connect(alice).castVote(proposalID, 0)
          ).to.be.revertedWith("NOT_AN_ACTIVE_PROPOSAL");
        });
        it("vote a proposal which crossed the voting end date", async function () {
          // project crossed the votingEndDate stage
          secs = 6 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          await expect(
            collectorDAO.connect(alice).castVote(proposalID, 0)
          ).to.be.revertedWith("NOT_AN_ACTIVE_PROPOSAL");
        });
        it("vote a proposal which crossed the execution deadline", async function () {
          // project is in EXPIRED stage
          secs = 8 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          await expect(
            collectorDAO.connect(alice).castVote(proposalID, 0)
          ).to.be.revertedWith("NOT_AN_ACTIVE_PROPOSAL");
        });
        it("a person who became member after the proposal creation", async function () {
          // forward the time ahead
          secs = SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          await collectorDAO
            .connect(bob)
            .subscribeToDAO({ value: ethers.utils.parseEther("10") });

          // move to ACTIVE stage
          secs = 2 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          await expect(
            collectorDAO.connect(bob).castVote(proposalID, 0)
          ).to.be.revertedWith("CANNOT_VOTE_FOR_THIS_PROPOSAL");
        });
        it("a member voted with invalid option, something other than 0/1/2", async function () {
          // move to ACTIVE stage
          secs = 3 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          await expect(
            collectorDAO.connect(alice).castVote(proposalID, 3)
          ).to.be.revertedWith("NOT_A_VALID_CHOICE");
        });
        it("a member who already voted", async function () {
          // move to ACTIVE stage
          secs = 3 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          // vote for the first time
          await collectorDAO.connect(alice).castVote(proposalID, 2);

          // try second time
          await expect(
            collectorDAO.connect(alice).castVote(proposalID, 0)
          ).to.be.revertedWith("ALREADY_VOTED");
        });
        it("a person who became member before or at same time of proposal creation", async function () {
          // move to ACTIVE stage
          secs = 3 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          expect(collectorDAO.connect(alice).castVote(proposalID, 2)).to.be.ok;
        });
        it("check vote outcome, win scenario", async function () {
          // move to ACTIVE stage
          secs = 3 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          await collectorDAO.connect(alice).castVote(proposalID, 2);

          secs = 3 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");
          expect(await collectorDAO.getProposalState(proposalID)).to.equal(3);
        });
        it("check vote outcome, fail scenario", async function () {
          // move to ACTIVE stage
          secs = 3 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          await collectorDAO.connect(alice).castVote(proposalID, 1);

          secs = 3 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");
          expect(await collectorDAO.getProposalState(proposalID)).to.equal(2);
        });
      });
      describe("cast vote by other than member", function () {
        it("cast vote by other than member", async function () {
          await expect(
            collectorDAO.connect(bob).castVote(proposalID, 0)
          ).to.be.revertedWith("NOT_A_MEMBER");
        });
      });
    });
    describe("cast vote by signature", function () {
      beforeEach(async function () {
        aliceBallot = {
          proposalID: proposalID,
          voter: alice.address,
          support: 2,
        };
        aliceSignature = ethers.utils.splitSignature(
          await alice._signTypedData(domain, ballotType, aliceBallot)
        );

        bobBallot = {
          proposalID: proposalID,
          voter: bob.address,
          support: 1,
        };
        bobSignature = ethers.utils.splitSignature(
          await bob._signTypedData(domain, ballotType, bobBallot)
        );
      });
      describe("cast vote by member using signature", function () {
        it("vote a proposal which is not in ACTIVE stage", async function () {
          await expect(
            collectorDAO.castVoteBySig(
              aliceBallot,
              aliceSignature.v,
              aliceSignature.r,
              aliceSignature.s
            )
          ).to.be.revertedWith("NOT_AN_ACTIVE_PROPOSAL");
        });
        it("a person who became member after the proposal creation", async function () {
          // forward the time ahead
          secs = SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          await collectorDAO
            .connect(bob)
            .subscribeToDAO({ value: ethers.utils.parseEther("10") });

          // move to ACTIVE stage
          secs = 2 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          await expect(
            collectorDAO.castVoteBySig(
              bobBallot,
              bobSignature.v,
              bobSignature.r,
              bobSignature.s
            )
          ).to.be.revertedWith("CANNOT_VOTE_FOR_THIS_PROPOSAL");
        });
        it("a member who already voted", async function () {
          // move to ACTIVE stage
          secs = 3 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          // vote for the first time
          await collectorDAO.connect(alice).castVote(proposalID, 1);

          // try second time
          await expect(
            collectorDAO.castVoteBySig(
              aliceBallot,
              aliceSignature.v,
              aliceSignature.r,
              aliceSignature.s
            )
          ).to.be.revertedWith("ALREADY_VOTED");
        });
        it("a member voted with invalid option, something other than 0/1/2", async function () {
          // move to ACTIVE stage
          secs = 3 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          // create a wrong ballot
          aliceBallot = {
            proposalID: proposalID,
            voter: alice.address,
            support: 5,
          };
          aliceSignature = ethers.utils.splitSignature(
            await alice._signTypedData(domain, ballotType, aliceBallot)
          );

          await expect(
            collectorDAO.castVoteBySig(
              aliceBallot,
              aliceSignature.v,
              aliceSignature.r,
              aliceSignature.s
            )
          ).to.be.revertedWith("NOT_A_VALID_CHOICE");
        });
        it("forge signature: bob is signing in the name of alice", async function () {
          aliceSignature = ethers.utils.splitSignature(
            await bob._signTypedData(domain, ballotType, aliceBallot)
          );

          await expect(
            collectorDAO.castVoteBySig(
              aliceBallot,
              aliceSignature.v,
              aliceSignature.r,
              aliceSignature.s
            )
          ).to.be.revertedWith("INVALID_SIGNATURE");
        });
        it("a person who became member before or at same time of proposal creation", async function () {
          // move to ACTIVE stage
          secs = 3 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");

          expect(
            collectorDAO.castVoteBySig(
              aliceBallot,
              aliceSignature.v,
              aliceSignature.r,
              aliceSignature.s
            )
          ).to.be.ok;
        });
      });
      describe("cast vote in bulk using signature", function () {
        beforeEach(async function () {
          // move to ACTIVE stage
          secs = 3 * SECONDS_IN_DAY;
          await network.provider.send("evm_increaseTime", [secs]);
          await network.provider.send("evm_mine");
        });
        it("cast vote by other than member [at least one in the list]", async function () {
          await expect(
            collectorDAO.castVoteBySigInBulk(
              [aliceBallot, bobBallot],
              [aliceSignature.v, bobSignature.v],
              [aliceSignature.r, bobSignature.r],
              [aliceSignature.s, bobSignature.s]
            )
          ).to.be.revertedWith("NOT_A_MEMBER");
        });
        it("cast vote by member", async function () {
          let addr0Ballot: any = {
            proposalID: proposalID,
            voter: addrs[0].address,
            support: 1,
          };
          let addr0Signature: any = ethers.utils.splitSignature(
            await addrs[0]._signTypedData(domain, ballotType, addr0Ballot)
          );

          await collectorDAO.castVoteBySigInBulk(
            [aliceBallot, addr0Ballot],
            [aliceSignature.v, addr0Signature.v],
            [aliceSignature.r, addr0Signature.r],
            [aliceSignature.s, addr0Signature.s]
          );
        });
      });
      describe("cast vote by other than member using signature", function () {
        it("cast vote by other than member", async function () {
          await expect(
            collectorDAO.castVoteBySig(
              bobBallot,
              bobSignature.v,
              bobSignature.r,
              bobSignature.s
            )
          ).to.be.revertedWith("NOT_A_MEMBER");
        });
      });
    });
  });

  describe("cast vote: calculate quorum", function () {
    beforeEach(async function () {
      // first, become a member
      await collectorDAO
        .connect(alice)
        .subscribeToDAO({ value: ethers.utils.parseEther("10") });

      for (let i: number = 0; i < votersList.length; ++i) {
        await collectorDAO
          .connect(addrs[i])
          .subscribeToDAO({ value: ethers.utils.parseEther("10") });
      }

      targets = [nftMarketPlace.address];
      values = [ethers.utils.parseEther("0")];
      calldata = [
        nftMarketPlace.interface.encodeFunctionData("getPrice", [
          bob.address,
          123
        ])
      ];
      description = "First Proposal";

      //create a proposal
      const txReceipt = await collectorDAO
        .connect(alice)
        .createProposal(targets, values, calldata, description);
      const resolvedReceipt = await txReceipt.wait();
      proposalID = resolvedReceipt.events?.find(
        (event) => event.event === "ProposalCreated"
      )?.args![0];

      // move to ACTIVE stage
      secs = 3 * SECONDS_IN_DAY;
      await network.provider.send("evm_increaseTime", [secs]);
      await network.provider.send("evm_mine");
    });
    it("win scenario", async function () {
      for (let i: number = 0; i < votersList.length - 3; ++i) {
        if (i % 2 == 0) {
          await collectorDAO.connect(addrs[i]).castVote(proposalID, 2);
        } else {
          await collectorDAO.connect(addrs[i]).castVote(proposalID, 1);
        }
      }
      // move beyond voting end date stage
      secs = 3 * SECONDS_IN_DAY;
      await network.provider.send("evm_increaseTime", [secs]);
      await network.provider.send("evm_mine");

      expect(await collectorDAO.getProposalState(proposalID)).to.equals(3);
    });
    it("fail due to quorum doesn't meet", async function () {
      for (let i: number = 0; i < 1; ++i) {
        await collectorDAO.connect(addrs[i]).castVote(proposalID, 2);
      }
      // move beyond voting end date stage
      secs = 3 * SECONDS_IN_DAY;
      await network.provider.send("evm_increaseTime", [secs]);
      await network.provider.send("evm_mine");

      expect(await collectorDAO.getProposalState(proposalID)).to.equals(2);
    });
  });

  describe("execute a proposal", function () {
    beforeEach(async function () {
      // first, become a member
      await collectorDAO
        .connect(alice)
        .subscribeToDAO({ value: ethers.utils.parseEther("10") });

      targets = [nftMarketPlace.address, nftMarketPlace.address];
      values = [ethers.utils.parseEther("0"), ethers.utils.parseEther("5")];
      calldata = [
        nftMarketPlace.interface.encodeFunctionData("getPrice", [
          nftMarketPlace.address,
          123
        ]),
        nftMarketPlace.interface.encodeFunctionData("buy", [
          nftMarketPlace.address,
          123
        ])
      ];
      description = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("First Proposal")
      );

      //create a proposal
      const txReceipt = await collectorDAO
        .connect(alice)
        .createProposal(targets, values, calldata, "First Proposal");
      const resolvedReceipt = await txReceipt.wait();
      proposalID = resolvedReceipt.events?.find(
        (event) => event.event === "ProposalCreated"
      )?.args![0];

      // move to ACTIVE stage
      secs = 3 * SECONDS_IN_DAY;
      await network.provider.send("evm_increaseTime", [secs]);
      await network.provider.send("evm_mine");
    });
    it("execute a not succeeded proposal", async function () {
      expect(
        collectorDAO
          .connect(alice)
          .execute(targets, values, calldata, description)
      ).to.be.revertedWith("NOT_READY_TO_BE_EXECUTED");
    });
    it("execute a proposal, by someone other than the member", async function () {
      await expect(
        collectorDAO
          .connect(bob)
          .execute(targets, values, calldata, description)
      ).to.be.revertedWith("NOT_A_MEMBER");
    });
    it("execute a succeeded proposal, by member", async function () {
      await collectorDAO.connect(alice).castVote(proposalID, 2);

      secs = 3 * SECONDS_IN_DAY;
      await network.provider.send("evm_increaseTime", [secs]);
      await network.provider.send("evm_mine");

      await collectorDAO
        .connect(alice)
        .execute(targets, values, calldata, description);
      expect(
        await collectorDAO.connect(alice).getProposalState(proposalID)
      ).to.equals(5);
    });
    it("execute a succeeded proposal, by member after it is expired", async function () {
      await collectorDAO.connect(alice).castVote(proposalID, 2);

      secs = 5 * SECONDS_IN_DAY;
      await network.provider.send("evm_increaseTime", [secs]);
      await network.provider.send("evm_mine");

      expect(
        await collectorDAO.connect(alice).getProposalState(proposalID)
      ).to.equals(4);
      expect(
        collectorDAO
          .connect(alice)
          .execute(targets, values, calldata, description)
      ).to.be.revertedWith("NOT_READY_TO_BE_EXECUTED");
    });
  });

  describe("execute a proposal to purchase NFT", function () {
    it("execute a succeeded proposal, by a member", async function () {
      // first, become a member
      await collectorDAO.connect(alice).subscribeToDAO({value: ethers.utils.parseEther("10")});

      targets = [collectorDAO.address];
      values = [ethers.utils.parseEther("0")];
      /* const funcSig = ["function buyNFT(address _nftContract, uint256 _nftId, uint256 _maxAllowedValue)"];
      const iface = new ethers.utils.Interface(funcSig);
      calldata = [iface.encodeFunctionData("buyNFT", [bob.address,123,ethers.utils.parseEther("5")])]; */
      calldata = [collectorDAO.interface.encodeFunctionData("buyNFT", [bob.address,123,ethers.utils.parseEther("5")])];
      description = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("First Proposal"));

      // create a proposal
      const txReceipt = await collectorDAO.connect(alice).createProposal(targets, values, calldata, "First Proposal");
      const resolvedReceipt = await txReceipt.wait();
      proposalID = resolvedReceipt.events?.find((event) => event.event === "ProposalCreated")?.args![0];

      // move to ACTIVE stage so that members can vote
      secs = 3 * SECONDS_IN_DAY;
      await network.provider.send("evm_increaseTime", [secs]);
      await network.provider.send("evm_mine");
      await collectorDAO.connect(alice).castVote(proposalID, 2);

      // end the voting so that member can execute the proposal
      secs = 3 * SECONDS_IN_DAY;
      await network.provider.send("evm_increaseTime", [secs]);
      await network.provider.send("evm_mine");

      await collectorDAO.connect(alice).execute(targets, values, calldata, description);
      expect(
        await collectorDAO.connect(alice).getProposalState(proposalID)
      ).to.equals(5);
    });
    it("execute a succeeded proposal, by a member with currentBalance < NFT price", async function () {
      // first, become a member
      await collectorDAO.connect(alice).subscribeToDAO({value: ethers.utils.parseEther("1")});

      targets = [collectorDAO.address];
      values = [ethers.utils.parseEther("0")];
      /* const funcSig = ["function buyNFT(address _nftContract, uint256 _nftId, uint256 _maxAllowedValue)"];
      const iface = new ethers.utils.Interface(funcSig);
      calldata = [iface.encodeFunctionData("buyNFT", [bob.address,123,ethers.utils.parseEther("5")])]; */
      calldata = [collectorDAO.interface.encodeFunctionData("buyNFT", [bob.address,123,ethers.utils.parseEther("5")])];
      description = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("First Proposal"));

      // create a proposal
      const txReceipt = await collectorDAO.connect(alice).createProposal(targets, values, calldata, "First Proposal");
      const resolvedReceipt = await txReceipt.wait();
      proposalID = resolvedReceipt.events?.find((event) => event.event === "ProposalCreated")?.args![0];

      // move to ACTIVE stage so that members can vote
      secs = 3 * SECONDS_IN_DAY;
      await network.provider.send("evm_increaseTime", [secs]);
      await network.provider.send("evm_mine");
      await collectorDAO.connect(alice).castVote(proposalID, 2);

      // end the voting so that member can execute the proposal
      secs = 3 * SECONDS_IN_DAY;
      await network.provider.send("evm_increaseTime", [secs]);
      await network.provider.send("evm_mine");

      await expect(collectorDAO.connect(alice).execute(targets, values, calldata, description))
      .to.be.revertedWith("DOES_NOT_HAVE_ENOUGH_BALANCE");
    });
    it("execute a succeeded proposal, by a member with _maxAllowedValue < NFT price", async function () {
      // first, become a member
      await collectorDAO.connect(alice).subscribeToDAO({value: ethers.utils.parseEther("10")});

      targets = [collectorDAO.address];
      values = [ethers.utils.parseEther("0")];
      /* const funcSig = ["function buyNFT(address _nftContract, uint256 _nftId, uint256 _maxAllowedValue)"];
      const iface = new ethers.utils.Interface(funcSig);
      calldata = [iface.encodeFunctionData("buyNFT", [bob.address,123,ethers.utils.parseEther("5")])]; */
      calldata = [collectorDAO.interface.encodeFunctionData("buyNFT", [bob.address,123,ethers.utils.parseEther("2")])];
      description = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("First Proposal"));

      // create a proposal
      const txReceipt = await collectorDAO.connect(alice).createProposal(targets, values, calldata, "First Proposal");
      const resolvedReceipt = await txReceipt.wait();
      proposalID = resolvedReceipt.events?.find((event) => event.event === "ProposalCreated")?.args![0];

      // move to ACTIVE stage so that members can vote
      secs = 3 * SECONDS_IN_DAY;
      await network.provider.send("evm_increaseTime", [secs]);
      await network.provider.send("evm_mine");
      await collectorDAO.connect(alice).castVote(proposalID, 2);

      // end the voting so that member can execute the proposal
      secs = 3 * SECONDS_IN_DAY;
      await network.provider.send("evm_increaseTime", [secs]);
      await network.provider.send("evm_mine");

      await expect(collectorDAO.connect(alice).execute(targets, values, calldata, description))
      .to.be.revertedWith("DOES_NOT_HAVE_ENOUGH_ALLOWANCE");
    });
    it("call buyNFT() directly without execute method, by a member", async function () {
      expect(collectorDAO.connect(alice).buyNFT(bob.address, 123, ethers.utils.parseEther("10")))
      .to.be.revertedWith("CALL_VIA_EXECUTE_FUNCTION");
    });
  });
});
