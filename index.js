const { TezosToolkit } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");

require("dotenv").config();

const contracts = {
  OvenFactory: "KT1Mgy95DVzqVBNYhsW93cyHuB57Q94UFhrh",
};

const Tezos = new TezosToolkit("https://mainnet.smartpy.io/");

async function main() {
  Tezos.setProvider({
    signer: await InMemorySigner.fromSecretKey(process.env.PRIVATE_KEY),
  });

  await makeOven();
}

main();

async function makeOven(Tezos) {
  const ovenFactory = await Tezos.wallet.at(contracts.OvenFactory);
  try {
    const op = await ovenFactory.methods.makeOven().send();
    console.log("Operation Sent -- Confirming block.");
    await op.confirmation(3);
    console.log(`Operation Confirmed: ${op.opHash}`);
  } catch (err) {
    console.log(err);
  }
}
