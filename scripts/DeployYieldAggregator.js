const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Contract addresses
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const AAVE_WETH_ADDRESS = "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8";
  const COMPOUND_PROXY = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
  const AAVE_POOL_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";
  const AAVE_POOL_ADDRESS = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
  const FEE_COLLECTOR = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

  try {
    // Get the deployer's address
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Get balance using provider
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance));

    console.log("\nDeploying YieldAggregator with the following addresses:");
    console.log("WETH Address:", WETH_ADDRESS);
    console.log("AAVE WETH Address:", AAVE_WETH_ADDRESS);
    console.log("Compound Proxy:", COMPOUND_PROXY);
    console.log("AAVE Pool Provider:", AAVE_POOL_PROVIDER);
    console.log("AAVE Pool Address:", AAVE_POOL_ADDRESS);
    console.log("Fee Collector:", FEE_COLLECTOR);

    // Get contract factory
    const Aggregator = await ethers.getContractFactory("YieldAggregator");
    console.log("\nContract factory created");

    // Deploy contract
    console.log("Deploying contract...");
    const aggregator = await Aggregator.deploy(
      WETH_ADDRESS,
      AAVE_WETH_ADDRESS,
      COMPOUND_PROXY,
      AAVE_POOL_PROVIDER,
      AAVE_POOL_ADDRESS,
      FEE_COLLECTOR
    );

    // Wait for deployment transaction to be mined
    console.log("Waiting for deployment transaction...");
    await aggregator.waitForDeployment();

    // Get the deployed contract address
    const contractAddress = await aggregator.getAddress();
    console.log("Contract deployed successfully!");
    console.log("Contract address:", contractAddress);

    // Get current block number
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("Current block number:", blockNumber);

    return {
      address: contractAddress,
      deployer: deployer.address,
      blockNumber: blockNumber,
    };
  } catch (error) {
    console.error("\nDeployment Error:");
    if (error.reason) console.error("Reason:", error.reason);
    if (error.code) console.error("Code:", error.code);
    if (error.message) console.error("Message:", error.message);
    throw error;
  }
}

// Execute deployment
main()
  .then((deploymentInfo) => {
    console.log("\nDeployment Info:", deploymentInfo);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
