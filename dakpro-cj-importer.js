// ============================================================
// DAKPRO ÉLITE — GLOBAL CJ IMPORTER PRO (ULTRA-ROBUSTE V3)
// CJ DROPSHIPPING + CLOUDINARY + FIREBASE
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

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
    API: "https://cj.dakproelite.com/api/cj",

    CLOUDINARY: {
        cloudName: "iufene3y",
        uploadPreset: "dakproelite_preset",
        folder: "dakproelite"
    },

    exchangeRate: 655,
    marginPercent: 30,

    commissions: {
        seller: 80,
        affiliate: 5,
        platform: 15
    }
};

// ============================================================
// IMPORTATEUR
// ============================================================

class DakproCJImporter {

    constructor(containerId = "module-container") {

        this.container = document.getElementById(containerId);

        if (!this.container) {
            console.error("DAKPRO : module-container introuvable.");
            return;
        }

        this.db = getDatabase();
        this.auth = getAuth();

        this.page = 1;
        this.pageSize = 50;
        this.totalPages = 1;
        this.totalRecords = 0;

        this.keyword = "";
        this.categoryId = "";

        this.products = new Map();
        this.product = null;

        this.variants = [];
        this.inventory = null;
        this.videos = [];

        this.loading = false;
        this.importing = false;

        this.render();
        this.events();
        this.loadCategories();
    }

    // ========================================================
    // INTERFACE
    // ========================================================

