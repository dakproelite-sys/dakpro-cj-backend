import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export async function init() {
    const container = document.getElementById('module-container');
    const db = getDatabase();

    container.innerHTML = `
        <style>
            .lvr-container { color: #f5f5f7; }
            .lvr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
            .lvr-title { color: #ffcc00; font-size: 18px; font-weight: 800; text-transform: uppercase; }
            .lvr-filter { background: #0d0d11; border: 1px solid #282836; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; outline: none; }
            .lvr-table-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 15px; overflow-x: auto; }
            table.lvr-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
            table.lvr-table th { background: #181820; color: #ffcc00; padding: 12px 10px; font-weight: 700; border-bottom: 1px solid #282836; text-transform: uppercase; font-size: 11px; }
            table.lvr-table td { padding: 12px 10px; border-bottom: 1px solid #1c1c26; vertical-align: middle; }
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; display: inline-block; }
            .status-valide { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; }
            .status-attente { background: rgba(255, 204, 0, 0.2); color: #ffcc00; border: 1px solid #ffcc00; }
            .status-suspendu { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
            .disp-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
            .disp-oui { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
            .disp-non { background: rgba(161, 161, 170, 0.2); color: #a1a1aa; }
            .btn-action { padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; margin-right: 5px; transition: opacity 0.2s; }
            .btn-action:hover { opacity: 0.8; }
            .btn-valider { background: #10b981; color: #000; }
            .btn-suspendre { background: #ef4444; color: #fff; }
        </style>

        <div class="lvr-container">
            <div class="lvr-header">
                <div class="lvr-title">🛵 Gestion des Livreurs & Flotte</div>
                <div>
                    <select id="lvr-status-filter" class="lvr-filter">
                        <option value="all">Tous les statuts</option>
                        <option value="en_attente">En attente de validation</option>
                        <option value="valide">Approuvés / Actifs</option>
                        <option value="suspendu">Suspendus</option>
                    </select>
                </div>
            </div>

            <div class="lvr-table-card">
                <table class="lvr-table">
                    <thead>
                        <tr>
                            <th>Livreur / Nom</th>
                            <th>Email & Téléphone</th>
                            <th>Engin / Véhicule</th>
                            <th>Zone de Couverture</th>
                            <th>Disponibilité</th>
                            <th>Statut</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="lvr-list-body">
                        <tr>
                            <td colspan="7" style="text-align: center; color: #ffcc00; padding: 20px;">Chargement des livreurs...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const listBody = document.getElementById('lvr-list-body');
    const statusFilter = document.getElementById('lvr-status-filter');
    let allLivreursData = {};

    // Écoute en temps réel de la Realtime Database (`livreurs/`)
    const livreursRef = ref(db, 'livreurs');
    onValue(livreursRef, (snapshot) => {
        if (snapshot.exists()) {
            allLivreursData = snapshot.val();
            renderLivreurs();
        } else {
            listBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucun livreur enregistré dans la base.</td></tr>`;
        }
    });

    function renderLivreurs() {
        const filterVal = statusFilter.value;
        let html = '';

        Object.keys(allLivreursData).forEach((livreurId) => {
            const livreur = allLivreursData[livreurId];
            const statut = livreur.statut || 'en_attente';
            const disponible = livreur.disponible !== false;

            if (filterVal !== 'all' && statut !== filterVal) {
                return;
            }

            let badgeClass = 'status-attente';
            let badgeText = '⏳ En Attente';
            if (statut === 'valide' || statut === 'approuve') {
                badgeClass = 'status-valide';
                badgeText = '✅ Validé';
            } else if (statut === 'suspendu') {
                badgeClass = 'status-suspendu';
                badgeText = '🚫 Suspendu';
            }

            html += `
                <tr>
                    <td><strong style="color: #ffcc00; font-size: 14px;">${livreur.nom || livreur.displayName || 'Sans Nom'}</strong></td>
                    <td>
                        <div>${livreur.email || 'N/A'}</div>
                        <div style="font-size: 11px; color: #a1a1aa;">📞 ${livreur.telephone || livreur.whatsapp || 'N/A'}</div>
                    </td>
                    <td><span style="color: #fff;">${livreur.vehicule || 'Moto / Tricycle'}</span></td>
                    <td><span style="color: #a1a1aa;">${livreur.zone || livreur.ville || 'Toutes zones'}</span></td>
                    <td>
                        <span class="disp-badge ${disponible ? 'disp-oui' : 'disp-non'}">
                            ${disponible ? '🟢 En Service' : '🔴 Indisponible'}
                        </span>
                    </td>
                    <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
                    <td>
                        ${statut !== 'valide' && statut !== 'approuve' ? `<button class="btn-action btn-valider" onclick="updateLivreurStatus('${livreurId}', 'valide')">Valider</button>` : ''}
                        ${statut !== 'suspendu' ? `<button class="btn-action btn-suspendre" onclick="updateLivreurStatus('${livreurId}', 'suspendu')">Suspendre</button>` : ''}
                    </td>
                </tr>
            `;
        });

        listBody.innerHTML = html || `<tr><td colspan="7" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucun livreur ne correspond au filtre sélectionné.</td></tr>`;
    }

    statusFilter.addEventListener('change', renderLivreurs);

    // Mettre à jour le statut du livreur
    window.updateLivreurStatus = async (livreurId, newStatus) => {
        const actionText = newStatus === 'valide' ? 'VALIDER' : 'SUSPENDRE';
        if (confirm(`Voulez-vous vraiment ${actionText} ce livreur ?`)) {
            try {
                await update(ref(db, `livreurs/${livreurId}`), { 
                    statut: newStatus,
                    updatedAt: new Date().toISOString()
                });

                await update(ref(db, `users/${livreurId}`), { 
                    livreurStatut: newStatus,
                    role: 'livreur'
                }).catch(() => {});

                alert(`✅ Statut du livreur mis à jour : ${newStatus.toUpperCase()}`);
            } catch (err) {
                alert("❌ Erreur de mise à jour : " + err.message);
            }
        }
    };
}
