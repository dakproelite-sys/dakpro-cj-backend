// ============================================================
// DAKPRO ÉLITE — SERVEUR PASSERELLE API CJ DROPSHIPPING (RENDER)
// ============================================================

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Clés récupérées depuis les variables d'environnement de Render
const CJ_API_KEY = process.env.CJ_API_KEY || "3cbdfa8d1b60406084ed6001902dc2a2";
const CJ_EMAIL = process.env.CJ_EMAIL || "contact@dakproelite.com"; 

// URL de base officielle CJdropshipping v2
const CJ_BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1";

let accessToken = null;
let tokenExpiresAt = 0;

// Fonction pour obtenir ou rafraîchir le jeton d'accès CJ
async function getCJAccessToken() {
    if (accessToken && Date.now() < tokenExpiresAt) {
        return accessToken;
    }

    try {
        const response = await axios.post(`${CJ_BASE_URL}/authentication/getToken`, {
            email: CJ_EMAIL,
            apiKey: CJ_API_KEY
        });

        const resData = response.data;
        if (resData && (resData.result || resData.code === 200 || resData.success)) {
            // Récupération sécurisée du token selon la structure de l'objet de réponse CJ
            accessToken = resData.data?.accessToken || resData.accessToken || resData.data;
            tokenExpiresAt = Date.now() + (24 * 60 * 60 * 1000); // Valide 24 heures
            return accessToken;
        } else {
            throw new Error(resData.message || "Échec d'authentification auprès de l'API CJdropshipping.");
        }
    } catch (error) {
        console.error("Erreur Auth CJ:", error.response?.data || error.message);
        return null;
    }
}

// Route de recherche de produits en direct
app.get('/api/cj/search', async (req, res) => {
    const keyword = req.query.keyword || '';
    const page = req.query.page || 1;
    const size = req.query.size || 20;

    try {
        const token = await getCJAccessToken();
        if (!token) {
            return res.status(500).json({ error: "Impossible d'établir la liaison sécurisée avec CJdropshipping." });
        }

        // Appel sur l'endpoint officiel de recherche/liste de produits CJ v2
        const cjResponse = await axios.get(`${CJ_BASE_URL}/product/list`, {
            headers: { 
                'Access-Token': token,
                'Content-Type': 'application/json'
            },
            params: {
                productNameEn: keyword,
                page: page,
                size: size
            }
        });

        res.json(cjResponse.data);
    } catch (error) {
        console.error("Erreur Recherche CJ:", error.response?.data || error.message);
        res.status(500).json({ error: "Erreur lors de la récupération du catalogue distant.", details: error.response?.data || error.message });
    }
});

// Route de test santé du serveur
app.get('/', (req, res) => {
    res.send("🚀 Passerelle DAKPRO ÉLITE CJdropshipping opérationnelle sur Render.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Passerelle Backend DAKPRO ÉLITE active sur le port ${PORT}`);
});
