import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const txCountCache = new Map();
const processingQueue = [];
let isProcessing = false;

async function getTransactionCount(walletAddress) {
  const { count: sentCount, error: sentError } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .or(`from_address.eq.${walletAddress}`);

  const { count: receivedCount, error: receivedError } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .or(`to_address.eq.${walletAddress}`);

  if (sentError || receivedError) {
    throw new Error("Error counting transactions");
  }

  return (sentCount || 0) + (receivedCount || 0);
}

async function initializeTxCounts() {
  try {
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("wallet_address");

    if (playersError) throw playersError;

    console.log("Initializing transaction counts for all players...");

    for (const player of players) {
      const count = await getTransactionCount(player.wallet_address);
      txCountCache.set(player.wallet_address, count);

      await supabase
        .from("players")
        .update({ total_transactions: count })
        .eq("wallet_address", player.wallet_address);
    }

    console.log("✅ Initialized transaction counts for all players");
  } catch (error) {
    console.error("Error initializing tx counts:", error);
  }
}

async function updateUserTxCount(walletAddress) {
  try {
    const previousCount = txCountCache.get(walletAddress) || 0;
    const newCount = await getTransactionCount(walletAddress);

    txCountCache.set(walletAddress, newCount);

    const { error: updateError } = await supabase
      .from("players")
      .update({ total_transactions: newCount })
      .eq("wallet_address", walletAddress);

    if (updateError) {
      throw updateError;
    }

    const change = newCount - previousCount;
    console.log(`✅ Updated transaction count for ${walletAddress}:`, {
      previous: previousCount,
      new: newCount,
      change: change,
    });
  } catch (error) {
    console.error("Error in updateUserTxCount:", error);
  }
}

async function processQueue() {
  if (isProcessing || processingQueue.length === 0) return;

  isProcessing = true;

  try {
    const transaction = processingQueue.shift();
    const { from_address, to_address } = transaction;

    console.log(`\n🔔 Processing transaction:`, {
      from: from_address.slice(0, 6) + "..." + from_address.slice(-4),
      to: to_address.slice(0, 6) + "..." + to_address.slice(-4),
      type: transaction.transaction_type,
    });

    await updateUserTxCount(from_address);

    if (from_address !== to_address) {
      await updateUserTxCount(to_address);
    }
  } finally {
    isProcessing = false;
    if (processingQueue.length > 0) {
      setTimeout(processQueue, 100);
    }
  }
}

function handleNewTransaction(payload) {
  processingQueue.push(payload.new);
  processQueue();
}

async function setupRealtimeListener() {
  console.log("🔄 Setting up realtime listener...");

  const channel = supabase.channel("db-changes").on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "transactions",
    },
    handleNewTransaction
  );

  channel.subscribe((status, err) => {
    if (err) {
      console.error("Subscription error:", err);
    } else {
      console.log("📡 Subscription status:", status);
    }
  });

  return channel;
}

async function init() {
  try {
    console.log("🚀 Initializing transaction listener...");
    await initializeTxCounts();
    await setupRealtimeListener();
    console.log(
      "✅ Realtime listener active and waiting for transactions...\n"
    );
  } catch (error) {
    console.error("❌ Initialization error:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  supabase.removeAllChannels();
  process.exit(0);
});

init();
