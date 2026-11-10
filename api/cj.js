import axios from 'axios';

const CJ_API_BASE = 'https://open.cjdropshipping.com/api2/v1';

let cachedToken = null;
let tokenExpiry = 0;

async function getCJToken() {
    const now = Date.now();
    if (cachedToken && now < tokenExpiry) {
        return cachedToken;
    }

    const email = process.env.CJ_ACCOUNT_EMAIL;
    const apiKey = process.env.CJ_API_KEY;

    if (!email || !apiKey) {
        throw new Error("Identifiants CJ manquants dans les variables Vercel.");
    }

    const response = await axios.post(`${CJ_API_BASE}/authentication/getAccessToken`, {
        email: email.trim(),
        password: apiKey.trim()
    });

    const result = response.data;
    if (!result || result.code !== 200 || !result.data?.accessToken) {
        throw new Error(result?.message || "Échec de l'authentification auprès de CJ.");
    }

    cachedToken = result.data.accessToken;
    tokenExpiry = now + (50 * 60 * 1000);
    return cachedToken;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action || (req.body && req.body.action);

    try {
        const token = await getCJToken();
        const headers = { 'CJ-Access-Token': token };

        if (action === 'categories') {
            const response = await axios.get(`${CJ_API_BASE}/product/category/get`, { headers });
            return res.status(200).json(response.data);
        }

        if (action === 'search') {
            const { keyWord, categoryId, page = 1, size = 50 } = req.method === 'GET' ? req.query : req.body;
            const response = await axios.get(`${CJ_API_BASE}/product/list`, {
                headers,
                params: {
                    productNameEn: keyWord || '',
                    categoryId: categoryId || '',
                    page: Number(page),
                    size: Number(size)
                }
            });
            return res.status(200).json(response.data);
        }

        if (action === 'details') {
            const pid = req.query.pid || (req.body && req.body.pid);
            const response = await axios.get(`${CJ_API_BASE}/product/detail`, {
                headers,
                params: { pid }
            });
            return res.status(200).json(response.data);
        }

        if (action === 'variants') {
            const pid = req.query.pid || (req.body && req.body.pid);
            const response = await axios.get(`${CJ_API_BASE}/product/variant/query`, {
                headers,
                params: { pid }
            });
            return res.status(200).json(response.data);
        }

        if (action === 'inventory') {
            const pid = req.query.pid || (req.body && req.body.pid);
            const response = await axios.get(`${CJ_API_BASE}/product/stock/query`, {
                headers,
                params: { pid }
            });
            return res.status(200).json(response.data);
        }

        return res.status(400).json({ success: false, message: `Action inconnue : ${action}` });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.response?.data?.message || error.message || "Erreur serveur."
        });
    }
}
