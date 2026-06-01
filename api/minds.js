import { track } from "@vercel/analytics/server";

const DEFAULT_MINDS = [
  { name: "Alan Turing", photo_path: "scientist-pics/Alan Turing.webp" },
  { name: "Albert Einstein", photo_path: "scientist-pics/Albert Einstein.jpg" },
  { name: "Alessandro Volta", photo_path: "scientist-pics/Alessandro Volta.jpeg" },
  { name: "Archimedes", photo_path: "scientist-pics/Archimedes.jpg" },
  { name: "Aristotle", photo_path: "scientist-pics/Aristotle.jpg" },
  { name: "Benjamin Franklin", photo_path: "scientist-pics/Benjamin Franklin.webp" },
  { name: "Bernhard Riemann", photo_path: "scientist-pics/Bernhard Riemann.jpeg" },
  { name: "Carl Friedrich Gauss", photo_path: "scientist-pics/Carl Friedrich Gauss.jpg" },
  { name: "Charles Darwin", photo_path: "scientist-pics/Charles Darwin.jpg" },
  { name: "David Hilbert", photo_path: "scientist-pics/David Hilbert.jpg" },
  { name: "Edward Teller", photo_path: "scientist-pics/Edward Teller.jpg" },
  { name: "Elon Musk", photo_path: "scientist-pics/Elon Musk.webp" },
  { name: "Enrico Fermi", photo_path: "scientist-pics/Enrico Fermi.jpg" },
  { name: "Erwin Schrödinger", photo_path: "scientist-pics/Erwin Schrödinger.jpg" },
  { name: "Euclid", photo_path: "scientist-pics/Euclid.jpg" },
  { name: "Fritz Haber", photo_path: "scientist-pics/Fritz Haber.jpg" },
  { name: "Galileo Galilei", photo_path: "scientist-pics/Galileo Galilei.jpg" },
  { name: "Gottfried Wilhelm Leibniz", photo_path: "scientist-pics/Gottfried Wilhelm Leibniz.jpg" },
  { name: "Henri Poincare", photo_path: "scientist-pics/Henri Poincare.png" },
  { name: "J. Robert Oppenheimer", photo_path: "scientist-pics/J. Robert Oppenheimer.jpg" },
  { name: "James Clerk Maxwell", photo_path: "scientist-pics/James Clerk Maxwell.jpg" },
  { name: "James Watt", photo_path: "scientist-pics/James Watt.jpg" },
  { name: "Johannes Kepler", photo_path: "scientist-pics/Johannes Kepler.jpg" },
  { name: "John von Neumann", photo_path: "scientist-pics/John von Neumann.gif" },
  { name: "Joseph Fourier", photo_path: "scientist-pics/Joseph Fourier.jpg" },
  { name: "Joseph-Louis Lagrange", photo_path: "scientist-pics/Joseph-Louis Lagrange.jpg" },
  { name: "Leonardo da Vinci", photo_path: "scientist-pics/Leonardo da Vinci.png" },
  { name: "Leonhard Euler", photo_path: "scientist-pics/Leonhard Euler.jpg" },
  { name: "Ludwig Boltzmann", photo_path: "scientist-pics/Ludwig Boltzmann.jpg" },
  { name: "Marie Curie", photo_path: "scientist-pics/Marie Curie.jpg" },
  { name: "Mark Zuckerberg", photo_path: "scientist-pics/Mark Zuckerberg.jpg" },
  { name: "Max Born", photo_path: "scientist-pics/Max Born.jpg" },
  { name: "Max Planck", photo_path: "scientist-pics/Max Planck.jpg" },
  { name: "Michael Faraday", photo_path: "scientist-pics/Michael Faraday.jpg" },
  { name: "Neil deGrasse Tyson", photo_path: "scientist-pics/Neil deGrasse Tyson.webp" },
  { name: "Nicolaus Copernicus", photo_path: "scientist-pics/Nicolaus Copernicus.jpg" },
  { name: "Niels Bohr", photo_path: "scientist-pics/Niels Bohr.jpg" },
  { name: "Nikola Tesla", photo_path: "scientist-pics/Nikola Tesla.jpeg" },
  { name: "Paul Dirac", photo_path: "scientist-pics/Paul Dirac.jpg" },
  { name: "Pierre-Simon Laplace", photo_path: "scientist-pics/Pierre-Simon Laplace.jpg" },
  { name: "Rene Descartes", photo_path: "scientist-pics/René Descartes.webp" },
  { name: "Richard Feynman", photo_path: "scientist-pics/Richard Feynman.jpg" },
  { name: "Robert Hooke", photo_path: "scientist-pics/Robert Hooke.jpg" },
  { name: "Sir George Stokes", photo_path: "scientist-pics/Sir George Stokes.jpg" },
  { name: "Sir Isaac Newton", photo_path: "scientist-pics/Sir Isaac Newton.jpg" },
  { name: "Srinivasa Ramanujan", photo_path: "scientist-pics/Srinivasa Ramanujan.jpg" },
  { name: "Stephen Hawking", photo_path: "scientist-pics/Stephen Hawking.jpg" },
  { name: "Thomas Edison", photo_path: "scientist-pics/Thomas Edison.jpg" },
  { name: "Werner Heisenberg", photo_path: "scientist-pics/Werner Heisenberg.jpg" },
  { name: "Wolfgang Pauli", photo_path: "scientist-pics/Wolfgang Pauli.jpg" }
];

