export default async function handler(req, res) {
  // Récupération du token configuré dans Vercel
  const token = process.env.CJ_ACCESS_TOKEN;

  if (!token) {
    return res.status(500).json({ 
      success: false, 
      error: "La variable CJ_ACCESS_TOKEN est manquante dans les variables d'environnement Vercel." 
    });
  }

  try {
    // Appel direct à l'API CJ Dropshipping avec l'en-tête requis CJ-Access-Token
    const response = await fetch("https://developers.cjdropshipping.cn/api2.0/v1/product/getCategory", {
      method: "GET",
      headers: {
        "CJ-Access-Token": token,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    
    // Renvoi de la réponse directement au client
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
