import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export async function init() {
    const container = document.getElementById('module-container');
    const db = getDatabase();

    container.innerHTML = `
        <style>
            .com-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; }
            .com-title { color: #ffcc00; font-size: 18px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 0.5px; }
            
            /* CARTE CONFIGURATION DES TAUX GLOBAUX */
            .rates-card { background: #13131a; border: 1px solid #ffcc00; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 20px rgba(255, 204, 0, 0.05); }
            .rates-title { font-size: 13px; font-weight: 800; color: #ffcc00; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 0.5px; }
            .grid-rates { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; }
            .rate-group { display: flex; flex-direction: column; gap: 6px; }
            .rate-group label { font-size: 11px; color: #a1a1aa; font-weight: 700; text-transform: uppercase; }
            .rate-group input { background: #0d0d11; border: 1px solid #282836; color: #ffcc00; padding: 10px 12px; border-radius: 6px; font-size: 14px; font-weight: 800; outline: none; transition: border-color 0.2s; }
            .rate-group input:focus { border-color: #ffcc00; }
            .btn-save-rates { background: #ffcc00; color: #000; font-weight: 800; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; height: fit-content; align-self: flex-end; transition: all 0.2s; text-transform: uppercase; font-size: 12px; }
            .btn-save-rates:hover { background: #e6b800; transform: translateY(-1px); }

            /* CARTES RESUME STATISTIQUES */
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 25px; }
            .stat-box { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 18px; text-align: center; }
            .stat-box .num { font-size: 22px; font-weight: 800; margin-top: 6px; }
            .stat-box .lbl { font-size: 11px; color: #a1a1aa; text-transform: uppercase; font-weight: 700; }
            
            /* COULEURS THEMATIQUES DAKPRO */
            .col-gold { color: #ffcc00; }
            .col-amber { color: #f59e0b; }
            .col-light-gold { color: #ffe57f; }

            /* FILTRES & TABLEAU DE COMMISSIONS */
            .com-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
            .com-filter { background: #0d0d11; border: 1px solid #282836; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; outline: none; }
            .com-filter:focus { border-color: #ffcc00; }
            .com-table-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 15px; overflow-x: auto; }
            table.com-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
            table.com-table th { background: #181820; color: #ffcc00; padding: 12px 10px; font-weight: 700; border-bottom: 1px solid #282836; text-transform: uppercase; font-size: 11px; }
            table.com-table td { padding: 12px 10px; border-bottom: 1px solid #1c1c26; vertical-align: middle; color: #f5f5f7; }
            
            /* BADGES ACCENTUES OR / JAUNE BRILLANT */
            .type-badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; display: inline-block; }
            .badge-plateforme { background: rgba(255, 204, 0, 0.15); color: #ffcc00; border: 1px solid #ffcc00; }
            .badge-affiliate { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid #f59e0b; }
            .badge-vendeur { background: rgba(255, 229, 127, 0.15); color: #ffe57f; border: 1px solid #ffe57f; }
        </style>

        <div class="com-container">
            <div class="com-title">🤝 Configuration Globale & Suivi des Commissions</div>

            <!-- REGULATEUR DE COMMISSIONS GLOBALES -->
            <div class="rates-card">
                <div class="rates-title">⚙️ Réglage des Taux de Commission Système (%)</div>
                <form id="form-rates" class="grid-rates">
                    <div class="rate-group">
                        <label>Part Vendeur (%)</label>
                        <input type="number" id="rate-vendeur" min="0" max="100" value="60" required>
                    </div>
                    <div class="rate-group">
                        <label>Commission Affilié (%)</label>
                        <input type="number" id="rate-affiliate" min="0" max="100" value="20" required>
                    </div>
                    <div class="rate-group">
                        <label>Frais Plateforme (%)</label>
                        <input type="number" id="rate-plateforme" min="0" max="100" value="20" readonly style="opacity: 0.6; cursor: not-allowed;">
                    </div>
                    <button type="submit" class="btn-save-rates">💾 Enregistrer les Taux</button>
                </form>
            </div>

            <!-- CARTE DE SYNTHESE STATISTIQUE -->
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="lbl">Gains Plateforme DAKPRO</div>
                    <div class="num col-gold" id="sum-plateforme">0 FCFA</div>
                </div>
                <div class="stat-box">
                    <div class="lbl">Commissions Affiliés Total</div>
                    <div class="num col-amber" id="sum-affiliate">0 FCFA</div>
                </div>
                <div class="stat-box">
                    <div class="lbl">Revenus Vendeurs Total</div>
                    <div class="num col-light-gold" id="sum-vendeur">0 FCFA</div>
                </div>
            </div>

            <!-- HISTORIQUE DES COMMISSIONS -->
            <div class="com-header">
                <div class="com-title" style="font-size: 14px; margin: 0;">📜 Registre Complet des Commissions</div>
                <select id="com-type-filter" class="com-filter">
                    <option value="all">Toutes les commissions</option>
                    <option value="plateforme">Frais Plateforme (DAKPRO)</option>
                    <option value="affiliate">Commissions Affiliés</option>
                    <option value="vendeur">Parts Vendeurs</option>
                </select>
            </div>

            <div class="com-table-card">
                <table class="com-table">
                    <thead>
                        <tr>
                            <th>Réf Vente / Produit</th>
                            <th>Type Commission</th>
                            <th>Bénéficiaire</th>
                            <th>Taux Applicatif</th>
                            <th>Montant Vente</th>
                            <th>Gain Déduit</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody id="com-list-body">
                        <tr>
                            <td colspan="7" style="text-align: center; color: #ffcc00; padding: 20px;">Chargement du registre...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Éléments du DOM
    const rateVendeurInput = document.getElementById('rate-vendeur');
    const rateAffiliateInput = document.getElementById('rate-affiliate');
    const ratePlateformeInput = document.getElementById('rate-plateforme');
    const formRates = document.getElementById('form-rates');

    const sumPlateforme = document.getElementById('sum-plateforme');
    const sumAffiliate = document.getElementById('sum-affiliate');
    const sumVendeur = document.getElementById('sum-vendeur');

    const listBody = document.getElementById('com-list-body');
    const typeFilter = document.getElementById('com-type-filter');

    let allCommissionsList = [];

    // Auto-calcul de la part Plateforme (100 - Vendeur - Affilié)
    function autoAdjustRate() {
        let v = parseFloat(rateVendeurInput.value) || 0;
        let a = parseFloat(rateAffiliateInput.value) || 0;

        if (v + a > 100) {
            a = 100 - v;
            if (a < 0) { v = 100; a = 0; }
            rateVendeurInput.value = v;
            rateAffiliateInput.value = a;
        }

        let p = 100 - (v + a);
        ratePlateformeInput.value = p;
    }

    rateVendeurInput.addEventListener('input', autoAdjustRate);
    rateAffiliateInput.addEventListener('input', autoAdjustRate);

    // 1. Chargement de la Configuration des Taux
    const configRef = ref(db, 'configuration/commissions');
    onValue(configRef, (snapshot) => {
        if (snapshot.exists()) {
            const cfg = snapshot.val();
            rateVendeurInput.value = cfg.vendeurPercent || 60;
            rateAffiliateInput.value = cfg.affiliatePercent || 20;
            ratePlateformeInput.value = cfg.plateformePercent || 20;
        }
    });

    // 2. Sauvegarde des Taux Globaux
    formRates.addEventListener('submit', async (e) => {
        e.preventDefault();
        autoAdjustRate();

        const payload = {
            vendeurPercent: parseFloat(rateVendeurInput.value),
            affiliatePercent: parseFloat(rateAffiliateInput.value),
            plateformePercent: parseFloat(ratePlateformeInput.value),
            updatedAt: new Date().toISOString()
        };

        try {
            await set(ref(db, 'configuration/commissions'), payload);
            alert("✅ Taux de commission enregistrés avec succès !");
        } catch (err) {
            alert("❌ Erreur de sauvegarde : " + err.message);
        }
    });

    // 3. Écoute en Temps Réel des Publications / Ventes
    const publicationsRef = ref(db, 'publications');
    onValue(publicationsRef, (snapshot) => {
        allCommissionsList = [];
        let totalPlat = 0;
        let totalAff = 0;
        let totalVnd = 0;

        if (snapshot.exists()) {
            const data = snapshot.val();

            Object.keys(data).forEach((id) => {
                const pub = data[id];
                const prixVente = pub.prixOriginal ? pub.prixOriginal.promo : (pub.prixNormalEUR || 0);
                const dev = pub.deviseOriginale || 'FCFA';

                const tVnd = pub.taux ? pub.taux.vendeurPercent : 60;
                const tAff = pub.taux ? pub.taux.affiliatePercent : 20;
                const tPlat = pub.taux ? pub.taux.plateformePercent : 20;

                const gainVnd = (prixVente * tVnd) / 100;
                const gainAff = (prixVente * tAff) / 100;
                const gainPlat = (prixVente * tPlat) / 100;

                totalPlat += gainPlat;
                totalAff += gainAff;
                totalVnd += gainVnd;

                allCommissionsList.push({
                    ref: pub.titre || id,
                    type: 'plateforme',
                    beneficiaire: 'DAKPRO ÉLITE (Admin)',
                    taux: tPlat,
                    montantVente: prixVente,
                    gain: gainPlat,
                    devise: dev,
                    date: pub.datePublication
                });

                allCommissionsList.push({
                    ref: pub.titre || id,
                    type: 'affiliate',
                    beneficiaire: pub.auteurUID ? `Affilié (${pub.auteurUID.slice(0, 6)}...)` : 'Affilié Réseau',
                    taux: tAff,
                    montantVente: prixVente,
                    gain: gainAff,
                    devise: dev,
                    date: pub.datePublication
                });

                allCommissionsList.push({
                    ref: pub.titre || id,
                    type: 'vendeur',
                    beneficiaire: pub.auteurEmail || 'Vendeur Direct',
                    taux: tVnd,
                    montantVente: prixVente,
                    gain: gainVnd,
                    devise: dev,
                    date: pub.datePublication
                });
            });
        }

        sumPlateforme.innerText = `${totalPlat.toLocaleString()} FCFA`;
        sumAffiliate.innerText = `${totalAff.toLocaleString()} FCFA`;
        sumVendeur.innerText = `${totalVnd.toLocaleString()} FCFA`;

        renderCommissionsTable();
    });

    function renderCommissionsTable() {
        const filterVal = typeFilter.value;
        let html = '';

        const filtered = allCommissionsList.filter(item => filterVal === 'all' || item.type === filterVal);

        filtered.forEach(item => {
            let badgeClass = 'badge-plateforme';
            let labelType = 'Plateforme';

            if (item.type === 'affiliate') {
                badgeClass = 'badge-affiliate';
                labelType = 'Affilié';
            } else if (item.type === 'vendeur') {
                badgeClass = 'badge-vendeur';
                labelType = 'Vendeur';
            }

            html += `
                <tr>
                    <td><strong style="color: #fff;">${item.ref}</strong></td>
                    <td><span class="type-badge ${badgeClass}">${labelType}</span></td>
                    <td style="color: #a1a1aa;">${item.beneficiaire}</td>
                    <td><strong style="color: #ffcc00;">${item.taux}%</strong></td>
                    <td>${item.montantVente.toLocaleString()} ${item.devise}</td>
                    <td><strong style="color: #ffcc00;">+${item.gain.toLocaleString()} ${item.devise}</strong></td>
                    <td style="font-size: 11px; color: #a1a1aa;">${item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</td>
                </tr>
            `;
        });

        listBody.innerHTML = html || `<tr><td colspan="7" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucune commission enregistrée.</td></tr>`;
    }

    typeFilter.addEventListener('change', renderCommissionsTable);
}