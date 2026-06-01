import { track } from "@vercel/analytics/server";

const K = 32;

async function querySupabase(endpoint, method = "GET", body = null) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${endpoint}`;
  const apiKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !apiKey) {
    return null;
  }

  const headers = {
    "apikey": apiKey,
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };

  const options = {
    method,
    headers
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase REST error (${response.status}): ${errorText}`);
  }

  // Handle 204 No Content for PATCH requests
  if (response.status === 204) {
    return null;
  }

  return await response.json();
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase environment variables are not set on Vercel." });
  }

  try {
    const { winner_id, loser_id } = req.body;
    if (!winner_id || !loser_id) {
      return res.status(400).json({ error: "Missing winner_id or loser_id" });
    }

    const wId = parseInt(winner_id, 10);
    const lId = parseInt(loser_id, 10);

    // 1. Fetch current ratings for winner and loser
    const responseData = await querySupabase(`persons?id=in.(${wId},${lId})`);
    if (!responseData || responseData.length < 2) {
      return res.status(404).json({ error: "Winner or loser not found in Supabase database" });
    }

    const winner = responseData.find(m => m.id === wId);
    const loser = responseData.find(m => m.id === lId);

    if (!winner || !loser) {
      return res.status(404).json({ error: "Could not locate winner/loser records" });
    }

    // 2. Perform Elo mathematics on the server
    const expectedWinner = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winner.elo - loser.elo) / 400));

    const newWinnerElo = Math.round((winner.elo + K * (1 - expectedWinner)) * 10) / 10;
    const newLoserElo = Math.round((loser.elo + K * (0 - expectedLoser)) * 10) / 10;

    // 3. Atomically update in Supabase via PATCH
    await querySupabase(`persons?id=eq.${winner.id}`, "PATCH", {
      elo: newWinnerElo,
      wins: winner.wins + 1
    });

    await querySupabase(`persons?id=eq.${loser.id}`, "PATCH", {
      elo: newLoserElo,
      losses: loser.losses + 1
    });

    // Track vote on the server-side
    try {
      await track("vote_cast", {
        winner: winner.name,
        loser: loser.name,
        winner_new_elo: newWinnerElo,
        loser_new_elo: newLoserElo
      });
    } catch (analyticsError) {
      console.warn("Vercel Server-side Analytics tracking failed:", analyticsError);
    }

    // 4. Return the complete updated leaderboard list sorted by id
    const updatedMinds = await querySupabase("persons?select=*&order=id.asc");
    return res.status(200).json(updatedMinds || []);
  } catch (error) {
    console.error("Vote Supabase API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
