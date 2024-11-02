const { ethers } = require("hardhat");
const {
  abi: IERC20_ABI,
} = require("@openzeppelin/contracts/build/contracts/IERC20.json");
const WETH_Address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function main() {
  const [owner] = await ethers.getSigners();
  const WETH = new ethers.Contract(WETH_Address, IERC20_ABI, owner);
  const amount = ethers.utils.parseEther("100");

  console.log("Sending Transaction....");
  const tx = await owner.sendTransaction({
    to: WETH.address,
    value: amount,
  });

  await tx.wait();

  const WETH_Balance = await WETH.balanceOf(owner.address);

  console.log(
    "WETH Balance after sendTransaction:",
    ethers.utils.formatEther(WETH_Balance)
  );

  // Check gas used
  const receipt = await tx.wait();
  console.log("sendTransaction gas used:", receipt.gasUsed.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
