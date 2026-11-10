// CONFIGURATION ET INITIALISATION FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDR7INHKaazaqZt-xIcjk10JFiy58uXKO8",
    authDomain: "dakproelite.firebaseapp.com",
    databaseURL: "https://dakproelite-default-rtdb.firebaseio.com",
    projectId: "dakproelite",
    storageBucket: "dakproelite.firebasestorage.app",
    messagingSenderId: "580591769206",
    appId: "1:580591769206:web:4f67f8aadbf3d051087157"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
    initAdminAcheteurs();
});

// UTILITAIRE TEMPOREL (Jour, Semaine, Mois)
function getTimeFrames(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);

    const isToday = now.toDateString() === date.toDateString();
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const isThisWeek = date >= startOfWeek;

    const isThisMonth = now.getMonth() === date.getMonth() && now.getFullYear() === date.getFullYear();

    return { isToday, isThisWeek, isThisMonth };
}

function initAdminAcheteurs() {
    // ÉCOUTE EN TEMPS RÉEL DES ACHATS ET COMMANDES
    db.ref('orders').on('value', async (snapshot) => {
        const orders = snapshot.val() || {};
        const usersSnapshot = await db.ref('users').once('value');
        const users = usersSnapshot.val() || {};

        const tbodyAchats = document.getElementById('tbodyAchatsAcheteurs');
        if (tbodyAchats) tbodyAchats.innerHTML = '';

        let totalJour = 0, totalSemaine = 0, totalMois = 0;
        let countJour = 0, countSemaine = 0, countMois = 0;

        const orderKeys = Object.keys(orders);

        if (orderKeys.length === 0) {
            if (tbodyAchats) tbodyAchats.innerHTML = '<tr><td colspan="7" style="text-align:center;">Aucun achat enregistré.</td></tr>';
            updateMetrics(0, 0, 0, 0, 0, 0);
            return;
        }

        orderKeys.reverse().forEach(orderId => {
            const order = orders[orderId];
            const buyer = users[order.buyerId] || {};
            
            const amount = parseFloat(order.totalAmount || order.price || 0);
            const createdAt = order.createdAt || Date.now();
            const time = getTimeFrames(createdAt);

            // CALCUL DES TOTALITÉS
            if (time.isToday) {
                totalJour += amount;
                countJour++;
            }
            if (time.isThisWeek) {
                totalSemaine += amount;
                countSemaine++;
            }
            if (time.isThisMonth) {
                totalMois += amount;
                countMois++;
            }

            // CONSTRUCTION DU TABLEAU DES ACHATS
            if (tbodyAchats) {
                const tr = document.createElement('tr');
                
                // Profil complet & numéro de compte / téléphone de l'acheteur
                const buyerProfile = `
                    <strong>${buyer.nom || 'Anonyme'}</strong><br>
                    <small style="color: var(--text-muted);">${buyer.email || 'Pas d\'email'}</small><br>
                    <small style="color: var(--gold-primary);">Compte: ${buyer.phone || buyer.accountNumber || order.paymentPhone || 'Non renseigné'}</small>
                `;

                // Détails des produits achetés
                const productDetails = `
                    <strong>${order.productName || 'Produit'}</strong><br>
                    <small>Qté: ${order.quantity || 1} | Réf: ${order.productId || 'N/A'}</small>
                `;

                tr.innerHTML = `
                    <td>${buyerProfile}</td>
                    <td>${productDetails}</td>
                    <td><strong style="color: var(--gold-primary);">${amount.toLocaleString('fr-FR')} €</strong></td>
                    <td>${order.paymentMethod || 'Mobile Money / Carte'}</td>
                    <td>${order.paymentAccount || order.paymentPhone || 'N/A'}</td>
                    <td>${new Date(createdAt).toLocaleDateString('fr-FR')} ${new Date(createdAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</td>
                    <td><span class="badge ${order.status === 'livre' ? 'badge-day' : 'badge-week'}">${order.status || 'En cours'}</span></td>
                `;
                tbodyAchats.appendChild(tr);
            }
        });

        // MISE À JOUR DES CARTES DU DASHBOARD
        updateMetrics(totalJour, countJour, totalSemaine, countSemaine, totalMois, countMois);
    });
}

function updateMetrics(totalJour, countJour, totalSemaine, countSemaine, totalMois, countMois) {
    const elJour = document.getElementById('totalAchatsJour');
    const elSemaine = document.getElementById('totalAchatsSemaine');
    const elMois = document.getElementById('totalAchatsMois');

    if (elJour) elJour.innerHTML = `${totalJour.toLocaleString('fr-FR')} € <br><small>(${countJour} achats)</small>`;
    if (elSemaine) elSemaine.innerHTML = `${totalSemaine.toLocaleString('fr-FR')} € <br><small>(${countSemaine} achats)</small>`;
    if (elMois) elMois.innerHTML = `${totalMois.toLocaleString('fr-FR')} € <br><small>(${countMois} achats)</small>`;
}
