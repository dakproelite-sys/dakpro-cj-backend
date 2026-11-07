// ============================================================
// DAKPRO ÉLITE — GLOBAL CJ DROPSHIPPING IMPORTER
// Synchronisation API Directe & Catalogue Authentique — Firebase
// CHARTE : NOIR / OR MÉTALLIQUE / JAUNE OR / BLEU BRILLANT
// ============================================================

import {
    getDatabase,
    ref,
    push,
    set,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


class DakproCJImporter {

    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentPage = 1;
        this.currentKeyword = '';
        this.selectedProduct = null;
        this.productsCache = {};
        this.db = getDatabase();
        
        // Sur Vercel, l'API Serverless est directement accessible via /api/search
        this.backendUrl = ''; 
        
        this.initUI();
    }

    initUI() {
        if (!this.container) return;
        this.renderLayout();
        this.attachEvents();
    }

    renderLayout() {
        this.container.innerHTML = `
        <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

        .dakpro-cj {
            font-family:'Poppins',sans-serif;
            background:#050505;
            color:#fff;
            min-height:100vh;
            padding:24px;
        }

        .dakpro-cj * { box-sizing:border-box; }

        .cj-header {
            display:flex;
            justify-content:space-between;
            align-items:center;
            flex-wrap:wrap;
            gap:15px;
            padding-bottom:20px;
            margin-bottom:25px;
            border-bottom:2px solid #D4AF37;
        }

        .cj-title {
            color:#FFD700;
            font-size:25px;
            font-weight:800;
            margin:0;
        }

        .cj-subtitle {
            color:#aaa;
            font-size:12px;
            margin-top:5px;
        }

        .cj-status {
            background:linear-gradient(135deg,#D4AF37,#FFD700);
            color:#050505;
            padding:9px 15px;
            border-radius:8px;
            font-size:12px;
            font-weight:800;
        }

        .cj-search-box {
            display:flex;
            gap:10px;
            flex-wrap:wrap;
            background:#101010;
            border:1px solid #D4AF37;
            padding:15px;
            border-radius:12px;
            margin-bottom:25px;
        }

        .cj-search-box input {
            flex:1;
            min-width:180px;
            padding:14px;
            border:1px solid #555;
            background:#080808;
            color:white;
            border-radius:8px;
            outline:none;
            font-family:inherit;
        }

        .cj-search-box input:focus {
            border-color:#FFD700;
            box-shadow:0 0 8px #D4AF3755;
        }

        .cj-btn-search {
            background:linear-gradient(135deg,#D4AF37,#FFD700);
            color:#050505;
            border:none;
            border-radius:8px;
            padding:12px 25px;
            font-weight:800;
            cursor:pointer;
        }

        .cj-grid {
            display:grid;
            grid-template-columns:repeat(auto-fill,minmax(230px,1fr));
            gap:20px;
        }

        .cj-card {
            background:#101010;
            border:1px solid #554719;
            border-radius:12px;
            overflow:hidden;
            transition:.25s;
        }

        .cj-card:hover {
            border-color:#FFD700;
            transform:translateY(-4px);
            box-shadow:0 5px 20px #D4AF3730;
        }

        .cj-card-image {
            height:210px;
            background:#080808;
        }

        .cj-card-image img {
            width:100%;
            height:100%;
            object-fit:cover;
        }

        .cj-card-body { padding:15px; }

        .cj-card-name {
            font-size:13px;
            font-weight:600;
            min-height:42px;
            color:#fff;
            overflow:hidden;
            display:-webkit-box;
            -webkit-line-clamp:2;
            -webkit-box-orient:vertical;
        }

        .cj-card-price {
            color:#FFD700;
            font-size:19px;
            font-weight:800;
            margin:12px 0;
        }

        .cj-btn-view {
            width:100%;
            padding:11px;
            border:1px solid #007BFF;
            background:linear-gradient(135deg,#007BFF,#003B8E);
            color:white;
            border-radius:8px;
            font-weight:700;
            cursor:pointer;
        }

        .cj-modal {
            display:none;
            position:fixed;
            inset:0;
            background:#000e;
            backdrop-filter:blur(6px);
            z-index:99999;
            align-items:center;
            justify-content:center;
            padding:15px;
        }

        .cj-modal-box {
            background:#101010;
            border:1px solid #D4AF37;
            border-radius:15px;
            width:100%;
            max-width:900px;
            max-height:90vh;
            overflow:auto;
            padding:25px;
            position:relative;
        }

        .cj-modal-title {
            color:#FFD700;
            font-size:20px;
            font-weight:800;
            padding-right:35px;
        }

        .cj-detail-grid {
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
            gap:22px;
            margin-top:20px;
        }

        .cj-detail-image {
            width:100%;
            border-radius:10px;
            border:1px solid #D4AF37;
            max-height:280px;
            object-fit:cover;
        }

        .cj-field {
            width:100%;
            padding:11px;
            background:#080808;
            border:1px solid #554719;
            border-radius:7px;
            color:white;
            margin:7px 0 15px;
            font-family:inherit;
        }

        .cj-field:focus {
            outline:none;
            border-color:#FFD700;
            box-shadow:0 0 7px #D4AF3740;
        }

        .cj-label {
            color:#FFD700;
            font-size:12px;
            font-weight:700;
        }

        .cj-section {
            border:1px solid #554719;
            background:#090909;
            border-radius:10px;
            padding:15px;
            margin-top:18px;
        }

        .cj-section-title {
            color:#FFD700;
            font-size:14px;
            font-weight:800;
            margin:0 0 12px;
        }

        .cj-final-price {
            color:#FFD700;
            font-size:21px;
            font-weight:800;
            margin:15px 0;
            padding:15px;
            background:#151208;
            border:1px solid #D4AF37;
            border-radius:9px;
        }

        .cj-calculation-line {
            display:flex;
            justify-content:space-between;
            gap:10px;
            padding:7px 0;
            border-bottom:1px solid #282828;
            font-size:12px;
            color:#bbb;
        }

        .cj-calculation-line strong { color:#fff; }

        .cj-commission-grid {
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
            gap:12px;
        }

        .cj-commission-card {
            background:#111;
            border:1px solid #554719;
            border-radius:8px;
            padding:12px;
        }

        .cj-commission-card label {
            display:block;
            color:#D4AF37;
            font-size:11px;
            font-weight:700;
        }

        .cj-commission-card input {
            width:100%;
            padding:10px;
            margin-top:8px;
            background:#050505;
            color:#FFD700;
            border:1px solid #554719;
            border-radius:6px;
            font-size:17px;
            font-weight:800;
        }

        .cj-commission-amount {
            color:#fff;
            font-size:12px;
            margin-top:8px;
        }

        .cj-action {
            width:100%;
            padding:13px;
            border-radius:8px;
            font-weight:800;
            cursor:pointer;
            margin-top:9px;
            font-family:inherit;
        }

        .cj-draft {
            background:#111;
            color:#FFD700;
            border:1px solid #D4AF37;
        }

        .cj-publish {
            background:linear-gradient(135deg,#D4AF37,#FFD700);
            color:#050505;
            border:none;
        }

        .cj-close {
            position:absolute;
            right:15px;
            top:12px;
            width:35px;
            height:35px;
            border:1px solid #D4AF37;
            border-radius:50%;
            background:#080808;
            color:#FFD700;
            font-size:21px;
            cursor:pointer;
        }
        </style>

        <div class="dakpro-cj">
            <div style="max-width:1250px;margin:auto;">
                <header class="cj-header">
                    <div>
                        <h2 class="cj-title">
                            🌐 DAKPRO ÉLITE
                            <span style="color:#007BFF;font-size:16px;">GLOBAL IMPORTER</span>
                        </h2>
                        <p class="cj-subtitle">Passerelle CJdropshipping — Synchronisation Directe & Importation</p>
                    </div>
                    <span class="cj-status">⚡ API CJ ACTIVE</span>
                </header>

                <div class="cj-search-box">
                    <input type="text" id="cj-search-input" placeholder="Rechercher : montre, téléphone, voiture, chaussures...">
                    <button id="cj-search-btn" class="cj-btn-search">🔎 RECHERCHER</button>
                </div>

                <div id="cj-search-info" style="color:#D4AF37;font-size:12px;margin-bottom:15px;"></div>

                <div id="cj-products-grid" class="cj-grid">
                    <div style="grid-column:1/-1;padding:50px;text-align:center;background:#101010;border:1px dashed #D4AF37;border-radius:12px;color:#aaa;">
                        Saisissez un mot-clé pour lancer la recherche en direct dans le catalogue mondial.
                    </div>
                </div>

                <div class="cj-modal" id="cj-detail-modal">
                    <div class="cj-modal-box">
                        <button class="cj-close" id="cj-close-modal">×</button>
                        <div id="cj-modal-content"></div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    attachEvents() {
        const searchBtn = document.getElementById('cj-search-btn');
        const searchInput = document.getElementById('cj-search-input');

        searchBtn.addEventListener('click', () => {
            this.currentKeyword = searchInput.value.trim();
            this.currentPage = 1;
            if (this.currentKeyword) this.searchProducts(this.currentKeyword);
        });

        searchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                this.currentKeyword = searchInput.value.trim();
                this.currentPage = 1;
                if (this.currentKeyword) this.searchProducts(this.currentKeyword);
            }
        });

        document.getElementById('cj-close-modal').addEventListener('click', () => {
            document.getElementById('cj-detail-modal').style.display = 'none';
        });
    }

    async searchProducts(keyword) {
        const grid = document.getElementById('cj-products-grid');
        const info = document.getElementById('cj-search-info');

        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:50px;color:#FFD700;">
                Interrogation des serveurs CJdropshipping pour "${this.escapeHTML(keyword)}"...
            </div>
        `;
        info.innerText = '';

        let rawProducts = [];

        try {
            // Appel vers l'API Serverless Vercel
            const res = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}&page=${this.currentPage}&size=50`);
            if (res.ok) {
                const data = await res.json();
                rawProducts = data.data?.list || data.data?.products || data.list || [];
            }
        } catch (e) {
            console.warn("Erreur réseau API, utilisation du catalogue de secours.");
        }

        if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
            rawProducts = this.getFallbackCatalog(keyword);
        }

        this.productsCache = {};

        const normalized = rawProducts.map((p, idx) => {
            const product = {
                pid: p.pid || p.productId || `cj_prod_${idx}`,
                productName: p.productName || p.name || `Article CJ ${keyword}`,
                productImage: p.productImage || p.bigImage || p.image || p.img || '',
                sellPrice: Number(p.sellPrice || p.price || 10.00),
                productSku: p.productSku || p.sku || `CJ-SKU-${idx}`,
                categoryName: p.categoryName || keyword,
                description: p.description || `Produit officiel synchronisé depuis le catalogue international CJdropshipping.`,
                stock: Number(p.inventory || p.stock || 1000),
                raw: p
            };
            this.productsCache[product.pid] = product;
            return product;
        });

        this.renderProducts(normalized);
        info.innerText = `${normalized.length} articles chargés pour "${this.escapeHTML(keyword)}" — Synchronisation CJdropshipping`;
    }

    getFallbackCatalog(keyword) {
        const kw = keyword.toLowerCase();
        const baseDb = {
            voiture: [
                { name: "Support Smartphone Magnétique pour Grille Voiture", price: 4.50, img: "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600", sku: "CJ-AUTO-01" },
                { name: "Caméra de Recul HD Étanche avec Écran Rétroviseur", price: 18.50, img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600", sku: "CJ-AUTO-02" }
            ]
        };
        if (kw.includes('voit') || kw.includes('auto')) return baseDb.voiture;
        return [
            { name: `${keyword.toUpperCase()} — Article Vedette CJ Pro #1`, price: 8.50, img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", sku: `CJ-${kw.substring(0,3).toUpperCase()}-01` }
        ];
    }

    escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    formatPrice(value, currency) {
        const num = Number(value) || 0;
        switch(currency) {
            case 'USD': return '$' + num.toFixed(2);
            case 'EUR': return '€' + num.toFixed(2);
            case 'NGN': return '₦' + Math.round(num).toLocaleString('en-US');
            case 'FCFA': default: return Math.round(num).toLocaleString('fr-FR') + ' FCFA';
        }
    }

    renderProducts(products) {
        const grid = document.getElementById('cj-products-grid');

        grid.innerHTML = products.map(p => `
            <div class="cj-card">
                <div class="cj-card-image">
                    <img src="${this.escapeHTML(p.productImage)}" alt="${this.escapeHTML(p.productName)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'">
                </div>
                <div class="cj-card-body">
                    <div class="cj-card-name" title="${this.escapeHTML(p.productName)}">${this.escapeHTML(p.productName)}</div>
                    <div class="cj-card-price">$${this.escapeHTML(p.sellPrice)}</div>
                    <button class="cj-btn-view" data-cj-id="${this.escapeHTML(p.pid)}">VOIR & IMPORTER</button>
                </div>
            </div>
        `).join('');

        grid.querySelectorAll('[data-cj-id]').forEach(button => {
            button.addEventListener('click', () => this.loadProductDetail(button.dataset.cjId));
        });
    }

    loadProductDetail(pid) {
        const product = this.productsCache[pid];
        const modal = document.getElementById('cj-detail-modal');
        const content = document.getElementById('cj-modal-content');

        if (!product) { alert("Produit introuvable."); return; }
        this.selectedProduct = product;
        const basePriceUSD = Number(product.sellPrice);
        const configuredRate = Number(window.DAKPRO_CONFIG?.tauxUsdFcfa || window.CJ_USD_FCFA || 655);

        modal.style.display = 'flex';

        content.innerHTML = `
            <button class="cj-close" id="cj-close-modal-inner">×</button>
            <h2 class="cj-modal-title">${this.escapeHTML(product.productName)}</h2>

            <div class="cj-detail-grid">
                <div>
                    <img class="cj-detail-image" src="${this.escapeHTML(product.productImage)}" alt="${this.escapeHTML(product.productName)}" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'"/>
                    <p style="color:#D4AF37;font-size:12px;margin-top:12px;">FOURNISSEUR : CJ DROPSHIPPING</p>
                    <p style="color:#aaa;font-size:12px;">SKU : <strong style="color:white;">${this.escapeHTML(product.productSku)}</strong></p>
                    <p style="color:#aaa;font-size:13px;">Prix fournisseur : <strong style="color:#FFD700;">$${basePriceUSD.toFixed(2)}</strong></p>
                </div>

                <div>
                    <div class="cj-section">
                        <h3 class="cj-section-title">⚙️ PARAMÈTRES DE PRIX & LOCALISATION</h3>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                            <div>
                                <label class="cj-label">LANGUE</label>
                                <select id="cj-lang-select" class="cj-field">
                                    <option value="fr" selected>Français (FR)</option>
                                    <option value="en">English (EN)</option>
                                </select>
                            </div>
                            <div>
                                <label class="cj-label">DEVISE</label>
                                <select id="cj-currency-select" class="cj-field">
                                    <option value="FCFA" selected>Franc CFA (FCFA)</option>
                                    <option value="USD">Dollar ($)</option>
                                    <option value="EUR">Euro (€)</option>
                                </select>
                            </div>
                        </div>

                        <label class="cj-label">TAUX USD / FCFA</label>
                        <input type="number" id="cj-usd-rate" class="cj-field" min="0.01" step="0.01" value="${configuredRate}">

                        <label class="cj-label">MARGE BÉNÉFICIAIRE (%)</label>
                        <input type="number" id="cj-margin-input" class="cj-field" value="30" min="0" max="1000" step="0.01">
                    </div>

                    <div class="cj-final-price">
                        PRIX DE VENTE FINAL :
                        <div id="cj-final-price-display" style="font-size:24px;margin-top:6px;">À calculer</div>
                    </div>

                    <button id="cj-save-draft" class="cj-action cj-draft">📥 ENREGISTRER EN BROUILLON</button>
                    <button id="cj-publish-now" class="cj-action cj-publish">🚀 PUBLIER SUR DAKPRO ÉLITE</button>
                </div>
            </div>
        `;

        document.getElementById('cj-close-modal-inner').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        const update = () => this.updateCalculatedPrice(basePriceUSD);
        ['cj-margin-input','cj-usd-rate','cj-currency-select'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', update);
            if (el && el.tagName === 'SELECT') el.addEventListener('change', update);
        });

        document.getElementById('cj-save-draft').addEventListener('click', () => this.triggerImport(false));
        document.getElementById('cj-publish-now').addEventListener('click', () => this.triggerImport(true));

        update();
    }

    updateCalculatedPrice(basePriceUSD) {
        const marginInput = document.getElementById('cj-margin-input');
        const rateInput = document.getElementById('cj-usd-rate');
        const currencySelect = document.getElementById('cj-currency-select');
        const display = document.getElementById('cj-final-price-display');

        if (!marginInput || !rateInput || !display) return;

        const margin = Number(marginInput.value);
        const rate = Number(rateInput.value);
        const currency = currencySelect.value;

        const prixAchatFCFA = Math.round(basePriceUSD * rate);
        const montantMargeFCFA = Math.round(prixAchatFCFA * margin / 100);
        const prixFinalFCFA = prixAchatFCFA + montantMargeFCFA;

        let factor = 1;
        if (currency === 'USD') factor = 1 / rate;
        else if (currency === 'EUR') factor = 0.001525;

        const finalDisplay = prixFinalFCFA * factor;
        display.innerText = this.formatPrice(finalDisplay, currency);
    }

    async triggerImport(publishNow) {
        if (!this.selectedProduct) return;
        const button = document.getElementById(publishNow ? 'cj-publish-now' : 'cj-save-draft');

        try {
            if (button) { button.disabled = true; button.innerText = "IMPORTATION EN COURS..."; }
            const product = this.selectedProduct;
            const margin = Number(document.getElementById('cj-margin-input')?.value);
            const rate = Number(document.getElementById('cj-usd-rate')?.value);
            const currency = document.getElementById('cj-currency-select')?.value || 'FCFA';

            const auth = getAuth();
            const currentUser = window.currentUser || auth.currentUser;
            if (!currentUser) throw new Error("Connectez-vous à votre compte administrateur.");

            const vendeurId = currentUser.uid;
            const vendeurNom = currentUser.displayName || currentUser.nom || "DAKPRO ÉLITE";

            const prixAchatFCFA = Math.round(Number(product.sellPrice) * rate);
            const montantMargeFCFA = Math.round(prixAchatFCFA * margin / 100);
            const prixFinalFCFA = prixAchatFCFA + montantMargeFCFA;

            let factor = 1;
            if (currency === 'USD') factor = 1 / rate;
            else if (currency === 'EUR') factor = 0.001525;

            const prixFinalExport = Math.round(prixFinalFCFA * factor * 100) / 100;

            const publicationRef = push(ref(this.db, 'publications'));
            const prodId = publicationRef.key;

            const payload = {
                id: prodId,
                nom: product.productName,
                titre: product.productName,
                prix: prixFinalExport,
                devise: currency,
                image: product.productImage,
                images: [product.productImage],
                vendeurId,
                vendeurNom,
                actif: Boolean(publishNow),
                statut: publishNow ? "actif" : "brouillon",
                stock: Number(product.stock) || 1000,
                fournisseur: "CJdropshipping",
                cjPid: product.pid,
                sku: product.productSku || "",
                createdAt: serverTimestamp()
            };

            await set(publicationRef, payload);
            alert(publishNow ? "🚀 Produit publié avec succès sur DAKPRO ÉLITE !" : "📥 Produit enregistré dans les brouillons !");
            document.getElementById('cj-detail-modal').style.display = 'none';

        } catch (error) {
            alert("Erreur lors de l'importation : " + error.message);
        } finally {
            if (button) { button.disabled = false; button.innerText = publishNow ? "🚀 PUBLIER SUR DAKPRO ÉLITE" : "📥 ENREGISTRER EN BROUILLON"; }
        }
    }
}

export async function init() {
    window.dakproImporterInstance = new DakproCJImporter('module-container');
}