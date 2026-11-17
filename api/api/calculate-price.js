'use strict';

/**
 * DAKPRO ÉLITE — MOTEUR CENTRAL DE PRIX, LOGISTIQUE, AFFILIATION & TRACKING
 * Produits CJ + Livraison groupée + Taux USD/FCFA + Douane + Marge Admin + Commissions Affiliés + Cookies
 *
 * Vercel Serverless Function
 * Fichier : api/calculate-price.js
 */

const BASE_URL = (
  process.env.CJ_BASE_URL ||
  'https://developers.cjdropshipping.com/api2.0/v1'
).replace(/\/+$/, '');

// URL de votre Firebase Realtime Database (sans slash à la fin)
const FIREBASE_DB_URL = (
  process.env.FIREBASE_DATABASE_URL ||
  'https://dakpro-elite-default-rtdb.firebaseio.com'
).replace(/\/+$/, '');

const TOKEN_URL = `${BASE_URL}/authentication/getAccessToken`;
const REFRESH_URL = `${BASE_URL}/authentication/refreshAccessToken`;

let tokenCache = null;
let tokenPromise = null;

// ==================================================
// 1. CONFIGURATION CORS, COOKIES & DOMAINES DAKPRO ELITE
// ==================================================

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const key = parts.shift().trim();
    if (key) {
      list[key] = decodeURIComponent(parts.join('=').trim());
    }
  });
  return list;
}

