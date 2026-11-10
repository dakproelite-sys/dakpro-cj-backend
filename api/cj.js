const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Activation du CORS pour autoriser les appels depuis votre front-end
app.use(cors());
app.use(express.json());

// Clé / Token d'accès CJ Dropshipping (depuis la variable d'environnement ou en dur si nécessaire)
const CJ_ACCESS_TOKEN = process.env.CJ_ACCESS_TOKEN || 'VOTRE_TOKEN_CJ_ICI';
const CJ_BASE_URL = 'https://developers.cjdropshipping.cn/api2.0/v1';

// 1. Route pour récupérer les catégories CJ
app.get('/api/cj/categories', async (req, res) => {
  try {
    const response = await axios.get(`${CJ_BASE_URL}/product/getCategory`, {
      headers: {
        'CJ-Access-Token': CJ_ACCESS_TOKEN
      }
    });
    return res.status(200).json(response.data);
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.response ? error.response.data : error.message 
    });
  }
});

// 2. Route pour récupérer et importer les produits (avec pagination et recherche)
app.get('/api/cj/products', async (req, res) => {
  try {
    const { pageNum = 1, pageSize = 20, categoryId, keyword } = req.query;

    const params = {
      pageNum: Number(pageNum),
      pageSize: Number(pageSize)
    };

    if (categoryId) params.categoryId = categoryId;
    if (keyword) params.productName = keyword;

    const response = await axios.get(`${CJ_BASE_URL}/product/list`, {
      headers: {
        'CJ-Access-Token': CJ_ACCESS_TOKEN
      },
      params: params
    });

    return res.status(200).json(response.data);
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.response ? error.response.data : error.message 
    });
  }
});

// 3. Route pour récupérer les détails d'un produit par son PID
app.get('/api/cj/product-detail', async (req, res) => {
  try {
    const { pid } = req.query;

    if (!pid) {
      return res.status(400).json({ success: false, message: "Le paramètre 'pid' du produit est requis." });
    }

    const response = await axios.get(`${CJ_BASE_URL}/product/query`, {
      headers: {
        'CJ-Access-Token': CJ_ACCESS_TOKEN
      },
      params: { pid }
    });

    return res.status(200).json(response.data);
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.response ? error.response.data : error.message 
    });
  }
});

module.exports = app;