    render() {

        this.container.innerHTML = `

        <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');

        .dakcj {
            background:#050505;
            color:#fff;
            padding:18px;
            min-height:100vh;
            font-family:Poppins,sans-serif;
        }

        .dakcj * {box-sizing:border-box}

        .dakcj-header {
            display:flex;
            justify-content:space-between;
            align-items:center;
            flex-wrap:wrap;
            gap:12px;
            padding-bottom:18px;
            border-bottom:2px solid #D4AF37;
            margin-bottom:20px;
        }

        .dakcj-title {
            color:#FFD700;
            font-size:22px;
            font-weight:800;
            margin:0;
        }

        .dakcj-subtitle {
            color:#aaa;
            font-size:11px;
        }

        .dakcj-status {
            color:#FFD700;
            border:1px solid #D4AF37;
            padding:9px 12px;
            border-radius:8px;
            font-size:10px;
            font-weight:800;
        }

        .dakcj-search {
            display:grid;
            grid-template-columns:2fr 1fr auto;
            gap:10px;
            padding:14px;
            background:#111;
            border:1px solid #80651f;
            border-radius:10px;
        }

        .dakcj input,
        .dakcj select {
            width:100%;
            padding:12px;
            border-radius:7px;
            background:#080808;
            color:white;
            border:1px solid #555;
            font-family:inherit;
        }

        .dakcj button {
            cursor:pointer;
            font-family:inherit;
            font-weight:800;
        }

        .dakcj button:disabled {
            opacity:.45;
            cursor:not-allowed;
        }

        .dakcj-btn {
            background:linear-gradient(135deg,#D4AF37,#FFD700);
            color:#050505;
            border:0;
            border-radius:7px;
            padding:12px 17px;
        }

        .dakcj-info {
            color:#D4AF37;
            font-size:11px;
            margin:15px 0;
        }

        .dakcj-grid {
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:12px;
        }

        .dakcj-card {
            background:#111;
            border:1px solid #554719;
            border-radius:10px;
            overflow:hidden;
        }

        .dakcj-card img {
            width:100%;
            height:160px;
            object-fit:contain;
            background:#080808;
        }

        .dakcj-card-body {padding:11px}

        .dakcj-name {
            font-size:11px;
            font-weight:600;
            min-height:34px;
        }

        .dakcj-price {
            color:#FFD700;
            font-weight:800;
            font-size:14px;
            margin:9px 0;
        }

        .dakcj-view {
            width:100%;
            padding:10px;
            background:#0759bd;
            color:white;
            border:0;
            border-radius:7px;
        }

        .dakcj-pages {
            display:flex;
            justify-content:center;
            align-items:center;
            gap:15px;
            margin:25px 0;
        }

        .dakcj-pages button {
            background:#111;
            color:#FFD700;
            border:1px solid #D4AF37;
            padding:10px 15px;
            border-radius:7px;
        }

        .dakcj-modal {
            display:none;
            position:fixed;
            inset:0;
            z-index:999999;
            background:#000e;
            align-items:center;
            justify-content:center;
            padding:12px;
        }

        .dakcj-modal-box {
            background:#101010;
            border:1px solid #D4AF37;
            border-radius:12px;
            width:100%;
            max-width:850px;
            max-height:92vh;
            overflow:auto;
            padding:20px;
        }

        .dakcj-close {
            float:right;
            background:#080808;
            border:1px solid #D4AF37;
            color:#FFD700;
            border-radius:50%;
            width:34px;
            height:34px;
        }

        .dakcj-detail {
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:20px;
            clear:both;
            padding-top:15px;
        }

        .dakcj-detail img {
            width:100%;
            max-height:300px;
            object-fit:contain;
            background:#080808;
            border:1px solid #554719;
            border-radius:8px;
        }

        .dakcj-section {
            background:#090909;
            border:1px solid #554719;
            border-radius:8px;
            padding:13px;
            margin-bottom:12px;
        }

        .dakcj-section h3 {
            color:#FFD700;
            font-size:12px;
        }

        .dakcj-label {
            display:block;
            color:#D4AF37;
            font-size:10px;
            margin:12px 0 5px;
        }

        .dakcj-result {
            color:#FFD700;
            font-size:23px;
            font-weight:800;
        }

        .dakcj-action {
            width:100%;
            padding:13px;
            border:0;
            border-radius:7px;
            margin-top:10px;
        }

        .dakcj-publish {
            background:linear-gradient(135deg,#D4AF37,#FFD700);
            color:#050505;
        }

        .dakcj-draft {
            background:#111;
            border:1px solid #D4AF37;
            color:#FFD700;
        }

        .dakcj-message {
            grid-column:1/-1;
            text-align:center;
            padding:30px;
            color:#ffb3b3;
            border:1px dashed #ff4d4d;
            border-radius:10px;
            background:#200;
        }

        .dakcj-video {
            width:100%;
            max-height:220px;
            margin-top:10px;
            background:#000;
        }

        @media(min-width:700px) {
            .dakcj-grid {
                grid-template-columns:repeat(4,minmax(0,1fr));
            }
        }

        @media(min-width:1200px) {
            .dakcj-grid {
                grid-template-columns:repeat(6,minmax(0,1fr));
            }
        }

        @media(max-width:650px) {
            .dakcj {padding:10px}
            .dakcj-search {grid-template-columns:1fr}
            .dakcj-detail {grid-template-columns:1fr}
        }
        </style>

        <section class="dakcj">

            <header class="dakcj-header">
                <div>
                    <h2 class="dakcj-title">
                        DAKPRO ÉLITE
                        <span style="color:#087bff">GLOBAL IMPORTER</span>
                    </h2>
                    <div class="dakcj-subtitle">
                        Catalogue international CJ Dropshipping
                    </div>
                </div>

                <span class="dakcj-status" id="dakcj-status">
                    ● INITIALISATION
                </span>
            </header>

            <div class="dakcj-search">

                <input id="dakcj-keyword"
                    type="search"
                    placeholder="Rechercher un produit CJ (ex: SmartWatch)...">

                <input id="dakcj-category"
                    list="dakcj-categories"
                    placeholder="Catégorie CJ">

                <datalist id="dakcj-categories"></datalist>

                <button class="dakcj-btn" id="dakcj-search">
                    RECHERCHER
                </button>

            </div>

            <div class="dakcj-info" id="dakcj-info">
                Prêt pour la recherche de produits.
            </div>

            <div class="dakcj-grid" id="dakcj-grid">
                <div class="dakcj-message" style="color:#aaa;border-color:#D4AF37;background:#111;">
                    DAKPRO ÉLITE — GLOBAL IMPORTER
                    <br><br>
                    Saisissez un mot-clé pour interroger le catalogue CJ Dropshipping.
                </div>
            </div>

            <div class="dakcj-pages">
                <button id="dakcj-prev" disabled>← Précédent</button>
                <span id="dakcj-page">Page 1 / 1</span>
                <button id="dakcj-next" disabled>Suivant →</button>
            </div>

            <div class="dakcj-modal" id="dakcj-modal">
                <div class="dakcj-modal-box">
                    <button class="dakcj-close" id="dakcj-close">×</button>
                    <div id="dakcj-detail-content"></div>
                </div>
            </div>

        </section>
        `;
    }

