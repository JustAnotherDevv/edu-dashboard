import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { DateTime } from "luxon";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const SCORE_WEIGHTS = {
  transactionCount: 0.25,
  volume: 0.25,
  frequency: 0.25,
  accountAge: 0.25,
};

const RISK_THRESHOLDS = {
  RAPID_TRANSACTION_COUNT: 50,
  CIRCULAR_TX_RATIO: 0.15,
  UNIQUE_INTERACTIONS_MIN: 5,
  VARIANCE_THRESHOLD: 0.3,
  TIME_PATTERN_VARIANCE: 0.4,
  MIN_TIME_BETWEEN_TXS: 10 * 1000,
  MIN_ACCOUNT_AGE_DAYS: 2,
  SUSPICIOUS_BATCH_SIZE: 5,
};

function analyzeTransactionPatterns(transactions) {
  const patterns = {
    timeIntervals: [],
    amounts: {},
    addressInteractions: {},
    circularTransactions: new Map(),
    rapidTransactions: 0,
    sameAmountCount: 0,
    uniqueRecipients: new Set(),
    dailyTxCounts: {},
    batchTransactions: 0,
  };

  let previousTx = null;

  transactions.forEach((tx, index) => {
    const txTime = DateTime.fromISO(tx.timestamp);
    const txDate = txTime.toFormat("yyyy-MM-dd");

    patterns.dailyTxCounts[txDate] = (patterns.dailyTxCounts[txDate] || 0) + 1;
    patterns.amounts[tx.amount] = (patterns.amounts[tx.amount] || 0) + 1;
    patterns.uniqueRecipients.add(tx.to_address);

    const interactionKey = `${tx.from_address}-${tx.to_address}`;
    patterns.addressInteractions[interactionKey] =
      (patterns.addressInteractions[interactionKey] || 0) + 1;

    if (previousTx) {
      const prevTime = DateTime.fromISO(previousTx.timestamp);
      const timeInterval = txTime.diff(prevTime).milliseconds;
      patterns.timeIntervals.push(timeInterval);

      if (timeInterval < RISK_THRESHOLDS.MIN_TIME_BETWEEN_TXS) {
        patterns.rapidTransactions++;
      }

      if (index >= RISK_THRESHOLDS.SUSPICIOUS_BATCH_SIZE) {
        const recentTxs = transactions.slice(
          index - RISK_THRESHOLDS.SUSPICIOUS_BATCH_SIZE,
          index
        );
        if (recentTxs.every((t) => t.amount === tx.amount)) {
          patterns.batchTransactions++;
        }
      }
    }

    const reversePair = `${tx.to_address}-${tx.from_address}`;
    if (patterns.circularTransactions.has(reversePair)) {
      patterns.circularTransactions.set(
        reversePair,
        patterns.circularTransactions.get(reversePair) + 1
      );
    } else {
      patterns.circularTransactions.set(interactionKey, 1);
    }

    previousTx = tx;
  });

  return {
    ...patterns,
    circularTxCount: Array.from(patterns.circularTransactions.values()).filter(
      (count) => count > 1
    ).length,
    maxDailyInteractions: Math.max(...Object.values(patterns.dailyTxCounts)),
    timeVariance: calculateVariance(patterns.timeIntervals),
    uniqueInteractionsCount: patterns.uniqueRecipients.size,
    activeDays: Object.keys(patterns.dailyTxCounts).length,
  };
}

function calculateRiskScore(patterns, accountAgeInDays) {
  const riskFactors = [];
  let humanProbabilityScore = 100;

  if (accountAgeInDays < RISK_THRESHOLDS.MIN_ACCOUNT_AGE_DAYS) {
    riskFactors.push("Account age below minimum threshold");
    humanProbabilityScore -= 20;
  }

  if (patterns.timeVariance < RISK_THRESHOLDS.VARIANCE_THRESHOLD) {
    riskFactors.push("Suspicious transaction timing pattern detected");
    humanProbabilityScore -= 15;
  }

  if (patterns.batchTransactions > 0) {
    riskFactors.push("Batch transaction patterns detected");
    humanProbabilityScore -= 10;
  }

  if (
    patterns.rapidTransactions / patterns.timeIntervals.length >
    RISK_THRESHOLDS.CIRCULAR_TX_RATIO
  ) {
    riskFactors.push("Suspicious rapid transaction patterns");
    humanProbabilityScore -= 15;
  }

  if (
    patterns.uniqueInteractionsCount < RISK_THRESHOLDS.UNIQUE_INTERACTIONS_MIN
  ) {
    riskFactors.push("Insufficient unique interactions");
    humanProbabilityScore -= 10;
  }

  const circularTxRatio =
    patterns.circularTxCount / patterns.timeIntervals.length;
  if (circularTxRatio > RISK_THRESHOLDS.CIRCULAR_TX_RATIO) {
    riskFactors.push("High number of circular transactions");
    humanProbabilityScore -= 20;
  }

  humanProbabilityScore = Math.max(0, Math.min(100, humanProbabilityScore));

  return {
    riskFactors,
    humanProbabilityScore,
    patterns: {
      uniqueInteractionsCount: patterns.uniqueInteractionsCount,
      circularTransactionsCount: patterns.circularTxCount,
      timeVariance: patterns.timeVariance,
      maxDailyInteractions: patterns.maxDailyInteractions,
      batchTransactionsCount: patterns.batchTransactions,
    },
  };
}

