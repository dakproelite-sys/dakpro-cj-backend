import { 
    getDatabase, 
    ref, 
    get, 
    update, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/* ============================================================
   DAKPRO ÉLITE — admin-profils.js
   MODULE ADMINISTRATION : GESTION DU PROFIL ADMINISTRATEUR
============================================================ */

export async function init() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const db = getDatabase();
    const auth = getAuth();
    const currentUser = auth.currentUser;

    container.innerHTML = `
        <style>
            * { box-sizing: border-box; }
            .profile-container { color: #f5f5f7; font-family: system-ui, -apple-system, sans-serif; background: #0d0d11; padding: 20px; border-radius: 12px; max-width: 800px; margin: 0 auto; }
            .profile-header { border-bottom: 2px solid #282836; padding-bottom: 15px; margin-bottom: 20px; text-align: center; }
            .profile-title { color: #ffcc00; font-size: 22px; font-weight: 800; text-transform: uppercase; }
            
            .profile-card { background: #13131a; border: 1px solid #282836; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
            .form-group { margin-bottom: 15px; }
            .form-group label { display: block; font-size: 11px; color: #a1a1aa; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
            .form-control { width: 100%; background: #0d0d11; border: 1px solid #282836; color: #fff; padding: 10px 12px; border-radius: 8px; font-size: 13px; outline: none; }
            .form-control:focus { border-color: #ffcc00; }
            
            .btn-submit { width: 100%; background: #ffcc00; color: #000; border: none; padding: 12px; border-radius: 8px; font-weight: 800; font-size: 12px; text-transform: uppercase; cursor: pointer; transition: 0.2s; }
            .btn-submit:hover { background: #e6b800; }
            
            .admin-badge { display: inline-block; background: rgba(255,204,0,0.15); color: #ffcc00; border: 1px solid #ffcc00; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 8px; }
        </style>

        <div class="profile-container">
            <div class="profile-header">
                <div class="profile-title">👤 Profil Administrateur</div>
                <span class="admin-badge">Super Administrateur</span>
            </div>

            <div class="profile-card">
                <form id="adminProfileForm">
                    <div class="form-group">
                        <label>Nom complet / Identifiant Admin</label>
                        <input type="text" id="adminName" class="form-control" placeholder="Nom de l'administrateur" required>
                    </div>

                    <div class="form-group">
                        <label>Adresse E-mail</label>
                        <input type="email" id="adminEmail" class="form-control" placeholder="admin@dakpro.com" disabled style="opacity:0.6; cursor:not-allowed;">
                    </div>

                    <div class="form-group">
                        <label>Numéro de Téléphone (Support)</label>
                        <input type="tel" id="adminPhone" class="form-control" placeholder="+229 00 00 00 00">
                    </div>

                    <button type="submit" class="btn-submit">💾 Enregistrer les modifications</button>
                </form>
            </div>
        </div>
    `;

    if (currentUser) {
        document.getElementById('adminEmail').value = currentUser.email || "";
        
        try {
            const adminRef = ref(db, `admins/${currentUser.uid}`);
            const snapshot = await get(adminRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                document.getElementById('adminName').value = data.userName || data.nom || "";
                document.getElementById('adminPhone').value = data.phone || data.telephone || "";
            }
        } catch (err) {
            console.error("Erreur profil admin :", err);
        }
    }

    document.getElementById('adminProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return alert("❌ Aucun administrateur connecté.");

        const userName = document.getElementById('adminName').value;
        const phone = document.getElementById('adminPhone').value;

        try {
            await update(ref(db, `admins/${currentUser.uid}`), {
                userName,
                phone,
                updatedAt: serverTimestamp()
            });
            alert("✅ Profil administrateur mis à jour avec succès !");
        } catch (err) {
            alert("❌ Erreur lors de la mise à jour : " + err.message);
        }
    });
}