function setCorsHeaders(req, res) {
  const requestOrigin = req.headers.origin;

  // Autoriser dynamiquement dakproelite.com et tous ses sous-domaines (acheteur, vendeur, admin, etc.)
  if (requestOrigin && (requestOrigin.endsWith('dakproelite.com') || requestOrigin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Partner-Key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function setAffiliateTrackingCookie(res, affiliateId) {
  if (!affiliateId) return;
  const maxAge = 30 * 24 * 60 * 60; // 30 jours de mémorisation du lien d'affilié
  const safeId = encodeURIComponent(String(affiliateId).trim());
  res.setHeader(
    'Set-Cookie',
    `dakpro_ref=${safeId}; Path=/; Max-Age=${maxAge}; Domain=.dakproelite.com; SameSite=Lax; Secure`
  );
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
// 2. CONNEXION FIREBASE REST (LECTURE PRODUITS & ANALYTICS)
// ==================================================

async function fetchFirebaseData(path) {
  try {
    const authSecret = process.env.FIREBASE_DB_SECRET ? `?auth=${process.env.FIREBASE_DB_SECRET}` : '';
    const url = `${FIREBASE_DB_URL}/${path.replace(/^\/+/, '')}.json${authSecret}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`[Firebase Read Warning] ${path}:`, err.message);
    return null;
  }
}

async function pushFirebaseAnalytics(eventData) {
  try {
    const authSecret = process.env.FIREBASE_DB_SECRET ? `?auth=${process.env.FIREBASE_DB_SECRET}` : '';
    const url = `${FIREBASE_DB_URL}/analytics/price_checks.json${authSecret}`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...eventData,
        timestamp: Date.now(),
        dateIso: new Date().toISOString()
      })
    });
  } catch (err) {
    console.warn('[Firebase Analytics Warning]:', err.message);
  }
}

// ==================================================
// 3. AUTHENTIFICATION CJ (IDENTIQUE À api/cj.js)
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
// 4. APPELS GET & POST VERS L'API CJ
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
// 5. TAUX DE CHANGE AUTOMATIQUE USD -> XOF (FCFA)
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
  return 620;
}

// ==================================================
// 6. LECTURE DU CORPS DE LA REQUÊTE POST
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
// 7. ROUTEUR PRINCIPAL (CALCUL + TRACKING + AFFILIATION)
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
    const cookies = parseCookies(req.headers.cookie);

    // 1. Identification du visiteur, de l'affilié (via lien ?ref= ou cookie) et du partenaire
    const rawAffiliateId = body.affiliateId || cookies.dakpro_ref || null;
    const affiliateId = rawAffiliateId ? String(rawAffiliateId).trim() : null;
    const visitorId = body.visitorId || cookies.dakpro_vid || `vis_${Date.now()}`;
    const partnerKey = req.headers['x-partner-key'] || body.partnerKey || null;

    // Si un affilié est présent, on rafraîchit le cookie de suivi cross-domain (dakproelite.com)
    if (affiliateId) {
      setAffiliateTrackingCookie(res, affiliateId);
    }

    // Vérification optionnelle d'un partenaire externe
    let partnerInfo = null;
    if (partnerKey) {
      const partnerRecord = await fetchFirebaseData(`api_keys/${partnerKey}`);
      if (!partnerRecord || partnerRecord.active !== true) {
        return sendJson(res, 401, {
          success: false,
          message: 'Clé API partenaire invalide ou désactivée.'
        });
      }
      partnerInfo = {
        partnerKey,
        partnerName: partnerRecord.partnerName || 'Partenaire DAKPRO'
      };
    }

    // 2. Paramètres du panier et du pays
    const items = Array.isArray(body.items) ? body.items : [];
    const endCountryCode = (body.countryCode || 'BJ').toUpperCase();
    const startCountryCode = (body.fromCountry || 'CN').toUpperCase();

    // Paramètres globaux de sécurité lus depuis Firebase /settings/pricing
    const globalSettings = (await fetchFirebaseData('settings/pricing')) || {};
    const fxBufferFcfa = Number(body.fxBufferFcfa ?? globalSettings.fxBufferFcfa ?? 25);
    const defaultPlatformMargin = Number(body.marginPercent ?? globalSettings.defaultPlatformMargin ?? 25);
    const defaultAffiliateMargin = Number(body.affiliatePercent ?? globalSettings.defaultAffiliateMargin ?? 15);
    const dduCustomsPercent = Number(body.customsPercent ?? globalSettings.dduCustomsPercent ?? 20);
    const fedapayFeePercent = Number(body.paymentFeePercent ?? globalSettings.fedapayFeePercent ?? 2.5);

    if (!items.length) {
      return sendJson(res, 400, {
        success: false,
        message: 'Le panier est vide. Envoyez items: [{ vid, quantity, productId }].'
      });
    }

    // Taux de change du jour + marge de sécurité
    const liveUsdRate = await getUsdToXofRate();
    const securedUsdRate = liveUsdRate + fxBufferFcfa;

    // 3. Analyse produit par produit (Prix CJ + Règles Admin Firebase + Vendeur + Affilié)
    let productsTotalUsd = 0;
    let totalPlatformMarginFcfa = 0;
    let totalAffiliateCommissionFcfa = 0;

    const freightProducts = [];
    const itemizedDetails = [];

    for (const item of items) {
      const vid = String(item.vid || '').trim();
      const productId = item.productId ? String(item.productId).trim() : null;
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);

      if (!vid) {
        return sendJson(res, 400, {
          success: false,
          message: 'Chaque article doit contenir un identifiant vid valide.'
        });
      }

      // Lecture du vrai prix fournisseur sur CJdropshipping
      const variantInfo = await callCJGet('/product/variant/queryByVid', { vid });
      const unitPriceUsd = Number(variantInfo.variantSellPrice || 0);

      if (unitPriceUsd <= 0) {
        throw new Error(`Prix fournisseur introuvable pour la variante ${vid}.`);
      }

      // Lecture des marges définies dans l'Admin Firebase pour ce produit
      let fbProduct = null;
      if (productId) {
        fbProduct = await fetchFirebaseData(`products/${productId}`);
      }

      const itemPlatformPercent = Number(
        item.platformMarginPercent ??
        (fbProduct && fbProduct.platformMarginPercent) ??
        defaultPlatformMargin
      );

      const itemAffiliatePercent = Number(
        item.affiliateCommissionPercent ??
        (fbProduct && fbProduct.affiliateCommissionPercent) ??
        defaultAffiliateMargin
      );

      const sellerId = (fbProduct && fbProduct.sellerId) || item.sellerId || 'DAKPRO_OFFICIAL';

      const lineTotalUsd = unitPriceUsd * quantity;
      const lineBaseFcfa = lineTotalUsd * securedUsdRate;
      productsTotalUsd += lineTotalUsd;

      // Répartition Plateforme vs Affilié
      const linePlatformFcfa = lineBaseFcfa * (itemPlatformPercent / 100);
      const lineAffiliateFcfa = affiliateId
        ? lineBaseFcfa * (itemAffiliatePercent / 100)
        : 0;

      totalPlatformMarginFcfa += linePlatformFcfa;
      totalAffiliateCommissionFcfa += lineAffiliateFcfa;

      freightProducts.push({ quantity, vid });

      itemizedDetails.push({
        vid,
        productId: productId || null,
        sellerId,
        variantName: variantInfo.variantNameEn || variantInfo.variantSku || vid,
        quantity,
        unitPriceUsd,
        lineTotalUsd: Number(lineTotalUsd.toFixed(2)),
        marginsApplied: {
          platformPercent: itemPlatformPercent,
          affiliatePercent: affiliateId ? itemAffiliatePercent : 0,
          platformGainFcfa: Math.round(linePlatformFcfa),
          affiliateGainFcfa: Math.round(lineAffiliateFcfa)
        }
      });
    }

    // 4. Calcul automatique du transport groupé CJ vers le pays choisi
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

    const ddpOptions = shippingOptions.filter(opt =>
      String(opt.logisticName || '').toUpperCase().includes('DDP')
    );
    const pool = ddpOptions.length > 0 ? ddpOptions : shippingOptions;
    pool.sort((a, b) => Number(a.logisticPrice) - Number(b.logisticPrice));

    const selectedShipping = pool[0];
    const shippingTotalUsd = Number(selectedShipping.logisticPrice || 0);
    const isDdp = String(selectedShipping.logisticName || '').toUpperCase().includes('DDP');

    // 5. Consolidation financière complète en FCFA
    const productsTotalFcfa = productsTotalUsd * securedUsdRate;
    const shippingTotalFcfa = shippingTotalUsd * securedUsdRate;
    const baseCostFcfa = productsTotalFcfa + shippingTotalFcfa;

    const customsProvisionFcfa = isDdp
      ? 0
      : productsTotalFcfa * (dduCustomsPercent / 100);

    const shippingMarginFcfa = shippingTotalFcfa * (defaultPlatformMargin / 100);
    const finalPlatformNetFcfa = totalPlatformMarginFcfa + shippingMarginFcfa;

    const subTotalBeforeGateway =
      baseCostFcfa +
      customsProvisionFcfa +
      finalPlatformNetFcfa +
      totalAffiliateCommissionFcfa;

    const gatewayFeeFcfa = subTotalBeforeGateway * (fedapayFeePercent / 100);

    const finalCustomerAmountFcfa = Math.ceil((subTotalBeforeGateway + gatewayFeeFcfa) / 100) * 100;

    // 6. Enregistrement analytique de la simulation dans Firebase
    if (body.trackVisit !== false) {
      pushFirebaseAnalytics({
        visitorId,
        affiliateId: affiliateId || 'DIRECT_PLATFORM',
        partnerName: partnerInfo ? partnerInfo.partnerName : 'INTERNAL',
        countryCode: endCountryCode,
        articlesCount: freightProducts.reduce((sum, p) => sum + p.quantity, 0),
        estimatedTotalFcfa: finalCustomerAmountFcfa
      });
    }

    return sendJson(res, 200, {
      success: true,
      currency: 'XOF',
      destination: endCountryCode,
      totalArticlesCount: freightProducts.reduce((sum, p) => sum + p.quantity, 0),
      tracking: {
        visitorId,
        hasAffiliate: Boolean(affiliateId),
        affiliateId: affiliateId || null,
        attributionMode: affiliateId ? 'AFFILIATE_LINK' : 'DIRECT_PLATFORM',
        partner: partnerInfo
      },
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
        platformNetGainFcfa: Math.round(finalPlatformNetFcfa),
        affiliateCommissionFcfa: Math.round(totalAffiliateCommissionFcfa),
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
