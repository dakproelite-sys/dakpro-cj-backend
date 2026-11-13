'use strict';

/**
 * DAKPRO ELITE — DAKPRO PREMIUM SOURCING
 * CJ DROPSHIPPING API BACKEND (V2.0 OFFICIAL)
 * Vercel Serverless Function
 */

const BASE_URL = (
  process.env.CJ_BASE_URL ||
  'https://developers.cjdropshipping.com/api2.0/v1'
).replace(/\/+$/, '');

const TOKEN_URL =
  `${BASE_URL}/authentication/getAccessToken`;

const REFRESH_URL =
  `${BASE_URL}/authentication/refreshAccessToken`;

// Cache local de l'instance serveur.
let tokenCache = null;
let tokenPromise = null;

// --------------------------------------------------
// REPONSES JSON (AVEC CORS INTÉGRÉ)
// --------------------------------------------------

function sendJson(res, status, data) {
  res.statusCode = status;

  // Injection automatique des en-têtes CORS sur toutes les réponses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  res.setHeader(
    'Content-Type',
    'application/json; charset=utf-8'
  );

  res.setHeader('Cache-Control', 'no-store');

  return res.end(JSON.stringify(data));
}

// --------------------------------------------------
// LECTURE DES REPONSES CJ
// --------------------------------------------------

async function readResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      message: 'Réponse JSON invalide de CJ.'
    };
  }
}

function isSuccessful(response, data) {
  return (
    response.ok &&
    (
      data.code === undefined ||
      data.code === 200 ||
      data.code === 0
    ) &&
    data.success !== false &&
    data.result !== false
  );
}

// --------------------------------------------------
// VERIFICATION DES VARIABLES
// --------------------------------------------------

function getApiKey() {
  const apiKey = process.env.CJ_API_KEY;

  if (!apiKey) {
    throw new Error(
      'CJ_API_KEY est absente des variables Vercel.'
    );
  }

  return apiKey.trim();
}

// --------------------------------------------------
// OBTENTION DU TOKEN
// --------------------------------------------------

async function obtainToken() {
  const apiKey = getApiKey();

  const response = await fetch(TOKEN_URL, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },

    body: JSON.stringify({
      apiKey
    })
  });

  const data = await readResponse(response);

  if (
    !isSuccessful(response, data) ||
    !data.data ||
    !data.data.accessToken
  ) {
    const error = new Error(
      data.message ||
      'CJ refuse la récupération du token.'
    );

    error.status = response.ok ? 502 : response.status;
    error.cjCode = data.code;
    error.requestId = data.requestId;

    throw error;
  }

  tokenCache = {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
    accessExpiry: Date.parse(data.data.accessTokenExpiryDate),
    refreshExpiry: Date.parse(data.data.refreshTokenExpiryDate)
  };

  return tokenCache.accessToken;
}

// --------------------------------------------------
// RENOUVELLEMENT DU TOKEN
// --------------------------------------------------

async function refreshToken() {
  if (
    !tokenCache ||
    !tokenCache.refreshToken ||
    (
      Number.isFinite(tokenCache.refreshExpiry) &&
      Date.now() >= tokenCache.refreshExpiry
    )
  ) {
    return obtainToken();
  }

  const response = await fetch(REFRESH_URL, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },

    body: JSON.stringify({
      refreshToken: tokenCache.refreshToken
    })
  });

  const data = await readResponse(response);

  if (
    !isSuccessful(response, data) ||
    !data.data ||
    !data.data.accessToken
  ) {
    if (data.code === 1600003) {
      return obtainToken();
    }

    const error = new Error(
      data.message ||
      'Impossible de renouveler le token CJ.'
    );

    error.status = response.ok ? 502 : response.status;
    error.cjCode = data.code;
    error.requestId = data.requestId;

    throw error;
  }

  tokenCache = {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken || tokenCache.refreshToken,
    accessExpiry: Date.parse(data.data.accessTokenExpiryDate),
    refreshExpiry: Date.parse(data.data.refreshTokenExpiryDate)
  };

  return tokenCache.accessToken;
}

// --------------------------------------------------
// GESTION AUTOMATIQUE DES TOKENS
// --------------------------------------------------

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
      (
        !Number.isFinite(tokenCache.accessExpiry) ||
        Date.now() < tokenCache.accessExpiry - 600000
      )
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

// --------------------------------------------------
// APPELS API CJ
// --------------------------------------------------

