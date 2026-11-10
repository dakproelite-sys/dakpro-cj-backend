import { getDatabase, ref, onValue, update, get, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================================
   MODULE INDÉPENDANT : GESTION D'AFFILIATION — DAKPRO ÉLITE
   Gestion dynamique des commissions, statistiques & versements
============================================================ */
export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();

    // 1. Structure HTML / UI Modulaire Élite pour l'Affiliation
    container.innerHTML = `
        <style>
            .aff-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; background: #0d0d11; padding: 15px; border-radius: 12px; }
            .aff-title { color: #ffcc00; font-size: 20px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 0.5px; border-left: 4px solid #ffcc00; padding-left: 10px; }
            
            /* DINETTE KPIs */
            .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
            .kpi-card { background: #13131a; border: 1px solid #282836; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
            .kpi-card-highlight { border-color: #ffcc00; box-shadow: 0 0 12px rgba(255, 204, 0, 0.15); }
            .kpi-val { font-size: 22px; font-weight: 900; color: #ffcc00; margin-top: 5px; }
            .kpi-lbl { font-size: 11px; color: #a1a1aa; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            
            /* SECTIONS & TABLEAUX */
            .aff-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
            .aff-card-title { font-size: 14px; font-weight: 800; color: #ffcc00; text-transform: uppercase; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #282836; padding-bottom: 10px; }
            
            .aff-table-wrapper { overflow-x: auto; margin-top: 10px; }
            .aff-table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
            .aff-table th { background: #0d0d11; color: #ffcc00; font-weight: 800; padding: 10px; text-transform: uppercase; border-bottom: 2px solid #282836; }
            .aff-table td { padding: 10px; border-bottom: 1px solid #1c1c26; color: #f5f5f7; }
            .aff-table tr:hover { background: rgba(255, 204, 0, 0.03); }

            /* BOUTONS & BADGES */
            .badge-status { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
            .badge-active { background: rgba(76, 175, 80, 0.2); color: #4caf50; border: 1px solid #4caf50; }
            .badge-pending { background: rgba(255, 204, 0, 0.2); color: #ffcc00; border: 1px solid #ffcc00; }
            .btn-action { background: #ffcc00; color: #000; font-weight: 800; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; text-transform: uppercase; }
            .btn-action:hover { background: #ffe57f; }
        </style>

        <div class="aff-container">
            <div class="aff-title">🤝 Dashboard Global & Gestion de l'Affiliation</div>

            <!-- KPIs GLOBAUX -->
            <div class="kpi-grid">
                <div class="kpi-card kpi-card-highlight">
                    <div class="kpi-lbl">Total Affiliés Inscrits</div>
                    <div class="kpi-val" id="kpi-total-affiliates">0</div>
                </div>
                <div class="kpi-card kpi-card-highlight">
                    <div class="kpi-lbl">Affiliés Rétribués (Au moins 1 gain)</div>
                    <div class="kpi-val" id="kpi-active-affiliates">0</div>
                </div>
                <div class="kpi-card kpi-card-highlight">
                    <div class="kpi-lbl">Total Commissions Distribuées</div>
                    <div class="kpi-val" id="kpi-total-commissions">0 FCFA</div>
                </div>
                <div class="kpi-card kpi-card-highlight">
                    <div class="kpi-lbl">Revenu Plateforme (Part DAKPRO)</div>
                    <div class="kpi-val" id="kpi-platform-share">0 FCFA</div>
                </div>
            </div>

            <!-- GAINS TEMPORELS (JOUR / SEMAINE / MOIS / ANNÉE) -->
            <div class="aff-card">
                <div class="aff-card-title">
                    <span>📅 Répartition Temporelle des Gain d'Affiliation</span>
                    <span style="font-size: 10px; background: rgba(255, 204, 0, 0.2); padding: 3px 8px; border-radius: 4px;">ANALYTIQUE AVANCÉE</span>
                </div>
                <div class="kpi-grid" style="margin-bottom: 0;">
                    <div class="kpi-card">
                        <div class="kpi-lbl">Gains Aujourd'hui</div>
                        <div class="kpi-val" id="kpi-day-commissions">0 FCFA</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-lbl">Gains cette Semaine</div>
                        <div class="kpi-val" id="kpi-week-commissions">0 FCFA</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-lbl">Gains ce Mois</div>
                        <div class="kpi-val" id="kpi-month-commissions">0 FCFA</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-lbl">Gains cette Année</div>
                        <div class="kpi-val" id="kpi-year-commissions">0 FCFA</div>
                    </div>
                </div>
            </div>

            <!-- REGISTRE DES AFFILIÉS ET DE LEURS PARRAINAGES -->
            <div class="aff-card">
                <div class="aff-card-title">
                    <span>👥 Registre des Affiliés & Performance Individualisée</span>
                </div>
                <div class="aff-table-wrapper">
                    <table class="aff-table">
                        <thead>
                            <tr>
                                <th>Code / Lien</th>
                                <th>Affilié (Nom & Email)</th>
                                <th>Fieuls Filleuls</th>
                                <th>Total Gagné</th>
                                <th>Solde Actuel</th>
                                <th>Dernière Comm.</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="tbl-affiliates-body">
                            <tr>
                                <td colspan="7" style="text-align: center; color: #a1a1aa;">Chargement des données d'affiliation...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- HISTORIQUE RÉCENT DES TRANSACTIONS D'AFFILIATION -->
            <div class="aff-card">
                <div class="aff-card-title">
                    <span>📜 Historique des Dernières Commissions Générées</span>
                </div>
                <div class="aff-table-wrapper">
                    <table class="aff-table">
                        <thead>
                            <tr>
                                <th>Date & Heure</th>
                                <th>Bénéficiaire (Parrain)</th>
                                <th>Origine (Filleul)</th>
                                <th>Montant Gagné</th>
                                <th>Part Plateforme</th>
                                <th>Statut</th>
                            </tr>
                        </thead>
                        <tbody id="tbl-history-body">
                            <tr>
                                <td colspan="6" style="text-align: center; color: #a1a1aa;">Aucune transaction d'affiliation enregistrée.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // 2. Synchronisation et calculs dynamiques depuis Realtime Database
    const affiliationsRef = ref(db, 'affiliations');
    onValue(affiliationsRef, async (snapshot) => {
        const tblBody = document.getElementById('tbl-affiliates-body');
        const tblHistBody = document.getElementById('tbl-history-body');

        if (!snapshot.exists()) {
            tblBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Aucune donnée d\'affiliation trouvée.</td></tr>';
            return;
        }

        const data = snapshot.val();
        let totalUsers = 0;
        let activeUsers = 0;
        let grandTotalCommissions = 0;
        let grandTotalPlatformShare = 0;

        let dayGains = 0;
        let weekGains = 0;
        let monthGains = 0;
        let yearGains = 0;

        // Configuration des repères temporels
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        const firstDayOfWeek = new Date(now);
        firstDayOfWeek.setDate(now.getDate() - now.getDay());
        firstDayOfWeek.setHours(0, 0, 0, 0);
        const startOfWeek = firstDayOfWeek.getTime();

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

        tblBody.innerHTML = '';
        let allTransactions = [];

        // Récupération globale des utilisateurs pour croiser les noms
        const usersSnap = await get(ref(db, 'utilisateurs'));
        const usersData = usersSnap.exists() ? usersSnap.val() : {};

        Object.keys(data).forEach(uid => {
            totalUsers++;
            const aff = data[uid];
            const uInfo = usersData[uid] || {};
            const nom = uInfo.nomComplet || uInfo.nom || aff.nom || 'Affilié Inconnu';
            const email = uInfo.email || aff.email || 'N/A';

            const totalGagne = parseFloat(aff.totalGagne || 0);
            const solde = parseFloat(aff.solde || 0);
            const filleulsCount = aff.filleuls ? Object.keys(aff.filleuls).length : (aff.nombreFilleuls || 0);

            if (totalGagne > 0) activeUsers++;
            grandTotalCommissions += totalGagne;

            if (aff.partPlateforme) {
                grandTotalPlatformShare += parseFloat(aff.partPlateforme || 0);
            }

            // Historique des commissions de cet affilié
            let lastCommDate = 'Aucune';
            if (aff.historiqueCommissions) {
                Object.values(aff.historiqueCommissions).forEach(comm => {
                    const amount = parseFloat(comm.montant || 0);
                    const timestamp = comm.date ? new Date(comm.date).getTime() : 0;

                    // Calculs temporels
                    if (timestamp >= startOfDay) dayGains += amount;
                    if (timestamp >= startOfWeek) weekGains += amount;
                    if (timestamp >= startOfMonth) monthGains += amount;
                    if (timestamp >= startOfYear) yearGains += amount;

                    allTransactions.push({
                        date: comm.date,
                        timestamp: timestamp,
                        parrainNom: nom,
                        filleulNom: comm.filleulNom || comm.filleulUid || 'Achat Filleul',
                        montant: amount,
                        partPlateforme: comm.partPlateforme || 0,
                        statut: comm.statut || 'valide'
                    });
                });
            }

            if (aff.derniereCommission) {
                lastCommDate = new Date(aff.derniereCommission).toLocaleDateString('fr-FR');
            }

            // Construction de la ligne du tableau
            tblBody.innerHTML += `
                <tr>
                    <td><strong style="color:#ffcc00;">${aff.codeAffiliation || uid.substring(0, 8)}</strong></td>
                    <td>
                        <div><strong>${nom}</strong></div>
                        <div style="font-size:10px; color:#a1a1aa;">${email}</div>
                    </td>
                    <td><span class="badge-status badge-active">${filleulsCount} Filleul(s)</span></td>
                    <td><strong>${totalGagne.toLocaleString()} FCFA</strong></td>
                    <td><span style="color:#4caf50; font-weight:800;">${solde.toLocaleString()} FCFA</span></td>
                    <td>${lastCommDate}</td>
                    <td>
                        <button class="btn-action" onclick="window.verserCommission('${uid}', ${solde})">Payer Solde</button>
                    </td>
                </tr>
            `;
        });

        // Mise à jour des cartes de statistiques (KPIs)
        document.getElementById('kpi-total-affiliates').innerText = totalUsers;
        document.getElementById('kpi-active-affiliates').innerText = activeUsers;
        document.getElementById('kpi-total-commissions').innerText = grandTotalCommissions.toLocaleString() + ' FCFA';
        document.getElementById('kpi-platform-share').innerText = grandTotalPlatformShare.toLocaleString() + ' FCFA';

        document.getElementById('kpi-day-commissions').innerText = dayGains.toLocaleString() + ' FCFA';
        document.getElementById('kpi-week-commissions').innerText = weekGains.toLocaleString() + ' FCFA';
        document.getElementById('kpi-month-commissions').innerText = monthGains.toLocaleString() + ' FCFA';
        document.getElementById('kpi-year-commissions').innerText = yearGains.toLocaleString() + ' FCFA';

        // 3. Affichage du journal d'historique (Trié du plus récent au plus ancien)
        allTransactions.sort((a, b) => b.timestamp - a.timestamp);
        if (allTransactions.length > 0) {
            tblHistBody.innerHTML = '';
            allTransactions.slice(0, 15).forEach(t => {
                const dateFormatted = t.date ? new Date(t.date).toLocaleString('fr-FR') : 'N/A';
                tblHistBody.innerHTML += `
                    <tr>
                        <td>${dateFormatted}</td>
                        <td><strong>${t.parrainNom}</strong></td>
                        <td>${t.filleulNom}</td>
                        <td><strong style="color:#4caf50;">+${t.montant.toLocaleString()} FCFA</strong></td>
                        <td>${parseFloat(t.partPlateforme).toLocaleString()} FCFA</td>
                        <td><span class="badge-status badge-active">${t.statut}</span></td>
                    </tr>
                `;
            });
        } else {
            tblHistBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#a1a1aa;">Aucune transaction enregistrée.</td></tr>';
        }
    });

    // 4. Fonction globale pour traiter le versement / réinitialiser le solde d'un affilié
    window.verserCommission = async (uid, soldeActuel) => {
        if (soldeActuel <= 0) {
            alert("⚠️ Cet affilié n'a aucun solde en attente de versement.");
            return;
        }

        if (confirm(`Voulez-vous valider le versement de ${soldeActuel.toLocaleString()} FCFA à cet affilié ?`)) {
            try {
                const updateData = {
                    solde: 0,
                    dernierVersementDate: new Date().toISOString(),
                    totalVerse: (await get(ref(db, `affiliations/${uid}/totalVerse`))).val() + soldeActuel || soldeActuel
                };

                await update(ref(db, `affiliations/${uid}`), updateData);
                alert("✅ Versement enregistré et solde réinitialisé avec succès !");
            } catch (err) {
                alert("❌ Erreur de versement : " + err.message);
            }
        }
    };
}