async function processWalletActivity(walletAddress) {
  try {
    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .or(`from_address.eq.${walletAddress},to_address.eq.${walletAddress}`)
      .order("timestamp", { ascending: true });

    if (txError) throw txError;

    if (!transactions || transactions.length === 0) {
      const defaultScoreData = {
        wallet_address: walletAddress,
        total_score: 0,
        transaction_score: 0,
        volume_score: 0,
        frequency_score: 0,
        age_score: 0,
        active_days: 0,
        total_volume: 0,
        transaction_count: 0,
        risk_level: "LOW",
        risk_factors: [],
        human_probability: 50,
        unique_interactions_count: 0,
        circular_transactions_count: 0,
        first_tx_date: new Date(),
        last_tx_date: new Date(),
      };

      await supabase.from("activity_scores").upsert(defaultScoreData);
      return;
    }

    const firstTx = DateTime.fromISO(transactions[0].timestamp);
    const lastTx = DateTime.fromISO(
      transactions[transactions.length - 1].timestamp
    );
    const accountAgeInDays = Math.max(1, lastTx.diff(firstTx, "days").days);

    const patterns = analyzeTransactionPatterns(transactions);
    const {
      riskFactors,
      humanProbabilityScore,
      patterns: riskPatterns,
    } = calculateRiskScore(patterns, accountAgeInDays);

    const scores = calculateScores({
      transactions,
      accountAgeInDays,
      patterns: riskPatterns,
      humanProbabilityScore,
    });

    const scoreData = {
      wallet_address: walletAddress,
      total_score: scores.totalScore,
      transaction_score: scores.transactionScore,
      volume_score: scores.volumeScore,
      frequency_score: scores.frequencyScore,
      age_score: scores.ageScore,
      active_days: patterns.activeDays,
      total_volume: transactions.reduce(
        (sum, tx) => sum + Number(tx.amount),
        0
      ),
      transaction_count: transactions.length,
      risk_level: determineRiskLevel(
        riskFactors,
        scores.totalScore,
        humanProbabilityScore
      ),
      risk_factors: riskFactors,
      human_probability: humanProbabilityScore,
      unique_interactions_count: riskPatterns.uniqueInteractionsCount,
      circular_transactions_count: riskPatterns.circularTransactionsCount,
      first_tx_date: firstTx.toJSDate(),
      last_tx_date: lastTx.toJSDate(),
    };

    const { error: upsertError } = await supabase
      .from("activity_scores")
      .upsert(scoreData, { onConflict: "wallet_address" });

    if (upsertError) throw upsertError;

    console.log(
      `Processed ${walletAddress}: Score ${scores.totalScore.toFixed(
        2
      )}, Human Probability: ${humanProbabilityScore}%`
    );
  } catch (error) {
    console.error(`Error processing wallet ${walletAddress}:`, error);
  }
}

function calculateScores({
  transactions,
  accountAgeInDays,
  patterns,
  humanProbabilityScore,
}) {
  const txPerDay = transactions.length / accountAgeInDays;
  const transactionScore = Math.min(100, Math.max(0, txPerDay * 20));

  const totalVolume = transactions.reduce(
    (sum, tx) => sum + Number(tx.amount),
    0
  );
  const volumeScore = Math.min(
    100,
    Math.max(0, Math.log10(1 + totalVolume) * 20)
  );

  const frequencyScore = Math.min(
    100,
    Math.max(0, patterns.timeVariance * 100)
  );

  const ageScore = Math.min(100, Math.max(0, (accountAgeInDays / 180) * 100));

  const totalScore = Math.max(
    0,
    Math.min(
      100,
      transactionScore * SCORE_WEIGHTS.transactionCount +
        volumeScore * SCORE_WEIGHTS.volume +
        frequencyScore * SCORE_WEIGHTS.frequency +
        ageScore * SCORE_WEIGHTS.accountAge
    )
  );

  return {
    totalScore: Number(totalScore.toFixed(2)),
    transactionScore: Number(transactionScore.toFixed(2)),
    volumeScore: Number(volumeScore.toFixed(2)),
    frequencyScore: Number(frequencyScore.toFixed(2)),
    ageScore: Number(ageScore.toFixed(2)),
  };
}

function calculateVariance(values) {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
  return (
    Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length) / mean
  );
}

function determineRiskLevel(riskFactors, totalScore, humanProbability) {
  if (riskFactors.length >= 3 || totalScore < 30 || humanProbability < 40)
    return "HIGH";
  if (riskFactors.length >= 1 || totalScore < 60 || humanProbability < 70)
    return "MEDIUM";
  return "LOW";
}

async function calculateActivityScores() {
  try {
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("wallet_address");

    if (playersError) throw playersError;

    console.log(`Processing ${players.length} players...`);

    for (const player of players) {
      await processWalletActivity(player.wallet_address);
    }

    console.log("Activity score calculation completed");
  } catch (error) {
    console.error("Error calculating activity scores:", error);
  }
}

calculateActivityScores().catch(console.error);

export default calculateActivityScores;