async function callCJ(path, params = {}) {

  async function request(accessToken) {

    const url = new URL(`${BASE_URL}${path}`);

    for (const [key, value] of Object.entries(params)) {

      if (
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {

        if (Array.isArray(value)) {
          value.forEach(item => {
            url.searchParams.append(key, item);
          });
        } else {
          url.searchParams.set(key, String(value));
        }
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
      data: await readResponse(response)
    };
  }

  let accessToken = await getToken();

  let result = await request(accessToken);

  // Token expiré ou invalide (Code CJ 1600001)
  if (result.data.code === 1600001) {

    accessToken = await getToken(true);

    result = await request(accessToken);
  }

  if (!isSuccessful(result.response, result.data)) {

    const error = new Error(
      result.data.message ||
      'Erreur pendant la communication avec CJ.'
    );

    error.status = result.response.ok
      ? 502
      : result.response.status;

    error.cjCode = result.data.code;
    error.requestId = result.data.requestId;

    throw error;
  }

  return result.data;
}

// --------------------------------------------------
// PARAMETRES PRODUITS (HARMONISÉS CJ V2.0)
// --------------------------------------------------

function getProductFilters(params) {

  const allowed = [
    'keyWord',
    'keyword',
    'page',
    'size',
    'categoryId',
    'lv2categoryList',
    'lv3categoryList',
    'countryCode',
    'startSellPrice',
    'endSellPrice',
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

  const result = {};

  for (const key of allowed) {

    const value = params.get(key);

    if (value !== null && value !== '') {
      if (key === 'keyword' || key === 'keyWord') {
        result['keyWord'] = value;
      } else {
        result[key] = value;
      }
    }
  }

  if (result.page !== undefined) {
    result.page = Math.min(
      1000,
      Math.max(1, Number(result.page) || 1)
    );
  }

  if (result.size !== undefined) {
    result.size = Math.min(
      100,
      Math.max(1, Number(result.size) || 10)
    );
  }

  return result;
}

// --------------------------------------------------
// ROUTEUR PRINCIPAL
// --------------------------------------------------

module.exports = async function handler(req, res) {

  // OPTIONS : réponse CORS pour les navigateurs.
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
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
      'https://localhost'
    );

    const params = url.searchParams;

    const action = (
      params.get('action') || 'health'
    ).toLowerCase();

    let result;

    // ----------------------------------------------
    // TEST DE CONNEXION
    // ----------------------------------------------

    if (action === 'health') {

      await getToken();

      return sendJson(res, 200, {
        success: true,
        authenticated: true,
        service: 'CJ Dropshipping',
        project: 'DAKPRO ELITE',
        message: 'Connexion CJ réussie.'
      });
    }

    // ----------------------------------------------
    // CATEGORIES
    // ----------------------------------------------

    else if (action === 'categories') {

      result = await callCJ(
        '/product/getCategory'
      );
    }

    // ----------------------------------------------
    // LISTE DES PRODUITS & RECHERCHE (PRODUCTS & SEARCH)
    // ----------------------------------------------

    else if (action === 'products' || action === 'search') {

      const filters = getProductFilters(params);

      result = await callCJ(
        '/product/listV2',
        filters
      );
    }

    // ----------------------------------------------
    // DETAILS PRODUIT (DETAIL & DETAILS)
    // ----------------------------------------------

    else if (action === 'detail' || action === 'details') {

      const pid = params.get('pid');
      const productSku = params.get('productSku');
      const variantSku = params.get('variantSku');

      if (!pid && !productSku && !variantSku) {

        return sendJson(res, 400, {
          success: false,
          message: 'Identifiant produit obligatoire.'
        });
      }

      const query = {};

      if (pid) query.pid = pid;
      if (productSku) query.productSku = productSku;
      if (variantSku) query.variantSku = variantSku;

      if (params.has('features')) {
        query.features = params.get('features');
      }

      result = await callCJ(
        '/product/query',
        query
      );
    }

    // ----------------------------------------------
    // VARIANTES PAR PRODUIT OU SKU
    // ----------------------------------------------

    else if (action === 'variants') {

      const query = {};

      for (const key of [
        'pid',
        'productSku',
        'variantSku'
      ]) {
        if (params.has(key)) {
          query[key] = params.get(key);
        }
      }

      if (params.has('countryCode')) {
        query.countryCode = params.get('countryCode');
      }

      if (!Object.keys(query).length) {

        return sendJson(res, 400, {
          success: false,
          message: 'Identifiant produit obligatoire.'
        });
      }

      result = await callCJ(
        '/product/variant/query',
        query
      );
    }

    // ----------------------------------------------
    // VARIANTE PAR VID
    // ----------------------------------------------

    else if (action === 'variant') {

      const vid = params.get('vid');

      if (!vid) {

        return sendJson(res, 400, {
          success: false,
          message: 'Le paramètre vid est obligatoire.'
        });
      }

      result = await callCJ(
        '/product/variant/queryByVid',
        { vid }
      );
    }

    // ----------------------------------------------
    // STOCK PAR VID
    // ----------------------------------------------

    else if (action === 'stock') {

      const vid = params.get('vid');

      if (!vid) {

        return sendJson(res, 400, {
          success: false,
          message: 'Le paramètre vid est obligatoire.'
        });
      }

      result = await callCJ(
        '/product/stock/queryByVid',
        { vid }
      );
    }

    // ----------------------------------------------
    // ENTREPOTS
    // ----------------------------------------------

    else if (action === 'warehouses') {

      result = await callCJ(
        '/warehouse/detail'
      );
    }

    // ----------------------------------------------
    // ACTION INCONNUE
    // ----------------------------------------------

    else {

      return sendJson(res, 400, {
        success: false,
        message: 'Action inconnue.',
        availableActions: [
          'health',
          'categories',
          'products',
          'search',
          'detail',
          'details',
          'variants',
          'variant',
          'stock',
          'warehouses'
        ]
      });
    }

    return sendJson(res, 200, result);

  } catch (error) {

    console.error('[DAKPRO CJ ERROR]', {
      message: error.message,
      cjCode: error.cjCode,
      requestId: error.requestId
    });

    return sendJson(res, error.status || 500, {

      success: false,

      message: error.message ||
        'Erreur interne du serveur.',

      cjCode: error.cjCode || null,

      requestId: error.requestId || null
    });
  }
};
