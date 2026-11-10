import { 
    getDatabase, 
    ref, 
    get, 
    update, 
    remove, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================================
   DAKPRO ÉLITE — admin-boosts.js
   MODULE ADMINISTRATION : GESTION DES BOOSTS DE VISIBILITÉ
============================================================ */

export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();
    let currentFilter = "all"; // "all", "pending", "active", "expired"
    let rawBoosts = {};

    container.innerHTML = `
        <style>
            * { box-sizing: border-box; }
            .boost-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; background: #0d0d11; padding: 15px; border-radius: 12px; }
            .boost-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #282836; padding-bottom: 12px; flex-wrap: wrap; gap: 10px; }
            .boost-title { color: #ffcc00; font-size: 20px; font-weight: 800; text-transform: uppercase; }

            .boost-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 20px; }
            .stat-box { background: #13131a; border: 1px solid #282836; border-radius: 10px; padding: 12px; text-align: center; cursor: pointer; transition: 0.2s; }
            .stat-box:hover { border-color: #ffcc00; }
            .stat-box .num { font-size: 20px; font-weight: 900; margin-top: 4px; }
            .stat-box .lbl { font-size: 10px; color: #a1a1aa; text-transform: uppercase; font-weight: 700; }
            .c-valid { color: #22c55e; }
            .c-pending { color: #ffcc00; }
            .c-rejected { color: #ef4444; }

            .boost-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 15px; }
            .boost-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; }
            .boost-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
            
            .product-title { font-size: 14px; font-weight: 800; color: #fff; }
            .seller-info { font-size: 11px; color: #a1a1aa; margin-top: 2px; }
            .boost-plan { font-size: 12px; font-weight: 900; color: #ffcc00; text-transform: uppercase; margin: 8px 0; background: rgba(255,204,0,0.1); padding: 6px; border-radius: 6px; text-align: center; border: 1px dashed #ffcc00; }

            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
            .st-pending { background: rgba(255,204,0,0.2); color: #ffcc00; border: 1px solid #ffcc00; }
            .st-valid { background: rgba(34,197,94,0.2); color: #22c55e; border: 1px solid #22c55e; }
            .st-rejected { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid #ef4444; }

            .actions-group { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 12px; }
            .btn-act { padding: 8px 5px; border: none; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer; text-transform: uppercase; transition: all 0.2s; }
            .btn-validate { background: #22c55e; color: #000; }
            .btn-validate:hover { background: #16a34a; }
            .btn-reject { background: #ef4444; color: #fff; }
            .btn-reject:hover { background: #dc2626; }
            .btn-delete { background: #282836; color: #ef4444; border: 1px solid #ef4444; }
            .btn-delete:hover { background: #ef4444; color: #fff; }
        </style>

        <div class="boost-container">
            <div class="boost-header">
                <div class="boost-title">🚀 Demandes de Boosts</div>
            </div>

            <div class="boost-stats">
                <div class="stat-box" id="statAll">
                    <div class="lbl">Total Boosts</div>
                    <div class="num" id="cntTotalBoosts">0</div>
                </div>
                <div class="stat-box" id="statPending">
                    <div class="lbl">En Attente</div>
                    <div class="num c-pending" id="cntPendingBoosts">0</div>
                </div>
                <div class="stat-box" id="statActive">
                    <div class="lbl">Actifs</div>
                    <div class="num c-valid" id="cntActiveBoosts">0</div>
                </div>
                <div class="stat-box" id="statRejected">
                    <div class="lbl">Refusés</div>
                    <div class="num c-rejected" id="cntRejectedBoosts">0</div>
                </div>
            </div>

            <div class="boost-grid" id="boostGridContainer">
                <div style="grid-column: 1 / -1; text-align:center; padding:40px; color:#666;">Chargement des demandes de boosts...</div>
            </div>
        </div>
    `;

    async function loadBoosts() {
        try {
            const boostsRef = ref(db, 'boosts');
            const snapshot = await get(boostsRef);
            rawBoosts = snapshot.exists() ? snapshot.val() : {};
            renderInterface();
        } catch (err) {
            console.error("Erreur chargement boosts:", err);
            document.getElementById('boostGridContainer').innerHTML = `<div style="color:#ef4444; text-align:center; grid-column:1/-1;">Erreur lors du chargement des boosts.</div>`;
        }
    }

    function renderInterface() {
        const grid = document.getElementById('boostGridContainer');
        grid.innerHTML = "";

        let total = 0, pending = 0, active = 0, rejected = 0;
        const keys = Object.keys(rawBoosts);

        keys.forEach(id => {
            const boost = rawBoosts[id];
            const status = (boost.status || "en_attente").toLowerCase();

            const isActif = status === "valide" || status === "actif";
            const isRefuse = status === "refuse" || status === "rejeté";

            total++;
            if (isActif) active++;
            else if (isRefuse) rejected++;
            else pending++;

            if (currentFilter === "pending" && (isActif || isRefuse)) return;
            if (currentFilter === "active" && !isActif) return;
            if (currentFilter === "rejected" && !isRefuse) return;

            const statusText = isActif ? "Actif" : (isRefuse ? "Refusé" : "En Attente");
            const badgeClass = isActif ? "st-valid" : (isRefuse ? "st-rejected" : "st-pending");

            const card = document.createElement('div');
            card.className = "boost-card";
            card.innerHTML = `
                <div>
                    <div class="boost-card-header">
                        <div>
                            <div class="product-title">📦 ${boost.productName || boost.produit || "Produit Inconnu"}</div>
                            <div class="seller-info">👤 Vendeur: ${boost.sellerName || boost.vendeur || "N/A"}</div>
                        </div>
                        <span class="status-badge ${badgeClass}">${statusText}</span>
                    </div>

                    <div class="boost-plan">🚀 Formule : ${boost.planName || boost.formule || "Standard"} (${(boost.price || boost.prix || 0).toLocaleString('fr-FR')} FCFA)</div>
                    <div style="font-size:10px; color:#a1a1aa;">Durée : ${boost.durationDays || 7} jour(s)</div>
                </div>

                <div class="actions-group">
                    <button class="btn-act btn-validate" data-id="${id}">✅ Activer</button>
                    <button class="btn-act btn-reject" data-id="${id}">❌ Refuser</button>
                    <button class="btn-act btn-delete" data-id="${id}">🗑️ Suppr.</button>
                </div>
            `;

            card.querySelector('.btn-validate').addEventListener('click', () => updateBoostStatus(id, "valide"));
            card.querySelector('.btn-reject').addEventListener('click', () => updateBoostStatus(id, "refuse"));
            card.querySelector('.btn-delete').addEventListener('click', () => deleteBoost(id));

            grid.appendChild(card);
        });

        document.getElementById('cntTotalBoosts').textContent = total;
        document.getElementById('cntPendingBoosts').textContent = pending;
        document.getElementById('cntActiveBoosts').textContent = active;
        document.getElementById('cntRejectedBoosts').textContent = rejected;

        if (grid.children.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#666;">Aucune demande de boost enregistrée.</div>`;
        }
    }

    async function updateBoostStatus(id, newStatus) {
        try {
            await update(ref(db, `boosts/${id}`), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });
            alert(`✅ Boost ${newStatus === "valide" ? "activé" : "refusé"}.`);
            await loadBoosts();
        } catch (e) {
            alert("❌ Erreur : " + e.message);
        }
    }

    async function deleteBoost(id) {
        if (!confirm("⚠️ Voulez-vous vraiment supprimer ce boost ?")) return;
        try {
            await remove(ref(db, `boosts/${id}`));
            alert("🗑️ Boost supprimé.");
            await loadBoosts();
        } catch (e) {
            alert("❌ Erreur : " + e.message);
        }
    }

    document.getElementById('statAll').addEventListener('click', () => { currentFilter = "all"; renderInterface(); });
    document.getElementById('statPending').addEventListener('click', () => { currentFilter = "pending"; renderInterface(); });
    document.getElementById('statActive').addEventListener('click', () => { currentFilter = "active"; renderInterface(); });
    document.getElementById('statRejected').addEventListener('click', () => { currentFilter = "rejected"; renderInterface(); });

    await loadBoosts();
}
