const { TezosToolkit, OpKind, MichelCodecPacker } = require("@taquito/taquito");
const { InMemorySigner } = require("@taquito/signer");
const { BigNumber } = require("bignumber.js");

require("dotenv").config();

const FEE_FACTOR = 997;

const contracts = {
  OvenFactory: "KT1Mgy95DVzqVBNYhsW93cyHuB57Q94UFhrh",
  Oven: "KT19cVLk9EK95rV1cF24hv34aACAqC7birBA",
  KolibriUSD: "KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV",
  QuipuKolibriDEX: "KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6",
};

const Tezos = new TezosToolkit("https://mainnet.smartpy.io/");

async function main() {
  Tezos.setPackerProvider(new MichelCodecPacker());
  Tezos.setProvider({
    signer: await InMemorySigner.fromSecretKey(process.env.PRIVATE_KEY),
  });

  // await leverageTez(Tezos, Math.pow(10, 1), 5 * Math.pow(10, 17));
  console.log(
    (await estimatemKUSDtoTEZ(Tezos, BigNumber(10).pow(20))).toString()
  );
}

main();

async function leverageTez(Tezos, xtzAmountInMutez, kUSDAmountToBorrow) {
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

  transactions.push({
    kind: OpKind.TRANSACTION,
    ...oven.methods.borrow(kUSDAmountToBorrow).toTransferParams(),
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

async function estimatemKUSDtoTEZ(Tezos, kUSDAmount) {
  kolibriDEX = await Tezos.wallet.at("KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6");
  const dexStorage = await kolibriDEX.storage();
  // console.log(dexStorage.storage.tez_pool.div(1e6).toString());
  const tokenInWithFee = kUSDAmount.times(FEE_FACTOR);
  const numerator = tokenInWithFee.times(dexStorage.storage.tez_pool);
  const denominator = dexStorage.storage.token_pool
    .times(1000)
    .plus(tokenInWithFee);

  return numerator.idiv(denominator);
}
