import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export async function init() {
    const container = document.getElementById('module-container');
    const db = getDatabase();

    container.innerHTML = `
        <style>
            .usr-container { color: #f5f5f7; }
            .usr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
            .usr-title { color: #ffcc00; font-size: 18px; font-weight: 800; text-transform: uppercase; }
            .usr-filter { background: #0d0d11; border: 1px solid #282836; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; outline: none; }
            .usr-table-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 15px; overflow-x: auto; }
            table.usr-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
            table.usr-table th { background: #181820; color: #ffcc00; padding: 12px 10px; font-weight: 700; border-bottom: 1px solid #282836; text-transform: uppercase; font-size: 11px; }
            table.usr-table td { padding: 12px 10px; border-bottom: 1px solid #1c1c26; vertical-align: middle; }
            .role-badge { padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
            .role-admin { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
            .role-vendeur { background: rgba(255, 204, 0, 0.2); color: #ffcc00; }
            .role-livreur { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
            .role-acheteur { background: rgba(16, 185, 129, 0.2); color: #10b981; }
            .select-action { background: #0d0d11; border: 1px solid #282836; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; }
            .btn-status { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; }
            .btn-active { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; }
            .btn-blocked { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
        </style>

        <div class="usr-container">
            <div class="usr-header">
                <div class="usr-title">👥 Gestion des Utilisateurs</div>
                <div>
                    <select id="usr-role-filter" class="usr-filter">
                        <option value="all">Tous les rôles</option>
                        <option value="acheteur">Acheteurs</option>
                        <option value="vendeur">Vendeurs</option>
                        <option value="livreur">Livreurs</option>
                        <option value="administration">Administrateurs</option>
                    </select>
                </div>
            </div>

            <div class="usr-table-card">
                <table class="usr-table">
                    <thead>
                        <tr>
                            <th>ID / UID</th>
                            <th>Email</th>
                            <th>Nom</th>
                            <th>Rôle</th>
                            <th>Statut</th>
                            <th>Changer Rôle</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="usr-list-body">
                        <tr>
                            <td colspan="7" style="text-align: center; color: #ffcc00; padding: 20px;">Chargement des utilisateurs...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const listBody = document.getElementById('usr-list-body');
    const roleFilter = document.getElementById('usr-role-filter');
    let allUsersData = {};

    // Écoute en temps réel des utilisateurs
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
            allUsersData = snapshot.val();
            renderUsers();
        } else {
            listBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucun utilisateur trouvé dans la base.</td></tr>`;
        }
    });

    function renderUsers() {
        const filterVal = roleFilter.value;
        let html = '';

        Object.keys(allUsersData).forEach((uid) => {
            const user = allUsersData[uid];
            const role = (user.role || 'acheteur').toLowerCase().trim();
            const status = user.statut || 'actif';

            if (filterVal !== 'all' && role !== filterVal) {
                return;
            }

            let roleBadgeClass = 'role-acheteur';
            if (role === 'administration' || role === 'admin') roleBadgeClass = 'role-admin';
            else if (role === 'vendeur') roleBadgeClass = 'role-vendeur';
            else if (role === 'livreur') roleBadgeClass = 'role-livreur';

            html += `
                <tr>
                    <td style="font-size: 10px; color: #a1a1aa;">${uid.slice(0, 8)}...</td>
                    <td><strong>${user.email || 'N/A'}</strong></td>
                    <td>${user.nom || user.displayName || 'Non renseigné'}</td>
                    <td><span class="role-badge ${roleBadgeClass}">${role}</span></td>
                    <td>
                        <button class="btn-status ${status === 'actif' ? 'btn-active' : 'btn-blocked'}" onclick="toggleUserStatus('${uid}', '${status}')">
                            ${status === 'actif' ? '✅ Actif' : '🚫 Bloqué'}
                        </button>
                    </td>
                    <td>
                        <select class="select-action" onchange="changeUserRole('${uid}', this.value)">
                            <option value="">Modifier...</option>
                            <option value="acheteur">Acheteur</option>
                            <option value="vendeur">Vendeur</option>
                            <option value="livreur">Livreur</option>
                            <option value="administration">Admin</option>
                        </select>
                    </td>
                    <td>
                        <span style="font-size: 11px; color: #a1a1aa;">${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </td>
                </tr>
            `;
        });

        listBody.innerHTML = html || `<tr><td colspan="7" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucun utilisateur ne correspond au filtre.</td></tr>`;
    }

    roleFilter.addEventListener('change', renderUsers);

    // Fonctions globales d'actions sur Firebase Realtime Database
    window.changeUserRole = async (uid, newRole) => {
        if (!newRole) return;
        if (confirm(`Voulez-vous vraiment passer cet utilisateur au rôle : ${newRole.toUpperCase()} ?`)) {
            try {
                await update(ref(db, `users/${uid}`), { role: newRole });
                alert("✅ Rôle mis à jour avec succès !");
            } catch (err) {
                alert("❌ Erreur : " + err.message);
            }
        }
    };

    window.toggleUserStatus = async (uid, currentStatus) => {
        const newStatus = currentStatus === 'actif' ? 'bloque' : 'actif';
        if (confirm(`Voulez-vous ${newStatus === 'bloque' ? 'BLOQUER' : 'DÉBLOQUER'} cet utilisateur ?`)) {
            try {
                await update(ref(db, `users/${uid}`), { statut: newStatus });
                alert(`✅ Statut changé : ${newStatus.toUpperCase()}`);
            } catch (err) {
                alert("❌ Erreur : " + err.message);
            }
        }
    };
}
