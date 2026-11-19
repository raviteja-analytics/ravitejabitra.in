// Vercel Serverless Function: Access Verification Gate
// Validates access key against process.env.APP_PASSWORD or default PIN 170397

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const inputKey = String(body.key || "").trim();
    const masterKey = String(process.env.APP_PASSWORD || "170397").trim();

    if (!inputKey) {
      return res.status(400).json({ ok: false, error: "Please enter your password or PIN" });
    }

    if (inputKey === masterKey) {
      return res.status(200).json({
        ok: true,
        message: "Access granted",
        timestamp: Date.now()
      });
    }

    return res.status(401).json({
      ok: false,
      error: "Incorrect password or PIN. Access denied."
    });
  } catch (err) {
    console.error("verify-access error:", err);
    return res.status(500).json({ ok: false, error: "Verification server error" });
  }
}
