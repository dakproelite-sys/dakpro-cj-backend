[11/11 07:51] AGLIGNAMOU: {
  "name": "dakpro-cj-backend",
  "version": "1.0.0",
  "private": true,
  "description": "Backend sécurisé Vercel pour l'API CJ Dropshipping de DAKPRO ÉLITE",
  "main": "api/cj.js",
  "type": "commonjs",
  "engines": {
    "node": ">=18.x"
  },
  "scripts": {
    "start": "node -e \"console.log('Projet prévu pour Vercel')\""
  }
}
[11/11 07:56] AGLIGNAMOU: package.json
[11/11 08:07] AGLIGNAMOU: 'use strict';

const CJ_BASE_URL = 'https://developers.cjdropshipping.com/api2.0/v1';

const TOKEN_URL = `${CJ_BASE_URL}/authentication/getAccessToken`;
const REFRESH_URL = `${CJ_BASE_URL}/authentication/refreshAccessToken`;

let tokenCache = null;
let tokenPromise = null;

function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(payload));
}

function applyCors(req, res) {
  const origins = (
    process.env.FRONTEND_URLS ||
    process.env.FRONTEND_URL ||
    'https://dakproelite.com,https://www.dakproelite.com'
  ).split(',').map(x => x.trim());

  const origin = req.headers.origin;

  if (origin && (origins.includes(origin) || origins.includes('*'))) {
    res.setHeader(
      'Access-Control-Allow-Origin',
      origins.includes('*') ? '*' : origin
    );
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
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

  const apiKey =
    process.env.CJ_API_KEY ||
    process.env.CJ_APIKEY;

  if (!apiKey) {
    throw new Error(
      'Variable CJ_API_KEY absente dans Vercel.'
    );
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      apiKey: apiKey
    })
  });

  const data = await readJson(response);

  if (
    !isSuccessful(response, data) ||
    !data.data ||
    !data.data.accessToken
  ) {
    const error = new Error(
      data.message || 'Impossible de récupérer le token CJ.'
    );

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

  if (
    !tokenCache ||
    !tokenCache.refreshToken ||
    Date.now() >= tokenCache.refreshExpiry
  ) {
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

  if (
    !isSuccessful(response, data) ||
    !data.data ||
    !data.data.accessToken
  ) {

    if (
      data.code === 1600003 ||
      data.code === 1600001
    ) {
      return obtainToken();
    }

    const error = new Error(
      data.message || 'Renouvellement du token impossible.'
    );

    error.status = response.ok ? 502 : response.status;
    error.cj = data;

    throw error;
  }

  tokenCache = {
    accessToken: data.data.accessToken,

    refreshToken:
      data.data.refreshToken ||
      tokenCache.refreshToken,

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

    if (
      tokenCache &&
      tokenCache.accessToken &&
      Date.now() < tokenCache.accessExpiry - 600000
    ) {
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

      if (
        value !== undefined &&
        value !== null &&
        String(value) !== ''
      ) {
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

    const error = new Error(
      result.data.message ||
      'Erreur CJ Dropshipping.'
    );

    error.status = result.response.ok
      ? 502
      : result.response.status;

    error.cj = result.data;

    throw error;
  }

  return result.data;
}

/* =====================================
   5. PARAMÈTRES DU CATALOGUE
===================================== */

const PRODUCT_LIST_PARAMS = [
  'keyWord',
  'page',
  'size',
  'categoryId',
  'lv2categoryList',
  'lv3categoryList',
  'countryCode',
  'startSellPrice',
  'endSellPrice',
  'addMarkStatus',
  'productType',
  'productFlag',
  'startWarehouseInventory',
  'endWarehouseInventory',
  'verifiedWarehouse',
  'timeStart',
  'timeEnd',
  'zonePlatform',
  'isWarehouse',
  'sort',
  'orderBy',
  'features',
  'supplierId',
  'hasCertification',
  'isSelfPickup',
  'customization'
];

function pickParams(searchParams, allowed) {

  const result = {};

  for (const key of allowed) {

    const value = searchParams.get(key);

    if (value !== null && value !== '') {
      result[key] = value;
    }
  }

  return result;
}

/* =====================================
   6. ROUTEUR PRINCIPAL CJ
===================================== */

module.exports = async function handler(req, res) {

  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {

    res.setHeader('Allow', 'GET, OPTIONS');

    return sendJson(res, 405, {
      success: false,
      message: 'Méthode non autorisée.'
    });
  }

  try {

    const url = new URL(
      req.url,
      `https://${req.headers.host || 'localhost'}`
    );

    const params = url.searchParams;

    const action = (
      params.get('action') || 'health'
    ).toLowerCase();

    let data;

    /* TEST CONNEXION */

    if (action === 'health') {

      await getToken();

      return sendJson(res, 200, {
        success: true,
        service: 'CJ Dropshipping API',
        authenticated: true,
        message: 'Connexion CJ opérationnelle.'
      });
    }

    /* CATÉGORIES */

    if (action === 'categories') {

      data = await callCJ('/product/getCategory');

    }

    /* LISTE DES PRODUITS */

    else if (action === 'products') {

      const filters = pickParams(
        params,
        PRODUCT_LIST_PARAMS
      );

      if (filters.page !== undefined) {
        filters.page = Math.min(
          1000,
          Math.max(1, Number(filters.page) || 1)
        );
      }

      if (filters.size !== undefined) {
        filters.size = Math.min(
          100,
          Math.max(1, Number(filters.size) || 10)
        );
      }

      data = await callCJ(
        '/product/listV2',
        filters
      );
    }

    /* DÉTAIL PRODUIT */

    else if (action === 'detail') {

      const pid =
        params.get('pid') ||
        params.get('productSku') ||
        params.get('variantSku');

      if (!pid) {
        return sendJson(res, 400, {
          success: false,
          message: 'Ajoutez pid, productSku ou variantSku.'
        });
      }

      const query = params.has('pid')
        ? { pid }
        : params.has('productSku')
          ? { productSku: pid }
          : { variantSku: pid };

      if (params.has('features')) {
        query.features = params.get('features');
      }

      data = await callCJ('/product/query', query);
    }

    /* VARIANTES */

    else if (action === 'variants') {

      const query = pickParams(
        params,
        [
          'pid',
          'productSku',
          'variantSku',
          'countryCode'
        ]
      );

      if (
        !query.pid &&
        !query.productSku &&
        !query.variantSku
      ) {
        return sendJson(res, 400, {
          success: false,
          message: 'Identifiant produit manquant.'
        });
      }

      data = await callCJ(
        '/product/variant/query',
        query
      );
    }

    /* DÉTAIL VARIANTE */

    else if (action === 'variant') {

      const vid = params.get('vid');

      if (!vid) {
        return sendJson(res, 400, {
          success: false,
          message: 'Ajoutez le paramètre vid.'
        });
      }

      const query = { vid };

      if (params.has('features')) {
        query.features = params.get('features');
      }

      data = await callCJ(
        '/product/variant/queryByVid',
        query
      );
    }

    /* STOCK */

    else if (action === 'stock') {

      const vid = params.get('vid');

      if (!vid) {
        return sendJson(res, 400, {
          success: false,
          message: 'Ajoutez le paramètre vid.'
        });
      }

      data = await callCJ(
        '/product/stock/queryByVid',
        { vid }
      );
    }

    /* ENTREPÔTS */

    else if (action === 'warehouses') {

      data = await callCJ(
        '/product/globalWarehouseList'
      );
    }

    else {

      return sendJson(res, 400, {
        success: false,
        message: 'Action inconnue.'
      });
    }

    return sendJson(res, 200, data);

  } catch (error) {

    console.error(
      '[CJ API]',
      error.message,
      error.cj
        ? {
            code: error.cj.code,
            requestId: error.cj.requestId
          }
        : ''
    );

    return sendJson(res, error.status || 500, {

      success: false,

      message:
        error.message ||
        'Erreur interne du serveur.',

      ...(error.cj
        ? {
            cjCode: error.cj.code,
            requestId: error.cj.requestId || null
          }
        : {})
    });
  }
};
[11/11 08:11] AGLIGNAMOU: api/cj.js
