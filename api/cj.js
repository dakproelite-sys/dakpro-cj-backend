export default async function handler(req) {
  const apiKey = process.env.CJ_ACCESS_TOKEN;

  if (!apiKey) {
    return Response.json(
      { error: "La variable CJ_ACCESS_TOKEN est manquante dans Vercel." },
      { status: 500 }
    );
  }

  try {
    // 1. Obtenir un AccessToken auprès de CJ Dropshipping
    const authResponse = await fetch("https://developers.cjdropshipping.cn/api2.0/v1/authentication/getAccessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ apiKey: apiKey })
    });

    const authData = await authResponse.json();

    if (!authData.result || !authData.data || !authData.data.accessToken) {
      return Response.json(
        {
          error: "Impossible d'obtenir un jeton d'accès CJ. Vérifiez votre clé dans Vercel.",
          cjResponse: authData
        },
        { status: 401 }
      );
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
    return Response.json(categoryData, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
