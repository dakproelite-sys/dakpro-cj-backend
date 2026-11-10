import { 
    getDatabase, 
    ref, 
    onValue, 
    update 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================================
   DAKPRO ÉLITE — admin-commandes.js
   MODULE ADMINISTRATION : GESTION DES COMMANDES ET LIVRAISONS PAR PAYS
============================================================ */

export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();

    container.innerHTML = `
        <style>
            .cmd-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; background: #0d0d11; padding: 15px; border-radius: 12px; }
            .cmd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #282836; padding-bottom: 12px; flex-wrap: wrap; gap: 10px; }
            .cmd-title { color: #ffcc00; font-size: 18px; font-weight: 800; text-transform: uppercase; }
            .country-filter { background: #181820; border: 1px solid #ffcc00; color: #fff; padding: 8px 12px; border-radius: 8px; font-weight: bold; font-size: 13px; }
            .cmd-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 15px; }
            .cmd-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; }
            .cmd-card-header { display: flex; justify-content: space-between; border-bottom: 1px solid #282836; padding-bottom: 8px; margin-bottom: 10px; }
            .client-name { font-size: 15px; font-weight: 800; color: #fff; }
            .country-badge { background: #282836; color: #ffcc00; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .phone-box { margin: 8px 0; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
            .btn-call { background: #22c55e; color: #000; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-weight: 800; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; }
            .btn-wa { background: #25D366; color: #fff; padding: 6px 12px; border-radius: 6px; text-decoration: none; font-weight: 800; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; }
            .order-details { background: #181820; padding: 10px; border-radius: 8px; margin: 10px 0; font-size: 12px; line-height: 1.5; }
            .form-group { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
            .form-group label { font-size: 11px; color: #a1a1aa; font-weight: 600; }
            .input-field, .select-livreur { width: 100%; background: #0d0d11; border: 1px solid #282836; color: #fff; padding: 8px; border-radius: 6px; font-size: 12px; box-sizing: border-box; }
            .input-field:focus, .select-livreur:focus { border-color: #ffcc00; outline: none; }
            .btn-assign { width: 100%; background: #ffcc00; color: #000; border: none; padding: 10px; border-radius: 6px; font-weight: 800; cursor: pointer; margin-top: 12px; text-transform: uppercase; transition: opacity 0.2s; }
            .btn-assign:hover { opacity: 0.9; }
        </style>

        <div class="cmd-container">
            <div class="cmd-header">
                <div class="cmd-title">📦 Commandes & Attributions par Pays</div>
                <div>
                    <label style="font-size: 12px; color: #aaa; margin-right: 6px;">Filtrer par pays :</label>
                    <select id="selectPaysFilter" class="country-filter">
                        <option value="TOUS">🌍 Tous les Pays</option>
                        <option value="BJ">🇧🇯 Bénin</option>
                        <option value="TG">🇹🇬 Togo</option>
                        <option value="CI">🇨🇮 Côte d'Ivoire</option>
                        <option value="BF">🇧🇫 Burkina Faso</option>
                        <option value="SN">🇸🇳 Sénégal</option>
                        <option value="ML">🇲🇱 Mali</option>
                        <option value="NE">🇳🇪 Niger</option>
                        <option value="CM">🇨🇲 Cameroun</option>
                    </select>
                </div>
            </div>

            <div class="cmd-grid" id="commandesGridContainer">
                <div style="grid-column: 1 / -1; text-align:center; padding:30px; color:#aaa;">Chargement des commandes...</div>
            </div>
        </div>
    `;

    const gridContainer = document.getElementById('commandesGridContainer');
    const selectPaysFilter = document.getElementById('selectPaysFilter');

    let livreursDisponibles = {};
    let toutesCommandes = {};
    let paysFiltreActuel = 'TOUS';

    // Changement du filtre pays
    selectPaysFilter.addEventListener('change', (e) => {
        paysFiltreActuel = e.target.value;
        renderCommandes();
    });

    // 1. Charger la liste des livreurs
    onValue(ref(db, 'livreurs'), (snapshot) => {
        livreursDisponibles = snapshot.exists() ? snapshot.val() : {};
        renderCommandes();
    });

    // 2. Écouter les commandes en temps réel
    onValue(ref(db, 'commandes'), (snapshot) => {
        toutesCommandes = snapshot.exists() ? snapshot.val() : {};
        renderCommandes();
    });

    function renderCommandes() {
        gridContainer.innerHTML = '';
        const keys = Object.keys(toutesCommandes);

        if (keys.length === 0) {
            gridContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:40px; color:#a1a1aa;">Aucune commande enregistrée.</div>`;
            return;
        }

        // Filtrer les commandes selon le pays sélectionné
        const commandesFiltrees = keys.filter(cmdId => {
            const cmd = toutesCommandes[cmdId];
            const paysCmd = (cmd.pays || cmd.countryCode || 'BJ').toUpperCase();
            return paysFiltreActuel === 'TOUS' || paysCmd === paysFiltreActuel;
        });

        if (commandesFiltrees.length === 0) {
            gridContainer.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:40px; color:#a1a1aa;">Aucune commande disponible pour ce pays.</div>`;
            return;
        }

        commandesFiltrees.forEach((cmdId) => {
            const cmd = toutesCommandes[cmdId];
            const phone = cmd.telephone || cmd.phone || cmd.clientPhone || '';
            const cleanPhone = phone.replace(/\D/g, '');
            const clientName = cmd.clientNom || cmd.userName || 'Client Inconnu';
            const adresse = cmd.adresse || cmd.ville || 'Adresse non précisée';
            const montant = cmd.montantTotal || cmd.total || 0;
            const statut = cmd.statut || 'en_attente';
            const paysCmd = (cmd.pays || cmd.countryCode || 'BJ').toUpperCase();

            // Filtrer les livreurs correspondant au pays de la commande
            let optionsLivreurs = `<option value="">-- Sélectionner un livreur --</option>`;
            Object.keys(livreursDisponibles).forEach(lvrId => {
                const lvr = livreursDisponibles[lvrId];
                const paysLvr = (lvr.pays || lvr.countryCode || 'BJ').toUpperCase();

                // On affiche les livreurs du même pays (ou tous si pas spécifié)
                if ((paysLvr === paysCmd || paysFiltreActuel === 'TOUS') && (lvr.statut === 'valide' || lvr.statut === 'approuve')) {
                    optionsLivreurs += `<option value="${lvrId}" data-tel="${lvr.telephone || lvr.phone || ''}">${lvr.nom || lvr.displayName} (${lvr.vehicule || 'Moto'}) - ${lvr.ville || paysLvr}</option>`;
                }
            });

            const card = document.createElement('div');
            card.className = 'cmd-card';
            card.innerHTML = `
                <div>
                    <div class="cmd-card-header">
                        <div>
                            <span class="client-name">👤 ${clientName}</span>
                            <span class="country-badge">📍 ${paysCmd}</span>
                        </div>
                        <span style="color:#ffcc00; font-weight:800;">${montant.toLocaleString('fr-FR')} FCFA</span>
                    </div>

                    <div class="phone-box">
                        ${cleanPhone ? `<a href="tel:${cleanPhone}" class="btn-call">📞 Appeler Client</a>` : ''}
                        ${cleanPhone ? `<a href="https://wa.me/${cleanPhone}" target="_blank" class="btn-wa">💬 WhatsApp Client</a>` : ''}
                    </div>

                    <div class="order-details">
                        <div><b>📍 Adresse de livraison :</b> ${adresse}</div>
                        <div><b>📦 Statut actuel :</b> <span style="color:#ffcc00;">${statut.toUpperCase()}</span></div>
                        ${cmd.numeroLivreurRetrait ? `<div style="margin-top:5px; color:#22c55e;"><b>📞 Numéro diffusé acheteur :</b> ${cmd.numeroLivreurRetrait}</div>` : ''}
                    </div>

                    <div class="form-group">
                        <label>1. Choisir le livreur (${paysCmd}) :</label>
                        <select class="select-livreur" id="select-lvr-${cmdId}">
                            ${optionsLivreurs}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>2. Numéro du livreur à transmettre à l'acheteur pour le retrait :</label>
                        <input type="tel" class="input-field" id="input-tel-livreur-${cmdId}" placeholder="Ex: +2290197455309" value="${cmd.numeroLivreurRetrait || ''}" />
                    </div>
                </div>

                <button class="btn-assign" data-id="${cmdId}">🚀 Publier Numéro & Assigner Livraison</button>
            `;

            // Remplir automatiquement le numéro du livreur quand on en sélectionne un dans la liste
            const selectElem = card.querySelector(`#select-lvr-${cmdId}`);
            const inputTelElem = card.querySelector(`#input-tel-livreur-${cmdId}`);

            selectElem.addEventListener('change', (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const telLivreur = selectedOption.getAttribute('data-tel');
                if (telLivreur) {
                    inputTelElem.value = telLivreur;
                }
            });

            // Action du bouton
            card.querySelector('.btn-assign').addEventListener('click', () => {
                const selectedLivreurId = selectElem.value;
                const numeroLivreurAcheteur = inputTelElem.value.trim();

                if (!selectedLivreurId) {
                    alert("⚠️ Veuillez sélectionner un livreur avant de valider.");
                    return;
                }

                if (!numeroLivreurAcheteur) {
                    alert("⚠️ Veuillez renseigner le numéro du livreur que l'acheteur doit contacter pour le retrait.");
                    return;
                }

                assignerLivraison(cmdId, selectedLivreurId, numeroLivreurAcheteur);
            });

            gridContainer.appendChild(card);
        });
    }

    // 3. Assigner la commande et publier le numéro pour l'acheteur
    async function assignerLivraison(cmdId, livreurId, numeroLivreur) {
        try {
            const updates = {};
            const now = new Date().toISOString();

            // Mise à jour de la commande (visible par l'acheteur dans ses commandes)
            updates[`commandes/${cmdId}/statut`] = 'en_cours_de_livraison';
            updates[`commandes/${cmdId}/livreurId`] = livreurId;
            updates[`commandes/${cmdId}/numeroLivreurRetrait`] = numeroLivreur; // Numéro que l'acheteur verra
            updates[`commandes/${cmdId}/assignedAt`] = now;

            // Ajout de la commande dans l'espace du livreur sélectionné
            updates[`livreurs/${livreurId}/coursesEnCours/${cmdId}`] = true;

            await update(ref(db), updates);
            alert("✅ Numéro publié et livraison attribuée avec succès ! L'acheteur a maintenant accès au numéro de contact pour le retrait.");
        } catch (err) {
            alert("❌ Erreur lors de l'attribution : " + err.message);
        }
    }
}
