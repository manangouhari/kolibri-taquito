const { TezosToolkit } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");

require("dotenv").config();

const Tezos = new TezosToolkit("https://mainnet.smartpy.io/");

async function main() {
  Tezos.setProvider({
    signer: await InMemorySigner.fromSecretKey(process.env.PRIVATE_KEY),
  });
}

main();
