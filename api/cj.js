export default async function handler(req, res) {
  const apiKey = process.env.CJ_ACCESS_TOKEN;

  if (!apiKey) {
    return res.status(500).json({ error: "La variable CJ_ACCESS_TOKEN est manquante dans Vercel." });
  }

  try {
    // 1. Obtenir le jeton auprès de CJ Dropshipping
    const authResponse = await fetch("https://developers.cjdropshipping.cn/api2.0/v1/authentication/getAccessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ apiKey: apiKey })
    });

    const authData = await authResponse.json();

    if (!authData.result || !authData.data || !authData.data.accessToken) {
      return res.status(401).json({
        error: "Clé API invalide ou refusée par CJ Dropshipping.",
        cjResponse: authData
      });
    }

    const accessToken = authData.data.accessToken;

    // 2. Récupérer les catégories
    const categoryResponse = await fetch("https://developers.cjdropshipping.cn/api2.0/v1/product/getCategory", {
      method: "GET",
      headers: {
        "CJ-Access-Token": accessToken,
        "Content-Type": "application/json"
      }
    });

    const categoryData = await categoryResponse.json();
    return res.status(200).json(categoryData);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
