export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const apiKey = process.env.CJ_ACCESS_TOKEN;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Variable manquante" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const authRes = await fetch("https://developers.cjdropshipping.cn/api2.0/v1/authentication/getAccessToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey })
    });
    const authData = await authRes.json();

    return new Response(JSON.stringify(authData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
