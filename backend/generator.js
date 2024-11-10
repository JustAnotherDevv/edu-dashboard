import { createClient } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker";
import dotenv from "dotenv";

dotenv.config();

const main () => {
    // console.log("Starting generator")
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const INTERVAL_SECONDS = 10;
const transactionTypes = [
  "ITEM_PURCHASE",
  "REWARD_CLAIM",
  "TOKEN_TRANSFER",
  "NFT_TRADE",
];

async function getRandomPlayers() {
  const { data: players, error } = await supabase
    .from("players")
    .select("wallet_address, username");

  if (error) {
    console.error("Error fetching players:", error);
    return null;
  }

  if (!players || players.length < 2) {
    console.error("Not enough players in database");
    return null;
  }

  const sender = players[Math.floor(Math.random() * players.length)];
  let receiver;
  do {
    receiver = players[Math.floor(Math.random() * players.length)];
  } while (receiver.wallet_address === sender.wallet_address);

  return { sender, receiver };
}

async function generateRandomTransaction() {
  try {
    const players = await getRandomPlayers();
    if (!players) return;

    const transaction = {
      from_address: players.sender.wallet_address,
      to_address: players.receiver.wallet_address,
      amount: parseFloat(faker.finance.amount(0.001, 10, 6)),
      transaction_type:
        transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
      timestamp: new Date(),
    };

    const { error } = await supabase.from("transactions").insert(transaction);

    if (error) {
      console.error("Error inserting transaction:", error);
      return;
    }

    console.log("\n✅ Generated new transaction:", {
      from: `${players.sender.username} (${transaction.from_address.slice(
        0,
        6
      )}...${transaction.from_address.slice(-4)})`,
      to: `${players.receiver.username} (${transaction.to_address.slice(
        0,
        6
      )}...${transaction.to_address.slice(-4)})`,
      type: transaction.transaction_type,
      amount: transaction.amount,
    });
  } catch (error) {
    console.error("Error generating transaction:", error);
  }
}

async function startPeriodicGenerator() {
  console.log(
    `🚀 Starting periodic transaction generator (${INTERVAL_SECONDS} second intervals)`
  );

  await generateRandomTransaction();

  setInterval(generateRandomTransaction, INTERVAL_SECONDS * 1000);
}

process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  process.exit(0);
});

startPeriodicGenerator();
// main()
