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

    // Send email suggestion via Resend API if credentials are provided
    const resendKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.SUGGESTIONS_EMAIL;
    if (resendKey && toEmail) {
      try {
        const mailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Who Is Smartest Suggestions <onboarding@resend.dev>",
            to: toEmail,
            subject: `💡 New Mind Suggestion: ${name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 550px; border: 1px solid #dfd7c3; border-radius: 8px; padding: 24px; background: #fafafa;">
                <h2 style="color: #1a1c1e; border-bottom: 2px solid #dfd7c3; padding-bottom: 8px; margin-top: 0;">New Mind Suggestion Received</h2>
                <p style="font-size: 15px; color: #334155;"><strong>Suggested Mind:</strong> <span style="font-size: 16px; color: #1e293b;">${name}</span></p>
                <p style="font-size: 14px; color: #475569; margin-bottom: 6px;"><strong>Details / Reason:</strong></p>
                <div style="background: #f1f5f9; padding: 14px; border-left: 4px solid #dfd7c3; border-radius: 4px; font-style: italic; color: #334155; line-height: 1.5;">
                  ${details ? details.replace(/\n/g, '<br>') : "No details provided"}
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <small style="color: #94a3b8;">Sent via Who Is Smartest Form Submission</small>
              </div>
            `
          })
        });
        
        if (!mailResponse.ok) {
          const mailErr = await mailResponse.text();
          console.error("Resend API email error:", mailErr);
        }
      } catch (emailErr) {
        console.error("Failed to send suggestion email via Resend:", emailErr);
      }
    }

    return res.status(200).json({ message: "Suggestion recorded successfully!" });
  } catch (error) {
    console.error("Suggestion API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
