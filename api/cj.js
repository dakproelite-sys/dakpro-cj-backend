'use strict';

/**
 * DAKPRO ELITE — DAKPRO PREMIUM SOURCING
 * CJ DROPSHIPPING API BACKEND
 * VERSION V2.1 — ARCHITECTURE CONSERVÉE
 *
 * Vercel Serverless Function
 *
 * Fichier : api/cj.js
 *
 * Actions :
 * health
 * categories
 * products
 * search
 * detail
 * details
 * variants
 * variant
 * stock
 * warehouses
 */

// ==================================================
// 1. CONFIGURATION CJ
// ==================================================

const BASE_URL = (
  process.env.CJ_BASE_URL ||
  'https://developers.cjdropshipping.com/api2.0/v1'
).replace(/\/+$/, '');

const TOKEN_URL =
  `${BASE_URL}/authentication/getAccessToken`;

const REFRESH_URL =
  `${BASE_URL}/authentication/refreshAccessToken`;

// Cache de token pour l'instance serveur.
let tokenCache = null;
let tokenPromise = null;


// ==================================================
// 2. CONFIGURATION CORS
// ==================================================

function setCorsHeaders(req, res) {

  const allowedOrigin =
    process.env.DAKPRO_ALLOWED_ORIGIN || '*';

  const requestOrigin = req.headers.origin;

  if (allowedOrigin === '*') {

    res.setHeader(
      'Access-Control-Allow-Origin',
      '*'
    );

  } else if (requestOrigin === allowedOrigin) {

    res.setHeader(
      'Access-Control-Allow-Origin',
      allowedOrigin
    );

    res.setHeader(
      'Vary',
      'Origin'
    );
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Accept'
  );

  res.setHeader(
    'Access-Control-Max-Age',
    '86400'
  );
}


// ==================================================
// 3. RÉPONSES JSON
// ==================================================

function sendJson(res, status, data) {

  res.statusCode = status;

  res.setHeader(
    'Content-Type',
    'application/json; charset=utf-8'
  );

  res.setHeader(
    'Cache-Control',
    'no-store'
  );

  return res.end(
    JSON.stringify(data)
  );
}


// ==================================================
// 4. LECTURE DES RÉPONSES CJ
// ==================================================

async function readResponse(response) {

  const text = await response.text();

  try {

    return text
      ? JSON.parse(text)
      : {};

  } catch {

    return {
      message: 'Réponse JSON invalide de CJ.'
    };
  }
}


// ==================================================
// 5. VÉRIFICATION DES RÉPONSES CJ
// ==================================================

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


// ==================================================
// 6. VÉRIFICATION DE LA CLÉ API
// ==================================================

function getApiKey() {

  const apiKey = process.env.CJ_API_KEY;

  if (!apiKey) {

    throw new Error(
      'CJ_API_KEY est absente des variables Vercel.'
    );
  }

  return apiKey.trim();
}


// ==================================================
// 7. OBTENTION DU TOKEN CJ
// ==================================================

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

    error.status = response.ok
      ? 502
      : response.status;

    error.cjCode = data.code;
    error.requestId = data.requestId;

    throw error;
  }

  tokenCache = {

    accessToken:
      data.data.accessToken,

    refreshToken:
      data.data.refreshToken,

    accessExpiry:
      Date.parse(data.data.accessTokenExpiryDate),

    refreshExpiry:
      Date.parse(data.data.refreshTokenExpiryDate)
  };

  return tokenCache.accessToken;
}


// ==================================================
// 8. RENOUVELLEMENT DU TOKEN
// ==================================================

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

      refreshToken:
        tokenCache.refreshToken

    })
  });

  const data = await readResponse(response);

  if (
    !isSuccessful(response, data) ||
    !data.data ||
    !data.data.accessToken
  ) {

    // Refresh token expiré ou invalide.
    if (data.code === 1600003) {

      return obtainToken();
    }

    const error = new Error(
      data.message ||
      'Impossible de renouveler le token CJ.'
    );

    error.status = response.ok
      ? 502
      : response.status;

    error.cjCode = data.code;
    error.requestId = data.requestId;

    throw error;
  }

  tokenCache = {

    accessToken:
      data.data.accessToken,

    refreshToken:
      data.data.refreshToken ||
      tokenCache.refreshToken,

    accessExpiry:
      Date.parse(data.data.accessTokenExpiryDate),

    refreshExpiry:
      Date.parse(data.data.refreshTokenExpiryDate)
  };

  return tokenCache.accessToken;
}


