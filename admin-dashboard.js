import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();

    // Injecter la structure HTML et le CSS ergonomique
    container.innerHTML = `
        <style>
            .dash-header { text-align: center; margin-bottom: 25px; }
            .dash-header h2 { color: #ffcc00; font-size: 22px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; }
            .dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 15px; margin-bottom: 25px; }
            .dash-card { background: #181820; border: 1px solid #282836; border-radius: 12px; padding: 18px; text-align: center; position: relative; }
            .dash-card h3 { color: #a1a1aa; font-size: 12px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; }
            .dash-card .val { font-size: 20px; font-weight: 800; color: #ffffff; }
            .dash-card .val.highlight { color: #ffcc00; }
            .dash-card .val.green { color: #10b981; }
            .dash-card .val.blue { color: #3b82f6; }
            .dash-card .val.purple { color: #a855f7; }
            .dash-card .val.orange { color: #f97316; }
            .dash-section-title { color: #ffcc00; font-size: 15px; font-weight: 700; margin: 25px 0 12px 0; border-bottom: 1px solid #282836; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center; }
            .dash-actions { display: flex; gap: 10px; justify-content: flex-end; margin-bottom: 15px; }
            .btn-clean { background: #ef4444; color: #fff; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 12px; transition: 0.2s; }
            .btn-clean:hover { background: #dc2626; }
            .filter-select { background: #181820; color: #ffcc00; border: 1px solid #282836; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; }
        </style>

        <div class="dash-header">
            <h2>📊 Tableau de Bord Administration (Temps Réel)</h2>
            <div class="dash-actions">
                <select id="time-filter" class="filter-select">
                    <option value="all">Toutes les périodes</option>
                    <option value="today">Aujourd'hui</option>
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois-ci</option>
                    <option value="year">Cette année</option>
                </select>
                <button id="btn-purge-stats" class="btn-clean">🗑️ Nettoyer Métriques Temporaires</button>
            </div>
        </div>

        <!-- SECTION 1 : VISITES & ACTIVITÉS -->
        <div class="dash-section-title">👀 Trafic & Interactions Client</div>
        <div class="dash-grid">
            <div class="dash-card">
                <h3>Visites Plateforme</h3>
                <div class="val blue" id="stat-site-visits">0</div>
            </div>
            <div class="dash-card">
                <h3>Produits & Publications</h3>
                <div class="val highlight" id="stat-publications">0</div>
            </div>
            <div class="dash-card">
                <h3>Commandes Effectuées</h3>
                <div class="val green" id="stat-orders">0</div>
            </div>
            <div class="dash-card">
                <h3>Total Transactions</h3>
                <div class="val orange" id="stat-transactions-count">0</div>
            </div>
        </div>

        <!-- SECTION 2 : FINANCES & PAIEMENTS RÉELS -->
        <div class="dash-section-title">💰 Finances, Achats & Paiements Reçus</div>
        <div class="dash-grid">
            <div class="dash-card">
                <h3>Volume Total Ventes</h3>
                <div class="val green" id="stat-total-sales">0 FCFA</div>
            </div>
            <div class="dash-card">
                <h3>Paiements Confirmés</h3>
                <div class="val highlight" id="stat-payments-received">0 FCFA</div>
            </div>
            <div class="dash-card">
                <h3>Gains Plateforme</h3>
                <div class="val purple" id="stat-platform-earnings">0 FCFA</div>
            </div>
            <div class="dash-card">
                <h3>Gains Affiliation</h3>
                <div class="val blue" id="stat-affiliate-earnings">0 FCFA</div>
            </div>
        </div>

        <!-- SECTION 3 : COMPTES ET RÔLES -->
        <div class="dash-section-title">👥 Utilisateurs & Profils Inscrits</div>
        <div class="dash-grid">
            <div class="dash-card">
                <h3>Total Utilisateurs</h3>
                <div class="val" id="stat-users">0</div>
            </div>
            <div class="dash-card">
                <h3>Vendeurs Actifs</h3>
                <div class="val" id="stat-sellers">0</div>
            </div>
            <div class="dash-card">
                <h3>Livreurs Inscrits</h3>
                <div class="val" id="stat-couriers">0</div>
            </div>
            <div class="dash-card">
                <h3>Architectes Inscrits</h3>
                <div class="val" id="stat-architects">0</div>
            </div>
        </div>

        <!-- SECTION 4 : MESSAGES & SUPPORT -->
        <div class="dash-section-title">💬 Communications & Support</div>
        <div class="dash-grid">
            <div class="dash-card">
                <h3>Messages Directs</h3>
                <div class="val" id="stat-messages">0</div>
            </div>
            <div class="dash-card">
                <h3>Tickets Support</h3>
                <div class="val highlight" id="stat-support-messages">0</div>
            </div>
        </div>
    `;

    // Fonction de formatage en FCFA
    const formatFCFA = (montant) => new Intl.NumberFormat('fr-FR').format(Math.max(0, montant || 0)) + " FCFA";

    // Vérification du filtre par période
    const isWithinPeriod = (timestamp, period) => {
        if (!timestamp || period === 'all') return true;
        const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
        const now = new Date();
        
        if (isNaN(date.getTime())) return true; // Si la date n'est pas lisible, on conserve l'élément

        if (period === 'today') return date.toDateString() === now.toDateString();
        if (period === 'week') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            return date >= sevenDaysAgo;
        }
        if (period === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        if (period === 'year') return date.getFullYear() === now.getFullYear();
        return true;
    };

    let selectedPeriod = 'all';

    function attachRealtimeListeners() {
        // 1. Visites du site
        onValue(ref(db, 'configuration/visites'), (snap) => {
            document.getElementById('stat-site-visits').innerText = snap.exists() ? snap.val() : 0;
        });

        // 2. Publications & Produits
        onValue(ref(db, 'publications'), (snap) => {
            if (snap.exists()) {
                const pubs = Object.values(snap.val());
                const filteredPubs = pubs.filter(p => isWithinPeriod(p.createdAt || p.datePublication, selectedPeriod));
                document.getElementById('stat-publications').innerText = filteredPubs.length;
            } else {
                document.getElementById('stat-publications').innerText = 0;
            }
        });

        // 3. Utilisateurs & Rôles
        onValue(ref(db, 'users'), (snap) => {
            if (snap.exists()) {
                const users = Object.values(snap.val());
                document.getElementById('stat-users').innerText = users.length;
                document.getElementById('stat-sellers').innerText = users.filter(u => (u.role || '').toLowerCase() === 'vendeur').length;
                document.getElementById('stat-couriers').innerText = users.filter(u => (u.role || '').toLowerCase() === 'livreur').length;
                document.getElementById('stat-architects').innerText = users.filter(u => (u.role || '').toLowerCase() === 'architecte').length;

                let totalAffiliateGains = 0;
                users.forEach(u => {
                    totalAffiliateGains += parseFloat(u.gainAffiliation || u.commissions || 0);
                });
                document.getElementById('stat-affiliate-earnings').innerText = formatFCFA(totalAffiliateGains);
            } else {
                ['stat-users', 'stat-sellers', 'stat-couriers', 'stat-architects'].forEach(id => {
                    document.getElementById(id).innerText = 0;
                });
                document.getElementById('stat-affiliate-earnings').innerText = formatFCFA(0);
            }
        });

        // 4. Transactions & Ventes Total
        onValue(ref(db, 'transactions'), (snap) => {
            if (snap.exists()) {
                const txs = Object.values(snap.val()).filter(t => isWithinPeriod(t.timestamp || t.createdAt, selectedPeriod));
                document.getElementById('stat-transactions-count').innerText = txs.length;

                let totalVentes = 0;
                let gainsPlateforme = 0;

                txs.forEach(t => {
                    if ((t.statut || '').toLowerCase() === 'succès' || (t.statut || '').toLowerCase() === 'valide') {
                        const totalTx = parseFloat(t.total || t.prixUnitaire || 0);
                        totalVentes += totalTx;
                        gainsPlateforme += parseFloat(t.commission || (totalTx * 0.05)); // 5% par défaut
                    }
                });

                document.getElementById('stat-total-sales').innerText = formatFCFA(totalVentes);
                document.getElementById('stat-platform-earnings').innerText = formatFCFA(gainsPlateforme);
            } else {
                document.getElementById('stat-transactions-count').innerText = 0;
                document.getElementById('stat-total-sales').innerText = formatFCFA(0);
                document.getElementById('stat-platform-earnings').innerText = formatFCFA(0);
            }
        });

        // 5. Commandes
        onValue(ref(db, 'commandes'), (snap) => {
            if (snap.exists()) {
                const orders = Object.values(snap.val()).filter(o => isWithinPeriod(o.createdAt || o.timestamp || o.date, selectedPeriod));
                document.getElementById('stat-orders').innerText = orders.length;
            } else {
                document.getElementById('stat-orders').innerText = 0;
            }
        });

        // 6. Paiements Confirmés
        onValue(ref(db, 'paiements'), (snap) => {
            if (snap.exists()) {
                const paiements = Object.values(snap.val()).filter(p => isWithinPeriod(p.createdAt || p.timestamp || p.date, selectedPeriod));
                let totalPaiements = 0;

                paiements.forEach(p => {
                    if ((p.statut || p.status || '').toLowerCase() === 'paye' || p.paye === true || p.statut === 'VALIDE' || p.statut === 'Succès') {
                        totalPaiements += parseFloat(p.montant || p.amount || p.total || 0);
                    }
                });

                document.getElementById('stat-payments-received').innerText = formatFCFA(totalPaiements);
            } else {
                document.getElementById('stat-payments-received').innerText = formatFCFA(0);
            }
        });

        // 7. Messages et Support
        onValue(ref(db, 'messages'), (snap) => {
            document.getElementById('stat-messages').innerText = snap.exists() ? Object.keys(snap.val()).length : 0;
        });

        onValue(ref(db, 'messages_support'), (snap) => {
            document.getElementById('stat-support-messages').innerText = snap.exists() ? Object.keys(snap.val()).length : 0;
        });
    }

    // Gestion de l'événement Filtre par Période
    document.getElementById('time-filter').addEventListener('change', (e) => {
        selectedPeriod = e.target.value;
        attachRealtimeListeners();
    });

    // Action de nettoyage des statistiques temporaires
    document.getElementById('btn-purge-stats').addEventListener('click', async () => {
        if (confirm("Voulez-vous réinitialiser le compteur de visites de la plateforme ?")) {
            try {
                await set(ref(db, 'configuration/visites'), 0);
                alert("Compteur de visites réinitialisé avec succès !");
            } catch (err) {
                console.error("Erreur lors de la réinitialisation :", err);
                alert("Erreur lors de la réinitialisation.");
            }
        }
    });

    // Démarrage des écouteurs Realtime Firebase
    attachRealtimeListeners();
}
