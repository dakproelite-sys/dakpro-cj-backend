export default function handler(req, res) {
  return res.status(200).json({
    status: "ok",
    message: "Le serveur Vercel répond correctement !",
    timestamp: new Date().toISOString()
  });
}
