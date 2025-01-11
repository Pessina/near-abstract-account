import { KeyPair, connect, keyStores } from "near-api-js";

// Validate and assign environment variables
const privateKey = process.env.NEXT_PUBLIC_NEAR_PRIVATE_KEY as string;
const accountId = process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID as string;
const networkId = process.env.NEXT_PUBLIC_NETWORK_ID as string;

if (!privateKey || !accountId || !networkId) {
  throw new Error("Missing environment variables");
}

// Create key pair and store
const keyPair = KeyPair.fromString(privateKey);
const keyStore = new keyStores.InMemoryKeyStore();
keyStore.setKey(networkId, accountId, keyPair);

const mainnetConfig = {
  networkId: "mainnet",
  nodeUrl: "https://free.rpc.fastnear.com",
  helperUrl: "https://helper.mainnet.near.org",
  explorerUrl: "https://nearblocks.io",
};

const testnetConfig = {
  networkId: "testnet",
  nodeUrl: "https://test.rpc.fastnear.com",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://testnet.nearblocks.io",
};

const config = {
  ...(networkId === "mainnet" ? mainnetConfig : testnetConfig),
  keyStore,
};

async function initNear() {
  const connection = await connect(config);
  const account = await connection.account(accountId);
  return { connection, account };
}

export default initNear;
