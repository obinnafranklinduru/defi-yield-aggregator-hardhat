const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  abi: IERC20_ABI,
} = require("@openzeppelin/contracts/build/contracts/IERC20.json");

const cometABI = require("../ABIs/cometABI.json");
const aaveV3PoolABI = require("../ABIs/aaveV3PoolABI.json");
const getAPY = require("../utils/getAPY");

const WETH_Address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const cWETHv3 = "0xA17581A9E3356d9A858b789D68B4d866e593aE94";
const aaveV3Pool = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";

describe("YieldAggregator", function () {
  let WETH_CONTRACT;
  let AAVE_WETH_CONTRACT;
  let COMPOUND_PROXY;
  let AAVE_POOL_PROVIDER;

  let YIELD_AGGREGATOR;
  let OWNER;
  let USER1;
  let USER2;

  // Constants
  const INITIAL_SUPPLY = ethers.parseEther("1000000");
  const BASIS_POINTS = 10000;
  const REBALANCE_COOLDOWN = 24 * 60 * 60; // 1 day in seconds

  beforeEach(async function () {
    [OWNER, USER1, USER2] = await ethers.getSigners();

    WETH_CONTRACT = new ethers.Contract(WETH_Address, IERC20_ABI, OWNER);
    AAVE_WETH_CONTRACT = new ethers.Contract(WETH_Address, cometABI.abi, OWNER);
    COMPOUND_PROXY = new ethers.Contract(cWETHv3, cometABI.abi, OWNER);
    AAVE_POOL_PROVIDER = new ethers.Contract(aaveV3Pool, aaveV3PoolABI, OWNER);

    const yieldAggregator = await ethers.getContractFactory("YieldAggregator");
    const YIELD_AGGREGATOR = await yieldAggregator.deploy(
      WETH_CONTRACT,
      AAVE_WETH_CONTRACT,
      COMPOUND_PROXY,
      AAVE_POOL_PROVIDER,
      OWNER.address
    );
    await YIELD_AGGREGATOR.waitForDeployment();
    await YIELD_AGGREGATOR.getAddress();

    // // Mint initial tokens to users
    // await wethToken.mint(user1.address, INITIAL_SUPPLY);
    // await wethToken.mint(user2.address, INITIAL_SUPPLY);

    // // Approve YieldAggregator to spend tokens
    // await wethToken
    //   .connect(user1)
    //   .approve(yieldAggregator.address, INITIAL_SUPPLY);
    // await wethToken
    //   .connect(user2)
    //   .approve(yieldAggregator.address, INITIAL_SUPPLY);
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await YIELD_AGGREGATOR.owner()).to.equal(OWNER.address);
    });

    it("Should initialize with correct addresses", async function () {
      expect(await YIELD_AGGREGATOR.WETH_CONTRACT()).to.equal(
        WETH_CONTRACT.address
      );
      // expect(await YIELD_AGGREGATOR.AAVE_WETH_CONTRACT()).to.equal(
      //   AaveWethTokenContract.address
      // );
      // expect(await YIELD_AGGREGATOR.COMPOUND_PROXY_ADDRESS()).to.equal(
      //   CompoundCometContract.address
      // );
      // expect(await YIELD_AGGREGATOR.AAVE_POOL_PROVIDER()).to.equal(
      //   AavePoolContractProvider.address
      // );
      // expect(await YIELD_AGGREGATOR.feeCollector()).to.equal(
      //   feeCollector.address
      // );
    });

    it("Should initialize with correct fee structure", async function () {
      const fees = await YIELD_AGGREGATOR.fees();
      expect(fees.annualManagementFeeInBasisPoints).to.equal(100); // 1%
      expect(fees.performanceFee).to.equal(1000); // 10%
    });
  });

  // describe("Deposits", function () {
  //   const depositAmount = ethers.parseEther("100");

  //   it("Should accept deposits and update state correctly", async function () {
  //     const compAPY = 500; // 5%
  //     const aaveAPY = 300; // 3%

  //     await yieldAggregator
  //       .connect(user1)
  //       .deposit(depositAmount, compAPY, aaveAPY);

  //     const userDeposit = await yieldAggregator.userDeposits(user1.address);
  //     expect(userDeposit.amount).to.equal(depositAmount);

  //     const totalDeposits = await yieldAggregator.totalDeposits();
  //     expect(totalDeposits).to.equal(depositAmount);

  //     // Should select Compound as it has higher APY
  //     const protocolInfo = await yieldAggregator.getCurrentProtocolInfo();
  //     expect(protocolInfo._protocol).to.equal(1); // COMPOUND
  //   });

  //   it("Should revert deposit with zero amount", async function () {
  //     await expect(
  //       yieldAggregator.connect(user1).deposit(0, 500, 300)
  //     ).to.be.revertedWithCustomError(
  //       yieldAggregator,
  //       "YieldAggregator__InsufficientBalance"
  //     );
  //   });

  //   it("Should handle multiple deposits from different users", async function () {
  //     await yieldAggregator.connect(user1).deposit(depositAmount, 500, 300);
  //     await yieldAggregator
  //       .connect(user2)
  //       .deposit(depositAmount.mul(2), 500, 300);

  //     const user1Deposit = await yieldAggregator.userDeposits(user1.address);
  //     const user2Deposit = await yieldAggregator.userDeposits(user2.address);

  //     expect(user1Deposit.amount).to.equal(depositAmount);
  //     expect(user2Deposit.amount).to.equal(depositAmount.mul(2));
  //     expect(await yieldAggregator.totalDeposits()).to.equal(
  //       depositAmount.mul(3)
  //     );
  //   });
  // });

  // describe("Withdrawals", function () {
  //   const depositAmount = ethers.parseEther("100");

  //   beforeEach(async function () {
  //     await yieldAggregator.connect(user1).deposit(depositAmount, 500, 300);
  //   });

  //   it("Should allow full withdrawal with yield", async function () {
  //     // Simulate yield by sending additional tokens to protocol
  //     const yieldAmount = ethers.parseEther("10");
  //     await wethToken.mint(CompoundCometContract.address, yieldAmount);

  //     const withdrawnAmount = await yieldAggregator.connect(user1).withdraw();

  //     const expectedAmount = depositAmount.add(yieldAmount);
  //     expect(withdrawnAmount).to.be.closeTo(
  //       expectedAmount,
  //       ethers.parseEther("0.1")
  //     );

  //     const userDeposit = await yieldAggregator.userDeposits(user1.address);
  //     expect(userDeposit.amount).to.equal(0);
  //   });

  //   it("Should collect fees on yield during withdrawal", async function () {
  //     const yieldAmount = ethers.parseEther("10");
  //     await wethToken.mint(CompoundCometContract.address, yieldAmount);

  //     const feeCollectorBalanceBefore = await wethToken.balanceOf(
  //       feeCollector.address
  //     );

  //     await yieldAggregator.connect(user1).withdraw();

  //     const feeCollectorBalanceAfter = await wethToken.balanceOf(
  //       feeCollector.address
  //     );
  //     expect(feeCollectorBalanceAfter.sub(feeCollectorBalanceBefore)).to.be.gt(
  //       0
  //     );
  //   });
  // });

  // describe("Rebalancing", function () {
  //   const depositAmount = ethers.parseEther("100");

  //   beforeEach(async function () {
  //     await yieldAggregator.connect(user1).deposit(depositAmount, 500, 300);
  //   });

  //   it("Should rebalance to higher yielding protocol", async function () {
  //     // Wait for cooldown
  //     await time.increase(REBALANCE_COOLDOWN);

  //     const initialProtocol = (await yieldAggregator.getCurrentProtocolInfo())
  //       ._protocol;

  //     // Trigger rebalance with Aave having higher APY
  //     await yieldAggregator.connect(owner).rebalance(300, 500);

  //     const newProtocol = (await yieldAggregator.getCurrentProtocolInfo())
  //       ._protocol;
  //     expect(newProtocol).to.not.equal(initialProtocol);
  //   });

  //   it("Should respect cooldown period", async function () {
  //     await expect(
  //       yieldAggregator.connect(owner).rebalance(300, 500)
  //     ).to.be.revertedWithCustomError(
  //       yieldAggregator,
  //       "YieldAggregator__RebalanceCooldown"
  //     );
  //   });
  // });

  // describe("Emergency Controls", function () {
  //   const depositAmount = ethers.parseEther("100");

  //   beforeEach(async function () {
  //     await yieldAggregator.connect(user1).deposit(depositAmount, 500, 300);
  //   });

  //   it("Should execute emergency withdrawal", async function () {
  //     const balanceBefore = await wethToken.balanceOf(owner.address);

  //     await yieldAggregator.connect(owner).emergencyWithdraw();

  //     const balanceAfter = await wethToken.balanceOf(owner.address);
  //     expect(balanceAfter.sub(balanceBefore)).to.equal(depositAmount);
  //     expect(await yieldAggregator.emergencyExitEnabled()).to.be.true;
  //   });

  //   it("Should prevent new deposits after emergency exit", async function () {
  //     await yieldAggregator.connect(owner).emergencyWithdraw();

  //     await expect(
  //       yieldAggregator.connect(user2).deposit(depositAmount, 500, 300)
  //     ).to.be.revertedWithCustomError(
  //       yieldAggregator,
  //       "YieldAggregator__EmergencyExit"
  //     );
  //   });
  // });

  // describe("Fee Management", function () {
  //   it("Should update protocol configuration correctly", async function () {
  //     const newFeeCollector = user2.address;
  //     const newManagementFee = 200; // 2%
  //     const newPerformanceFee = 2000; // 20%

  //     await yieldAggregator
  //       .connect(owner)
  //       .updateProtocolConfiguration(
  //         newFeeCollector,
  //         newManagementFee,
  //         newPerformanceFee
  //       );

  //     expect(await yieldAggregator.feeCollector()).to.equal(newFeeCollector);

  //     const fees = await yieldAggregator.fees();
  //     expect(fees.annualManagementFeeInBasisPoints).to.equal(newManagementFee);
  //     expect(fees.performanceFee).to.equal(newPerformanceFee);
  //   });

  //   it("Should revert fee updates exceeding maximums", async function () {
  //     const maxManagementFee = 500; // 5%
  //     const invalidManagementFee = 600;

  //     await expect(
  //       yieldAggregator
  //         .connect(owner)
  //         .updateProtocolConfiguration(
  //           user2.address,
  //           invalidManagementFee,
  //           2000
  //         )
  //     ).to.be.revertedWithCustomError(
  //       yieldAggregator,
  //       "YieldAggregator__FeeTooHigh"
  //     );
  //   });
  // });
});
