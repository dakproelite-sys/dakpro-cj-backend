/* ============================================================
   FICHIER : admin-paiements.js
   APPLICATION : DAKPROELITE
   DESCRIPTION : Registre des paiements & demandes de retrait 
                 avec détails de livraison et configuration 
                 stricte des passerelles marchands.
============================================================ */

import { 
    getDatabase, 
    ref, 
    onValue, 
    update 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();

    container.innerHTML = `
        <style>
            .pay-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; padding: 15px; background: #0d0d11; border-radius: 12px; }
            .pay-title { color: #ffcc00; font-size: 18px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px; border-left: 4px solid #ffcc00; padding-left: 10px; letter-spacing: 0.5px; }

            /* CARTES STATISTIQUES FINANCIÈRES */
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px; }
            .stat-card { background: #13131a; border: 1px solid #282836; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
            .stat-card .num { font-size: 22px; font-weight: 900; margin-top: 6px; }
            .stat-card .lbl { font-size: 11px; color: #a1a1aa; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
            .col-gold { color: #ffcc00; }
            .col-green { color: #10b981; }
            .col-red { color: #ef4444; }

            /* FILTRES ET EN-TÊTE TABLEAU */
            .pay-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; background: #13131a; padding: 12px 15px; border-radius: 10px; border: 1px solid #282836; }
            .pay-filter { background: #0d0d11; border: 1px solid #282836; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 12px; outline: none; }
            .pay-filter:focus { border-color: #ffcc00; }
            
            .pay-table-card { background: #13131a; border: 1px solid #282836; border-radius: 10px; padding: 15px; overflow-x: auto; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
            table.pay-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
            table.pay-table th { background: #0d0d11; color: #ffcc00; padding: 12px 10px; font-weight: 800; border-bottom: 2px solid #282836; text-transform: uppercase; font-size: 10px; }
            table.pay-table td { padding: 12px 10px; border-bottom: 1px solid #1c1c26; vertical-align: middle; color: #f5f5f7; }
            table.pay-table tr:hover { background: rgba(255, 204, 0, 0.02); }

            /* BADGES ET BOUTONS */
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; display: inline-block; }
            .status-attente { background: rgba(255, 204, 0, 0.15); color: #ffcc00; border: 1px solid #ffcc00; }
            .status-paye { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid #10b981; }
            .status-rejete { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444; }

            .btn-pay { padding: 6px 12px; border-radius: 4px; font-size: 10px; font-weight: 800; border: none; cursor: pointer; margin-right: 5px; text-transform: uppercase; transition: transform 0.2s; }
            .btn-pay:hover { transform: translateY(-1px); }
            .btn-valider { background: #ffcc00; color: #000; }
            .btn-rejeter { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }

            /* DETAILS LIVRAISON & COORDONNEES */
            .info-user { font-weight: 700; color: #fff; font-size: 13px; }
            .info-sub { color: #a1a1aa; font-size: 11px; margin-top: 2px; }
            .info-highlight { color: #ffcc00; font-weight: 700; }

            /* SECTION FORMULAIRES DE PASSERELLES */
            .cfg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 15px; margin-top: 15px; }
            .cfg-card { background: #13131a; border: 1px solid #282836; border-radius: 10px; padding: 15px; display: flex; flex-direction: column; justify-content: space-between; }
            .cfg-card-title { font-size: 12px; font-weight: 800; color: #ffcc00; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #282836; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }

            .form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
            .form-group label { font-size: 10px; color: #a1a1aa; font-weight: 700; text-transform: uppercase; }
            .form-group input { background: #0d0d11; border: 1px solid #282836; color: #ffcc00; padding: 8px; border-radius: 6px; font-size: 12px; font-weight: 600; outline: none; }
            .form-group input:focus { border-color: #ffcc00; }

            .switch { position: relative; display: inline-block; width: 34px; height: 18px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #282836; transition: .3s; border-radius: 18px; }
            .slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 3px; bottom: 3px; background-color: #fff; transition: .3s; border-radius: 50%; }
            input:checked + .slider { background-color: #ffcc00; }
            input:checked + .slider:before { transform: translateX(16px); background-color: #000; }

            .btn-pub-section { background: #ffcc00; color: #000; font-weight: 900; border: none; padding: 9px; border-radius: 6px; cursor: pointer; font-size: 11px; text-transform: uppercase; margin-top: 10px; width: 100%; transition: background 0.2s ease; }
            .btn-pub-section:hover { background: #ffe57f; }
            .section-separator { width: 100%; height: 1px; background: #282836; margin: 30px 0; }
        </style>

        <div class="pay-container">
            <!-- SECTION 1 : DEMANDES DE RETRAIT & PAIEMENTS -->
            <div class="pay-title">💳 Registre Global des Transactions & Retraits</div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="lbl">En Attente de Règlement</div>
                    <div class="num col-gold" id="sum-attente">0 FCFA</div>
                </div>
                <div class="stat-card">
                    <div class="lbl">Total Payé (Validé)</div>
                    <div class="num col-green" id="sum-valide">0 FCFA</div>
                </div>
                <div class="stat-card">
                    <div class="lbl">Demandes Rejetées</div>
                    <div class="num col-red" id="sum-rejete">0 FCFA</div>
                </div>
            </div>

            <div class="pay-header">
                <div class="pay-title" style="font-size: 13px; margin: 0; border: none; padding: 0;">📜 Historique Complet des Paiements Clients & Retraits</div>
                <select id="pay-status-filter" class="pay-filter">
                    <option value="all">Tous les statuts</option>
                    <option value="en_attente">En attente de paiement</option>
                    <option value="paye">Paiements Validés</option>
                    <option value="rejete">Demandes Rejetées</option>
                </select>
            </div>

            <div class="pay-table-card">
                <table class="pay-table">
                    <thead>
                        <tr>
                            <th>Nom & Prénom</th>
                            <th>Adresse & Ville de Livraison</th>
                            <th>Moyen de Paiement</th>
                            <th>N° Transaction / IBAN</th>
                            <th>Montant</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="pay-list-body">
                        <tr>
                            <td colspan="7" style="text-align: center; color: #ffcc00; padding: 20px;">Chargement des données en temps réel...</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="section-separator"></div>

            <!-- SECTION 2 : CONFIGURATION DES PASSERELLES MARCHAND -->
            <div class="pay-title">⚙️ CONFIGURATION DES PASSERELLES MARCHAND (DAKPROELITE)</div>

            <div class="cfg-grid">

                <!-- MOOV MONEY -->
                <form id="form-moov" class="cfg-card">
                    <div>
                        <div class="cfg-card-title">
                            <span>📱 Moov Money</span>
                            <label class="switch"><input type="checkbox" id="moov-active" checked><span class="slider"></span></label>
                        </div>
                        <div class="form-group">
                            <label>Nom Marchand</label>
                            <input type="text" id="moov-nom" placeholder="Ex: DAKPROELITE MOOV" required>
                        </div>
                        <div class="form-group">
                            <label>Code / ID Marchand</label>
                            <input type="text" id="moov-numero" placeholder="Ex: 342612" required>
                        </div>
                        <div class="form-group">
                            <label>Syntaxe USSD</label>
                            <input type="text" id="moov-ussd" value="*855*4*1*{NUMERO}*{MONTANT}#" required>
                        </div>
                    </div>
                    <button type="submit" class="btn-pub-section">🚀 Publier Moov</button>
                </form>

                <!-- MTN MONEY -->
                <form id="form-mtn" class="cfg-card">
                    <div>
                        <div class="cfg-card-title">
                            <span>📱 MTN Mobile Money</span>
                            <label class="switch"><input type="checkbox" id="mtn-active" checked><span class="slider"></span></label>
                        </div>
                        <div class="form-group">
                            <label>Nom Marchand</label>
                            <input type="text" id="mtn-nom" placeholder="Ex: DAKPROELITE MTN" required>
                        </div>
                        <div class="form-group">
                            <label>Numéro Marchand / Téléphone</label>
                            <input type="text" id="mtn-numero" placeholder="Ex: 0100000000" required>
                        </div>
                        <div class="form-group">
                            <label>Syntaxe USSD</label>
                            <input type="text" id="mtn-ussd" value="*139*8*{NUMERO}*{MONTANT}#" required>
                        </div>
                    </div>
                    <button type="submit" class="btn-pub-section">🚀 Publier MTN</button>
                </form>

                <!-- CELTIIS CASH -->
                <form id="form-celtiis" class="cfg-card">
                    <div>
                        <div class="cfg-card-title">
                            <span>🔵 Celtiis Cash</span>
                            <label class="switch"><input type="checkbox" id="celtiis-active" checked><span class="slider"></span></label>
                        </div>
                        <div class="form-group">
                            <label>Nom Marchand</label>
                            <input type="text" id="celtiis-nom" placeholder="Ex: DAKPROELITE CELTIIS" required>
                        </div>
                        <div class="form-group">
                            <label>Numéro Marchand / Téléphone</label>
                            <input type="text" id="celtiis-numero" placeholder="Ex: 0140000000" required>
                        </div>
                        <div class="form-group">
                            <label>Syntaxe USSD</label>
                            <input type="text" id="celtiis-ussd" value="*880*3*{NUMERO}*{MONTANT}#" required>
                        </div>
                    </div>
                    <button type="submit" class="btn-pub-section">🚀 Publier Celtiis</button>
                </form>

                <!-- ORANGE MONEY -->
                <form id="form-orange" class="cfg-card">
                    <div>
                        <div class="cfg-card-title">
                            <span>🍊 Orange Money</span>
                            <label class="switch"><input type="checkbox" id="orange-active" checked><span class="slider"></span></label>
                        </div>
                        <div class="form-group">
                            <label>Nom Marchand</label>
                            <input type="text" id="orange-nom" placeholder="Ex: DAKPROELITE ORANGE" required>
                        </div>
                        <div class="form-group">
                            <label>Numéro Marchand / Téléphone</label>
                            <input type="text" id="orange-numero" placeholder="Ex: 00000000" required>
                        </div>
                        <div class="form-group">
                            <label>Syntaxe USSD</label>
                            <input type="text" id="orange-ussd" value="#144*4*1*{NUMERO}*{MONTANT}#" required>
                        </div>
                    </div>
                    <button type="submit" class="btn-pub-section">🚀 Publier Orange</button>
                </form>

                <!-- WAVE -->
                <form id="form-wave" class="cfg-card">
                    <div>
                        <div class="cfg-card-title">
                            <span>🌊 Wave Money</span>
                            <label class="switch"><input type="checkbox" id="wave-active" checked><span class="slider"></span></label>
                        </div>
                        <div class="form-group">
                            <label>Nom Marchand</label>
                            <input type="text" id="wave-nom" placeholder="Ex: DAKPROELITE WAVE" required>
                        </div>
                        <div class="form-group">
                            <label>Numéro Marchand</label>
                            <input type="text" id="wave-numero" placeholder="Ex: +2290100000000" required>
                        </div>
                        <div class="form-group">
                            <label>Lien QR / Pay Wave</label>
                            <input type="text" id="wave-link" placeholder="https://pay.wave.com/m/...">
                        </div>
                    </div>
                    <button type="submit" class="btn-pub-section">🚀 Publier Wave</button>
                </form>

                <!-- CARTE BANCAIRE -->
                <form id="form-card" class="cfg-card">
                    <div>
                        <div class="cfg-card-title">
                            <span>💳 Carte / Aggrégateur API</span>
                            <label class="switch"><input type="checkbox" id="card-active"><span class="slider"></span></label>
                        </div>
                        <div class="form-group">
                            <label>Fournisseur (FedaPay / KkiaPay / Stripe)</label>
                            <input type="text" id="card-provider" placeholder="Ex: FedaPay">
                        </div>
                        <div class="form-group">
                            <label>Clé Publique API</label>
                            <input type="text" id="card-public-key" placeholder="pk_live_xxxxxxxxx">
                        </div>
                    </div>
                    <button type="submit" class="btn-pub-section">🚀 Publier API Carte</button>
                </form>

                <!-- VIREMENT BANCAIRE -->
                <form id="form-bank" class="cfg-card">
                    <div>
                        <div class="cfg-card-title">
                            <span>🏛️ Virement / IBAN / RIB</span>
                            <label class="switch"><input type="checkbox" id="bank-active"><span class="slider"></span></label>
                        </div>
                        <div class="form-group">
                            <label>Nom de la Banque</label>
                            <input type="text" id="bank-name" placeholder="Ex: Ecobank / BOA">
                        </div>
                        <div class="form-group">
                            <label>Titulaire du Compte</label>
                            <input type="text" id="bank-holder" placeholder="Ex: DAKPROELITE SARL">
                        </div>
                        <div class="form-group">
                            <label>IBAN / RIB</label>
                            <input type="text" id="bank-iban" placeholder="BJ660 01001 0000000000 00">
                        </div>
                    </div>
                    <button type="submit" class="btn-pub-section">🚀 Publier RIB</button>
                </form>

                <!-- CASH À LA LIVRAISON -->
                <form id="form-cash" class="cfg-card">
                    <div>
                        <div class="cfg-card-title">
                            <span>💵 Cash à la livraison</span>
                            <label class="switch"><input type="checkbox" id="cash-active" checked><span class="slider"></span></label>
                        </div>
                        <div class="form-group">
                            <label>Instructions au Client</label>
                            <input type="text" id="cash-instructions" value="Paiement en espèces directement au livreur à la réception." required>
                        </div>
                    </div>
                    <button type="submit" class="btn-pub-section">🚀 Publier Cash</button>
                </form>

            </div>
        </div>
    `;

    // -------------------------------------------------------------
    // LOGIQUE 1 : LECTURE REALTIME ET EXTRACTION DES COORDONNÉES COMPLÈTES
    // -------------------------------------------------------------
    const listBody = document.getElementById('pay-list-body');
    const statusFilter = document.getElementById('pay-status-filter');
    const sumAttente = document.getElementById('sum-attente');
    const sumValide = document.getElementById('sum-valide');
    const sumRejete = document.getElementById('sum-rejete');

    let allPayoutsData = {};

    onValue(ref(db, 'retraits'), (snapshot) => {
        if (snapshot.exists()) {
            allPayoutsData = snapshot.val();
            renderPayouts();
        } else {
            listBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucune transaction de paiement enregistrée.</td></tr>`;
            sumAttente.innerText = '0 FCFA';
            sumValide.innerText = '0 FCFA';
            sumRejete.innerText = '0 FCFA';
        }
    });

    function renderPayouts() {
        const filterVal = statusFilter.value;
        let html = '';

        let totalPending = 0;
        let totalPaid = 0;
        let totalRejected = 0;

        const keys = Object.keys(allPayoutsData);

        if (keys.length === 0) {
            listBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucun paiement trouvé.</td></tr>`;
            return;
        }

        keys.forEach((payoutId) => {
            const item = allPayoutsData[payoutId];
            const statut = item.statut || item.status || 'en_attente';
            const montant = parseFloat(item.montant || item.total || item.amount || 0);
            const dev = item.devise || 'FCFA';

            if (statut === 'en_attente') totalPending += montant;
            else if (statut === 'paye' || statut === 'valide') totalPaid += montant;
            else if (statut === 'rejete') totalRejected += montant;

            if (filterVal !== 'all' && statut !== filterVal) return;

            // Extractions précises des champs Nom, Prénom, Téléphone, Adresse et Banque
            const nomPrenom = `${item.nom || ''} ${item.prenom || ''}`.trim() || item.nomUtilisateur || item.clientNom || item.email || 'Utilisateur Anonyme';
            const telephoneClient = item.telephone || item.phone || item.contact || 'N/A';
            const adresseLivraison = item.adresse || item.adresseLivraison || item.rue || 'Non renseignée';
            const villeLivraison = item.ville || item.quartier || item.pays || 'N/A';
            const numTransac = item.numeroPaiement || item.numeroBancaire || item.iban || item.reference || item.telephonePayeur || 'N/A';
            const moyenPaiement = item.moyenPaiement || item.methodePaiement || item.gateway || 'Mobile Money';

            let badgeClass = 'status-attente';
            let badgeText = '⏳ En Attente';

            if (statut === 'paye' || statut === 'valide') {
                badgeClass = 'status-paye';
                badgeText = '✅ Payé';
            } else if (statut === 'rejete') {
                badgeClass = 'status-rejete';
                badgeText = '❌ Rejeté';
            }

            html += `
                <tr>
                    <td>
                        <div class="info-user">${nomPrenom}</div>
                        <div class="info-sub">📞 ${telephoneClient}</div>
                    </td>
                    <td>
                        <div class="info-user" style="font-size: 12px; font-weight: 500;">📍 ${adresseLivraison}</div>
                        <div class="info-sub">🏙️ <span class="info-highlight">${villeLivraison}</span></div>
                    </td>
                    <td><strong style="color: #ffcc00; text-transform: uppercase;">${moyenPaiement}</strong></td>
                    <td><span style="color: #fff; font-family: monospace; font-size: 13px;">${numTransac}</span></td>
                    <td><strong style="color: #10b981; font-size: 13px;">${montant.toLocaleString()} ${dev}</strong></td>
                    <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
                    <td>
                        ${(statut === 'en_attente' || statut === 'pending') ? `
                            <button class="btn-pay btn-valider" data-action="paye" data-id="${payoutId}">Payer</button>
                            <button class="btn-pay btn-rejeter" data-action="rejete" data-id="${payoutId}">Rejeter</button>
                        ` : '<span style="color: #a1a1aa; font-size: 11px;">Terminé</span>'}
                    </td>
                </tr>
            `;
        });

        sumAttente.innerText = `${totalPending.toLocaleString()} FCFA`;
        sumValide.innerText = `${totalPaid.toLocaleString()} FCFA`;
        sumRejete.innerText = `${totalRejected.toLocaleString()} FCFA`;

        listBody.innerHTML = html || `<tr><td colspan="7" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucune transaction ne correspond à ce filtre.</td></tr>`;
    }

    statusFilter.addEventListener('change', renderPayouts);

    // ÉCOUTEUR D'ÉVÉNEMENTS SÉCURISÉ POUR LES BOUTONS DU TABLEAU (Event Delegation)
    listBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const payoutId = btn.getAttribute('data-id');
        const newStatus = btn.getAttribute('data-action');
        const actionText = newStatus === 'paye' ? 'VALIDER et MARQUER PAYÉ' : 'REJETER';

        if (confirm(`Voulez-vous vraiment ${actionText} cette demande de transaction ID: ${payoutId} ?`)) {
            try {
                await update(ref(db, `retraits/${payoutId}`), {
                    statut: newStatus,
                    processedAt: new Date().toISOString()
                });
                alert(`✅ Transaction mise à jour avec succès : ${newStatus.toUpperCase()}`);
            } catch (err) {
                alert("❌ Erreur lors du traitement : " + err.message);
            }
        }
    });

    // -------------------------------------------------------------
    // LOGIQUE 2 : CONFIGURATION DES PASSERELLES ET FORMULAIRES
    // -------------------------------------------------------------
    onValue(ref(db, 'configuration'), (snapshot) => {
        if (!snapshot.exists()) return;
        const config = snapshot.val();
        const p = config.paiements || config.paiement || {};

        const mapFields = (key, prefix) => {
            if (!p[key]) return;
            const activeEl = document.getElementById(`${prefix}-active`);
            if (activeEl) activeEl.checked = !!p[key].actif;

            if (p[key].nom_marchand && document.getElementById(`${prefix}-nom`)) document.getElementById(`${prefix}-nom`).value = p[key].nom_marchand;
            if (p[key].numero_marchand && document.getElementById(`${prefix}-numero`)) document.getElementById(`${prefix}-numero`).value = p[key].numero_marchand;
            if (p[key].code_ussd && document.getElementById(`${prefix}-ussd`)) document.getElementById(`${prefix}-ussd`).value = p[key].code_ussd;
        };

        mapFields('moov', 'moov');
        mapFields('mtn', 'mtn');
        mapFields('celtiis', 'celtiis');
        mapFields('orange', 'orange');
        mapFields('wave', 'wave');

        if (p.wave && p.wave.lien_paiement && document.getElementById('wave-link')) {
            document.getElementById('wave-link').value = p.wave.lien_paiement;
        }

        if (p.carte_bancaire) {
            document.getElementById('card-active').checked = !!p.carte_bancaire.actif;
            if (p.carte_bancaire.fournisseur) document.getElementById('card-provider').value = p.carte_bancaire.fournisseur;
            if (p.carte_bancaire.cle_publique) document.getElementById('card-public-key').value = p.carte_bancaire.cle_publique;
        }

        if (p.virement_bancaire) {
            document.getElementById('bank-active').checked = !!p.virement_bancaire.actif;
            if (p.virement_bancaire.nom_banque) document.getElementById('bank-name').value = p.virement_bancaire.nom_banque;
            if (p.virement_bancaire.titulaire) document.getElementById('bank-holder').value = p.virement_bancaire.titulaire;
            if (p.virement_bancaire.iban) document.getElementById('bank-iban').value = p.virement_bancaire.iban;
        }

        if (p.cash) {
            document.getElementById('cash-active').checked = !!p.cash.actif;
            if (p.cash.instructions) document.getElementById('cash-instructions').value = p.cash.instructions;
        }
    });

    async function publishPaymentToFirebase(key, dataObject) {
        try {
            const updates = {};
            updates[`configuration/paiements/${key}`] = dataObject;
            updates[`configuration/paiement/${key}`] = dataObject;

            await update(ref(db), updates);
            alert(`✅ Passerelle ${key.toUpperCase()} enregistrée et publiée avec succès !`);
        } catch (err) {
            alert(`❌ Erreur lors de l'enregistrement Firebase : ${err.message}`);
        }
    }

    // GESTION DES FORMULAIRES DE PASSERELLES
    document.getElementById('form-moov').addEventListener('submit', (e) => {
        e.preventDefault();
        publishPaymentToFirebase('moov', {
            actif: document.getElementById('moov-active').checked,
            nom_marchand: document.getElementById('moov-nom').value.trim(),
            numero_marchand: document.getElementById('moov-numero').value.trim(),
            code_ussd: document.getElementById('moov-ussd').value.trim(),
            updatedAt: new Date().toISOString()
        });
    });

    document.getElementById('form-mtn').addEventListener('submit', (e) => {
        e.preventDefault();
        publishPaymentToFirebase('mtn', {
            actif: document.getElementById('mtn-active').checked,
            nom_marchand: document.getElementById('mtn-nom').value.trim(),
            numero_marchand: document.getElementById('mtn-numero').value.trim(),
            code_ussd: document.getElementById('mtn-ussd').value.trim(),
            updatedAt: new Date().toISOString()
        });
    });

    document.getElementById('form-celtiis').addEventListener('submit', (e) => {
        e.preventDefault();
        publishPaymentToFirebase('celtiis', {
            actif: document.getElementById('celtiis-active').checked,
            nom_marchand: document.getElementById('celtiis-nom').value.trim(),
            numero_marchand: document.getElementById('celtiis-numero').value.trim(),
            code_ussd: document.getElementById('celtiis-ussd').value.trim(),
            updatedAt: new Date().toISOString()
        });
    });

    document.getElementById('form-orange').addEventListener('submit', (e) => {
        e.preventDefault();
        publishPaymentToFirebase('orange', {
            actif: document.getElementById('orange-active').checked,
            nom_marchand: document.getElementById('orange-nom').value.trim(),
            numero_marchand: document.getElementById('orange-numero').value.trim(),
            code_ussd: document.getElementById('orange-ussd').value.trim(),
            updatedAt: new Date().toISOString()
        });
    });

    document.getElementById('form-wave').addEventListener('submit', (e) => {
        e.preventDefault();
        publishPaymentToFirebase('wave', {
            actif: document.getElementById('wave-active').checked,
            nom_marchand: document.getElementById('wave-nom').value.trim(),
            numero_marchand: document.getElementById('wave-numero').value.trim(),
            lien_paiement: document.getElementById('wave-link').value.trim(),
            updatedAt: new Date().toISOString()
        });
    });

    document.getElementById('form-card').addEventListener('submit', (e) => {
        e.preventDefault();
        publishPaymentToFirebase('carte_bancaire', {
            actif: document.getElementById('card-active').checked,
            fournisseur: document.getElementById('card-provider').value.trim(),
            cle_publique: document.getElementById('card-public-key').value.trim(),
            updatedAt: new Date().toISOString()
        });
    });

    document.getElementById('form-bank').addEventListener('submit', (e) => {
        e.preventDefault();
        publishPaymentToFirebase('virement_bancaire', {
            actif: document.getElementById('bank-active').checked,
            nom_banque: document.getElementById('bank-name').value.trim(),
            titulaire: document.getElementById('bank-holder').value.trim(),
            iban: document.getElementById('bank-iban').value.trim(),
            updatedAt: new Date().toISOString()
        });
    });

    document.getElementById('form-cash').addEventListener('submit', (e) => {
        e.preventDefault();
        publishPaymentToFirebase('cash', {
            actif: document.getElementById('cash-active').checked,
            instructions: document.getElementById('cash-instructions').value.trim(),
            updatedAt: new Date().toISOString()
        });
    });
}
