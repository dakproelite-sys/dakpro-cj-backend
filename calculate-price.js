'use strict';

/**
 * DAKPRO ÉLITE — CALCULATEUR AUTOMATIQUE DE PANIER (MULTI-ARTICLES)
 * Produits + Livraison groupée CJ + Taux USD/FCFA + Marge de sécurité + Douane
 *
 * Vercel Serverless Function
 * Fichier : api/calculate-price.js
 */

const BASE_URL = (
  process.env.CJ_BASE_URL ||
  'https://developers.cjdropshipping.com/api2.0/v1'
).replace(/\/+$/, '');

const TOKEN_URL = `${BASE_URL}/authentication/getAccessToken`;
const REFRESH_URL = `${BASE_URL}/authentication/refreshAccessToken`;

let tokenCache = null;
let tokenPromise = null;

// ==================================================
// 1. CONFIGURATION CORS & RÉPONSES JSON
// ==================================================

function setCorsHeaders(req, res) {
  const allowedOrigin = process.env.DAKPRO_ALLOWED_ORIGIN || '*';
  const requestOrigin = req.headers.origin;

  if (allowedOrigin === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (requestOrigin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(data));
}

async function readResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: 'Réponse JSON invalide de CJ.' };
  }
}

function isSuccessful(response, data) {
  return (
    response.ok &&
    (data.code === undefined || data.code === 200 || data.code === 0) &&
    data.success !== false &&
    data.result !== false
  );
}

// ==================================================
// 2. AUTHENTIFICATION CJ (IDENTIQUE À api/cj.js)
// ==================================================

function getApiKey() {
  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) {
    throw new Error('CJ_API_KEY est absente des variables Vercel.');
  }
  return apiKey.trim();
}

async function obtainToken() {
  const apiKey = getApiKey();
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ apiKey })
  });

  const data = await readResponse(response);

  if (!isSuccessful(response, data) || !data.data || !data.data.accessToken) {
    const error = new Error(data.message || 'CJ refuse la récupération du token.');
    error.status = response.ok ? 502 : response.status;
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

async function refreshToken() {
  if (
    !tokenCache ||
    !tokenCache.refreshToken ||
    (Number.isFinite(tokenCache.refreshExpiry) && Date.now() >= tokenCache.refreshExpiry)
  ) {
    return obtainToken();
  }

  const response = await fetch(REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ refreshToken: tokenCache.refreshToken })
  });

  const data = await readResponse(response);

  if (!isSuccessful(response, data) || !data.data || !data.data.accessToken) {
    if (data.code === 1600003) return obtainToken();
    const error = new Error(data.message || 'Impossible de renouveler le token CJ.');
    error.status = response.ok ? 502 : response.status;
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

async function getToken(forceRefresh = false) {
  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    if (forceRefresh) return refreshToken();
    if (
      tokenCache &&
      tokenCache.accessToken &&
      (!Number.isFinite(tokenCache.accessExpiry) || Date.now() < tokenCache.accessExpiry - 600000)
    ) {
      return tokenCache.accessToken;
    }
    if (tokenCache && tokenCache.refreshToken) return refreshToken();
    return obtainToken();
  })();

  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null;
  }
}

// ==================================================
// 3. APPELS GET & POST VERS L'API CJ
// ==================================================

async function callCJGet(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  let accessToken = await getToken();
  let response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'CJ-Access-Token': accessToken, 'Accept': 'application/json' }
  });
  let data = await readResponse(response);

  if (data.code === 1600001) {
    accessToken = await getToken(true);
    response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'CJ-Access-Token': accessToken, 'Accept': 'application/json' }
    });
    data = await readResponse(response);
  }

  if (!isSuccessful(response, data)) {
    throw new Error(data.message || 'Erreur CJ GET');
  }
  return data.data;
}

async function callCJPost(path, body = {}) {
  let accessToken = await getToken();
  let response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'CJ-Access-Token': accessToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  });
  let data = await readResponse(response);

  if (data.code === 1600001) {
    accessToken = await getToken(true);
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'CJ-Access-Token': accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });
    data = await readResponse(response);
  }

  if (!isSuccessful(response, data)) {
    throw new Error(data.message || 'Erreur CJ POST');
  }
  return data.data;
}

// ==================================================
// 4. TAUX DE CHANGE AUTOMATIQUE USD -> XOF (FCFA)
// ==================================================

async function getUsdToXofRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const json = await res.json();
    if (json && json.rates && json.rates.XOF) {
      return Number(json.rates.XOF);
    }
  } catch (e) {
    console.warn('Fallback taux USD/XOF utilisé');
  }
  // Taux de sécurité par défaut si l'API externe est indisponible
  return 620;
}

// ==================================================
// 5. LECTURE DU CORPS DE LA REQUÊTE POST
// ==================================================

async function parseJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Format JSON invalide dans la requête.'));
      }
    });
    req.on('error', reject);
  });
}

