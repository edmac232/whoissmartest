const DEFAULT_MINDS = [
  { name: "Alan Turing", photo_path: "scientist-pics/Alan Turing.webp" },
  { name: "Albert Einstein", photo_path: "scientist-pics/Albert Einstein.jpg" },
  { name: "Alessandro Volta", photo_path: "scientist-pics/Alessandro Volta.jpeg" },
  { name: "Archimedes", photo_path: "scientist-pics/Archimedes.jpg" },
  { name: "Aristotle", photo_path: "scientist-pics/Aristotle.jpg" },
  { name: "Benjamin Franklin", photo_path: "scientist-pics/Benjamin Franklin.webp" },
  { name: "Bernhard Riemann", photo_path: "scientist-pics/Bernhard Riemann.jpeg" },
  { name: "Carl Friedrich Gauss", photo_path: "scientist-pics/Carl Friedrich Gauss.jpg" },
  { name: "David Hilbert", photo_path: "scientist-pics/David Hilbert.jpg" },
  { name: "Edward Teller", photo_path: "scientist-pics/Edward Teller.jpg" },
  { name: "Enrico Fermi", photo_path: "scientist-pics/Enrico Fermi.jpg" },
  { name: "Erwin Schrödinger", photo_path: "scientist-pics/Erwin Schrödinger.jpg" },
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
  { name: "Max Born", photo_path: "scientist-pics/Max Born.jpg" },
  { name: "Max Planck", photo_path: "scientist-pics/Max Planck.jpg" },
  { name: "Michael Faraday", photo_path: "scientist-pics/Michael Faraday.jpg" },
  { name: "Nicolaus Copernicus", photo_path: "scientist-pics/Nicolaus Copernicus.jpg" },
  { name: "Niels Bohr", photo_path: "scientist-pics/Niels Bohr.jpg" },
  { name: "Nikola Tesla", photo_path: "scientist-pics/Nikola Tesla.jpeg" },
  { name: "Paul Dirac", photo_path: "scientist-pics/Paul Dirac.jpg" },
  { name: "Pierre-Simon Laplace", photo_path: "scientist-pics/Pierre-Simon Laplace.jpg" },
  { name: "Richard Feynman", photo_path: "scientist-pics/Richard Feynman.jpg" },
  { name: "Robert Hooke", photo_path: "scientist-pics/Robert Hooke.jpg" },
  { name: "Sir George Stokes", photo_path: "scientist-pics/Sir George Stokes.jpg" },
  { name: "Sir Isaac Newton", photo_path: "scientist-pics/Sir Isaac Newton.jpg" },
  { name: "Srinivasa Ramanujan", photo_path: "scientist-pics/Srinivasa Ramanujan.jpg" },
  { name: "Stephen Hawking", photo_path: "scientist-pics/Stephen Hawking.jpg" },
  { name: "Werner Heisenberg", photo_path: "scientist-pics/Werner Heisenberg.jpg" },
  { name: "Wolfgang Pauli", photo_path: "scientist-pics/Wolfgang Pauli.jpg" }
];

const KV_KEY = "whoissmartest_minds_v1";

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
  // CORS Headers for static frontend integration
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 1. Fetch current minds list from Vercel KV
    let mindsData = await queryKV("get", [KV_KEY]);
    let minds = null;

    if (mindsData) {
      minds = JSON.parse(mindsData);
    }

    // Initialize with defaults if empty
    if (!minds || !Array.isArray(minds)) {
      minds = DEFAULT_MINDS.map((m, idx) => ({
        id: idx + 1,
        name: m.name,
        photo_path: m.photo_path,
        elo: 1400.0,
        wins: 0,
        losses: 0
      }));
      // Write back to KV if active
      if (process.env.KV_REST_API_URL) {
        await queryKV("set", [KV_KEY, JSON.stringify(minds)]);
      }
    }

    // 2. Handle POST request: Add Custom Mind or Reset/Clear DB
    if (req.method === "POST") {
      const body = req.body;
      const action = body.action;

      if (action === "reset") {
        minds = DEFAULT_MINDS.map((m, idx) => ({
          id: idx + 1,
          name: m.name,
          photo_path: m.photo_path,
          elo: 1400.0,
          wins: 0,
          losses: 0
        }));
      } else if (action === "clear") {
        minds = [];
      } else if (action === "delete") {
        const deleteId = parseInt(body.id, 10);
        minds = minds.filter(m => m.id !== deleteId);
      } else if (action === "add") {
        const { name, photo_path } = body;
        if (!name || !photo_path) {
          return res.status(400).json({ error: "Missing name or photo" });
        }
        
        // Prevent duplicate name
        const duplicate = minds.some(m => m.name.toLowerCase() === name.toLowerCase());
        if (duplicate) {
          return res.status(400).json({ error: `A mind named "${name}" already exists.` });
        }

        const newId = minds.reduce((max, m) => m.id > max ? m.id : max, 0) + 1;
        minds.push({
          id: newId,
          name: name,
          photo_path: photo_path,
          elo: 1400.0,
          wins: 0,
          losses: 0
        });
      } else {
        return res.status(400).json({ error: "Invalid action" });
      }

      // Write changes back to KV
      if (process.env.KV_REST_API_URL) {
        await queryKV("set", [KV_KEY, JSON.stringify(minds)]);
      }
    }

    return res.status(200).json(minds);
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
