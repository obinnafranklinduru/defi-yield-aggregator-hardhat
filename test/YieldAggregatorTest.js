const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  abi: IERC20_ABI,
} = require("@openzeppelin/contracts/build/contracts/IERC20.json");

const cometABI = require("../ABIs/cometABI.json");
const aaveV3PoolABI = require("../ABIs/aaveV3PoolABI.json");
const getAPY = require("../utils/getAPY");

// Contract addresses
const WETH_Address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const cWETHv3 = "0xA17581A9E3356d9A858b789D68B4d866e593aE94";
const aaveV3Pool = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
const aaveHardCodedPoolAddress = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";

describe("YieldAggregator", function () {
  // Contract instances
  let WETH;
  let aaveWETH;
  let compoundProxy;
  let aavePool;
  let yieldAggregator;

  // Actors
  let owner;
  let user1;
  let user2;

  // Constants
  const INITIAL_DEPOSIT = ethers.parseEther("10");
  const REBALANCE_COOLDOWN = 24 * 60 * 60; // 1 day in seconds

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Initialize contract instances
    WETH = new ethers.Contract(WETH_Address, IERC20_ABI, owner);
    aaveWETH = new ethers.Contract(WETH_Address, cometABI.abi, owner);
    compoundProxy = new ethers.Contract(cWETHv3, cometABI.abi, owner);
    aavePool = new ethers.Contract(aaveV3Pool, aaveV3PoolABI, owner);

    // Deploy YieldAggregator
    const YieldAggregator = await ethers.getContractFactory("YieldAggregator");
    yieldAggregator = await YieldAggregator.deploy(
      WETH.target,
      aaveWETH.target,
      compoundProxy.target,
      aavePool.target,
      aaveHardCodedPoolAddress,
      owner.address
    );
    await yieldAggregator.waitForDeployment();

    // Get initial WETH for testing
    await owner.sendTransaction({
      to: WETH.target,
      value: ethers.parseEther("50"),
    });

    // Send some WETH to user1 and user2 for testing
    await WETH.transfer(user1.address, INITIAL_DEPOSIT);
    await WETH.transfer(user2.address, INITIAL_DEPOSIT);

    // Approve YieldAggregator to spend WETH for all users
    await WETH.approve(
      await yieldAggregator.getAddress(),
      ethers.parseEther("50")
    );
    await WETH.connect(user1).approve(
      await yieldAggregator.getAddress(),
      ethers.parseEther("50")
    );
    await WETH.connect(user2).approve(
      await yieldAggregator.getAddress(),
      ethers.parseEther("50")
    );
  });

  describe("Deployment", function () {
    it("sets the correct owner", async function () {
      expect(await yieldAggregator.owner()).to.equal(owner.address);
    });

    it("initializes with correct contract addresses", async function () {
      const wethAddress = await yieldAggregator.WETH_ADDRESS();
      const aaveWethAddress = await yieldAggregator.AAVE_WETH_ADDRESS();
      const compoundProxyAddress =
        await yieldAggregator.COMPOUND_PROXY_ADDRESS();
      const aavePoolProvider = await yieldAggregator.AAVE_POOL_PROVIDER();
      const aavePoolAddress = await yieldAggregator.AAVE_POOL_ADDRESS();
      const feeCollector = await await yieldAggregator.feeCollector();

      expect(wethAddress).to.equal(WETH.target);
      expect(aaveWethAddress).to.equal(aaveWETH.target);
      expect(compoundProxyAddress).to.equal(compoundProxy.target);
      expect(aavePoolProvider).to.equal(aavePool.target);
      expect(aavePoolAddress).to.equal(aaveHardCodedPoolAddress);
      expect(feeCollector).to.equal(owner.address);
    });

    it("initializes with correct fee structure", async function () {
      const fees = await yieldAggregator.fees();
      expect(fees.annualManagementFeeInBasisPoints).to.equal(100); // 1%
      expect(fees.performanceFee).to.equal(1000); // 10%
    });
  });

  describe("Deposits", function () {
    const depositAmount = ethers.parseEther("10");

    it("Should accept deposits and update state correctly", async function () {
      const compAPY = 500; // 5%
      const aaveAPY = 300; // 3%

      // Check user1's WETH balance before deposit
      const userBalance = await WETH.balanceOf(user1.address);
      expect(userBalance).not.be.equal(0);

      // Perform deposit
      await yieldAggregator
        .connect(user1)
        .deposit(depositAmount, compAPY, aaveAPY);

      // Verify deposit was recorded correctly
      const userDeposit = await yieldAggregator.userDeposits(user1.address);
      expect(userDeposit.amount).to.equal(depositAmount);

      // Verify total deposits updated
      // Verify protocol selection (should be Compound as it has higher APY)
      const [protocol, totalValue] =
        await yieldAggregator.getCurrentProtocolInfo();
      expect(totalValue).not.be.equal(0);
      expect(protocol).to.equal(1); // COMPOUND
    });

    it("Should revert deposit with zero amount", async function () {
      await expect(
        yieldAggregator.connect(user1).deposit(0, 500, 300)
      ).to.be.revertedWithCustomError(
        yieldAggregator,
        "YieldAggregator__InsufficientBalance"
      );
    });

    it("Should handle multiple deposits from different users", async function () {
      await yieldAggregator.connect(user1).deposit(depositAmount, 500, 300);
      await yieldAggregator.connect(user2).deposit(depositAmount, 500, 300);

      const user1Deposit = await yieldAggregator.userDeposits(user1.address);
      const user2Deposit = await yieldAggregator.userDeposits(user2.address);

      expect(user1Deposit.amount).to.equal(depositAmount);
      expect(user2Deposit.amount).to.equal(depositAmount);
      expect(await yieldAggregator.totalDeposits()).not.be.equal(depositAmount);
    });
  });

  describe("Withdrawals", function () {
    const depositAmount = ethers.parseEther("10");

    beforeEach(async function () {
      await yieldAggregator.connect(user1).deposit(depositAmount, 500, 300);
    });

    it("Should allow full withdrawal", async function () {
      const withdrawnAmount = await yieldAggregator.connect(user1).withdraw();

      const userDeposit = await yieldAggregator.userDeposits(user1.address);
      expect(userDeposit.amount).to.equal(0);
      expect(withdrawnAmount).not.be.equal(0);
    });
  });

  describe("Rebalancing", function () {
    const depositAmount = ethers.parseEther("10");

    beforeEach(async function () {
      await yieldAggregator.connect(user1).deposit(depositAmount, 500, 300);
    });

    it("Should rebalance to higher yielding protocol", async function () {
      await time.increase(REBALANCE_COOLDOWN);

      const initialProtocol = (await yieldAggregator.getCurrentProtocolInfo())
        ._protocol;

      // Trigger rebalance with Aave having higher APY
      await yieldAggregator.connect(owner).rebalance(300, 500);

      const newProtocol = (await yieldAggregator.getCurrentProtocolInfo())
        ._protocol;
      expect(newProtocol).to.not.equal(initialProtocol);
    });
  });

  describe("Emergency Controls", function () {
    const depositAmount = ethers.parseEther("10");

    beforeEach(async function () {
      await yieldAggregator.connect(user1).deposit(depositAmount, 500, 300);
    });

    it("Should execute emergency withdrawal", async function () {
      const balanceBefore = await WETH.balanceOf(owner.address);

      await yieldAggregator.connect(owner).emergencyWithdraw();

      const balanceAfter = await WETH.balanceOf(owner.address);

      expect(balanceAfter).not.be.equal(balanceBefore);
      expect(await yieldAggregator.emergencyExitEnabled()).to.be.true;
    });

    it("Should prevent new deposits after emergency exit", async function () {
      await yieldAggregator.connect(owner).emergencyWithdraw();

      await expect(
        yieldAggregator.connect(user2).deposit(depositAmount, 500, 300)
      ).to.be.revertedWithCustomError(
        yieldAggregator,
        "YieldAggregator__EmergencyExit"
      );
    });
  });

  describe("Fee Management", function () {
    it("Should update protocol configuration correctly", async function () {
      const newFeeCollector = user2.address;
      const newManagementFee = 200; // 2%
      const newPerformanceFee = 2000; // 20%

      await yieldAggregator
        .connect(owner)
        .updateProtocolConfiguration(
          newFeeCollector,
          newManagementFee,
          newPerformanceFee
        );

      expect(await yieldAggregator.feeCollector()).to.equal(newFeeCollector);

      const fees = await yieldAggregator.fees();
      expect(fees.annualManagementFeeInBasisPoints).to.equal(newManagementFee);
      expect(fees.performanceFee).to.equal(newPerformanceFee);
    });

    it("Should revert fee updates exceeding maximums", async function () {
      const invalidManagementFee = 600;

      await expect(
        yieldAggregator
          .connect(owner)
          .updateProtocolConfiguration(
            user2.address,
            invalidManagementFee,
            2000
          )
      ).to.be.revertedWithCustomError(
        yieldAggregator,
        "YieldAggregator__FeeTooHigh"
      );
    });
  });
});