    // ========================================================
    // COMMUNICATION AVEC L'API VERCEL (ULTRA-SÉCURISÉE)
    // ========================================================

    async api(action, params = {}, method = "GET") {
        const url = new URL(CONFIG.API);
        url.searchParams.set("action", action);

        if (method === "GET") {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "") {
                    url.searchParams.set(key, String(value));
                }
            });
        }

        let response;
        try {
            response = await fetch(url.toString(), {
                method,
                headers: {
                    "Accept": "application/json",
                    ...(method !== "GET" ? {"Content-Type": "application/json"} : {})
                },
                body: method !== "GET" ? JSON.stringify(params) : undefined
            });
        } catch (networkError) {
            throw new Error(`Erreur réseau : Impossible de contacter le serveur Vercel (${networkError.message}). Vérifiez votre connexion internet.`);
        }

        let result;
        const textResponse = await response.text();

        try {
            result = JSON.parse(textResponse);
        } catch {
            throw new Error(`Réponse serveur invalide (Format non-JSON) : ${textResponse.substring(0, 100)}...`);
        }

        if (!response.ok || result.success === false) {
            let errorDetail = result.message || result.error || `Erreur HTTP ${response.status}`;
            if (typeof errorDetail === 'object') {
                errorDetail = JSON.stringify(errorDetail);
            }
            throw new Error(errorDetail);
        }

        return result;
    }

    // ========================================================
    // EXTRACTION DES RÉPONSES
    // ========================================================

    getData(response) {
        return response?.data ?? response?.resultData ?? response;
    }

    getList(response) {
        const data = this.getData(response);
        const candidates = [
            data?.list,
            data?.variants,
            data?.items,
            data?.inventory,
            data?.tree,
            data
        ];
        return candidates.find(Array.isArray) || [];
    }

    getObject(response) {
        let data = this.getData(response);
        if (Array.isArray(data)) {
            data = data[0] || {};
        }
        if (data?.list && Array.isArray(data.list)) {
            data = data.list[0] || {};
        }
        return data && typeof data === "object" ? data : {};
    }

    // ========================================================
    // ÉVÉNEMENTS
    // ========================================================

    events() {
        const $ = selector => this.container.querySelector(selector);

        $("#dakcj-search").addEventListener("click", () => {
            this.keyword = $("#dakcj-keyword").value.trim();
            this.categoryId = $("#dakcj-category").value.trim();
            this.page = 1;
            this.search();
        });

        $("#dakcj-keyword").addEventListener("keydown", event => {
            if (event.key === "Enter") $("#dakcj-search").click();
        });

        $("#dakcj-prev").addEventListener("click", () => {
            if (this.page > 1 && !this.loading) {
                this.page--;
                this.search();
            }
        });

        $("#dakcj-next").addEventListener("click", () => {
            if (this.page < this.totalPages && !this.loading) {
                this.page++;
                this.search();
            }
        });

        $("#dakcj-close").addEventListener("click", () => this.close());

        $("#dakcj-modal").addEventListener("click", event => {
            if (event.target.id === "dakcj-modal") this.close();
        });
    }

    // ========================================================
    // CATÉGORIES
    // ========================================================

    async loadCategories() {
        try {
            const response = await this.api("categories");
            const categories = this.getList(response);
            const flattened = [];

            const visit = list => {
                list.forEach(item => {
                    if (!item || typeof item !== "object") return;
                    const id = item.categoryId || item.categoryFirstId || item.categorySecondId || item.id;
                    const name = item.categoryName || item.categoryFirstName || item.categorySecondName || item.name;

                    if (id && name) {
                        flattened.push({ id: String(id), name: String(name) });
                    }

                    const children = item.categoryFirstList || item.categorySecondList || item.children || item.list;
                    if (Array.isArray(children)) visit(children);
                });
            };

            visit(categories);

            const unique = [...new Map(flattened.map(item => [item.id, item])).values()];

            this.container.querySelector("#dakcj-categories").innerHTML =
                unique.map(item => `
                    <option value="${this.escape(item.id)}">
                        ${this.escape(item.name)}
                    </option>
                `).join("");

            this.status("● CONNECTEUR CJ PRÊT");

        } catch (error) {
            console.warn("Catégories CJ :", error.message);
            this.status("● ERREUR CATÉGORIES");
        }
    }

    // ========================================================
    // RECHERCHE CATALOGUE
    // ========================================================

    async search() {
        if (this.loading) return;
        this.loading = true;

        const grid = this.container.querySelector("#dakcj-grid");
        const info = this.container.querySelector("#dakcj-info");

        grid.innerHTML = `
            <div class="dakcj-message" style="color:#FFD700;border-color:#D4AF37;background:#111;">
                🔍 Recherche en cours sur CJ Dropshipping...
            </div>
        `;
        this.status("● RECHERCHE EN COURS");

        try {
            const response = await this.api("search", {
                keyWord: this.keyword,
                categoryId: this.categoryId,
                page: this.page,
                size: this.pageSize
            });

            const data = this.getData(response);
            const list = Array.isArray(data?.list) ? data.list : [];

            this.totalPages = Math.max(1, Number(data?.totalPages) || 1);
            this.totalRecords = Number(data?.totalRecords) || 0;

            if (list.length === 0) {
                grid.innerHTML = `
                    <div class="dakcj-message" style="color:#FFD700;border-color:#D4AF37;background:#111;">
                        ⚠️ Aucun produit trouvé pour <strong>"${this.escape(this.keyword)}"</strong>.<br>
                        Veuillez essayer un autre terme ou vérifier l'orthographe.
                    </div>
                `;
                info.textContent = "Aucun résultat trouvé.";
                this.status("● AUCUN RÉSULTAT");
                return;
            }

            this.products.clear();

            const products = list.map(item => {
                const pid = String(item.pid || item.id || item.productId || "");
                const images = this.images(item.images || item.productImageSet, item.productImage || item.bigImage);

                const product = {
                    pid,
                    name: item.productName || item.productNameEn || item.nameEn || "Produit CJ",
                    image: item.productImage || item.bigImage || images[0] || "",
                    images,
                    sku: item.productSku || item.sku || "",
                    price: this.number(item.sellPrice ?? item.productPrice ?? item.supplierPrice),
                    stock: this.stock(item),
                    categoryId: item.categoryId || "",
                    categoryName: item.categoryName || "",
                    description: item.description || "",
                    raw: item
                };

                if (pid) this.products.set(pid, product);
                return product;
            }).filter(item => item.pid);

            this.renderProducts(products);

            info.textContent = `${this.totalRecords.toLocaleString("fr-FR")} résultats trouvés — page ${this.page} sur ${this.totalPages}.`;
            this.status("● CATALOGUE CJ CONNECTÉ");

        } catch (error) {
            grid.innerHTML = `
                <div class="dakcj-message">
                    ❌ <strong>Problème rencontré avec l'API CJ :</strong><br><br>
                    ${this.escape(error.message)}
                </div>
            `;
            this.status("● ERREUR API");
            info.textContent = "La recherche a échoué.";
        } finally {
            this.loading = false;
            this.pagination();
        }
    }

    // ========================================================
    // AFFICHAGE CATALOGUE
    // ========================================================

    renderProducts(products) {
        const grid = this.container.querySelector("#dakcj-grid");

        if (!products.length) {
            grid.innerHTML = `
                <div class="dakcj-message">
                    Aucun produit valide à afficher.
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(product => `
            <article class="dakcj-card">
                ${
                    product.image
                        ? `<img src="${this.escape(product.image)}" alt="${this.escape(product.name)}" loading="lazy">`
                        : `<div style="height:160px;text-align:center;padding:60px 5px;color:#888">Image indisponible</div>`
                }
                <div class="dakcj-card-body">
                    <div class="dakcj-name">${this.escape(product.name)}</div>
                    <div class="dakcj-price">
                        ${product.price ? "$" + product.price.toFixed(2) : "Prix indisponible"}
                    </div>
                    <button class="dakcj-view" data-pid="${this.escape(product.pid)}">
                        VOIR LE PRODUIT
                    </button>
                </div>
            </article>
        `).join("");

        grid.querySelectorAll("[data-pid]").forEach(button => {
            button.addEventListener("click", () => {
                this.openProduct(button.dataset.pid);
            });
        });
    }

    // ========================================================
    // DÉTAILS PRODUIT
    // ========================================================

    async openProduct(pid) {
        const product = this.products.get(String(pid));
        if (!product) return;

        this.product = product;

        const modal = this.container.querySelector("#dakcj-modal");
        const content = this.container.querySelector("#dakcj-detail-content");

        modal.style.display = "flex";
        content.innerHTML = `
            <div class="dakcj-message" style="color:#FFD700;border-color:#D4AF37;background:#111;">
                Chargement des détails et des variantes depuis CJ Dropshipping...
            </div>
        `;

        try {
            const [detailResponse, variantResponse] = await Promise.allSettled([
                this.api("details", {pid: product.pid}),
                this.api("variants", {pid: product.pid})
            ]);

            if (detailResponse.status === "fulfilled") {
                const details = this.getObject(detailResponse.value);
                product.name = details.productName || details.productNameEn || product.name;
                product.description = details.description || details.productDescription || product.description;
                product.sku = details.productSku || details.sku || product.sku;
                product.image = details.productImage || details.bigImage || product.image;
                product.images = this.images(details.images || details.productImageSet, product.image);
                product.price = this.number(details.sellPrice ?? details.supplierPrice ?? details.productPrice ?? product.price);
            }

            this.variants = variantResponse.status === "fulfilled" ? this.getList(variantResponse.value) : [];

            this.inventory = null;
            try {
                const stockResponse = await this.api("inventory", {pid: product.pid});
                this.inventory = this.getObject(stockResponse);
            } catch (error) {
                console.warn("Stock non récupéré :", error.message);
            }

            this.videos = [];
            try {
                const videoResponse = await this.api("videos", {productId: product.pid}, "POST");
                this.videos = this.getList(videoResponse);
            } catch (error) {
                console.warn("Vidéos indisponibles :", error.message);
            }

            this.renderDetail();

        } catch (error) {
            content.innerHTML = `
                <div class="dakcj-message">
                    ❌ Erreur lors du chargement des détails : ${this.escape(error.message)}
                </div>
            `;
        }
    }

    // ========================================================
    // DÉTAIL ET PARAMÈTRES
    // ========================================================

    renderDetail() {
        const content = this.container.querySelector("#dakcj-detail-content");

        const variants = this.variants.map((item, index) => `
            <option value="${index}">
                ${this.escape(item.variantName || item.name || item.variantSku || "Variante " + (index + 1))}
            </option>
        `).join("");

        const videos = this.videos
            .filter(video => (video.isFree || video.isBuy || video.copyrightBuyType === 1 || video.copyrightBuyType === 2) && (video.videoUrl || video.url))
            .map(video => `
                <video class="dakcj-video" controls preload="metadata" src="${this.escape(video.videoUrl || video.url)}"></video>
            `).join("");

        content.innerHTML = `
            <h2 style="color:#FFD700;font-size:18px">${this.escape(this.product.name)}</h2>
            <div class="dakcj-detail">
                <div>
                    ${this.product.image ? `<img src="${this.escape(this.product.image)}">` : ""}
                    <p style="color:#aaa;font-size:11px">FOURNISSEUR : CJ DROPSHIPPING</p>
                    <p style="color:#FFD700;font-size:13px">Prix fournisseur : ${this.product.price ? "$" + this.product.price : "Indisponible"}</p>
                    <p style="font-size:11px;color:#aaa">Référence : ${this.escape(this.product.sku)}</p>
                    <label class="dakcj-label">VARIANTES</label>
                    <select id="dakcj-variant">
                        <option value="">Produit standard</option>
                        ${variants}
                    </select>
                    ${videos}
                </div>
                <div>
                    <div class="dakcj-section">
                        <h3>PARAMÈTRES COMMERCIAUX</h3>
                        <label class="dakcj-label">TAUX USD / FCFA</label>
                        <input id="dakcj-rate" type="number" value="${CONFIG.exchangeRate}">
                        <label class="dakcj-label">MARGE COMMERCIALE (%)</label>
                        <input id="dakcj-margin" type="number" min="0" max="1000" value="${CONFIG.marginPercent}">
                    </div>
                    <div class="dakcj-section">
                        <h3>PRIX PUBLIC</h3>
                        <div class="dakcj-result" id="dakcj-price">Calcul...</div>
                        <div id="dakcj-cost" style="font-size:11px;color:#aaa;margin-top:10px"></div>
                    </div>
                    <button id="dakcj-draft" class="dakcj-action dakcj-draft">ENREGISTRER EN BROUILLON</button>
                    <button id="dakcj-publish" class="dakcj-action dakcj-publish">PUBLIER SUR DAKPRO ÉLITE</button>
                </div>
            </div>
        `;

        content.querySelector("#dakcj-rate").addEventListener("input", () => this.previewPrice());
        content.querySelector("#dakcj-margin").addEventListener("input", () => this.previewPrice());
        content.querySelector("#dakcj-draft").addEventListener("click", () => this.publish(false));
        content.querySelector("#dakcj-publish").addEventListener("click", () => this.publish(true));

        this.previewPrice();
    }

    async calculatePrice() {
        const rate = Number(this.container.querySelector("#dakcj-rate").value);
        const margin = Number(this.container.querySelector("#dakcj-margin").value);

        if (!Number.isFinite(rate) || rate <= 0) throw new Error("Taux de conversion invalide.");
        if (!Number.isFinite(margin) || margin < 0 || margin > 1000) throw new Error("Marge commerciale invalide.");
        if (!this.product.price || this.product.price <= 0) throw new Error("Prix fournisseur CJ indisponible.");

        const response = await this.api("pricing", {
            supplierPriceUSD: this.product.price,
            exchangeRate: rate,
            marginPercent: margin
        }, "POST");

        const result = this.getObject(response);
        return {
            supplierCost: Number(result.supplierPriceFCFA),
            finalPrice: Number(result.publicPriceFCFA),
            marginFCFA: Number(result.marginFCFA),
            rate,
            margin,
            commissions: {
                seller: Number(result.commissions?.sellerFCFA || 0),
                affiliate: Number(result.commissions?.affiliateFCFA || 0),
                platform: Number(result.commissions?.dakproFCFA || 0)
            }
        };
    }

    async previewPrice() {
        try {
            const result = await this.calculatePrice();
            this.container.querySelector("#dakcj-price").textContent = this.fcfa(result.finalPrice);
            this.container.querySelector("#dakcj-cost").innerHTML = `
                Coût fournisseur : <strong>${this.fcfa(result.supplierCost)}</strong><br>
                Marge commerciale : <strong>${this.fcfa(result.marginFCFA)}</strong><br>
                Vendeur 80 % : <strong>${this.fcfa(result.commissions.seller)}</strong><br>
                Affiliation 5 % : <strong>${this.fcfa(result.commissions.affiliate)}</strong><br>
                DAKPRO 15 % : <strong>${this.fcfa(result.commissions.platform)}</strong>
            `;
        } catch (error) {
            this.container.querySelector("#dakcj-price").textContent = "Calcul indisponible";
            this.container.querySelector("#dakcj-cost").textContent = error.message;
        }
    }

    async uploadRemoteToCloudinary(remoteUrl, resourceType = "auto") {
        if (!remoteUrl) return "";
        const endpoint = `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY.cloudName}/${resourceType}/upload`;
        const form = new FormData();
        form.append("file", remoteUrl);
        form.append("upload_preset", CONFIG.CLOUDINARY.uploadPreset);
        form.append("folder", CONFIG.CLOUDINARY.folder);

        const response = await fetch(endpoint, { method: "POST", body: form });
        const data = await response.json();
        if (!response.ok || !data.secure_url) {
            throw new Error(data.error?.message || "Transfert Cloudinary impossible.");
        }
        return data.secure_url;
    }

    async transferProductMedia() {
        const sourceImages = [...new Set([this.product.image, ...(this.product.images || [])].filter(Boolean))];
        const cloudImages = [];

        for (const imageUrl of sourceImages) {
            try {
                const cloudUrl = await this.uploadRemoteToCloudinary(imageUrl, "image");
                cloudImages.push(cloudUrl);
            } catch {
                cloudImages.push(imageUrl);
            }
        }

        let cloudVideo = "";
        const allowedVideo = this.videos.find(v => (v.isFree || v.isBuy || v.copyrightBuyType === 1 || v.copyrightBuyType === 2) && (v.videoUrl || v.url));
        if (allowedVideo) {
            try {
                cloudVideo = await this.uploadRemoteToCloudinary(allowedVideo.videoUrl || allowedVideo.url, "video");
            } catch {}
        }

        return {
            images: cloudImages,
            image: cloudImages[0] || this.product.image || "",
            video: cloudVideo
        };
    }

    async publish(publishNow) {
        if (this.importing) return;
        const currentUser = window.currentUser || this.auth.currentUser;

        if (!currentUser) {
            alert("Connectez-vous avant de publier un produit.");
            return;
        }

        this.importing = true;
        const buttons = [
            this.container.querySelector("#dakcj-draft"),
            this.container.querySelector("#dakcj-publish")
        ];

        buttons.forEach(b => { b.disabled = true; b.textContent = "IMPORTATION EN COURS..."; });

        try {
            const calculation = await this.calculatePrice();
            const media = await this.transferProductMedia();
            const selectedVariantIndex = this.container.querySelector("#dakcj-variant").value;
            const selectedVariant = selectedVariantIndex !== "" ? this.variants[Number(selectedVariantIndex)] : null;

            const publicationRef = push(ref(this.db, "publications"));
            const productId = publicationRef.key;

            const affiliateLink = new URL(window.DAKPRO_CONFIG?.productPageUrl || "index.html", window.location.origin);
            affiliateLink.searchParams.set("produit", productId);
            affiliateLink.searchParams.set("ref", currentUser.uid);

            const payload = {
                id: productId,
                nom: this.product.name,
                titre: this.product.name,
                fournisseur: "CJdropshipping",
                cjPid: String(this.product.pid),
                sku: selectedVariant?.variantSku || selectedVariant?.sku || this.product.sku || "",
                prixFournisseurUSD: this.product.price,
                prixFournisseurFCFA: calculation.supplierCost,
                tauxConversion: calculation.rate,
                prix: calculation.finalPrice,
                prixPublic: calculation.finalPrice,
                devise: "FCFA",
                margeBeneficiaire: calculation.margin,
                montantMarge: calculation.marginFCFA,
                commissions: {
                    baseCalcul: "MARGE_COMMERCIALE",
                    vendeur: { taux: 80, montant: calculation.commissions.seller, statut: "en_attente" },
                    affiliation: { taux: 5, montant: calculation.commissions.affiliate, statut: "non_attribue", affilieId: null },
                    plateforme: { taux: 15, montant: calculation.commissions.platform }
                },
                image: media.image,
                images: media.images,
                video: media.video,
                imageSourceCJ: this.product.image,
                variantes: this.variants.map(v => ({
                    vid: v.vid || v.variantId || "",
                    sku: v.variantSku || v.sku || "",
                    nom: v.variantName || v.name || "",
                    image: v.variantImage || v.image || ""
                })),
                vendeurId: currentUser.uid,
                vendeurNom: currentUser.displayName || currentUser.nom || "DAKPRO ÉLITE",
                createdBy: currentUser.uid,
                affiliateLink: affiliateLink.toString(),
                stock: this.product.stock ?? null,
                categorie: this.product.categoryName || "",
                description: this.product.description || "",
                actif: Boolean(publishNow),
                statut: publishNow ? "actif" : "brouillon",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            await set(publicationRef, payload);
            this.showSuccess(productId, affiliateLink.toString(), publishNow);

        } catch (error) {
            alert("Erreur d'importation : " + error.message);
            buttons.forEach((b, i) => {
                b.disabled = false;
                b.textContent = i === 0 ? "ENREGISTRER EN BROUILLON" : "PUBLIER SUR DAKPRO ÉLITE";
            });
        } finally {
            this.importing = false;
        }
    }

    showSuccess(productId, link, published) {
        const content = this.container.querySelector("#dakcj-detail-content");
        content.innerHTML = `
            <div style="text-align:center;padding:25px 5px">
                <div style="font-size:45px">${published ? "🚀" : "📥"}</div>
                <h2 style="color:#FFD700">${published ? "PRODUIT PUBLIÉ" : "BROUILLON ENREGISTRÉ"}</h2>
                <div class="dakcj-section" style="text-align:left">
                    <p style="color:#D4AF37;font-size:11px">IDENTIFIANT</p>
                    <strong style="word-break:break-all">${this.escape(productId)}</strong>
                    <p style="color:#D4AF37;font-size:11px;margin-top:18px">LIEN DU PRODUIT</p>
                    <p style="font-size:11px;word-break:break-all">${this.escape(link)}</p>
                    <button id="dakcj-copy" class="dakcj-action dakcj-publish">COPIER LE LIEN</button>
                </div>
                <button id="dakcj-finish" class="dakcj-action dakcj-draft">TERMINER</button>
            </div>
        `;
        content.querySelector("#dakcj-copy").addEventListener("click", async () => {
            try { await navigator.clipboard.writeText(link); alert("Lien copié."); } catch { alert("Copie impossible."); }
        });
        content.querySelector("#dakcj-finish").addEventListener("click", () => this.close());
    }

    images(value, mainImage) {
        let list = [];
        if (typeof value === "string") {
            try { value = JSON.parse(value); } catch { value = [value]; }
        }
        if (Array.isArray(value)) {
            list = value.map(i => (typeof i === "string" ? i : i?.url || i?.image || i?.imageUrl || i?.bigImage || "")).filter(Boolean);
        }
        if (mainImage) list.unshift(mainImage);
        return [...new Set(list)];
    }

    number(value) {
        if (value === null || value === undefined || value === "") return null;
        const res = Number(String(value).replace(",", ".").replace(/[^\d.]/g, ""));
        return Number.isFinite(res) && res > 0 ? res : null;
    }

    stock(product) {
        for (const v of [product?.stock, product?.inventory, product?.quantity, product?.totalInventory]) {
            if (v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v))) return Number(v);
        }
        return null;
    }

    fcfa(value) {
        return Math.round(Number(value) || 0).toLocaleString("fr-FR") + " FCFA";
    }

    escape(value) {
        return String(value ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[c]);
    }

    status(message) {
        const el = this.container.querySelector("#dakcj-status");
        if (el) el.textContent = message;
    }

    pagination() {
        const prev = this.container.querySelector("#dakcj-prev");
        const next = this.container.querySelector("#dakcj-next");
        const page = this.container.querySelector("#dakcj-page");
        page.textContent = `Page ${this.page} / ${this.totalPages}`;
        prev.disabled = this.loading || this.page <= 1;
        next.disabled = this.loading || this.page >= this.totalPages;
    }

    close() {
        this.container.querySelector("#dakcj-modal").style.display = "none";
        this.product = null;
        this.variants = [];
        this.inventory = null;
        this.videos = [];
    }
}

export function init() {
    const container = document.getElementById("module-container");
    if (!container) {
        console.error("DAKPRO : module-container introuvable.");
        return null;
    }
    window.dakproImporterInstance = new DakproCJImporter("module-container");
    return window.dakproImporterInstance;
}
