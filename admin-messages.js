import { 
    getDatabase, 
    ref, 
    get, 
    push, 
    remove, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

/* ============================================================
   DAKPRO ÉLITE — admin-messages.js
   MODULE ADMINISTRATION : MESSAGERIE & NOTIFICATIONS BROADCST
============================================================ */

export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();

    container.innerHTML = `
        <style>
            * { box-sizing: border-box; }
            .msg-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; background: #0d0d11; padding: 20px; border-radius: 12px; }
            .msg-header { border-bottom: 2px solid #282836; padding-bottom: 12px; margin-bottom: 20px; }
            .msg-title { color: #ffcc00; font-size: 20px; font-weight: 800; text-transform: uppercase; }

            .msg-box { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 16px; margin-bottom: 20px; }
            .form-group { margin-bottom: 12px; }
            .form-group label { display: block; font-size: 11px; color: #a1a1aa; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
            .form-control { width: 100%; background: #0d0d11; border: 1px solid #282836; color: #fff; padding: 10px; border-radius: 8px; font-size: 12px; outline: none; }
            .form-control:focus { border-color: #ffcc00; }
            textarea.form-control { resize: vertical; min-height: 80px; }

            .btn-send { background: #ffcc00; color: #000; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 800; font-size: 11px; text-transform: uppercase; cursor: pointer; transition: 0.2s; width: 100%; }
            .btn-send:hover { background: #e6b800; }

            .history-title { font-size: 14px; color: #ffcc00; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; }
            .msg-list { display: flex; flex-direction: column; gap: 10px; }
            .msg-item { background: #13131a; border: 1px solid #282836; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: flex-start; }
            .msg-item-title { font-size: 13px; font-weight: 800; color: #fff; }
            .msg-item-body { font-size: 11px; color: #a1a1aa; margin-top: 4px; }
            .msg-item-meta { font-size: 9px; color: #ffcc00; margin-top: 6px; font-weight: 700; }
        </style>

        <div class="msg-container">
            <div class="msg-header">
                <div class="msg-title">💬 Messagerie & BroadCast Admin</div>
            </div>

            <div class="msg-box">
                <form id="sendMessageForm">
                    <div class="form-group">
                        <label>Cible du message</label>
                        <select id="msgTarget" class="form-control">
                            <option value="all">📢 Tous les Utilisateurs</option>
                            <option value="vendeurs">🏬 Uniquement les Vendeurs</option>
                            <option value="livreurs">🛵 Uniquement les Livreurs</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Titre de la notification / Message</label>
                        <input type="text" id="msgSubject" class="form-control" placeholder="Titre..." required>
                    </div>

                    <div class="form-group">
                        <label>Contenu du message</label>
                        <textarea id="msgBody" class="form-control" placeholder="Rédigez votre annonce ici..." required></textarea>
                    </div>

                    <button type="submit" class="btn-send">📤 Envoyer l'Annonce</button>
                </form>
            </div>

            <div class="history-title">📋 Messages Envoyés</div>
            <div class="msg-list" id="messagesHistoryList">
                <div style="text-align:center; color:#666; padding:20px;">Chargement de l'historique...</div>
            </div>
        </div>
    `;

    async function loadMessagesHistory() {
        const listContainer = document.getElementById('messagesHistoryList');
        try {
            const snapshot = await get(ref(db, 'messages'));
            listContainer.innerHTML = "";

            if (snapshot.exists()) {
                const data = snapshot.val();
                Object.keys(data).reverse().forEach(id => {
                    const item = data[id];
                    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : "Date inconnue";

                    const div = document.createElement('div');
                    div.className = "msg-item";
                    div.innerHTML = `
                        <div>
                            <div class="msg-item-title">${item.subject || "Sans titre"}</div>
                            <div class="msg-item-body">${item.body || ""}</div>
                            <div class="msg-item-meta">Destinataires : ${item.target || "Tous"} • Envoyé le ${dateStr}</div>
                        </div>
                        <button style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:14px;" data-id="${id}">🗑️</button>
                    `;

                    div.querySelector('button').addEventListener('click', () => deleteMessage(id));
                    listContainer.appendChild(div);
                });
            } else {
                listContainer.innerHTML = `<div style="text-align:center; color:#666; padding:20px;">Aucun message envoyé pour le moment.</div>`;
            }
        } catch (err) {
            console.error(err);
            listContainer.innerHTML = `<div style="color:#ef4444; text-align:center;">Erreur lors du chargement des messages.</div>`;
        }
    }

    async function deleteMessage(id) {
        if (!confirm("Voulez-vous vraiment supprimer ce message ?")) return;
        try {
            await remove(ref(db, `messages/${id}`));
            await loadMessagesHistory();
        } catch (e) {
            alert("Erreur: " + e.message);
        }
    }

    document.getElementById('sendMessageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const target = document.getElementById('msgTarget').value;
        const subject = document.getElementById('msgSubject').value;
        const body = document.getElementById('msgBody').value;

        try {
            await push(ref(db, 'messages'), {
                target,
                subject,
                body,
                createdAt: serverTimestamp()
            });

            alert("✅ Message/Notification diffusé avec succès !");
            document.getElementById('sendMessageForm').reset();
            await loadMessagesHistory();
        } catch (err) {
            alert("❌ Erreur d'envoi : " + err.message);
        }
    });

    await loadMessagesHistory();
}
