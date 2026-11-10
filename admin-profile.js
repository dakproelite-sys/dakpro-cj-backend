import { getDatabase, ref, get, update, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================================
   MODULE PROFILE / GESTION DES PROFILS (REALTIME DATABASE)
============================================================ */
export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();
    const currentUser = window.currentUser || null;

    // 1. Structure HTML / UI Élite
    container.innerHTML = `
        <style>
            .profile-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; background: #0d0d11; padding: 15px; border-radius: 12px; }
            .profile-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #282836; padding-bottom: 12px; }
            .profile-title { color: #ffcc00; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            
            .stats-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
            .stat-card { background: #13131a; border: 1px solid #282836; border-radius: 10px; padding: 12px; text-align: center; }
            .stat-card .val { font-size: 20px; font-weight: 900; color: #ffcc00; margin-top: 4px; }
            .stat-card .lbl { font-size: 10px; color: #a1a1aa; text-transform: uppercase; font-weight: 700; }

            .profile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
            .profile-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
            .card-title { font-size: 14px; font-weight: 800; color: #ffcc00; text-transform: uppercase; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #282836; padding-bottom: 8px; }

            .user-list { display: flex; flex-direction: column; gap: 10px; max-height: 450px; overflow-y: auto; padding-right: 5px; }
            .user-item { background: #0d0d11; border: 1px solid #282836; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; transition: border 0.2s; }
            .user-item:hover { border-color: #ffcc00; }
            
            .user-avatar { width: 40px; height: 40px; border-radius: 50%; background: #282836; color: #ffcc00; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; border: 1px solid #ffcc00; }
            .user-info { flex: 1; margin-left: 12px; }
            .user-name { font-size: 13px; font-weight: 700; color: #fff; }
            .user-role { font-size: 10px; color: #a1a1aa; display: flex; gap: 8px; margin-top: 2px; }
            
            .badge { padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
            .badge-admin { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
            .badge-vendeur { background: rgba(255, 204, 0, 0.2); color: #ffcc00; border: 1px solid #ffcc00; }
            .badge-acheteur { background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid #3b82f6; }
            .badge-livreur { background: rgba(34, 197, 94, 0.2); color: #22c55e; border: 1px solid #22c55e; }

            .btn-edit { background: #282836; color: #ffcc00; border: none; padding: 6px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; cursor: pointer; }
            .btn-edit:hover { background: #ffcc00; color: #000; }

            .form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
            .form-group label { font-size: 10px; color: #a1a1aa; font-weight: 700; text-transform: uppercase; }
            .form-group input, .form-group select { background: #0d0d11; border: 1px solid #282836; color: #ffcc00; padding: 8px 10px; border-radius: 6px; font-size: 12px; outline: none; }
            .form-group input:focus, .form-group select:focus { border-color: #ffcc00; }
            
            .btn-save { background: linear-gradient(135deg, #ffcc00, #e6b800); color: #000; font-weight: 900; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; width: 100%; text-transform: uppercase; font-size: 11px; margin-top: 5px; }
        </style>

        <div class="profile-container">
            <div class="profile-header">
                <div class="profile-title">👤 Gestion Supérieure des Profils</div>
                <input type="text" id="profileSearch" placeholder="🔍 Rechercher par Nom, Email, UID..." style="background:#13131a; border:1px solid #282836; color:#ffcc00; padding:8px 14px; border-radius:20px; font-size:12px; width:260px; outline:none;">
            </div>

            <!-- COMPTEURS GLOBAUX -->
            <div class="stats-bar">
                <div class="stat-card">
                    <div class="lbl">Total Profils</div>
                    <div class="val" id="cntTotal">0</div>
                </div>
                <div class="stat-card">
                    <div class="lbl">Vendeurs</div>
                    <div class="val" id="cntVendeurs">0</div>
                </div>
                <div class="stat-card">
                    <div class="lbl">Acheteurs / Affiliés</div>
                    <div class="val" id="cntAcheteurs">0</div>
                </div>
                <div class="stat-card">
                    <div class="lbl">Administrateurs</div>
                    <div class="val" id="cntAdmins">0</div>
                </div>
            </div>

            <div class="profile-grid">
                <!-- REPERTOIRE DE TOUS LES PROFILS -->
                <div class="profile-card" style="grid-column: span 2;">
                    <div class="card-title">
                        <span>📋 Annuaire Realtime Database</span>
                        <span style="font-size:10px; color:#a1a1aa;" id="lastUpdate">Actualisé instantanément</span>
                    </div>
                    <div class="user-list" id="usersListContainer">
                        <div style="text-align:center; padding:30px; color:#666;">Chargement des données Firebase...</div>
                    </div>
                </div>

                <!-- FORMULAIRE DE MODIFICATION RAPIDE / MON PROFIL ADMIN -->
                <div class="profile-card">
                    <div class="card-title">⚙️ Éditeur d'Autorité Profil</div>
                    <div id="profileEditForm">
                        <div style="text-align:center; padding:20px; color:#666; font-size:12px;">
                            Sélectionnez un utilisateur dans la liste pour modifier ses accès, rôles ou soldes.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 2. Chargement des données depuis Realtime Database (`users` ou `profiles`)
    let usersData = {};

    async function loadProfiles() {
        try {
            const dbRef = ref(db);
            // On vérifie le nœud 'users' ou 'profiles'
            const snapshot = await get(child(dbRef, 'users'));
            
            if (snapshot.exists()) {
                usersData = snapshot.val();
            } else {
                const snapProfiles = await get(child(dbRef, 'profiles'));
                usersData = snapProfiles.exists() ? snapProfiles.val() : {};
            }

            renderUsersList(usersData);
            updateCounters(usersData);
        } catch (err) {
            console.error("Erreur chargement profils:", err);
            document.getElementById('usersListContainer').innerHTML = `<div style="color:#ef4444; text-align:center;">Erreur de connexion à Realtime Database.</div>`;
        }
    }

    // 3. Mise à jour des compteurs statistiques
    function updateCounters(data) {
        let total = 0, vendeurs = 0, acheteurs = 0, admins = 0;
        
        Object.values(data).forEach(u => {
            total++;
            const role = (u.role || u.type || 'acheteur').toLowerCase();
            if (role.includes('admin')) admins++;
            else if (role.includes('vendeur') || role.includes('seller')) vendeurs++;
            else acheteurs++;
        });

        document.getElementById('cntTotal').textContent = total;
        document.getElementById('cntVendeurs').textContent = vendeurs;
        document.getElementById('cntAcheteurs').textContent = acheteurs;
        document.getElementById('cntAdmins').textContent = admins;
    }

    // 4. Rendu de la liste des profils
    function renderUsersList(data, filter = "") {
        const containerList = document.getElementById('usersListContainer');
        containerList.innerHTML = "";

        const keys = Object.keys(data);
        if (keys.length === 0) {
            containerList.innerHTML = `<div style="text-align:center; padding:20px; color:#666;">Aucun profil trouvé dans la base.</div>`;
            return;
        }

        keys.forEach(uid => {
            const u = data[uid];
            const name = u.nom || u.name || u.displayName || u.email || "Utilisateur sans nom";
            const email = u.email || "Sans email";
            const role = u.role || u.type || "acheteur";
            const solde = u.solde || u.balance || 0;
            const devise = u.devise || "FCFA";

            if (filter && !name.toLowerCase().includes(filter) && !email.toLowerCase().includes(filter) && !uid.toLowerCase().includes(filter)) {
                return;
            }

            let badgeClass = "badge-acheteur";
            if (role.includes('admin')) badgeClass = "badge-admin";
            else if (role.includes('vendeur')) badgeClass = "badge-vendeur";
            else if (role.includes('livreur')) badgeClass = "badge-livreur";

            const item = document.createElement('div');
            item.className = "user-item";
            item.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <div class="user-avatar">${name.charAt(0).toUpperCase()}</div>
                    <div class="user-info">
                        <div class="user-name">${name}</div>
                        <div class="user-role">
                            <span class="badge ${badgeClass}">${role}</span>
                            <span>${email}</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="text-align:right;">
                        <div style="font-size:12px; font-weight:800; color:#ffcc00;">${solde} ${devise}</div>
                        <div style="font-size:9px; color:#a1a1aa;">UID: ${uid.substring(0, 8)}...</div>
                    </div>
                    <button class="btn-edit" data-uid="${uid}">Gérer</button>
                </div>
            `;

            item.querySelector('.btn-edit').addEventListener('click', () => openFormEditor(uid, u));
            containerList.appendChild(item);
        });
    }

    // 5. Formulaire d'édition de profil
    function openFormEditor(uid, userData) {
        const formContainer = document.getElementById('profileEditForm');
        formContainer.innerHTML = `
            <div class="form-group">
                <label>Nom Complet</label>
                <input type="text" id="editName" value="${userData.nom || userData.name || ''}">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="editEmail" value="${userData.email || ''}">
            </div>
            <div class="form-group">
                <label>Téléphone</label>
                <input type="text" id="editPhone" value="${userData.phone || userData.telephone || ''}">
            </div>
            <div class="form-group">
                <label>Rôle Système</label>
                <select id="editRole">
                    <option value="acheteur" ${userData.role === 'acheteur' ? 'selected' : ''}>Acheteur / Affilié</option>
                    <option value="vendeur" ${userData.role === 'vendeur' ? 'selected' : ''}>Vendeur / Partenaire</option>
                    <option value="livreur" ${userData.role === 'livreur' ? 'selected' : ''}>Livreur</option>
                    <option value="admin" ${userData.role === 'admin' ? 'selected' : ''}>Administrateur</option>
                </select>
            </div>
            <div class="form-group">
                <label>Solde Compte (FCFA)</label>
                <input type="number" id="editSolde" value="${userData.solde || userData.balance || 0}">
            </div>
            <button class="btn-save" id="btnSaveUser">💾 Mettre à jour dans Realtime DB</button>
        `;

        document.getElementById('btnSaveUser').addEventListener('click', async () => {
            const newNom = document.getElementById('editName').value;
            const newEmail = document.getElementById('editEmail').value;
            const newPhone = document.getElementById('editPhone').value;
            const newRole = document.getElementById('editRole').value;
            const newSolde = Number(document.getElementById('editSolde').value);

            try {
                const userRef = ref(db, `users/${uid}`);
                await update(userRef, {
                    nom: newNom,
                    email: newEmail,
                    phone: newPhone,
                    role: newRole,
                    solde: newSolde,
                    updatedAt: Date.now()
                });

                alert("✅ Profil mis à jour avec succès dans Firebase Realtime Database !");
                await loadProfiles();
            } catch (e) {
                alert("❌ Erreur de sauvegarde : " + e.message);
            }
        });
    }

    // 6. Écouteur pour la barre de recherche
    document.getElementById('profileSearch')?.addEventListener('input', (e) => {
        renderUsersList(usersData, e.target.value.toLowerCase().trim());
    });

    // Initialisation du chargement
    await loadProfiles();
}
