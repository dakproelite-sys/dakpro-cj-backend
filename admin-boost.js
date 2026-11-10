import { getDatabase, ref, get, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================================
   MODULE BOOST — DAKPRO ÉLITE (REALTIME DATABASE)
   Gestion en temps réel des publications & produits boostés
============================================================ */
export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();
    let boostsData = {};
    let productsData = {};

    // 1. Structure HTML / UI Élite
    container.innerHTML = `
        <style>
            .boost-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; background: #0d0d11; padding: 15px; border-radius: 12px; }
            .boost-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #282836; padding-bottom: 12px; flex-wrap: wrap; gap: 10px; }
            .boost-title { color: #ffcc00; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }

            /* Cartes Statistiques */
            .boost-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
            .stat-box { background: #13131a; border: 1px solid #282836; border-radius: 10px; padding: 12px; text-align: center; }
            .stat-box .num { font-size: 22px; font-weight: 900; margin-top: 4px; }
            .stat-box .lbl { font-size: 10px; color: #a1a1aa; text-transform: uppercase; font-weight: 700; }
            .c-active { color: #22c55e; }
            .c-expired { color: #ef4444; }
            .c-rev { color: #ffcc00; }

            /* Tableau des Boosts */
            .boost-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 20px; }
            .boost-table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .boost-table th { text-align: left; padding: 10px; color: #ffcc00; border-bottom: 1px solid #282836; font-size: 10px; text-transform: uppercase; }
            .boost-table td { padding: 12px 10px; border-bottom: 1px solid #1c1c26; color: #fff; vertical-align: middle; }

            .badge-status { padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; display: inline-block; }
            .st-active { background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid #22c55e; }
            .st-blocked { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }

            .btn-act { padding: 6px 10px; border: none; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer; text-transform: uppercase; margin-right: 4px; }
            .btn-renew { background: #22c55e; color: #000; }
            .btn-stop { background: #ef4444; color: #fff; }
        </style>

        <div class="boost-container">
            <div class="boost-header">
                <div class="boost-title">🚀 GESTION DES BOOSTS & SPONSORISATIONS</div>
                <button id="btnForceCheckBoosts" style="background:#ffcc00; color:#000; border:none; padding:8px 14px; border-radius:6px; font-weight:800; font-size:11px; cursor:pointer;">
                    🔄 Vérifier & Bloquer les Expirés
                </button>
            </div>

            <!-- STATISTIQUES GLOBALES -->
            <div class="boost-stats">
                <div class="stat-box">
                    <div class="lbl">Total Boosts Demandés</div>
                    <div class="num" id="cntTotalBoosts">0</div>
                </div>
                <div class="stat-box">
                    <div class="lbl">Boosts Actifs</div>
                    <div class="num c-active" id="cntActiveBoosts">0</div>
                </div>
                <div class="stat-box">
                    <div class="lbl">Boosts Expirés / Bloqués</div>
                    <div class="num c-expired" id="cntExpiredBoosts">0</div>
                </div>
                <div class="stat-box">
                    <div class="lbl">Revenus des Boosts</div>
                    <div class="num c-rev" id="cntRevenueBoosts">0 FCFA</div>
                </div>
            </div>

            <!-- TABLEAU DES PRODUITS BOOSTÉS -->
            <div class="boost-card">
                <div style="font-size:14px; font-weight:800; color:#ffcc00; text-transform:uppercase; margin-bottom:15px;">
                    📋 Liste Complète des Boosts (Realtime DB)
                </div>
                <div style="overflow-x:auto;">
                    <table class="boost-table">
                        <thead>
                            <tr>
                                <th>Produit / Vendeur</th>
                                <th>Montant Payé</th>
                                <th>Date & Heures (Début → Fin)</th>
                                <th>Temps Restant</th>
                                <th>Statut Boost / Produit</th>
                                <th>Actions Admin</th>
                            </tr>
                        </thead>
                        <tbody id="boostsTableBody">
                            <tr><td colspan="6" style="text-align:center; color:#666;">Chargement des données de boost...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // 2. Chargement des données et audit d'expiration des boosts
    async function loadAndAuditBoosts() {
        try {
            const [snapBoosts, snapProducts] = await Promise.all([
                get(ref(db, 'boosts')),
                get(ref(db, 'publications'))
            ]);

            boostsData = snapBoosts.exists() ? snapBoosts.val() : {};
            productsData = snapProducts.exists() ? snapProducts.val() : {};

            const updates = {};
            const now = Date.now();

            // Parcourir chaque boost pour vérifier la date d'expiration
            Object.keys(boostsData).forEach(boostId => {
                const b = boostsData[boostId];
                const expireTime = b.expireAt || (b.createdAt + (b.dureeJours * 24 * 60 * 60 * 1000));
                const isExpired = now >= expireTime;

                /*
                   RÈGLE DE SÉCURITÉ BOOST :
                   Dès que le temps est écoulé :
                   1. Le boost s'arrête (status: "expired", boostActif: false).
                   2. Le produit associé est automatiquement masqué/bloqué (actif: false).
                */
                if (isExpired && b.status !== "expired") {
                    updates[`boosts/${boostId}/status`] = "expired";
                    updates[`boosts/${boostId}/boostActif`] = false;

                    // Blocage du produit lié
                    if (b.productId) {
                        updates[`publications/${b.productId}/boostActif`] = false;
                        updates[`publications/${b.productId}/actif`] = false; // Bloque le produit
                        updates[`publications/${b.productId}/raisonBlocage`] = "Expiration du temps de boost";
                    }
                }
            });

            // Sauvegarde automatique dans Realtime DB si des expirations ont eu lieu
            if (Object.keys(updates).length > 0) {
                await update(ref(db), updates);
                const reSnap = await get(ref(db, 'boosts'));
                boostsData = reSnap.exists() ? reSnap.val() : {};
            }

            renderTable();
        } catch (err) {
            console.error("Erreur chargement boosts:", err);
            document.getElementById('boostsTableBody').innerHTML = `
                <tr><td colspan="6" style="text-align:center; color:#ef4444;">Erreur lors du chargement Realtime Database.</td></tr>
            `;
        }
    }

    // 3. Calcul de la durée restante
    function formatTimeRemaining(ms) {
        if (ms <= 0) return "<b style='color:#ef4444;'>Expiré (Produit Bloqué)</b>";
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `<b style="color:#22c55e;">${days}j ${hours}h restants</b>`;
        return `<b style="color:#ffcc00;">${hours}h ${minutes}m restants</b>`;
    }

    // 4. Rendu de la table d'administration
    function renderTable() {
        const tbody = document.getElementById('boostsTableBody');
        tbody.innerHTML = "";

        const keys = Object.keys(boostsData);
        let total = 0, active = 0, expired = 0, totalRevenue = 0;
        const now = Date.now();

        if (keys.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#666;">Aucun boost enregistré dans la base.</td></tr>`;
            return;
        }

        keys.forEach(id => {
            const b = boostsData[id];
            total++;

            const montant = Number(b.montant || b.price || 0);
            totalRevenue += montant;

            const start = b.createdAt || now;
            const dureeJours = b.dureeJours || 1;
            const expireAt = b.expireAt || (start + (dureeJours * 24 * 60 * 60 * 1000));
            const msRemaining = expireAt - now;
            const isExpired = msRemaining <= 0 || b.status === "expired";

            if (isExpired) expired++;
            else active++;

            const startDateStr = new Date(start).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
            const expireDateStr = new Date(expireAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <b>${b.productName || "Produit Inconnu"}</b><br>
                    <span style="font-size:9px; color:#a1a1aa;">Vendeur ID: ${b.userId || 'N/A'}</span>
                </td>
                <td><b style="color:#ffcc00;">${montant.toLocaleString()} ${b.devise || 'FCFA'}</b></td>
                <td>
                    <span style="font-size:10px; color:#aaa;">Du: ${startDateStr}</span><br>
                    <b style="color:#fff;">Au: ${expireDateStr}</b>
                </td>
                <td>${formatTimeRemaining(msRemaining)}</td>
                <td>
                    ${!isExpired 
                        ? '<span class="badge-status st-active">🚀 Boost Actif</span>' 
                        : '<span class="badge-status st-blocked">🔒 Bloqué & Expiré</span>'
                    }
                </td>
                <td>
                    <button class="btn-act btn-renew" data-id="${id}">⚡ Prolongation</button>
                    <button class="btn-act btn-stop" data-id="${id}">${!isExpired ? '⛔ Stopper' : '🗑️ Supprimer'}</button>
                </td>
            `;

            // Action 1: Prolongation manuelle d'un boost
            tr.querySelector('.btn-renew').addEventListener('click', () => extendBoost(id, b));

            // Action 2: Stopper ou Supprimer
            tr.querySelector('.btn-stop').addEventListener('click', () => stopOrDeleteBoost(id, b, isExpired));

            tbody.appendChild(tr);
        });

        // Mise à jour des compteurs
        document.getElementById('cntTotalBoosts').textContent = total;
        document.getElementById('cntActiveBoosts').textContent = active;
        document.getElementById('cntExpiredBoosts').textContent = expired;
        document.getElementById('cntRevenueBoosts').textContent = `${totalRevenue.toLocaleString()} FCFA`;
    }

    // 5. Prolongation manuelle d'un boost par l'admin
    async function extendBoost(boostId, boostObj) {
        const extraDays = prompt("Combien de jours voulez-vous ajouter à ce boost ?", "3");
        if (!extraDays || isNaN(extraDays)) return;

        try {
            const addMs = Number(extraDays) * 24 * 60 * 60 * 1000;
            const currentExpire = boostObj.expireAt && boostObj.expireAt > Date.now() ? boostObj.expireAt : Date.now();
            const newExpire = currentExpire + addMs;

            const updates = {};
            updates[`boosts/${boostId}/expireAt`] = newExpire;
            updates[`boosts/${boostId}/status`] = "active";
            updates[`boosts/${boostId}/boostActif`] = true;

            // Déblocage du produit associé s'il était bloqué
            if (boostObj.productId) {
                updates[`publications/${boostObj.productId}/boostActif`] = true;
                updates[`publications/${boostObj.productId}/actif`] = true;
                updates[`publications/${boostObj.productId}/raisonBlocage`] = null;
            }

            await update(ref(db), updates);
            alert(`✅ Boost prolongé de ${extraDays} jour(s). Le produit est à nouveau actif !`);
            await loadAndAuditBoosts();
        } catch (e) {
            alert("❌ Erreur : " + e.message);
        }
    }

    // 6. Arrêt forcé ou Suppression d'un boost
    async function stopOrDeleteBoost(boostId, boostObj, isExpired) {
        if (!isExpired) {
            if (!confirm("⚠️ Voulez-vous immédiatement interrompre ce boost et bloquer l'article ?")) return;
            try {
                const updates = {};
                updates[`boosts/${boostId}/status`] = "expired";
                updates[`boosts/${boostId}/boostActif`] = false;

                if (boostObj.productId) {
                    updates[`publications/${boostObj.productId}/boostActif`] = false;
                    updates[`publications/${boostObj.productId}/actif`] = false;
                }

                await update(ref(db), updates);
                alert("🔒 Boost stoppé et produit bloqué.");
                await loadAndAuditBoosts();
            } catch (e) {
                alert("❌ Erreur : " + e.message);
            }
        } else {
            if (!confirm("🗑️ Voulez-vous supprimer cet enregistrement de l'historique ?")) return;
            try {
                await remove(ref(db, `boosts/${boostId}`));
                alert("🗑️ Entrée supprimée.");
                await loadAndAuditBoosts();
            } catch (e) {
                alert("❌ Erreur : " + e.message);
            }
        }
    }

    // Écouteur du bouton de vérification manuelle
    document.getElementById('btnForceCheckBoosts')?.addEventListener('click', async () => {
        await loadAndAuditBoosts();
        alert("🔄 Contrôle des expirations terminé !");
    });

    // Initialisation
    await loadAndAuditBoosts();
}
