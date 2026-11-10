import { getDatabase, ref, onValue, set, update, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/* ============================================================
   MODULE CONFIGURATION GLOBALE & CREATION DE COMPTES — DAKPRO ÉLITE
============================================================ */
export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();
    const auth = getAuth();

    // 1. Structure HTML / UI Modulaire Élite
    container.innerHTML = `
        <style>
            .cfg-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; background: #0d0d11; padding: 15px; border-radius: 12px; }
            .cfg-title { color: #ffcc00; font-size: 20px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 0.5px; border-left: 4px solid #ffcc00; padding-left: 10px; }
            
            .cfg-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
            .cfg-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); display: flex; flex-direction: column; justify-content: space-between; }
            .cfg-card-highlight { border: 1px solid #ffcc00; box-shadow: 0 0 15px rgba(255, 204, 0, 0.15); margin-bottom: 25px; }
            .cfg-card-title { font-size: 14px; font-weight: 800; color: #ffcc00; text-transform: uppercase; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #282836; padding-bottom: 10px; }
            
            .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
            .form-group label { font-size: 11px; color: #a1a1aa; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
            .form-group input, .form-group select { background: #0d0d11; border: 1px solid #282836; color: #ffcc00; padding: 10px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; outline: none; transition: all 0.2s; }
            .form-group input:focus, .form-group select:focus { border-color: #ffcc00; box-shadow: 0 0 8px rgba(255, 204, 0, 0.3); }
            
            .switch-group { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #1c1c26; }
            .switch-label { font-size: 12px; font-weight: 700; color: #f5f5f7; }
            .switch { position: relative; display: inline-block; width: 44px; height: 22px; }
            .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #282836; transition: .3s; border-radius: 22px; }
            .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: #fff; transition: .3s; border-radius: 50%; }
            input:checked + .slider { background-color: #ffcc00; }
            input:checked + .slider:before { transform: translateX(22px); background-color: #000; }

            .btn-pub-section { background: linear-gradient(135deg, #ffcc00, #e6b800); color: #000; font-weight: 900; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; transition: all 0.2s; text-transform: uppercase; font-size: 11px; margin-top: 15px; width: 100%; letter-spacing: 0.5px; }
            .btn-pub-section:hover { background: linear-gradient(135deg, #ffe57f, #ffcc00); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255, 204, 0, 0.2); }
            
            .btn-role-action { background: #ffcc00; color: #000; font-weight: 800; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 11px; text-transform: uppercase; width: 100%; }
            .btn-login-as { background: rgba(255, 204, 0, 0.15); color: #ffcc00; border: 1px solid #ffcc00; font-weight: 700; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 10px; text-transform: uppercase; width: 100%; margin-top: 5px; }
        </style>

        <div class="cfg-container">
            <div class="cfg-title">⚙️ Configuration Système & Gestion des Comptes</div>

            <!-- NOUVELLE SECTION : CRÉATION DIRECTE DE COMPTE (AUTH + DB) -->
            <div class="cfg-card cfg-card-highlight">
                <div class="cfg-card-title">
                    <span>➕ Créer un Nouveau Compte (Livreur / Vendeur / Admin)</span>
                    <span style="font-size: 10px; background: rgba(255, 204, 0, 0.2); padding: 3px 8px; border-radius: 4px;">AUTHENTICATION & REALTIME DB</span>
                </div>
                <form id="form-create-account" style="background: #0d0d11; border: 1px solid #282836; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                        <div class="form-group">
                            <label>Nom complet du livreur / utilisateur</label>
                            <input type="text" id="new-user-name" placeholder="Ex: Jean Kouassi" required>
                        </div>
                        <div class="form-group">
                            <label>Adresse Email</label>
                            <input type="email" id="new-user-email" placeholder="livreur@dakpro.com" required>
                        </div>
                        <div class="form-group">
                            <label>Mot de passe initial</label>
                            <input type="password" id="new-user-pass" placeholder="••••••••" required minlength="6">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 5px;">
                        <div class="form-group">
                            <label>Rôle Attribué</label>
                            <select id="new-user-role">
                                <option value="livreur">🛵 Livreur Officiel</option>
                                <option value="vendeur">🏪 Vendeur / Partenaire</option>
                                <option value="client">👤 Client Ordinaire</option>
                                <option value="admin">👑 Administrateur DAKPRO</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Numéro de Téléphone (Optionnel)</label>
                            <input type="text" id="new-user-phone" placeholder="+2250700000000">
                        </div>
                    </div>
                    <button type="submit" class="btn-pub-section" style="margin-top: 10px;">✨ Inscrire & Attribuer le Rôle Immédiatement</button>
                </form>
            </div>

            <!-- SECTION MODIFICATION DES ROLES EXISTANTS -->
            <div class="cfg-card cfg-card-highlight">
                <div class="cfg-card-title">
                    <span>🔄 Modification de Rôle pour Utilisateur Existant</span>
                    <span style="font-size: 10px; background: rgba(255, 204, 0, 0.2); padding: 3px 8px; border-radius: 4px;">SYNCHRO TEMPS RÉEL</span>
                </div>
                <div style="background: #0d0d11; border: 1px solid #282836; border-radius: 8px; padding: 12px; margin-bottom: 10px;">
                    <div class="form-group">
                        <label>Sélectionner un compte dans la base</label>
                        <select id="role-user-select">
                            <option value="">Chargement du registre...</option>
                        </select>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px;">
                        <div class="form-group">
                            <label>Nouveau Rôle Système</label>
                            <select id="role-target-select">
                                <option value="livreur">🛵 Livreur Officiel</option>
                                <option value="vendeur">🏪 Vendeur / Partenaire</option>
                                <option value="client">👤 Client Ordinaire</option>
                                <option value="admin">👑 Administrateur DAKPRO</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Statut Compte</label>
                            <select id="role-status-select">
                                <option value="actif">✅ Actif / Validé</option>
                                <option value="suspendu">🚫 Suspendu</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                    <button type="button" id="btn-assign-role" class="btn-role-action">⚡ Mettre à Jour le Rôle</button>
                    <button type="button" id="btn-login-as-role" class="btn-login-as">🔑 Basculer sur cet Espace</button>
                </div>
            </div>

            <!-- AUTRES CARTE CONFIGURATIONS... -->
            <div class="cfg-grid">
                <div class="cfg-card">
                    <div>
                        <div class="cfg-card-title">🌐 Identification Plateforme</div>
                        <div class="form-group">
                            <label>Nom Officiel de l'application</label>
                            <input type="text" id="cfg-app-name" value="DAKPRO ÉLITE">
                        </div>
                        <div class="form-group">
                            <label>Devise Système</label>
                            <select id="cfg-currency">
                                <option value="FCFA">FCFA (XOF / XAF)</option>
                                <option value="EUR">Euro (€)</option>
                                <option value="USD">Dollar ($)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Email Support Client</label>
                            <input type="email" id="cfg-support-email" value="contact@dakpro.com">
                        </div>
                        <div class="form-group">
                            <label>WhatsApp Support Direct</label>
                            <input type="text" id="cfg-support-phone" value="+22500000000">
                        </div>
                    </div>
                    <button type="button" id="btn-pub-identity" class="btn-pub-section">📢 Publier l'Identification</button>
                </div>

                <div class="cfg-card">
                    <div>
                        <div class="cfg-card-title">📦 Tarifs & Livraisons</div>
                        <div class="form-group">
                            <label>Prise en charge de base (FCFA)</label>
                            <input type="number" id="cfg-delivery-base" value="1000">
                        </div>
                        <div class="form-group">
                            <label>Frais par KM supplémentaire (FCFA)</label>
                            <input type="number" id="cfg-delivery-km" value="200">
                        </div>
                        <div class="form-group">
                            <label>Part Rétribuée au Livreur (%)</label>
                            <input type="number" id="cfg-delivery-driver-share" value="80" min="0" max="100">
                        </div>
                        <div class="form-group">
                            <label>Rayon maximal de livraison (KM)</label>
                            <input type="number" id="cfg-delivery-max-radius" value="30">
                        </div>
                    </div>
                    <button type="button" id="btn-pub-delivery" class="btn-pub-section">📢 Publier Paramètres Livraison</button>
                </div>

                <div class="cfg-card">
                    <div>
                        <div class="cfg-card-title">💳 Passerelles Actives</div>
                        <div class="switch-group">
                            <span class="switch-label">Wave Mobile Money</span>
                            <label class="switch"><input type="checkbox" id="pay-wave" checked><span class="slider"></span></label>
                        </div>
                        <div class="switch-group">
                            <span class="switch-label">Orange Money</span>
                            <label class="switch"><input type="checkbox" id="pay-om" checked><span class="slider"></span></label>
                        </div>
                        <div class="switch-group">
                            <span class="switch-label">MTN Mobile Money</span>
                            <label class="switch"><input type="checkbox" id="pay-mtn" checked><span class="slider"></span></label>
                        </div>
                        <div class="switch-group">
                            <span class="switch-label">Moov Money</span>
                            <label class="switch"><input type="checkbox" id="pay-moov" checked><span class="slider"></span></label>
                        </div>
                        <div class="switch-group">
                            <span class="switch-label">Paiement Cash à la Livraison</span>
                            <label class="switch"><input type="checkbox" id="pay-cash" checked><span class="slider"></span></label>
                        </div>
                    </div>
                    <button type="button" id="btn-pub-payments" class="btn-pub-section">📢 Publier Passerelles de Paiement</button>
                </div>

                <div class="cfg-card">
                    <div>
                        <div class="cfg-card-title">🔒 Contrôle & Maintenance</div>
                        <div class="switch-group">
                            <span class="switch-label">Mode Maintenance Général</span>
                            <label class="switch"><input type="checkbox" id="sys-maintenance"><span class="slider"></span></label>
                        </div>
                        <div class="switch-group">
                            <span class="switch-label">Autoriser Nouvelles Inscriptions</span>
                            <label class="switch"><input type="checkbox" id="sys-registrations" checked><span class="slider"></span></label>
                        </div>
                        <div class="switch-group">
                            <span class="switch-label">Auto-validation Inscriptions Livreurs</span>
                            <label class="switch"><input type="checkbox" id="sys-auto-drivers"><span class="slider"></span></label>
                        </div>
                        <div class="form-group" style="margin-top: 10px;">
                            <label>Version Minimale App Mobile</label>
                            <input type="text" id="sys-min-version" value="1.0.0">
                        </div>
                    </div>
                    <button type="button" id="btn-pub-system" class="btn-pub-section">📢 Publier Sécurité & App</button>
                </div>
            </div>
        </div>
    `;

    // Éléments DOM
    const userSelect = document.getElementById('role-user-select');
    const roleTargetSelect = document.getElementById('role-target-select');
    const roleStatusSelect = document.getElementById('role-status-select');

    // 2. Écoute dynamique Realtime DB pour la liste déroulante des utilisateurs
    const usersRef = ref(db, 'utilisateurs');
    onValue(usersRef, (snapshot) => {
        userSelect.innerHTML = '<option value="">-- Sélectionner un utilisateur --</option>';
        if (snapshot.exists()) {
            const users = snapshot.val();
            Object.keys(users).forEach((uid) => {
                const u = users[uid];
                const nom = u.nomComplet || u.nom || u.email || uid;
                const roleActuel = u.role ? u.role.toUpperCase() : 'CLIENT';
                userSelect.innerHTML += `<option value="${uid}">${nom} (${u.email || 'Sans Email'}) - [${roleActuel}]</option>`;
            });
        }
    });

    // 3. Charger les paramètres système depuis la base
    const configRef = ref(db, 'configuration/generale');
    onValue(configRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.appName) document.getElementById('cfg-app-name').value = data.appName;
            if (data.currency) document.getElementById('cfg-currency').value = data.currency;
            if (data.supportEmail) document.getElementById('cfg-support-email').value = data.supportEmail;
            if (data.supportPhone) document.getElementById('cfg-support-phone').value = data.supportPhone;

            if (data.delivery) {
                if (data.delivery.basePrice) document.getElementById('cfg-delivery-base').value = data.delivery.basePrice;
                if (data.delivery.pricePerKm) document.getElementById('cfg-delivery-km').value = data.delivery.pricePerKm;
                if (data.delivery.driverShare) document.getElementById('cfg-delivery-driver-share').value = data.delivery.driverShare;
                if (data.delivery.maxRadius) document.getElementById('cfg-delivery-max-radius').value = data.delivery.maxRadius;
            }

            if (data.payments) {
                document.getElementById('pay-wave').checked = !!data.payments.wave;
                document.getElementById('pay-om').checked = !!data.payments.om;
                document.getElementById('pay-mtn').checked = !!data.payments.mtn;
                document.getElementById('pay-moov').checked = !!data.payments.moov;
                document.getElementById('pay-cash').checked = !!data.payments.cash;
            }

            if (data.system) {
                document.getElementById('sys-maintenance').checked = !!data.system.maintenance;
                document.getElementById('sys-registrations').checked = !!data.system.allowRegistrations;
                document.getElementById('sys-auto-drivers').checked = !!data.system.autoApproveDrivers;
                if (data.system.minVersion) document.getElementById('sys-min-version').value = data.system.minVersion;
            }
        }
    });

    // ============================================================
    // CRÉATION DE COMPTE DANS AUTHENTICATION & REALTIME DB
    // ============================================================
    document.getElementById('form-create-account').addEventListener('submit', async (e) => {
        e.preventDefault();

        const nom = document.getElementById('new-user-name').value.trim();
        const email = document.getElementById('new-user-email').value.trim();
        const password = document.getElementById('new-user-pass').value;
        const role = document.getElementById('new-user-role').value;
        const phone = document.getElementById('new-user-phone').value.trim();

        try {
            // 1. Création du compte dans Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // 2. Préparation de la fiche utilisateur dans Realtime DB
            const userPayload = {
                uid: uid,
                nomComplet: nom,
                email: email,
                telephone: phone,
                role: role,
                statut: 'actif',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const updates = {};
            updates[`utilisateurs/${uid}`] = userPayload;

            // 3. Si c'est un livreur, créer l'entrée miroir sous `livreurs/{uid}`
            if (role === 'livreur') {
                updates[`livreurs/${uid}`] = {
                    uid: uid,
                    nom: nom,
                    email: email,
                    telephone: phone,
                    disponible: true,
                    statutCompte: 'valide',
                    updatedAt: new Date().toISOString()
                };
            }

            await update(ref(db), updates);

            alert(`✅ Compte créé avec succès ! UID: ${uid} - Rôle: ${role.toUpperCase()}`);
            document.getElementById('form-create-account').reset();
        } catch (err) {
            alert("❌ Erreur lors de la création du compte : " + err.message);
        }
    });

    // ============================================================
    // MODIFICATION MODULAIRE ET PUBLICATION PAR SECTION
    // ============================================================

    // Mise à jour de rôle utilisateur existant
    document.getElementById('btn-assign-role').addEventListener('click', async () => {
        const selectedUid = userSelect.value;
        const newRole = roleTargetSelect.value;
        const newStatus = roleStatusSelect.value;

        if (!selectedUid) return alert("⚠️ Veuillez choisir un utilisateur.");

        try {
            await update(ref(db, `utilisateurs/${selectedUid}`), {
                role: newRole,
                statut: newStatus,
                updatedAt: new Date().toISOString()
            });

            if (newRole === 'livreur') {
                const userSnap = await get(ref(db, `utilisateurs/${selectedUid}`));
                const uData = userSnap.val() || {};
                await update(ref(db, `livreurs/${selectedUid}`), {
                    uid: selectedUid,
                    nom: uData.nomComplet || uData.nom || 'Livreur DAKPRO',
                    email: uData.email || '',
                    statutCompte: newStatus === 'actif' ? 'valide' : 'suspendu',
                    updatedAt: new Date().toISOString()
                });
            }

            alert(`✅ Rôle "${newRole.toUpperCase()}" mis à jour avec succès !`);
        } catch (err) {
            alert("❌ Erreur : " + err.message);
        }
    });

    // Connexion / Simulation Espace
    document.getElementById('btn-login-as-role').addEventListener('click', async () => {
        const selectedUid = userSelect.value;
        if (!selectedUid) return alert("⚠️ Veuillez sélectionner un utilisateur.");
        const userSnap = await get(ref(db, `utilisateurs/${selectedUid}`));
        if (userSnap.exists()) {
            const uData = userSnap.val();
            sessionStorage.setItem('activeRoleSession', JSON.stringify({ uid: selectedUid, role: uData.role || 'livreur' }));
            alert(`🔑 Session active configurée pour : ${uData.nomComplet || selectedUid}`);
        }
    });

    // Publication Identification
    document.getElementById('btn-pub-identity').addEventListener('click', async () => {
        try {
            await update(ref(db, 'configuration/generale'), {
                appName: document.getElementById('cfg-app-name').value,
                currency: document.getElementById('cfg-currency').value,
                supportEmail: document.getElementById('cfg-support-email').value,
                supportPhone: document.getElementById('cfg-support-phone').value,
                updatedAt: new Date().toISOString()
            });
            alert("✅ Identification publiée avec succès !");
        } catch (err) {
            alert("❌ Erreur : " + err.message);
        }
    });

    // Publication Livraisons
    document.getElementById('btn-pub-delivery').addEventListener('click', async () => {
        try {
            await update(ref(db, 'configuration/generale/delivery'), {
                basePrice: parseFloat(document.getElementById('cfg-delivery-base').value),
                pricePerKm: parseFloat(document.getElementById('cfg-delivery-km').value),
                driverShare: parseFloat(document.getElementById('cfg-delivery-driver-share').value),
                maxRadius: parseFloat(document.getElementById('cfg-delivery-max-radius').value)
            });
            await update(ref(db, 'configuration/generale'), { updatedAt: new Date().toISOString() });
            alert("✅ Tarifs & Livraisons publiés avec succès !");
        } catch (err) {
            alert("❌ Erreur : " + err.message);
        }
    });

    // Publication Paiements
    document.getElementById('btn-pub-payments').addEventListener('click', async () => {
        try {
            await update(ref(db, 'configuration/generale/payments'), {
                wave: document.getElementById('pay-wave').checked,
                om: document.getElementById('pay-om').checked,
                mtn: document.getElementById('pay-mtn').checked,
                moov: document.getElementById('pay-moov').checked,
                cash: document.getElementById('pay-cash').checked
            });
            await update(ref(db, 'configuration/generale'), { updatedAt: new Date().toISOString() });
            alert("✅ Passerelles de paiement publiées avec succès !");
        } catch (err) {
            alert("❌ Erreur : " + err.message);
        }
    });

    // Publication Sécurité & Maintenance
    document.getElementById('btn-pub-system').addEventListener('click', async () => {
        try {
            await update(ref(db, 'configuration/generale/system'), {
                maintenance: document.getElementById('sys-maintenance').checked,
                allowRegistrations: document.getElementById('sys-registrations').checked,
                autoApproveDrivers: document.getElementById('sys-auto-drivers').checked,
                minVersion: document.getElementById('sys-min-version').value
            });
            await update(ref(db, 'configuration/generale'), { updatedAt: new Date().toISOString() });
            alert("✅ Sécurité & Maintenance publiées avec succès !");
        } catch (err) {
            alert("❌ Erreur : " + err.message);
        }
    });
}
