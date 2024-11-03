const { ethers } = require("ethers");

const getCompoundAPY = async (cWETHv3_Contract) => {
  const SECONDS_PER_YEAR = 60 * 60 * 24 * 365;
  const SCALE = ethers.BigNumber.from("10").pow(18);

  const utilization = await cWETHv3_Contract.getUtilization();
  const supplyRate = await cWETHv3_Contract.getSupplyRate(utilization);
  const compAPY = (supplyRate / SCALE) * SECONDS_PER_YEAR * 100;

  return compAPY;
};

const getAaveAPY = async (aaveV3Pool_contract) => {
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const SECONDS_PER_YEAR = 31536000;
  const RAY = 10 ** 27;

  const { currentLiquidityRate } = await aaveV3Pool_contract.getReserveData(
    WETH
  );
  const depositAPR = (await currentLiquidityRate) / RAY;
  const aaveAPY =
    (await ((1 + depositAPR / SECONDS_PER_YEAR) ** SECONDS_PER_YEAR - 1)) * 100;

  return aaveAPY;
};

module.exports = {
  getCompoundAPY,
  getAaveAPY,
};
