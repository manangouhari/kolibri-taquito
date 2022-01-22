const { TezosToolkit, OpKind } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");

require("dotenv").config();

const contracts = {
  OvenFactory: "KT1Mgy95DVzqVBNYhsW93cyHuB57Q94UFhrh",
  Oven: "KT19cVLk9EK95rV1cF24hv34aACAqC7birBA",
};

const Tezos = new TezosToolkit("https://mainnet.smartpy.io/");

async function main() {
  Tezos.setProvider({
    signer: await InMemorySigner.fromSecretKey(process.env.PRIVATE_KEY),
  });

  await leverageTez(Tezos, Math.pow(10, 6));
}

main();

async function leverageTez(Tezos, xtzAmountInMutez) {
  /*
    1. Add $XTZ collateral.
    2. Mint $kUSD against it. 
    3. Swap the minted $kUSD to $XTZ.
  */
  const transactions = [];
  const oven = await Tezos.wallet.at(contracts.Oven);

  // Add $XTZ collateral.
  transactions.push({
    kind: OpKind.TRANSACTION,
    ...oven.methods
      .default()
      .toTransferParams({ amount: xtzAmountInMutez, mutez: true }),
  });

  try {
    const batch = Tezos.wallet.batch(transactions);
    const op = await batch.send();
    console.log("Operation Sent -- Confirming block.");
    await op.confirmation(3);
    console.log(`Operation Confirmed: ${op.opHash}`);
  } catch (err) {
    console.log(err);
  }
}

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
