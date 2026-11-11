const { callCJApi } = require('../lib/cjService');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const action = req.query.action || req.body?.action;
    const method = req.method;
    const params = method === 'GET' ? req.query : req.body;

    let cjResponse;

    switch (action) {
      case 'categories':
        cjResponse = await callCJApi('/product/getCategory', 'GET');
        break;

      case 'search':
        cjResponse = await callCJApi('/product/list', 'GET', {
          pageNum: params.page || 1,
          pageSize: params.size || 50,
          keyword: params.keyWord || params.keyword || '',
          categoryId: params.categoryId || ''
        });
        break;

      case 'details':
        cjResponse = await callCJApi('/product/query', 'GET', {
          pid: params.pid
        });
        break;

      case 'variants':
        cjResponse = await callCJApi('/product/variant/query', 'GET', {
          pid: params.pid
        });
        break;

      case 'inventory':
        cjResponse = await callCJApi('/product/stock/query', 'GET', {
          pid: params.pid
        });
        break;

      case 'videos':
        cjResponse = await callCJApi('/product/video/query', 'POST', {
          productId: params.productId || params.pid
        });
        break;

      case 'pricing': {
        const supplierUSD = Number(params.supplierPriceUSD || 0);
        const rate = Number(params.exchangeRate || 655);
        const margin = Number(params.marginPercent || 30);

        const supplierFCFA = supplierUSD * rate;
        const publicPriceFCFA = supplierFCFA * (1 + margin / 100);
        const marginFCFA = publicPriceFCFA - supplierFCFA;

        const sellerFCFA = marginFCFA * 0.80;
        const affiliateFCFA = marginFCFA * 0.05;
        const dakproFCFA = marginFCFA * 0.15;

        return res.status(200).json({
          success: true,
          data: {
            supplierPriceFCFA: Math.round(supplierFCFA),
            publicPriceFCFA: Math.round(publicPriceFCFA),
            marginFCFA: Math.round(marginFCFA),
            commissions: {
              sellerFCFA: Math.round(sellerFCFA),
              affiliateFCFA: Math.round(affiliateFCFA),
              dakproFCFA: Math.round(dakproFCFA)
            }
          }
        });
      }

      default:
        return res.status(400).json({
          success: false,
          message: `Action CJ inconnue : ${action}`
        });
    }

    return res.status(200).json(cjResponse);
  } catch (error) {
    console.error('Erreur API CJ Backend :', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur interne du serveur backend CJ'
    });
  }
};