// Helper for Supabase REST API requests
async function querySupabase(endpoint, method = "GET", body = null) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${endpoint}`;
  const apiKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !apiKey) {
    return null; // Supabase not configured
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

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase environment variables (SUPABASE_URL and SUPABASE_ANON_KEY) are not set on Vercel." });
  }

  try {
    // 1. Handle GET: Retrieve all minds
    if (req.method === "GET") {
      let minds = await querySupabase("persons?select=*&order=id.asc");
      
      // Auto-seed database with default minds on first load if empty
      if (!minds || minds.length === 0) {
        const payload = DEFAULT_MINDS.map(m => ({
          name: m.name,
          photo_path: m.photo_path,
          elo: 1400.0,
          wins: 0,
          losses: 0
        }));
        await querySupabase("persons", "POST", payload);
        minds = await querySupabase("persons?select=*&order=id.asc");
      } else if (minds.length < DEFAULT_MINDS.length) {
        // Self-healing seeder: detect and auto-populate missing default scientists
        const existingNames = new Set(minds.map(m => m.name.toLowerCase().trim()));
        const missingMinds = DEFAULT_MINDS.filter(m => !existingNames.has(m.name.toLowerCase().trim()));
        
        if (missingMinds.length > 0) {
          const payload = missingMinds.map(m => ({
            name: m.name,
            photo_path: m.photo_path,
            elo: 1400.0,
            wins: 0,
            losses: 0
          }));
          await querySupabase("persons", "POST", payload);
          minds = await querySupabase("persons?select=*&order=id.asc");
        }
      }
      
      return res.status(200).json(minds || []);
    }

    // 2. Handle POST: Admin actions
    if (req.method === "POST") {
      const body = req.body;
      const action = body.action;

      if (action === "add") {
        const { name, photo_path } = body;
        if (!name || !photo_path) {
          return res.status(400).json({ error: "Missing name or photo" });
        }

        // Add mind starting at 1400 Elo out-of-the-box
        await querySupabase("persons", "POST", {
          name: name,
          photo_path: photo_path,
          elo: 1400.0,
          wins: 0,
          losses: 0
        });

        try {
          await track("admin_add_mind", { name });
        } catch (analyticsError) {
          console.warn("Vercel Server-side Analytics tracking failed:", analyticsError);
        }
      } else if (action === "delete") {
        const deleteId = parseInt(body.id, 10);
        await querySupabase(`persons?id=eq.${deleteId}`, "DELETE");

        try {
          await track("admin_delete_mind", { id: deleteId });
        } catch (analyticsError) {
          console.warn("Vercel Server-side Analytics tracking failed:", analyticsError);
        }
      } else if (action === "clear") {
        // Delete all rows in persons table
        await querySupabase("persons?id=gt.0", "DELETE");

        try {
          await track("admin_clear_all_minds");
        } catch (analyticsError) {
          console.warn("Vercel Server-side Analytics tracking failed:", analyticsError);
        }
      } else if (action === "reset") {
        // Clear all and rebuild default 43 minds
        await querySupabase("persons?id=gt.0", "DELETE");
        
        const payload = DEFAULT_MINDS.map((m, idx) => ({
          name: m.name,
          photo_path: m.photo_path,
          elo: 1400.0,
          wins: 0,
          losses: 0
        }));

        await querySupabase("persons", "POST", payload);

        try {
          await track("admin_reset_to_defaults");
        } catch (analyticsError) {
          console.warn("Vercel Server-side Analytics tracking failed:", analyticsError);
        }
      } else {
        return res.status(400).json({ error: "Invalid action" });
      }

      // Re-fetch updated list to return to client
      const updated = await querySupabase("persons?select=*&order=id.asc");
      return res.status(200).json(updated || []);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Supabase API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
