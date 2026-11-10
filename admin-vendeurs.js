import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export async function init() {
    const container = document.getElementById('module-container');
    const db = getDatabase();

    container.innerHTML = `
        <style>
            .vnd-container { color: #f5f5f7; }
            .vnd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
            .vnd-title { color: #ffcc00; font-size: 18px; font-weight: 800; text-transform: uppercase; }
            .vnd-filter { background: #0d0d11; border: 1px solid #282836; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 13px; outline: none; }
            .vnd-table-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 15px; overflow-x: auto; }
            table.vnd-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
            table.vnd-table th { background: #181820; color: #ffcc00; padding: 12px 10px; font-weight: 700; border-bottom: 1px solid #282836; text-transform: uppercase; font-size: 11px; }
            table.vnd-table td { padding: 12px 10px; border-bottom: 1px solid #1c1c26; vertical-align: middle; }
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; display: inline-block; }
            .status-approuve { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; }
            .status-en_attente { background: rgba(255, 204, 0, 0.2); color: #ffcc00; border: 1px solid #ffcc00; }
            .status-suspendu { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
            .btn-action { padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; margin-right: 5px; transition: opacity 0.2s; }
            .btn-action:hover { opacity: 0.8; }
            .btn-valider { background: #10b981; color: #000; }
            .btn-suspendre { background: #ef4444; color: #fff; }
        </style>

        <div class="vnd-container">
            <div class="vnd-header">
                <div class="vnd-title">🏪 Gestion des Vendeurs & Boutiques</div>
                <div>
                    <select id="vnd-status-filter" class="vnd-filter">
                        <option value="all">Tous les statuts</option>
                        <option value="en_attente">En attente de validation</option>
                        <option value="approuve">Approuvés / Actifs</option>
                        <option value="suspendu">Suspendus</option>
                    </select>
                </div>
            </div>

            <div class="vnd-table-card">
                <table class="vnd-table">
                    <thead>
                        <tr>
                            <th>Boutique</th>
                            <th>Propriétaire</th>
                            <th>Contact / WhatsApp</th>
                            <th>Catégorie</th>
                            <th>Statut</th>
                            <th>Date Inscription</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="vnd-list-body">
                        <tr>
                            <td colspan="7" style="text-align: center; color: #ffcc00; padding: 20px;">Chargement des boutiques vendeurs...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const listBody = document.getElementById('vnd-list-body');
    const statusFilter = document.getElementById('vnd-status-filter');
    let allVendorsData = {};

    // Écoute en temps réel du nœud "vendeurs"
    const vendorsRef = ref(db, 'vendeurs');
    onValue(vendorsRef, (snapshot) => {
        if (snapshot.exists()) {
            allVendorsData = snapshot.val();
            renderVendors();
        } else {
            listBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucune boutique vendeur trouvée.</td></tr>`;
        }
    });

    function renderVendors() {
        const filterVal = statusFilter.value;
        let html = '';

        Object.keys(allVendorsData).forEach((vendorId) => {
            const vendor = allVendorsData[vendorId];
            const statut = vendor.statut || 'en_attente';

            if (filterVal !== 'all' && statut !== filterVal) {
                return;
            }

            let badgeClass = 'status-en_attente';
            let badgeText = '⏳ En Attente';
            if (statut === 'approuve') {
                badgeClass = 'status-approuve';
                badgeText = '✅ Validé';
            } else if (statut === 'suspendu') {
                badgeClass = 'status-suspendu';
                badgeText = '🚫 Suspendu';
            }

            html += `
                <tr>
                    <td><strong style="color: #ffcc00; font-size: 14px;">${vendor.nomBoutique || 'Sans nom'}</strong></td>
                    <td>${vendor.emailOwner || vendor.email || 'Non renseigné'}</td>
                    <td>${vendor.telephone || vendor.whatsapp || 'N/A'}</td>
                    <td><span style="color: #a1a1aa;">${vendor.categorie || 'Général'}</span></td>
                    <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
                    <td style="font-size: 11px; color: #a1a1aa;">${vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        ${statut !== 'approuve' ? `<button class="btn-action btn-valider" onclick="updateVendorStatus('${vendorId}', 'approuve')">Approuver</button>` : ''}
                        ${statut !== 'suspendu' ? `<button class="btn-action btn-suspendre" onclick="updateVendorStatus('${vendorId}', 'suspendu')">Suspendre</button>` : ''}
                    </td>
                </tr>
            `;
        });

        listBody.innerHTML = html || `<tr><td colspan="7" style="text-align: center; color: #a1a1aa; padding: 20px;">Aucun vendeur ne correspond à ce filtre.</td></tr>`;
    }

    statusFilter.addEventListener('change', renderVendors);

    // Modifier le statut d'un vendeur dans Realtime Database
    window.updateVendorStatus = async (vendorId, newStatus) => {
        const actionText = newStatus === 'approuve' ? 'APPROUVER' : 'SUSPENDRE';
        if (confirm(`Voulez-vous vraiment ${actionText} cette boutique vendeur ?`)) {
            try {
                // Mise à jour dans 'vendeurs/'
                await update(ref(db, `vendeurs/${vendorId}`), { 
                    statut: newStatus,
                    updatedAt: new Date().toISOString()
                });

                // Optionnel : synchronisation du rôle dans 'users/' si l'ID correspond
                await update(ref(db, `users/${vendorId}`), { 
                    vendeurStatut: newStatus 
                }).catch(() => {});

                alert(`✅ Boutique mise à jour : ${newStatus.toUpperCase()}`);
            } catch (err) {
                alert("❌ Erreur lors de la mise à jour : " + err.message);
            }
        }
    };
}
