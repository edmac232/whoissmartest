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
    const { name, details } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing suggestion name." });
    }

    // Insert suggestion into Supabase table
    await querySupabase("suggestions", "POST", {
      name: name,
      details: details || ""
    });

    return res.status(200).json({ message: "Suggestion recorded successfully!" });
  } catch (error) {
    console.error("Suggestion API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