// ==================================================
// 6. ROUTEUR PRINCIPAL (POST)
// ==================================================

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendJson(res, 405, {
      success: false,
      message: 'Utilisez la méthode POST avec le panier (items).'
    });
  }

  try {
    const body = await parseJsonBody(req);

    // Liste des articles du panier : [{ vid: "...", quantity: 2 }, ...]
    const items = Array.isArray(body.items) ? body.items : [];
    const endCountryCode = (body.countryCode || 'BJ').toUpperCase();
    const startCountryCode = (body.fromCountry || 'CN').toUpperCase();

    // Paramètres de sécurité (modifiables via la requête ou valeurs par défaut sûres)
    const fxBufferFcfa = Number(body.fxBufferFcfa ?? 25); // +25 FCFA/USD contre les frais bancaires
    const platformMarginPercent = Number(body.marginPercent ?? 25); // 25% de bénéfice DAKPRO ÉLITE
    const dduCustomsPercent = Number(body.customsPercent ?? 20); // 20% de provision douane si non-DDP
    const fedapayFeePercent = Number(body.paymentFeePercent ?? 2.5); // 2.5% frais Mobile Money / FedaPay

    if (!items.length) {
      return sendJson(res, 400, {
        success: false,
        message: 'Le panier est vide. Envoyez items: [{ vid, quantity }].'
      });
    }

    // 1. Récupération du prix réel CJ de chaque variante du panier
    let productsTotalUsd = 0;
    const freightProducts = [];
    const itemizedDetails = [];

    for (const item of items) {
      const vid = String(item.vid || '').trim();
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);

      if (!vid) {
        return sendJson(res, 400, {
          success: false,
          message: 'Chaque article doit contenir un identifiant vid valide.'
        });
      }

      const variantInfo = await callCJGet('/product/variant/queryByVid', { vid });
      const unitPriceUsd = Number(variantInfo.variantSellPrice || 0);

      if (unitPriceUsd <= 0) {
        throw new Error(`Prix fournisseur introuvable pour la variante ${vid}.`);
      }

      const lineTotalUsd = unitPriceUsd * quantity;
      productsTotalUsd += lineTotalUsd;

      freightProducts.push({
        quantity,
        vid
      });

      itemizedDetails.push({
        vid,
        variantName: variantInfo.variantNameEn || variantInfo.variantSku || vid,
        quantity,
        unitPriceUsd,
        lineTotalUsd: Number(lineTotalUsd.toFixed(2))
      });
    }

    // 2. Calcul automatique des frais de port groupés via CJ (1 à 100+ articles)
    const shippingOptions = await callCJPost('/logistic/freightCalculate', {
      startCountryCode,
      endCountryCode,
      products: freightProducts
    });

    if (!Array.isArray(shippingOptions) || shippingOptions.length === 0) {
      return sendJson(res, 422, {
        success: false,
        message: `Aucun transporteur CJ disponible vers le pays ${endCountryCode} pour ce panier.`
      });
    }

    // Priorité automatique aux lignes DDP (douane prépayée), sinon la moins chère
    const ddpOptions = shippingOptions.filter(opt =>
      String(opt.logisticName || '').toUpperCase().includes('DDP')
    );
    const pool = ddpOptions.length > 0 ? ddpOptions : shippingOptions;
    pool.sort((a, b) => Number(a.logisticPrice) - Number(b.logisticPrice));

    const selectedShipping = pool[0];
    const shippingTotalUsd = Number(selectedShipping.logisticPrice || 0);
    const isDdp = String(selectedShipping.logisticName || '').toUpperCase().includes('DDP');

    // 3. Conversion sécurisée USD -> FCFA (XOF)
    const liveUsdRate = await getUsdToXofRate();
    const securedUsdRate = liveUsdRate + fxBufferFcfa;

    const productsTotalFcfa = productsTotalUsd * securedUsdRate;
    const shippingTotalFcfa = shippingTotalUsd * securedUsdRate;
    const baseCostFcfa = productsTotalFcfa + shippingTotalFcfa;

    // 4. Provision douane (0 FCFA si DDP car déjà inclus dans le fret CJ, sinon provision %)
    const customsProvisionFcfa = isDdp
      ? 0
      : productsTotalFcfa * (dduCustomsPercent / 100);

    // 5. Marge DAKPRO ÉLITE + Frais d'encaissement FedaPay
    const marginFcfa = baseCostFcfa * (platformMarginPercent / 100);
    const subTotalBeforeGateway = baseCostFcfa + customsProvisionFcfa + marginFcfa;
    const gatewayFeeFcfa = subTotalBeforeGateway * (fedapayFeePercent / 100);

    // Arrondi à la centaine supérieure (ex: 12 430 -> 12 500 FCFA)
    const finalCustomerAmountFcfa = Math.ceil((subTotalBeforeGateway + gatewayFeeFcfa) / 100) * 100;

    return sendJson(res, 200, {
      success: true,
      currency: 'XOF',
      destination: endCountryCode,
      totalArticlesCount: freightProducts.reduce((sum, p) => sum + p.quantity, 0),
      shipping: {
        carrier: selectedShipping.logisticName,
        agingDays: selectedShipping.logisticAging || 'N/A',
        isDdp,
        customsNotice: isDdp
          ? 'Droits de douane inclus (DDP).'
          : 'Envoi DDU : provision douanière appliquée.'
      },
      exchangeRate: {
        marketRate: liveUsdRate,
        securedRateUsed: securedUsdRate
      },
      breakdownUsd: {
        productsUsd: Number(productsTotalUsd.toFixed(2)),
        shippingUsd: Number(shippingTotalUsd.toFixed(2)),
        totalCjCostUsd: Number((productsTotalUsd + shippingTotalUsd).toFixed(2))
      },
      breakdownFcfa: {
        productsFcfa: Math.round(productsTotalFcfa),
        shippingFcfa: Math.round(shippingTotalFcfa),
        customsProvisionFcfa: Math.round(customsProvisionFcfa),
        dakproMarginFcfa: Math.round(marginFcfa),
        gatewayFeeFcfa: Math.round(gatewayFeeFcfa),
        finalAmountToChargeFcfa: finalCustomerAmountFcfa
      },
      items: itemizedDetails
    });

  } catch (error) {
    console.error('[DAKPRO CALCULATE PRICE ERROR]', error);
    return sendJson(res, error.status || 500, {
      success: false,
      message: error.message || 'Erreur lors du calcul automatique du panier.'
    });
  }
};
