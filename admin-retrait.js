import { 
    getDatabase, 
    ref, 
    get, 
    update, 
    remove, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================================
   DAKPRO ÉLITE — admin-retrait.js
   MODULE ADMINISTRATION : GESTION ET VALIDATION DES RETRAITS
============================================================ */

export async function init() {
    const container = document.getElementById('module-container');
    if (!container) {
        console.warn("DAKPRO ÉLITE : #module-container introuvable.");
        return;
    }

    const db = getDatabase();
    let currentRoleTab = "all";          // "all", "vendeurs", "livreurs"
    let currentStatusFilter = "pending"; // "pending", "approved", "rejected", "all"
    let currentTimeFilter = "all";       // "all", "day", "week", "month", "year", "archive"
    let rawWithdrawals = {};

    // 1. Définition de l'Interface Utilisateur (UI)
    container.innerHTML = `
        <style>
            * { box-sizing: border-box; }
            .retrait-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; background: #0d0d11; padding: 15px; border-radius: 12px; }
            .retrait-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #282836; padding-bottom: 12px; flex-wrap: wrap; gap: 10px; }
            .retrait-title { color: #ffcc00; font-size: 20px; font-weight: 800; text-transform: uppercase; }

            /* Onglets Rôles */
            .tabs-role { display: flex; gap: 8px; background: #13131a; padding: 4px; border-radius: 8px; border: 1px solid #282836; }
            .tab-btn { padding: 8px 14px; border: none; border-radius: 6px; background: transparent; color: #a1a1aa; font-size: 11px; font-weight: 800; cursor: pointer; text-transform: uppercase; transition: all 0.2s; }
            .tab-btn.active { background: #ffcc00; color: #000; box-shadow: 0 0 10px rgba(255,204,0,0.3); }

            /* Métriques Financières */
            .retrait-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 20px; }
            .stat-box { background: #13131a; border: 1px solid #282836; border-radius: 10px; padding: 12px; text-align: center; cursor: pointer; transition: 0.2s; }
            .stat-box:hover { border-color: #ffcc00; }
            .stat-box .num { font-size: 20px; font-weight: 900; margin-top: 4px; }
            .stat-box .lbl { font-size: 10px; color: #a1a1aa; text-transform: uppercase; font-weight: 700; }
            .c-valid { color: #22c55e; }
            .c-pending { color: #ffcc00; }
            .c-rejected { color: #ef4444; }

            /* Filtres Temporels */
            .time-filters { display: flex; gap: 8px; margin-bottom: 15px; overflow-x: auto; padding-bottom: 5px; }
            .filter-btn { background: #13131a; border: 1px solid #282836; color: #a1a1aa; padding: 6px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; cursor: pointer; white-space: nowrap; }
            .filter-btn.active { border-color: #ffcc00; color: #ffcc00; background: rgba(255,204,0,0.1); }

            /* Grille des Demandes */
            .retrait-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 15px; }
            .retrait-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
            .retrait-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 1px solid #282836; padding-bottom: 8px; }
            
            .user-identity { font-size: 14px; font-weight: 800; color: #fff; }
            .user-phone { font-size: 11px; color: #ffcc00; font-weight: 700; }
            .user-role-badge { font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: #282836; color: #a1a1aa; text-transform: uppercase; }

            .amount-box { background: rgba(255,204,0,0.05); border: 1px dashed #ffcc00; padding: 10px; border-radius: 8px; text-align: center; margin: 10px 0; }
            .amount-value { font-size: 24px; font-weight: 900; color: #ffcc00; }
            .payment-method { font-size: 11px; color: #a1a1aa; margin-top: 4px; font-weight: 700; }

            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
            .st-pending { background: rgba(255,204,0,0.2); color: #ffcc00; border: 1px solid #ffcc00; }
            .st-valid { background: rgba(34,197,94,0.2); color: #22c55e; border: 1px solid #22c55e; }
            .st-rejected { background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid #ef4444; }

            /* Actions */
            .actions-group { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 12px; }
            .btn-act { padding: 9px 5px; border: none; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer; text-transform: uppercase; transition: all 0.2s; }
            .btn-validate { background: #22c55e; color: #000; }
            .btn-validate:hover { background: #16a34a; }
            .btn-reject { background: #ef4444; color: #fff; }
            .btn-reject:hover { background: #dc2626; }
            .btn-delete { background: #282836; color: #ef4444; border: 1px solid #ef4444; }
            .btn-delete:hover { background: #ef4444; color: #fff; }

            .btn-whatsapp { display: inline-flex; align-items: center; gap: 4px; color: #25D366; font-size: 11px; font-weight: 700; text-decoration: none; margin-top: 4px; }
            .btn-whatsapp:hover { text-decoration: underline; }
        </style>

        <div class="retrait-container">
            <div class="retrait-header">
                <div class="retrait-title">💰 Demandes de Retrait</div>
                <div class="tabs-role">
                    <button class="tab-btn active" id="tabRoleAll">Tous</button>
                    <button class="tab-btn" id="tabRoleVendeurs">🏬 Vendeurs</button>
                    <button class="tab-btn" id="tabRoleLivreurs">🛵 Livreurs</button>
                </div>
            </div>

            <!-- COMPTEURS ET FILTRES D'ÉTAT -->
            <div class="retrait-stats">
                <div class="stat-box" id="statPending">
                    <div class="lbl">En Attente</div>
                    <div class="num c-pending" id="cntPendingRetraits">0 FCFA</div>
                </div>
                <div class="stat-box" id="statValid">
                    <div class="lbl">Confirmés / Payés</div>
                    <div class="num c-valid" id="cntValidRetraits">0 FCFA</div>
                </div>
                <div class="stat-box" id="statRejected">
                    <div class="lbl">Refusés / Rejetés</div>
                    <div class="num c-rejected" id="cntRejectedRetraits">0 FCFA</div>
                </div>
                <div class="stat-box" id="statAll">
                    <div class="lbl">Total Général</div>
                    <div class="num" id="cntTotalRetraits">0 FCFA</div>
                </div>
            </div>

            <!-- FILTRES TEMPORELS -->
            <div class="time-filters">
                <button class="filter-btn active" data-filter="all">Tous les temps</button>
                <button class="filter-btn" data-filter="day">Aujourd'hui</button>
                <button class="filter-btn" data-filter="week">Cette Semaine</button>
                <button class="filter-btn" data-filter="month">Ce Mois-ci</button>
                <button class="filter-btn" data-filter="year">Cette Année</button>
                <button class="filter-btn" data-filter="archive">📁 Anciennes Années</button>
            </div>

            <!-- LISTE DES DEMANDES -->
            <div class="retrait-grid" id="retraitsGridContainer">
                <div style="grid-column: 1 / -1; text-align:center; padding:40px; color:#666;">Chargement des demandes de retrait...</div>
            </div>
        </div>
    `;

    // 2. Gestion des périodes temporelles
    function checkDatePeriod(timestamp, filter) {
        if (!timestamp || filter === "all") return true;
        const docDate = new Date(timestamp);
        const now = new Date();

        const isSameDay = docDate.toDateString() === now.toDateString();
        
        const currentDay = now.getDay();
        const firstDayWeek = new Date(now);
        firstDayWeek.setDate(now.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
        firstDayWeek.setHours(0,0,0,0);
        const isSameWeek = docDate >= firstDayWeek;

        const isSameMonth = docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
        const isSameYear = docDate.getFullYear() === now.getFullYear();
        const isArchive = docDate.getFullYear() < now.getFullYear();

        if (filter === "day") return isSameDay;
        if (filter === "week") return isSameWeek;
        if (filter === "month") return isSameMonth;
        if (filter === "year") return isSameYear;
        if (filter === "archive") return isArchive;

        return true;
    }

    // 3. Charger les retraits depuis Realtime Database (`/retraits`)
    async function loadWithdrawals() {
        try {
            const retraitsRef = ref(db, 'retraits');
            const snapshot = await get(retraitsRef);

            if (snapshot.exists()) {
                rawWithdrawals = snapshot.val();
            } else {
                rawWithdrawals = {};
            }

            renderInterface();
        } catch (err) {
            console.error("Erreur de chargement des retraits :", err);
            document.getElementById('retraitsGridContainer').innerHTML = `
                <div style="color:#ef4444; text-align:center; grid-column: 1 / -1; padding:20px;">
                    ❌ Erreur lors du chargement des données de retrait.
                </div>
            `;
        }
    }

    // 4. Rendu de l'interface
    function renderInterface() {
        const grid = document.getElementById('retraitsGridContainer');
        grid.innerHTML = "";

        let sumPending = 0, sumValid = 0, sumRejected = 0, sumTotal = 0;
        const keys = Object.keys(rawWithdrawals);

        keys.forEach(id => {
            const item = rawWithdrawals[id];

            // Rôle (Vendeur / Livreur)
            const role = (item.userRole || item.role || "vendeur").toLowerCase();
            const isLivreur = role.includes("livreur") || role.includes("driver");
            const isVendeur = role.includes("vendeur") || role.includes("seller");

            if (currentRoleTab === "vendeurs" && !isVendeur) return;
            if (currentRoleTab === "livreurs" && !isLivreur) return;

            // Filtre temporel
            if (!checkDatePeriod(item.createdAt || item.timestamp, currentTimeFilter)) return;

            // Statut
            const status = (item.status || "en_attente").toLowerCase();
            const isValide = status === "valide" || status === "validé" || status === "approuve";
            const isRefuse = status === "refuse" || status === "rejeté" || status === "refusé";

            const amount = parseFloat(item.amount || item.montant || 0);

            // Sommes globales
            sumTotal += amount;
            if (isValide) sumValid += amount;
            else if (isRefuse) sumRejected += amount;
            else sumPending += amount;

            // Filtre par statut sélectionné
            if (currentStatusFilter === "pending" && (isValide || isRefuse)) return;
            if (currentStatusFilter === "approved" && !isValide) return;
            if (currentStatusFilter === "rejected" && !isRefuse) return;

            // Affichage de l'identité
            const userName = item.userName || item.nom || "Nom Non Renseigné";
            const rawPhone = item.phone || item.telephone || item.paymentPhone || "";
            const cleanPhone = rawPhone.replace(/\D/g, '');
            const userPhone = rawPhone || "Téléphone non fourni";
            const userEmail = item.email || "Email non fourni";
            const userId = item.userId || item.uid || id;
            const method = item.paymentMethod || item.moyenPaiement || "Mobile Money / MoMo";

            const statusText = isValide ? "Confirmé" : (isRefuse ? "Refusé" : "En Attente");
            const badgeClass = isValide ? "st-valid" : (isRefuse ? "st-rejected" : "st-pending");
            const dateStr = item.createdAt || item.timestamp 
                ? new Date(item.createdAt || item.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                : "Date inconnue";

            const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone}` : "#";

            const card = document.createElement('div');
            card.className = "retrait-card";
            card.innerHTML = `
                <div>
                    <div class="retrait-card-header">
                        <div>
                            <div class="user-identity">👤 ${userName}</div>
                            <div class="user-phone">📞 ${userPhone}</div>
                            ${cleanPhone ? `<a href="${whatsappLink}" target="_blank" class="btn-whatsapp">💬 Contact WhatsApp</a>` : ''}
                            <div style="font-size:10px; color:#a1a1aa; margin-top:2px;">✉️ ${userEmail}</div>
                            <div style="font-size:9px; color:#666; margin-top:2px;">UID: ${userId}</div>
                        </div>
                        <div style="text-align:right;">
                            <span class="status-badge ${badgeClass}">${statusText}</span>
                            <div style="margin-top:4px;"><span class="user-role-badge">${isLivreur ? '🛵 Livreur' : '🏬 Vendeur'}</span></div>
                        </div>
                    </div>

                    <div class="amount-box">
                        <div style="font-size:10px; color:#a1a1aa; text-transform:uppercase;">Montant Demandé</div>
                        <div class="amount-value">${amount.toLocaleString('fr-FR')} FCFA</div>
                        <div class="payment-method">💳 Mode : ${method}</div>
                    </div>

                    <div style="font-size:10px; color:#a1a1aa; display:flex; justify-content:space-between; margin-top:5px;">
                        <span>Demande du : <b>${dateStr}</b></span>
                    </div>

                    ${item.rejectionReason ? `<div style="font-size:10px; color:#ef4444; margin-top:6px; background:rgba(239,68,68,0.1); padding:6px; border-radius:4px;"><b>Motif du refus :</b> ${item.rejectionReason}</div>` : ''}
                </div>

                <div class="actions-group">
                    <button class="btn-act btn-validate" data-id="${id}">✅ Valider</button>
                    <button class="btn-act btn-reject" data-id="${id}">❌ Refuser</button>
                    <button class="btn-act btn-delete" data-id="${id}">🗑️ Suppr.</button>
                </div>
            `;

            // Écouteurs d'actions
            card.querySelector('.btn-validate').addEventListener('click', () => updateRetraitStatus(id, "valide", item));
            card.querySelector('.btn-reject').addEventListener('click', () => updateRetraitStatus(id, "refuse", item));
            card.querySelector('.btn-delete').addEventListener('click', () => deleteRetrait(id));

            grid.appendChild(card);
        });

        // Mise à jour des compteurs financiers
        document.getElementById('cntPendingRetraits').textContent = sumPending.toLocaleString('fr-FR') + " FCFA";
        document.getElementById('cntValidRetraits').textContent = sumValid.toLocaleString('fr-FR') + " FCFA";
        document.getElementById('cntRejectedRetraits').textContent = sumRejected.toLocaleString('fr-FR') + " FCFA";
        document.getElementById('cntTotalRetraits').textContent = sumTotal.toLocaleString('fr-FR') + " FCFA";

        if (grid.children.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:40px; color:#666;">Aucune demande de retrait dans cette catégorie.</div>`;
        }
    }

    // 5. Validation / Refus de Retrait
    async function updateRetraitStatus(id, newStatus, item) {
        let rejectionReason = "";

        if (newStatus === "valide") {
            const confirmVal = confirm(`⚠️ Confirmez-vous le paiement de ${item.amount || item.montant} FCFA à ${item.userName || item.nom} ?`);
            if (!confirmVal) return;
        } else if (newStatus === "refuse") {
            rejectionReason = prompt("Veuillez indiquer le motif du refus du retrait :");
            if (rejectionReason === null) return;
        }

        try {
            const updates = {};
            updates[`retraits/${id}/status`] = newStatus;
            updates[`retraits/${id}/updatedAt`] = serverTimestamp();
            if (rejectionReason) {
                updates[`retraits/${id}/rejectionReason`] = rejectionReason;
            }

            await update(ref(db), updates);
            alert(`✅ Retrait ${newStatus === "valide" ? "confirmé et marqué comme payé" : "refusé"}.`);
            await loadWithdrawals();
        } catch (e) {
            alert("❌ Erreur de mise à jour : " + e.message);
        }
    }

    // 6. Suppression
    async function deleteRetrait(id) {
        if (!confirm("⚠️ Confirmez-vous la suppression définitive de cette demande de retrait ?")) return;

        try {
            await remove(ref(db, `retraits/${id}`));
            alert("🗑️ Demande de retrait supprimée.");
            await loadWithdrawals();
        } catch (e) {
            alert("❌ Erreur de suppression : " + e.message);
        }
    }

    // 7. Écouteurs Onglets & Filtres
    document.getElementById('tabRoleAll').addEventListener('click', (e) => {
        document.querySelectorAll('.tabs-role .tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRoleTab = "all";
        renderInterface();
    });

    document.getElementById('tabRoleVendeurs').addEventListener('click', (e) => {
        document.querySelectorAll('.tabs-role .tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRoleTab = "vendeurs";
        renderInterface();
    });

    document.getElementById('tabRoleLivreurs').addEventListener('click', (e) => {
        document.querySelectorAll('.tabs-role .tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRoleTab = "livreurs";
        renderInterface();
    });

    // Filtres d'état
    document.getElementById('statPending').addEventListener('click', () => { currentStatusFilter = "pending"; renderInterface(); });
    document.getElementById('statValid').addEventListener('click', () => { currentStatusFilter = "approved"; renderInterface(); });
    document.getElementById('statRejected').addEventListener('click', () => { currentStatusFilter = "rejected"; renderInterface(); });
    document.getElementById('statAll').addEventListener('click', () => { currentStatusFilter = "all"; renderInterface(); });

    // Filtres temporels
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTimeFilter = e.target.dataset.filter;
            renderInterface();
        });
    });

    // Chargement initial
    await loadWithdrawals();
}
