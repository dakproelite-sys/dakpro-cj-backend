export default async function handler(req, res) {
  const apiKey = process.env.CJ_ACCESS_TOKEN;

  if (!apiKey) {
    return res.status(500).json({ error: "La variable CJ_ACCESS_TOKEN est manquante dans Vercel." });
  }

  try {
    // 1. Obtenir un AccessToken valide auprès de CJ Dropshipping
    const authResponse = await fetch("https://developers.cjdropshipping.cn/api2.0/v1/authentication/getAccessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        apiKey: apiKey
      })
    });

    const authData = await authResponse.json();

    // Si CJ refuse d'émettre un jeton
    if (!authData.result || !authData.data || !authData.data.accessToken) {
      return res.status(401).json({
        error: "Impossible d'obtenir un jeton d'accès CJ. Vérifiez que la clé dans Vercel est exacte.",
        cjResponse: authData
      });
    }

    const accessToken = authData.data.accessToken;

    // 2. Appeler l'API des catégories avec le jeton valide
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
