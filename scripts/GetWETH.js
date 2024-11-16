const { ethers } = require("hardhat");
const {
  abi: IERC20_ABI,
} = require("@openzeppelin/contracts/build/contracts/IERC20.json");

// WETH ABI for the deposit function
const WETH_ABI = [
  "function deposit() payable",
  "function balanceOf(address) view returns (uint)",
];

const WETH_Address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function main() {
  const [owner] = await ethers.getSigners();
  const WETH = new ethers.Contract(WETH_Address, WETH_ABI, owner);
  const amount = ethers.parseEther("100");

  console.log("Depositing ETH to get WETH...");
  const tx = await WETH.deposit({ value: amount });
  await tx.wait();

  const WETH_Balance = await WETH.balanceOf(owner.address);

  console.log("WETH Balance after deposit:", ethers.formatEther(WETH_Balance));

  // Check gas used
  const receipt = await tx.wait();
  console.log("deposit() gas used:", receipt.gasUsed.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