// ==================================================
// 9. GESTION AUTOMATIQUE DES TOKENS
// ==================================================

async function getToken(forceRefresh = false) {

  if (tokenPromise) {

    return tokenPromise;
  }

  tokenPromise = (async () => {

    // Renouvellement forcé.
    if (forceRefresh) {

      return refreshToken();
    }

    // Token encore valide.
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

    // Renouvellement normal.
    if (
      tokenCache &&
      tokenCache.refreshToken
    ) {

      return refreshToken();
    }

    // Première authentification.
    return obtainToken();

  })();

  try {

    return await tokenPromise;

  } finally {

    tokenPromise = null;
  }
}


// ==================================================
// 10. APPELS À L'API CJ
// ==================================================

async function callCJ(path, params = {}) {

  async function request(accessToken) {

    const url = new URL(
      `${BASE_URL}${path}`
    );

    for (
      const [key, value]
      of Object.entries(params)
    ) {

      if (
        value === undefined ||
        value === null ||
        value === ''
      ) {

        continue;
      }

      if (Array.isArray(value)) {

        value.forEach(item => {

          url.searchParams.append(
            key,
            String(item)
          );

        });

      } else {

        url.searchParams.set(
          key,
          String(value)
        );
      }
    }

    const response = await fetch(
      url.toString(),
      {

        method: 'GET',

        headers: {

          'CJ-Access-Token':
            accessToken,

          'Accept':
            'application/json'
        }
      }
    );

    return {

      response,

      data:
        await readResponse(response)
    };
  }

  // Première tentative.
  let accessToken = await getToken();

  let result = await request(accessToken);

  // Token invalide : renouvellement automatique.
  if (result.data.code === 1600001) {

    accessToken = await getToken(true);

    result = await request(accessToken);
  }

  if (
    !isSuccessful(
      result.response,
      result.data
    )
  ) {

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


// ==================================================
// 11. PARAMÈTRES DE RECHERCHE PRODUITS
// ==================================================

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

    if (
      value !== null &&
      value !== ''
    ) {

      if (
        key === 'keyword' ||
        key === 'keyWord'
      ) {

        result.keyWord = value;

      } else {

        result[key] = value;
      }
    }
  }

  // Normalisation des mots-clés.
  if (
    result.keyWord !== undefined
  ) {

    result.keyWord = String(
      result.keyWord
    ).trim();
  }

  // Normalisation des options CJ V2.
  if (
    typeof result.features === 'string'
  ) {

    result.features = result.features
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  // Valeurs par défaut de pagination.
  if (result.page !== undefined) {

    result.page = Math.min(
      1000,
      Math.max(
        1,
        Number(result.page) || 1
      )
    );
  }

  if (result.size !== undefined) {

    result.size = Math.min(
      100,
      Math.max(
        1,
        Number(result.size) || 10
      )
    );
  }

  return result;
}


// ==================================================
// 12. ROUTEUR PRINCIPAL
// ==================================================

module.exports = async function handler(req, res) {

  // CORS sur toutes les réponses.
  setCorsHeaders(req, res);

  // ------------------------------------------------
  // OPTIONS
  // ------------------------------------------------

  if (req.method === 'OPTIONS') {

    return res.status(204).end();
  }

  // ------------------------------------------------
  // MÉTHODES AUTORISÉES
  // ------------------------------------------------

  if (req.method !== 'GET') {

    res.setHeader(
      'Allow',
      'GET, OPTIONS'
    );

    return sendJson(res, 405, {

      success: false,

      message:
        'Méthode non autorisée.'
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


    // ==============================================
    // 13. TEST DE CONNEXION
    // ==============================================

    if (action === 'health') {

      await getToken();

      return sendJson(res, 200, {

        success: true,

        authenticated: true,

        service:
          'CJ Dropshipping',

        project:
          'DAKPRO ELITE',

        message:
          'Connexion CJ réussie.'
      });
    }


    // ==============================================
    // 14. CATÉGORIES
    // ==============================================

    else if (action === 'categories') {

      result = await callCJ(
        '/product/getCategory'
      );
    }


    // ==============================================
    // 15. PRODUITS ET RECHERCHE
    // ==============================================

    else if (
      action === 'products' ||
      action === 'search'
    ) {

      const filters =
        getProductFilters(params);

      // CJ V2 : liste des produits.
      result = await callCJ(
        '/product/listV2',
        filters
      );
    }


    // ==============================================
    // 16. DÉTAILS D'UN PRODUIT
    // ==============================================

    else if (
      action === 'detail' ||
      action === 'details'
    ) {

      const pid =
        params.get('pid') ||
        params.get('id');

      const productSku =
        params.get('productSku');

      const variantSku =
        params.get('variantSku');

      if (
        !pid &&
        !productSku &&
        !variantSku
      ) {

        return sendJson(res, 400, {

          success: false,

          message:
            'Identifiant produit obligatoire.'
        });
      }

      const query = {};

      if (pid) {

        query.pid = pid;
      }

      if (productSku) {

        query.productSku = productSku;
      }

      if (variantSku) {

        query.variantSku = variantSku;
      }

      if (params.has('features')) {

        query.features = params.get('features');
      }

      result = await callCJ(
        '/product/query',
        query
      );
    }


    // ==============================================
    // 17. VARIANTES D'UN PRODUIT
    // ==============================================

    else if (action === 'variants') {

      const query = {};

      for (const key of [

        'pid',
        'productSku',
        'variantSku',
        'id'

      ]) {

        if (params.has(key)) {

          query[
            key === 'id'
              ? 'pid'
              : key
          ] = params.get(key);
        }
      }

      if (params.has('countryCode')) {

        query.countryCode =
          params.get('countryCode');
      }

      if (
        !Object.keys(query).length
      ) {

        return sendJson(res, 400, {

          success: false,

          message:
            'Identifiant produit obligatoire.'
        });
      }

      result = await callCJ(
        '/product/variant/query',
        query
      );
    }


    // ==============================================
    // 18. DÉTAIL D'UNE VARIANTE PAR VID
    // ==============================================

    else if (action === 'variant') {

      const vid = params.get('vid');

      if (!vid) {

        return sendJson(res, 400, {

          success: false,

          message:
            'Le paramètre vid est obligatoire.'
        });
      }

      result = await callCJ(
        '/product/variant/queryByVid',
        { vid }
      );
    }


    // ==============================================
    // 19. STOCK D'UNE VARIANTE
    // ==============================================

    else if (action === 'stock') {

      const vid = params.get('vid');

      if (!vid) {

        return sendJson(res, 400, {

          success: false,

          message:
            'Le paramètre vid est obligatoire.'
        });
      }

      result = await callCJ(
        '/product/stock/queryByVid',
        { vid }
      );
    }


    // ==============================================
    // 20. ENTREPÔTS
    // ==============================================

    else if (action === 'warehouses') {

      result = await callCJ(
        '/warehouse/detail'
      );
    }


    // ==============================================
    // 21. ACTION INCONNUE
    // ==============================================

    else {

      return sendJson(res, 400, {

        success: false,

        message:
          'Action inconnue.',

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


    // ==============================================
    // 22. RÉPONSE FINALE
    // ==============================================

    return sendJson(
      res,
      200,
      result
    );

  } catch (error) {

    console.error(
      '[DAKPRO CJ ERROR]',
      {

        message:
          error.message,

        cjCode:
          error.cjCode,

        requestId:
          error.requestId
      }
    );

    return sendJson(
      res,
      error.status || 500,
      {

        success: false,

        message:
          error.message ||
          'Erreur interne du serveur.',

        cjCode:
          error.cjCode || null,

        requestId:
          error.requestId || null
      }
    );
  }
};
