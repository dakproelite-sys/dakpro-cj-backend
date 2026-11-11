const CJ_BASE_URL = 'https://developers.cjdropshipping.com/api2.0/v1';

const TOKEN_URL = `${CJ_BASE_URL}/authentication/getAccessToken`;
const REFRESH_URL = `${CJ_BASE_URL}/authentication/refreshAccessToken`;

let tokenCache = null;
let tokenPromise = null;

function sendJson(status, payload) {
  return new Response(JSON.stringify(payload), {
    status: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || 'Réponse CJ invalide' };
  }
}

function isSuccessful(response, data) {
  return response.ok &&
    (data.code === undefined ||
     data.code === 0 ||
     data.code === 200);
}

/* =====================================
   1. OBTENIR LE TOKEN CJ (Avec Email + Key)
===================================== */

async function obtainToken() {
  const email = process.env.CJ_EMAIL;
  const apiKey = process.env.CJ_API_KEY;

  if (!email || !apiKey) {
    throw new Error('Les variables CJ_EMAIL et CJ_API_KEY sont obligatoires dans Vercel.');
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email,
      apiKey: apiKey
    })
  });

  const data = await readJson(response);

  if (!isSuccessful(response, data) || !data.data || !data.data.accessToken) {
    const error = new Error(data.message || 'Impossible de récupérer le token CJ.');
    error.status = response.ok ? 502 : response.status;
    error.cj = data;
    throw error;
  }

  tokenCache = {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken || null,
    accessExpiry: data.data.accessTokenExpiryDate
      ? Date.parse(data.data.accessTokenExpiryDate)
      : Date.now() + 170 * 86400000,
    refreshExpiry: data.data.refreshTokenExpiryDate
      ? Date.parse(data.data.refreshTokenExpiryDate)
      : Date.now() + 170 * 86400000
  };

  return tokenCache.accessToken;
}

/* =====================================
   2. RENOUVELER LE TOKEN
===================================== */

async function refreshToken() {
  if (!tokenCache || !tokenCache.refreshToken || Date.now() >= tokenCache.refreshExpiry) {
    return obtainToken();
  }

  const response = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      refreshToken: tokenCache.refreshToken
    })
  });

  const data = await readJson(response);

  if (!isSuccessful(response, data) || !data.data || !data.data.accessToken) {
    if (data.code === 1600003 || data.code === 1600001) {
      return obtainToken();
    }
    const error = new Error(data.message || 'Renouvellement du token impossible.');
    error.status = response.ok ? 502 : response.status;
    error.cj = data;
    throw error;
  }

  tokenCache = {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken || tokenCache.refreshToken,
    accessExpiry: data.data.accessTokenExpiryDate
      ? Date.parse(data.data.accessTokenExpiryDate)
      : Date.now() + 170 * 86400000,
    refreshExpiry: data.data.refreshTokenExpiryDate
      ? Date.parse(data.data.refreshTokenExpiryDate)
      : tokenCache.refreshExpiry
  };

  return tokenCache.accessToken;
}

/* =====================================
   3. GESTION AUTOMATIQUE DU TOKEN
===================================== */

async function getToken(forceRefresh = false) {
  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = (async () => {
    if (forceRefresh) {
      return refreshToken();
    }
    if (tokenCache && tokenCache.accessToken && Date.now() < tokenCache.accessExpiry - 600000) {
      return tokenCache.accessToken;
    }
    if (tokenCache && tokenCache.refreshToken) {
      return refreshToken();
    }
    return obtainToken();
  })();

  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null;
  }
}

/* =====================================
   4. COMMUNICATION AVEC CJ DROPSHIPPING
===================================== */

async function callCJ(path, query = {}) {
  const makeRequest = async (accessToken) => {
    const url = new URL(`${CJ_BASE_URL}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && String(value) !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'CJ-Access-Token': accessToken,
        'Accept': 'application/json'
      }
    });

    return {
      response,
      data: await readJson(response)
    };
  };

  let accessToken = await getToken();
  let result = await makeRequest(accessToken);

  if (result.data && result.data.code === 1600001) {
    accessToken = await getToken(true);
    result = await makeRequest(accessToken);
  }

  if (!isSuccessful(result.response, result.data)) {
    const error = new Error(result.data.message || 'Erreur CJ Dropshipping.');
    error.status = result.response.ok ? 502 : result.response.status;
    error.cj = result.data;
    throw error;
  }

  return result.data;
}

/* =====================================
   5. ROUTEUR PRINCIPAL VERCEL
===================================== */

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  if (req.method !== 'GET') {
    return sendJson(405, {
      success: false,
      message: 'Méthode non autorisée.'
    });
  }

  try {
    const url = new URL(req.url, `https://${req.headers.get('host') || 'localhost'}`);
    const params = url.searchParams;
    const action = (params.get('action') || 'health').toLowerCase();
    let data;

    if (action === 'health') {
      await getToken();
      return sendJson(200, {
        success: true,
        service: 'CJ Dropshipping API',
        authenticated: true,
        message: 'Connexion CJ opérationnelle.'
      });
    }

    if (action === 'categories') {
      data = await callCJ('/product/getCategory');
    } else {
      data = await callCJ('/product/getCategory');
    }

    return sendJson(200, data);

  } catch (error) {
    console.error('[CJ API]', error.message, error.cj ? { code: error.cj.code, requestId: error.cj.requestId } : '');
    return sendJson(error.status || 500, {
      success: false,
      message: error.message || 'Erreur interne du serveur.',
      ...(error.cj ? { cjCode: error.cj.code, requestId: error.cj.requestId || null } : {})
    });
  }
}
