const KV_KEY = "whoissmartest_minds_v1";
const K = 32;

// Helper to query Vercel KV REST API
async function queryKV(command, args = []) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null; // KV not configured
  }

  const response = await fetch(`${url}/${command}/${args.join("/")}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`KV REST API error: ${response.statusText}`);
  }

  const body = await response.json();
  return body.result;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { winner_id, loser_id } = req.body;
    if (!winner_id || !loser_id) {
      return res.status(400).json({ error: "Missing winner_id or loser_id" });
    }

    // 1. Fetch current minds list from KV
    let mindsData = await queryKV("get", [KV_KEY]);
    if (!mindsData) {
      return res.status(404).json({ error: "Database not initialized. Visit the page first." });
    }

    let minds = JSON.parse(mindsData);
    if (!Array.isArray(minds)) {
      return res.status(500).json({ error: "Database format error." });
    }

    // 2. Find winner and loser
    const wId = parseInt(winner_id, 10);
    const lId = parseInt(loser_id, 10);
    
    const winner = minds.find(m => m.id === wId);
    const loser = minds.find(m => m.id === lId);

    if (!winner || !loser) {
      return res.status(404).json({ error: "Winner or loser not found in database" });
    }

    // 3. Perform Elo mathematics on the server
    const expectedWinner = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winner.elo - loser.elo) / 400));

    winner.elo = Math.round((winner.elo + K * (1 - expectedWinner)) * 10) / 10;
    loser.elo = Math.round((loser.elo + K * (0 - expectedLoser)) * 10) / 10;

    winner.wins += 1;
    loser.losses += 1;

    // 4. Save updated list back to KV
    if (process.env.KV_REST_API_URL) {
      await queryKV("set", [KV_KEY, JSON.stringify(minds)]);
    }

    return res.status(200).json(minds);
  } catch (error) {
    console.error("Vote API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
