/* ============================================================
   FICHIER : admin-configuration.js
   APPLICATION : DAKPROELITE
   DESCRIPTION : Gestion globale de la configuration, création 
                 de comptes et configuration des passerelles.
============================================================ */

import { getDatabase, ref, onValue, set, get, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();
    const auth = getAuth();

    container.innerHTML = `
        <style>
            .cfg-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; background: #0d0d11; padding: 15px; border-radius: 12px; }
            .cfg-title { color: #ffcc00; font-size: 16px; font-weight: 800; text-transform: uppercase; margin-bottom: 15px; border-left: 4px solid #ffcc00; padding-left: 10px; }
            .cfg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
            .cfg-card { background: #13131a; border: 1px solid #282836; border-radius: 10px; padding: 15px; display: flex; flex-direction: column; justify-content: space-between; }
            .cfg-card-highlight { border: 1px solid #ffcc00; margin-bottom: 20px; }
            .cfg-card-title { font-size: 13px; font-weight: 800; color: #ffcc00; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #282836; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
            
            .form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
            .form-group label { font-size: 10px; color: #a1a1aa; font-weight: 700; text-transform: uppercase; }
            .form-group input, .form-group select { background: #0d0d11; border: 1px solid #282836; color: #ffcc00; padding: 8px; border-radius: 6px; font-size: 12px; font-weight: 600; outline: none; }
            .form-group input:focus, .form-group select:focus { border-color: #ffcc00; }
            
            .switch-group { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #1c1c26; margin-bottom: 8px; }
            .switch { position: relative; display: inline-block; width: 36px; height: 18px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #282836; transition: .3s; border-radius: 18px; }
            .slider:before { position: absolute; content: ""; height: 12px; width: 12px; left: 3px; bottom: 3px; background-color: #fff; transition: .3s; border-radius: 50%; }
            input:checked + .slider { background-color: #ffcc00; }
            input:checked + .slider:before { transform: translateX(18px); background-color: #000; }

            .btn-pub-section { background: #ffcc00; color: #000; font-weight: 900; border: none; padding: 9px; border-radius: 6px; cursor: pointer; font-size: 11px; text-transform: uppercase; margin-top: 10px; width: 100%; }
            .btn-pub-section:hover { background: #ffe57f; }
            .section-separator { width: 100%; height: 1px; background: #282836; margin: 20px 0; }
        </style>

        <div class="cfg-container">
            <div class="cfg-title">⚙️ GESTION DES PASSERELLES & CONFIGURATION DAKPROELITE</div>

            <!-- CRÉATION ET GESTION COMPTES -->
            <div class="cfg-grid cfg-card-highlight" style="padding: 10px;">
                <div class="cfg-card" style="border:none;">
                    <div class="cfg-card-title">➕ Créer un Utilisateur / Admin / Livreur</div>
                    <form id="form-create-account">
                        <div class="form-group">
                            <label>Nom complet</label>
                            <input type="text" id="new-user-name" placeholder="Ex: Jubilé Lalo" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="new-user-email" placeholder="contact@dakpro.com" required>
                        </div>
                        <div class="form-group">
                            <label>Mot de passe</label>
                            <input type="password" id="new-user-pass" placeholder="••••••••" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label>Rôle</label>
                            <select id="new-user-role">
                                <option value="admin">👑 Administrateur</option>
                                <option value="livreur">🛵 Livreur Officiel</option>
                                <option value="vendeur">🏪 Vendeur</option>
                                <option value="client">👤 Client</option>
                            </select>
                        </div>
                        <button type="submit" class="btn-pub-section">Créer Compte</button>
                    </form>
                </div>

                <div class="cfg-card" style="border:none;">
                    <div class="cfg-card-title">🔄 Modifier un Rôle / Statut</div>
                    <div class="form-group">
                        <label>Compte existant</label>
                        <select id="role-user-select"><option value="">Chargement...</option></select>
                    </div>
                    <div class="form-group">
                        <label>Rôle attribué</label>
                        <select id="role-target-select">
                            <option value="admin">👑 Administrateur</option>
                            <option value="livreur">🛵 Livreur Officiel</option>
                            <option value="vendeur">🏪 Vendeur</option>
                            <option value="client">👤 Client</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Statut</label>
                        <select id="role-status-select">
                            <option value="actif">✅ Actif</option>
                            <option value="suspendu">🚫 Suspendu</option>
                        </select>
                    </div>
                    <button type="button" id="btn-assign-role" class="btn-pub-section">Mettre à Jour Rôle</button>
                </div>
            </div>

            <div class="section-separator"></div>
            <div class="cfg-title">💳 PASSERELLES DE PAIEMENT (SAISIE DES NUMÉROS MARCHANDS)</div>

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
                            <input type="text" id="moov-nom" value="JUBILE LALO" placeholder="Ex: JUBILE LALO" required>
                        </div>
                        <div class="form-group">
                            <label>Numéro / Code ID Marchand</label>
                            <input type="text" id="moov-numero" value="342612" placeholder="Ex: 342612" required>
                        </div>
                        <div class="form-group">
                            <label>Syntaxe USSD</label>
                            <input type="text" id="moov-ussd" value="*855*4*1*342612*{MONTANT}#" required>
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
                            <input type="text" id="mtn-numero" placeholder="Ex: 00000000" required>
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
                            <input type="text" id="celtiis-numero" placeholder="Ex: 40000000" required>
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
                            <label>Numéro Associé</label>
                            <input type="text" id="wave-numero" placeholder="Ex: +22997000000" required>
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
                            <span>💳 Carte Bancaire (API)</span>
                            <label class="switch"><input type="checkbox" id="card-active"><span class="slider"></span></label>
                        </div>
                        <div class="form-group">
                            <label>Fournisseur (FedaPay, Kkiapay...)</label>
                            <input type="text" id="card-provider" placeholder="Ex: FedaPay">
                        </div>
                        <div class="form-group">
                            <label>Clé Publique API</label>
                            <input type="text" id="card-public-key" placeholder="pk_live_xxxxxxxxx">
                        </div>
                    </div>
                    <button type="submit" class="btn-pub-section">🚀 Publier Carte</button>
                </form>

                <!-- VIREMENT BANCAIRE -->
                <form id="form-bank" class="cfg-card">
                    <div>
                        <div class="cfg-card-title">
                            <span>🏛️ Virement / RIB</span>
                            <label class="switch"><input type="checkbox" id="bank-active"><span class="slider"></span></label>
                        </div>
                        <div class="form-group">
                            <label>Nom de la Banque</label>
                            <input type="text" id="bank-name" placeholder="Ex: Ecobank / BOA" required>
                        </div>
                        <div class="form-group">
                            <label>Titulaire du Compte</label>
                            <input type="text" id="bank-holder" placeholder="Ex: DAKPROELITE SARL" required>
                        </div>
                        <div class="form-group">
                            <label>Numéro RIB / IBAN</label>
                            <input type="text" id="bank-iban" placeholder="BJ660 01001 0000000000 00" required>
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

    // 1. Charger dynamiquement les comptes dans la sélection
    const userSelect = document.getElementById('role-user-select');
    onValue(ref(db, 'utilisateurs'), (snapshot) => {
        if (!snapshot.exists()) {
            get(ref(db, 'users')).then(snap => fillUsers(snap));
        } else {
            fillUsers(snapshot);
        }
    });

    function fillUsers(snapshot) {
        if (!userSelect) return;
        userSelect.innerHTML = '<option value="">-- Sélectionner un compte --</option>';
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.keys(data).forEach(uid => {
                const u = data[uid];
                userSelect.innerHTML += `<option value="${uid}">${u.nomComplet || u.email || uid} [${(u.role || 'client').toUpperCase()}]</option>`;
            });
        }
    }

    // 2. Charger les données existantes dans les formulaires
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
        if (p.wave && p.wave.lien_paiement && document.getElementById('wave-link')) document.getElementById('wave-link').value = p.wave.lien_paiement;
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

    // 3. Fonction globale d'écriture synchrone vers Firebase Realtime Database
    async function publishPaymentToFirebase(key, dataObject) {
        try {
            const updates = {};
            // Écriture sur tous les chemins possibles
            updates[`configuration/paiements/${key}`] = dataObject;
            updates[`configuration/paiement/${key}`] = dataObject;
            updates[`paiements/${key}`] = dataObject;
            updates[`paiement/${key}`] = dataObject;

            await update(ref(db), updates);
            alert(`✅ ${key.toUpperCase()} publié et synchronisé dans la base !`);
        } catch (err) {
            alert(`❌ Erreur Firebase : ${err.message}`);
        }
    }

    // 4. Écouteurs de formulaires
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

    // 5. Enregistrement Utilisateurs & Rôles
    document.getElementById('form-create-account').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nom = document.getElementById('new-user-name').value.trim();
        const email = document.getElementById('new-user-email').value.trim();
        const pass = document.getElementById('new-user-pass').value;
        const role = document.getElementById('new-user-role').value;

        try {
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            const uid = cred.user.uid;
            const payload = { uid, nomComplet: nom, email, role, statut: 'actif', createdAt: new Date().toISOString() };
            await set(ref(db, `utilisateurs/${uid}`), payload);
            await set(ref(db, `users/${uid}`), payload);
            alert(`✅ Compte [${role}] créé avec succès !`);
            document.getElementById('form-create-account').reset();
        } catch (err) {
            alert(`❌ Erreur création : ${err.message}`);
        }
    });

    document.getElementById('btn-assign-role').addEventListener('click', async () => {
        const uid = userSelect.value;
        if (!uid) return alert("❌ Veuillez sélectionner un utilisateur.");

        const targetRole = document.getElementById('role-target-select').value;
        const targetStatus = document.getElementById('role-status-select').value;

        try {
            const updates = {};
            updates[`utilisateurs/${uid}/role`] = targetRole;
            updates[`utilisateurs/${uid}/statut`] = targetStatus;
            updates[`users/${uid}/role`] = targetRole;
            updates[`users/${uid}/statut`] = targetStatus;

            await update(ref(db), updates);
            alert(`✅ Compte mis à jour vers le rôle : ${targetRole.toUpperCase()}`);
        } catch (err) {
            alert(`❌ Erreur mise à jour : ${err.message}`);
        }
    });
}
