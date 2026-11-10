import { 
    getDatabase, 
    ref, 
    onValue, 
    update 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================================
   MODULE ADMINISTRATEUR : GESTION CATALOGUE & ANALYTICS PRODUITS
   Fichier : admin-produits.js
============================================================ */

export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();

    // 1. Structure HTML & Style CSS
    container.innerHTML = `
        <style>
            .prd-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; background: #0d0d11; padding: 20px; border-radius: 12px; }
            .prd-title { color: #ffcc00; font-size: 20px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 0.5px; border-left: 4px solid #ffcc00; padding-left: 10px; }
            
            /* KPIs & ANALYTICS */
            .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; }
            .kpi-card { background: #13131a; border: 1px solid #282836; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
            .kpi-card-highlight { border-color: #ffcc00; box-shadow: 0 0 12px rgba(255, 204, 0, 0.15); }
            .kpi-val { font-size: 24px; font-weight: 900; color: #ffcc00; margin-top: 5px; }
            .kpi-lbl { font-size: 11px; color: #a1a1aa; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

            /* CONTROLES ET FILTRES */
            .prd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; background: #13131a; padding: 15px; border-radius: 10px; border: 1px solid #282836; }
            .prd-controls { display: flex; gap: 10px; flex-wrap: wrap; width: 100%; justify-content: flex-end; }
            .prd-input, .prd-select { background: #0d0d11; border: 1px solid #282836; color: #fff; padding: 10px 14px; border-radius: 6px; font-size: 13px; outline: none; }
            .prd-input:focus, .prd-select:focus { border-color: #ffcc00; }
            
            /* TABLEAU DU CATALOGUE */
            .prd-table-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 15px; overflow-x: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
            table.prd-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
            table.prd-table th { background: #0d0d11; color: #ffcc00; padding: 12px 10px; font-weight: 800; border-bottom: 2px solid #282836; text-transform: uppercase; font-size: 11px; }
            table.prd-table td { padding: 12px 10px; border-bottom: 1px solid #1c1c26; vertical-align: middle; color: #f5f5f7; }
            table.prd-table tr:hover { background: rgba(255, 204, 0, 0.02); }
            
            .prd-thumb { width: 48px; height: 48px; border-radius: 6px; object-fit: cover; background: #20202c; border: 1px solid #282836; }
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; display: inline-block; }
            .status-actif { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; }
            .status-masque { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
            .status-rupture { background: rgba(255, 204, 0, 0.2); color: #ffcc00; border: 1px solid #ffcc00; }
            
            .btn-act { padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; margin-right: 4px; transition: all 0.2s ease; }
            .btn-act:hover { opacity: 0.85; transform: translateY(-1px); }
            .btn-toggle { background: #3b82f6; color: #fff; }
            .btn-del { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
            .btn-del:hover { background: #ef4444; color: #fff; }
        </style>

        <div class="prd-container">
            <div class="prd-title">📦 Inventaire & Performance du Catalogue (Temps Réel)</div>

            <!-- DASHBOARD ANALYTIQUE -->
            <div class="kpi-grid">
                <div class="kpi-card kpi-card-highlight">
                    <div class="kpi-lbl">Total Produits Publiés</div>
                    <div class="kpi-val" id="stat-total-published">0</div>
                </div>
                <div class="kpi-card kpi-card-highlight">
                    <div class="kpi-lbl">Total Unités Vendues</div>
                    <div class="kpi-val" id="stat-total-sold" style="color: #10b981;">0</div>
                </div>
                <div class="kpi-card kpi-card-highlight">
                    <div class="kpi-lbl">Produits en Rupture</div>
                    <div class="kpi-val" id="stat-out-stock" style="color: #ff5252;">0</div>
                </div>
                <div class="kpi-card kpi-card-highlight">
                    <div class="kpi-lbl">Produits Masqués / Inactifs</div>
                    <div class="kpi-val" id="stat-hidden-prods" style="color: #a1a1aa;">0</div>
                </div>
            </div>

            <!-- RECHERCHE & FILTRES -->
            <div class="prd-header">
                <div class="prd-controls">
                    <input type="text" id="prd-search" class="prd-input" style="flex: 1; min-width: 220px;" placeholder="🔍 Rechercher par nom, description ou ID...">
                    <select id="prd-status-filter" class="prd-select">
                        <option value="all">Tous les statuts</option>
                        <option value="actif">En vente (Actifs)</option>
                        <option value="rupture">En rupture de stock</option>
                        <option value="masque">Masqués / Inactifs</option>
                    </select>
                </div>
            </div>

            <!-- TABLEAU DU CATALOGUE -->
            <div class="prd-table-card">
                <table class="prd-table">
                    <thead>
                        <tr>
                            <th>Aperçu</th>
                            <th>Produit</th>
                            <th>Prix</th>
                            <th>Vendeur / Boutique</th>
                            <th>Stock</th>
                            <th>Vendus</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="prd-list-body">
                        <tr>
                            <td colspan="8" style="text-align: center; color: #ffcc00; padding: 20px;">Chargement en temps réel du catalogue...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const listBody = document.getElementById('prd-list-body');
    const searchInput = document.getElementById('prd-search');
    const statusFilter = document.getElementById('prd-status-filter');
    
    let productsData = {};
    let publicationsData = {};
    let allProductsData = {};

    const mergeData = () => {
        allProductsData = { ...publicationsData, ...productsData };
        updateStatistics(allProductsData);
        renderProducts();
    };

    // Écoute Realtime sur /produits
    onValue(ref(db, 'produits'), (snapshot) => {
        productsData = snapshot.exists() ? snapshot.val() : {};
        mergeData();
    });

    // Écoute Realtime sur /publications
    onValue(ref(db, 'publications'), (snapshot) => {
        publicationsData = snapshot.exists() ? snapshot.val() : {};
        mergeData();
    });

    // Fonction d'évaluation standardisée du statut effectif
    function getEffectiveStatus(item) {
        const rawStatus = String(item.statut || '').toLowerCase();
        const stock = item.stock !== undefined && item.stock !== null ? parseInt(item.stock, 10) : null;
        const isInactive = rawStatus === 'masque' || rawStatus === 'inactif' || item.actif === false;

        if (isInactive) return 'masque';
        if (rawStatus === 'rupture' || (stock !== null && stock <= 0)) return 'rupture';
        return 'actif';
    }

    // Calcul synchrone des KPIs
    function updateStatistics(data) {
        const prods = Object.values(data);
        let totalSold = 0;
        let outOfStockCount = 0;
        let hiddenCount = 0;

        prods.forEach(item => {
            totalSold += parseInt(item.nombreVentes || item.quantiteVendue || item.vendus || 0, 10);
            
            const status = getEffectiveStatus(item);
            if (status === 'rupture') outOfStockCount++;
            if (status === 'masque') hiddenCount++;
        });

        document.getElementById('stat-total-published').innerText = prods.length;
        document.getElementById('stat-total-sold').innerText = totalSold.toLocaleString();
        document.getElementById('stat-out-stock').innerText = outOfStockCount;
        document.getElementById('stat-hidden-prods').innerText = hiddenCount;
    }

    // Génération du tableau avec filtrage cohérent
    function renderProducts() {
        const query = searchInput.value.toLowerCase().trim();
        const filterVal = statusFilter.value;
        let html = '';

        const keys = Object.keys(allProductsData);
        
        if (keys.length === 0) {
            listBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucun produit trouvé dans Firebase.</td></tr>`;
            return;
        }

        keys.forEach((prodId) => {
            const item = allProductsData[prodId];
            const name = item.nom || item.titre || item.name || 'Produit sans titre';
            const description = item.description || '';
            const effectiveStatus = getEffectiveStatus(item);
            
            const stock = item.stock !== undefined ? item.stock : 'N/A';
            const vendus = item.nombreVentes || item.quantiteVendue || item.vendus || 0;
            const prix = item.prixPromo || item.prix || item.price || 0;
            const devise = item.devise || 'FCFA';
            
            let img = item.image || item.imageUrl || item.mediaUrl || '';
            if (!img && Array.isArray(item.images) && item.images.length > 0) {
                img = item.images[0];
            }
            if (!img) img = 'https://via.placeholder.com/80?text=Sans+Image';

            // Application du filtre de recherche et du statut effectif
            const matchSearch = name.toLowerCase().includes(query) || prodId.toLowerCase().includes(query) || description.toLowerCase().includes(query);
            if (query && !matchSearch) return;
            if (filterVal !== 'all' && effectiveStatus !== filterVal) return;

            let badgeClass = 'status-actif';
            let badgeText = '✅ En vente';
            if (effectiveStatus === 'masque') {
                badgeClass = 'status-masque';
                badgeText = '🚫 Masqué';
            } else if (effectiveStatus === 'rupture') {
                badgeClass = 'status-rupture';
                badgeText = '⚠️ Rupture';
            }

            html += `
                <tr>
                    <td><img src="${img}" class="prd-thumb" onerror="this.src='https://via.placeholder.com/80?text=Erreur'" alt="Aperçu"></td>
                    <td>
                        <strong style="color: #fff; font-size: 14px;">${name}</strong>
                        <div style="font-size: 10px; color: #a1a1aa;">ID: ${prodId}</div>
                    </td>
                    <td><strong style="color: #ffcc00;">${parseFloat(prix).toLocaleString()} ${devise}</strong></td>
                    <td><span style="color: #a1a1aa;">${item.vendeurNom || item.boutique || 'Admin / DAKPRO'}</span></td>
                    <td><strong>${stock}</strong></td>
                    <td><strong style="color: #10b981;">${vendus}</strong></td>
                    <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
                    <td>
                        <button class="btn-act btn-toggle" data-action="toggle" data-id="${prodId}" data-status="${effectiveStatus}">
                            ${effectiveStatus === 'masque' ? 'Activer' : 'Masquer'}
                        </button>
                        <button class="btn-act btn-del" data-action="delete" data-id="${prodId}" title="Supprimer définitivement">Supprimer</button>
                    </td>
                </tr>
            `;
        });

        listBody.innerHTML = html || `<tr><td colspan="8" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucun produit ne correspond à vos filtres.</td></tr>`;
    }

    searchInput.addEventListener('input', renderProducts);
    statusFilter.addEventListener('change', renderProducts);

    // GESTION DES ACTIONS (MASQUER ET SUPPRESSION DÉFINITIVE)
    listBody.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const prodId = target.getAttribute('data-id');

        if (action === 'toggle') {
            const currentStatus = target.getAttribute('data-status');
            const newStatus = currentStatus === 'masque' ? 'actif' : 'masque';
            const isActive = (newStatus === 'actif');

            const updates = {};
            if (productsData[prodId]) {
                updates[`produits/${prodId}/statut`] = newStatus;
                updates[`produits/${prodId}/actif`] = isActive;
            }
            if (publicationsData[prodId]) {
                updates[`publications/${prodId}/statut`] = newStatus;
                updates[`publications/${prodId}/actif`] = isActive;
            }

            try {
                await update(ref(db), updates);
            } catch (err) {
                alert("❌ Erreur de modification : " + err.message);
            }
        } 
        
        else if (action === 'delete') {
            if (confirm(`⚠️ Confirmation de suppression définitive :\n\nVoulez-vous supprimer le produit ID "${prodId}" de Firebase Realtime Database ?\nIl disparaîtra immédiatement du site client et de l'administration.`)) {
                
                const updates = {};
                if (productsData[prodId]) updates[`produits/${prodId}`] = null;
                if (publicationsData[prodId]) updates[`publications/${prodId}`] = null;

                try {
                    await update(ref(db), updates);
                } catch (err) {
                    alert("❌ Erreur lors de la suppression : " + err.message);
                }
            }
        }
    });
}
