require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
      },
      {
        version: "0.8.0",
      },
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545/",
      timeout: 120000,
      gas: "auto",
      gasMultiplier: 2,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
      },
    },
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC_URL,
        blockNumber: 18791033,
        gasPrice: 500000000000,
      },
      mining: {
        auto: true,
        interval: 0,
      },
    },
  },
  mocha: {
    timeout: 120000,
  },
};
