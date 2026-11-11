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
   1. OBTENIR LE TOKEN CJ
===================================== */

async function obtainToken() {
  const email = process.env.CJ_EMAIL;
  const apiKey = process.env.CJ_API_KEY;

  if (!email || !apiKey) {
    throw new Error('Variables CJ_EMAIL ou CJ_API_KEY manquantes dans Vercel.');
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, apiKey })
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
    accessExpiry: data.data.accessTokenExpiryDate ? Date.parse(data.data.accessTokenExpiryDate) : Date.now() + 170 * 86400000,
    refreshExpiry: data.data.refreshTokenExpiryDate ? Date.parse(data.data.refreshTokenExpiryDate) : Date.now() + 170 * 86400000
  };

  return tokenCache.accessToken;
}

/* =====================================
   2. GESTION DU TOKEN
===================================== */

async function getToken(forceRefresh = false) {
  if (tokenPromise && !forceRefresh) {
    return tokenPromise;
  }

  tokenPromise = (async () => {
    if (tokenCache && tokenCache.accessToken && !forceRefresh && Date.now() < tokenCache.accessExpiry - 600000) {
      return tokenCache.accessToken;
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
   3. COMMUNICATION CJ
===================================== */

async function callCJ(path, query = {}) {
  const accessToken = await getToken();
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

  const data = await readJson(response);

  if (!isSuccessful(response, data)) {
    const error = new Error(data.message || 'Erreur CJ Dropshipping.');
    error.status = response.ok ? 502 : response.status;
    error.cj = data;
    throw error;
  }

  return data;
}

/* =====================================
   4. ROUTEUR PRINCIPAL VERCEL
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
    return sendJson(405, { success: false, message: 'Méthode non autorisée.' });
  }

  try {
    const url = new URL(req.url, `https://${req.headers.get('host') || 'localhost'}`);
    const params = url.searchParams;
    const action = (params.get('action') || 'health').toLowerCase();

    let data;

    if (action === 'health') {
      return sendJson(200, {
        success: true,
        service: 'DAKPROELITE CJ Backend',
        message: 'Le serveur Vercel est opérationnel et connecté à CJ.'
      });
    }

    if (action === 'categories') {
      data = await callCJ('/product/getCategory');
    } else if (action === 'products') {
      const page = params.get('page') || '1';
      const size = params.get('size') || '20';
      data = await callCJ('/product/listV2', { page, size });
    } else {
      return sendJson(400, { 
        success: false, 
        message: 'Action inconnue. Utilisez ?action=health, ?action=categories ou ?action=products' 
      });
    }

    return sendJson(200, data);

  } catch (error) {
    console.error('[CJ API Error]', error.message);
    return sendJson(error.status || 500, {
      success: false,
      message: error.message || 'Erreur interne du serveur.',
      cjDetails: error.cj || null
    });
  }
}
