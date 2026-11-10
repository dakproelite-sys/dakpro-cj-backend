import { 
    getDatabase, 
    ref, 
    get, 
    update, 
    remove, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================================
   DAKPRO ÉLITE — admin-retraits.js
   MODULE ADMINISTRATION : GESTION DES DEMANDES DE RETRAIT
============================================================ */

export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();
    let currentRoleTab = "all";       
    let currentStatusFilter = "pending"; 
    let rawWithdrawals = {};

    container.innerHTML = `
        <style>
            * { box-sizing: border-box; }
            .retrait-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; background: #0d0d11; padding: 15px; border-radius: 12px; }
            .retrait-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #282836; padding-bottom: 12px; flex-wrap: wrap; gap: 10px; }
            .retrait-title { color: #ffcc00; font-size: 20px; font-weight: 800; text-transform: uppercase; }

            .tabs-role { display: flex; gap: 8px; background: #13131a; padding: 4px; border-radius: 8px; border: 1px solid #282836; }
            .tab-btn { padding: 8px 14px; border: none; border-radius: 6px; background: transparent; color: #a1a1aa; font-size: 11px; font-weight: 800; cursor: pointer; text-transform: uppercase; transition: all 0.2s; }
            .tab-btn.active { background: #ffcc00; color: #000; }

            .retrait-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 20px; }
            .stat-box { background: #13131a; border: 1px solid #282836; border-radius: 10px; padding: 12px; text-align: center; cursor: pointer; }
            .stat-box .num { font-size: 18px; font-weight: 900; margin-top: 4px; }
            .stat-box .lbl { font-size: 10px; color: #a1a1aa; text-transform: uppercase; font-weight: 700; }
            .c-valid { color: #22c55e; }
            .c-pending { color: #ffcc00; }
            .c-rejected { color: #ef4444; }

            .retrait-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 15px; }
            .retrait-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; }
            .retrait-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 1px solid #282836; padding-bottom: 8px; }
            
            .user-identity { font-size: 14px; font-weight: 800; color: #fff; }
            .user-phone { font-size: 11px; color: #ffcc00; font-weight: 700; }

            .amount-box { background: rgba(255,204,0,0.05); border: 1px dashed #ffcc00; padding: 10px; border-radius: 8px; text-align: center; margin: 10px 0; }
            .amount-value { font-size: 22px; font-weight: 900; color: #ffcc00; }

            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
            .st-pending { background: rgba(255,204,0,0.2); color: #ffcc00; border: 1px solid #ffcc00; }
            .st-valid { background: rgba(34,197,94,0.2); color: #22c55e; border: 1px solid #22c55e; }
            .st-rejected { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid #ef4444; }

            .actions-group { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 12px; }
            .btn-act { padding: 8px 5px; border: none; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer; text-transform: uppercase; }
            .btn-validate { background: #22c55e; color: #000; }
            .btn-reject { background: #ef4444; color: #fff; }
            .btn-delete { background: #282836; color: #ef4444; border: 1px solid #ef4444; }
        </style>

        <div class="retrait-container">
            <div class="retrait-header">
                <div class="retrait-title">💰 Demandes de Retraits</div>
                <div class="tabs-role">
                    <button class="tab-btn active" id="tabRoleAll">Tous</button>
                    <button class="tab-btn" id="tabRoleVendeurs">🏬 Vendeurs</button>
                    <button class="tab-btn" id="tabRoleLivreurs">🛵 Livreurs</button>
                </div>
            </div>

            <div class="retrait-stats">
                <div class="stat-box" id="statPending"><div class="lbl">En Attente</div><div class="num c-pending" id="cntPendingRetraits">0 FCFA</div></div>
                <div class="stat-box" id="statValid"><div class="lbl">Confirmés</div><div class="num c-valid" id="cntValidRetraits">0 FCFA</div></div>
                <div class="stat-box" id="statRejected"><div class="lbl">Refusés</div><div class="num c-rejected" id="cntRejectedRetraits">0 FCFA</div></div>
                <div class="stat-box" id="statAll"><div class="lbl">Total</div><div class="num" id="cntTotalRetraits">0 FCFA</div></div>
            </div>

            <div class="retrait-grid" id="retraitsGridContainer">
                <div style="grid-column: 1 / -1; text-align:center; padding:40px; color:#666;">Chargement des demandes de retrait...</div>
            </div>
        </div>
    `;

    async function loadWithdrawals() {
        try {
            const snapshot = await get(ref(db, 'retraits'));
            rawWithdrawals = snapshot.exists() ? snapshot.val() : {};
            renderInterface();
        } catch (err) {
            console.error("Erreur retraits :", err);
        }
    }

    function renderInterface() {
        const grid = document.getElementById('retraitsGridContainer');
        grid.innerHTML = "";

        let sumPending = 0, sumValid = 0, sumRejected = 0, sumTotal = 0;
        const keys = Object.keys(rawWithdrawals);

        keys.forEach(id => {
            const item = rawWithdrawals[id];
            const role = (item.userRole || item.role || "vendeur").toLowerCase();
            const isLivreur = role.includes("livreur");
            const isVendeur = role.includes("vendeur");

            if (currentRoleTab === "vendeurs" && !isVendeur) return;
            if (currentRoleTab === "livreurs" && !isLivreur) return;

            const status = (item.status || "en_attente").toLowerCase();
            const isValide = status === "valide" || status === "confirmé";
            const isRefuse = status === "refuse" || status === "rejeté";
            const amount = parseFloat(item.amount || item.montant || 0);

            sumTotal += amount;
            if (isValide) sumValid += amount;
            else if (isRefuse) sumRejected += amount;
            else sumPending += amount;

            if (currentStatusFilter === "pending" && (isValide || isRefuse)) return;
            if (currentStatusFilter === "approved" && !isValide) return;
            if (currentStatusFilter === "rejected" && !isRefuse) return;

            const card = document.createElement('div');
            card.className = "retrait-card";
            card.innerHTML = `
                <div>
                    <div class="retrait-card-header">
                        <div>
                            <div class="user-identity">👤 ${item.userName || item.nom || "Anonyme"}</div>
                            <div class="user-phone">📞 ${item.phone || item.telephone || "N/A"}</div>
                        </div>
                        <span class="status-badge ${isValide ? 'st-valid' : (isRefuse ? 'st-rejected' : 'st-pending')}">${isValide ? 'Confirmé' : (isRefuse ? 'Refusé' : 'En Attente')}</span>
                    </div>

                    <div class="amount-box">
                        <div style="font-size:10px; color:#a1a1aa;">MONTANT DEMANDÉ</div>
                        <div class="amount-value">${amount.toLocaleString('fr-FR')} FCFA</div>
                        <div style="font-size:11px; color:#a1a1aa;">Mode : ${item.paymentMethod || "Mobile Money"}</div>
                    </div>
                </div>

                <div class="actions-group">
                    <button class="btn-act btn-validate" data-id="${id}">✅ Valider</button>
                    <button class="btn-act btn-reject" data-id="${id}">❌ Refuser</button>
                    <button class="btn-act btn-delete" data-id="${id}">🗑️ Suppr.</button>
                </div>
            `;

            card.querySelector('.btn-validate').addEventListener('click', () => updateRetraitStatus(id, "valide"));
            card.querySelector('.btn-reject').addEventListener('click', () => updateRetraitStatus(id, "refuse"));
            card.querySelector('.btn-delete').addEventListener('click', () => deleteRetrait(id));

            grid.appendChild(card);
        });

        document.getElementById('cntPendingRetraits').textContent = sumPending.toLocaleString('fr-FR') + " FCFA";
        document.getElementById('cntValidRetraits').textContent = sumValid.toLocaleString('fr-FR') + " FCFA";
        document.getElementById('cntRejectedRetraits').textContent = sumRejected.toLocaleString('fr-FR') + " FCFA";
        document.getElementById('cntTotalRetraits').textContent = sumTotal.toLocaleString('fr-FR') + " FCFA";

        if (grid.children.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#666;">Aucune demande de retrait.</div>`;
        }
    }

    async function updateRetraitStatus(id, newStatus) {
        try {
            await update(ref(db, `retraits/${id}`), { status: newStatus, updatedAt: serverTimestamp() });
            await loadWithdrawals();
        } catch (e) {
            alert("Erreur : " + e.message);
        }
    }

    async function deleteRetrait(id) {
        if (!confirm("Supprimer cette demande ?")) return;
        try {
            await remove(ref(db, `retraits/${id}`));
            await loadWithdrawals();
        } catch (e) {
            alert("Erreur : " + e.message);
        }
    }

    document.getElementById('tabRoleAll').addEventListener('click', (e) => { currentRoleTab = "all"; renderInterface(); });
    document.getElementById('tabRoleVendeurs').addEventListener('click', (e) => { currentRoleTab = "vendeurs"; renderInterface(); });
    document.getElementById('tabRoleLivreurs').addEventListener('click', (e) => { currentRoleTab = "livreurs"; renderInterface(); });

    document.getElementById('statPending').addEventListener('click', () => { currentStatusFilter = "pending"; renderInterface(); });
    document.getElementById('statValid').addEventListener('click', () => { currentStatusFilter = "approved"; renderInterface(); });
    document.getElementById('statRejected').addEventListener('click', () => { currentStatusFilter = "rejected"; renderInterface(); });
    document.getElementById('statAll').addEventListener('click', () => { currentStatusFilter = "all"; renderInterface(); });

    await loadWithdrawals();
}
