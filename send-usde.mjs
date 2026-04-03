import { signAndSend, getWallet } from "@open-wallet-standard/core";
import { ethers } from "ethers";

// --- Config ---
const WALLET_NAME = "hackathon";
const FROM = "0x793dd118B0f8f22cfe52eD8A152d4677CFB571D3";
const TO = "0x7bcF94886f3858Ad2D321A1F112665c6D2C0632A";
const AMOUNT = "0.005"; // USDC.e (6 decimals)

// Bridged USDC (Stargate) on Tempo
const USDE_CONTRACT = "0x20c000000000000000000000b9537d11c60e8b50";
const TEMPO_CHAIN_ID = 4217;
const RPC_URL = "https://rpc.tempo.xyz";

// --- Build ERC-20 transfer calldata ---
const iface = new ethers.Interface([
  "function transfer(address to, uint256 amount)",
]);
const amountWei = ethers.parseUnits(AMOUNT, 6); // USDC.e has 6 decimals
const data = iface.encodeFunctionData("transfer", [TO, amountWei]);

// --- Fetch nonce and gas from RPC ---
const provider = new ethers.JsonRpcProvider(RPC_URL);

const [nonce, feeData, block] = await Promise.all([
  provider.getTransactionCount(FROM, "pending"),
  provider.getFeeData(),
  provider.getBlock("latest"),
]);

// --- Build EIP-1559 transaction ---
const tx = ethers.Transaction.from({
  type: 2,
  chainId: TEMPO_CHAIN_ID,
  nonce,
  to: USDE_CONTRACT,
  value: 0n,
  data,
  maxFeePerGas: feeData.maxFeePerGas,
  maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
  gasLimit: 300_000n, // Tempo TIP-20 transfers need more gas
});

const unsignedRaw = tx.unsignedSerialized.slice(2); // remove 0x prefix

console.log("Wallet:", WALLET_NAME);
console.log("From:", FROM);
console.log("To:", TO);
console.log("Amount:", AMOUNT, "USDC.e");
console.log("Contract:", USDE_CONTRACT);
console.log("Chain: Tempo (4217)");
console.log("Nonce:", nonce);
console.log("Gas limit: 100000");
console.log("Unsigned tx hex:", unsignedRaw.slice(0, 40) + "...");
console.log("\nSigning and broadcasting...\n");

// --- Sign & send via OWS ---
const result = signAndSend(
  WALLET_NAME,
  "evm",
  unsignedRaw,
  undefined, // passphrase
  undefined, // index
  RPC_URL,
);

console.log("Transaction hash:", result.txHash);
console.log(`https://explore.mainnet.tempo.xyz/tx/${result.txHash}`);
