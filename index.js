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

  leverageTez(Tezos, BigNumber(1e6), BigNumber(1e18));
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
      .toTransferParams({ amount: xtzAmountInMutez.toString(), mutez: true }),
  });

  transactions.push({
    kind: OpKind.TRANSACTION,
    ...oven.methods.borrow(kUSDAmountToBorrow.toString()).toTransferParams(),
  });

  const kusd = await Tezos.wallet.at(contracts.KolibriUSD);
  transactions.push({
    kind: OpKind.TRANSACTION,
    ...kusd.methods
      .approve(contracts.QuipuKolibriDEX, kUSDAmountToBorrow.toString())
      .toTransferParams(),
  });

  let teztimate = await estimateKUSDtoTEZ(Tezos, kUSDAmountToBorrow);
  teztimate = withSlippage(teztimate, 1);
  const kolibriDEX = await Tezos.wallet.at(
    "KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6"
  );
  transactions.push({
    kind: OpKind.TRANSACTION,
    ...kolibriDEX.methods
      .tokenToTezPayment(
        kUSDAmountToBorrow.toString(),
        teztimate.toString(),
        "tz1gF55wBNAMRiyEjKeiv2rWZ6VUHGr8sE7i"
      )
      .toTransferParams(),
  });

  try {
    console.log("Preparing batch.");
    const batch = Tezos.wallet.batch(transactions);
    const op = await batch.send();
    console.log("Operation Sent -- Confirming block.", op.opHash);
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

async function estimateKUSDtoTEZ(Tezos, kUSDAmount) {
  kolibriDEX = await Tezos.wallet.at("KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6");
  const dexStorage = await kolibriDEX.storage();

  const tokenInWithFee = kUSDAmount.times(FEE_FACTOR);
  const numerator = tokenInWithFee.times(dexStorage.storage.tez_pool);
  const denominator = dexStorage.storage.token_pool
    .times(1000)
    .plus(tokenInWithFee);

  return numerator.idiv(denominator);
}

function withSlippage(value, slippage) {
  return value.times(BigNumber(100).minus(slippage)).idiv(100);
}
