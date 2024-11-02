const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const YieldAggregatorArtifact = require("../artifacts/contracts/YieldAggregator.sol/YieldAggregator.json");

async function main() {
  // Contract addresses
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const AAVE_WETH_ADDRESS = "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8";
  const COMPOUND_PROXY = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
  const AAVE_POOL_PROVIDER = "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e";
  const FEE_COLLECTOR = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

  console.log("Deploying YieldAggregator with the following addresses:");
  console.log("WETH Address:", WETH_ADDRESS);
  console.log("AAVE WETH Address:", AAVE_WETH_ADDRESS);
  console.log("Compound Proxy:", COMPOUND_PROXY);
  console.log("AAVE Pool Provider:", AAVE_POOL_PROVIDER);
  console.log("Fee Collector:", FEE_COLLECTOR);

  try {
    // Connect to the local network
    const provider = new ethers.getDefaultProvider("http://127.0.0.1:8545");

    // Get the deployer's private key - replace with your private key or use env variable
    const privateKey = process.env.PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log("\nDeployer address:", wallet.address);

    // Get the wallet's balance
    const balance = await provider.getBalance(wallet.address);
    console.log("Deployer balance:", balance, "ETH");

    // Create contract factory
    const factory = new ethers.ContractFactory(
      YieldAggregatorArtifact.abi,
      YieldAggregatorArtifact.bytecode,
      wallet
    );

    console.log("\nDeploying contract...");

    // Deploy the contract with specified gas settings
    const deploymentTransaction = await factory.deploy(
      WETH_ADDRESS,
      AAVE_WETH_ADDRESS,
      COMPOUND_PROXY,
      AAVE_POOL_PROVIDER,
      FEE_COLLECTOR
    );

    console.log("Waiting for deployment confirmation...");

    // Wait for deployment to complete
    const contract = await deploymentTransaction.deployed();
    console.log("\nContract deployed successfully!");
    console.log("Contract address:", contract.address);

    // // Get deployment transaction receipt
    // const receipt = await deploymentTransaction.deployTransaction.wait();
    // console.log("Gas used:", receipt.gasUsed.toString());
    // console.log("Block number:", receipt.blockNumber);

    // // Save deployment information
    // await saveFrontendFiles(contract, receipt.blockNumber);

    // return contract;
  } catch (error) {
    console.error("\nDeployment Error:");
    if (error.reason) console.error("Reason:", error.reason);
    if (error.code) console.error("Code:", error.code);
    if (error.message) console.error("Message:", error.message);
    throw error;
  }
}

async function saveFrontendFiles(contract, blockNumber) {
  const contractsDir = path.join(__dirname, "..", "constants");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Save contract address and deployment info
  const deploymentInfo = {
    address: contract.address,
    deploymentBlock: blockNumber,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(contractsDir, "YieldAggregator-address.json"),
    JSON.stringify(deploymentInfo, undefined, 2)
  );

  // Save ABI
  fs.writeFileSync(
    path.join(contractsDir, "YieldAggregator.json"),
    JSON.stringify(YieldAggregatorArtifact, null, 2)
  );

  console.log("\nContract files saved to constants directory");
}

// Add this to handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  process.exit(1);
});

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
