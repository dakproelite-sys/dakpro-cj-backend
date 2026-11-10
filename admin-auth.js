// ============================================================
// DAKPRO ÉLITE — admin-auth.js
// AUTHENTIFICATION RÉSERVÉE AUX ADMINISTRATEURS
//
// Firebase Authentication
// Firebase Realtime Database
// PAS DE FIRESTORE
// ============================================================


const auth = firebase.auth();
const db = firebase.database();


// ============================================================
// VARIABLES ADMIN
// ============================================================

let currentAdmin = null;
let currentAdminData = null;
let adminAuthorized = false;


// ============================================================
// VÉRIFICATION DE L'ADMINISTRATEUR
// ============================================================

auth.onAuthStateChanged(async (user) => {

    // --------------------------------------------------------
    // Aucun utilisateur connecté
    // --------------------------------------------------------

    if (!user) {

        currentAdmin = null;
        currentAdminData = null;
        adminAuthorized = false;

        console.log("ℹ️ Aucun administrateur connecté.");

        window.location.href = "connexion.html";

        return;
    }


    // --------------------------------------------------------
    // Utilisateur Firebase connecté
    // --------------------------------------------------------

    currentAdmin = user;

    console.log(
        "🔐 Utilisateur Firebase connecté :",
        user.uid
    );


    try {

        // ----------------------------------------------------
        // RÉCUPÉRER LE PROFIL ADMIN DANS REALTIME DATABASE
        // ----------------------------------------------------

        const snapshot =
            await db
                .ref("users/" + user.uid)
                .once("value");


        currentAdminData =
            snapshot.val();


        // ----------------------------------------------------
        // PROFIL ABSENT
        // ----------------------------------------------------

        if (!currentAdminData) {

            adminAuthorized = false;

            console.error(
                "❌ Profil introuvable dans users/" +
                user.uid
            );

            alert(
                "Accès refusé : profil administrateur introuvable."
            );

            await auth.signOut();

            window.location.href =
                "connexion.html";

            return;
        }


        // ----------------------------------------------------
        // VÉRIFICATION DU RÔLE
        // ----------------------------------------------------

        if (currentAdminData.role !== "admin") {

            adminAuthorized = false;

            console.error(
                "⛔ Rôle non autorisé :",
                currentAdminData.role
            );

            alert(
                "⛔ Accès strictement réservé aux administrateurs."
            );

            await auth.signOut();

            window.location.href =
                "connexion.html";

            return;
        }


        // ----------------------------------------------------
        // ADMINISTRATEUR VALIDÉ
        // ----------------------------------------------------

        adminAuthorized = true;


        console.log(
            "=========================================="
        );

        console.log(
            "✅ ADMINISTRATEUR AUTORISÉ"
        );

        console.log(
            "UID :",
            user.uid
        );

        console.log(
            "Nom :",
            currentAdminData.nom ||
            currentAdminData.name ||
            ""
        );

        console.log(
            "Email :",
            user.email
        );

        console.log(
            "Rôle :",
            currentAdminData.role
        );

        console.log(
            "=========================================="
        );


    } catch (error) {

        adminAuthorized = false;

        console.error(
            "❌ Erreur de vérification administrateur :",
            error
        );

        alert(
            "Impossible de vérifier les droits administrateur.\n\n" +
            error.message
        );
    }

});


// ============================================================
// RÉCUPÉRER L'ADMINISTRATEUR CONNECTÉ
// ============================================================

function getCurrentAdmin() {

    return auth.currentUser;
}


// ============================================================
// RÉCUPÉRER LE PROFIL DE L'ADMINISTRATEUR
// ============================================================

async function getCurrentAdminData() {

    const user = auth.currentUser;

    if (!user) {

        return null;
    }


    try {

        const snapshot =
            await db
                .ref("users/" + user.uid)
                .once("value");


        return snapshot.val();

    } catch (error) {

        console.error(
            "❌ Erreur récupération profil admin :",
            error
        );

        return null;
    }
}


// ============================================================
// VÉRIFIER SI L'UTILISATEUR EST ADMIN
// ============================================================

async function isAdmin() {

    const user = auth.currentUser;

    if (!user) {

        return false;
    }


    try {

        const snapshot =
            await db
                .ref("users/" + user.uid)
                .once("value");


        const data =
            snapshot.val();


        return !!(
            data &&
            data.role === "admin"
        );

    } catch (error) {

        console.error(
            "❌ Erreur vérification admin :",
            error
        );

        return false;
    }
}


// ============================================================
// EXIGER LES DROITS ADMIN
// ============================================================

async function requireAdmin() {

    const user = auth.currentUser;


    if (!user) {

        window.location.href =
            "connexion.html";

        return false;
    }


    const authorized =
        await isAdmin();


    if (!authorized) {

        alert(
            "⛔ Accès réservé aux administrateurs."
        );

        await auth.signOut();

        window.location.href =
            "connexion.html";

        return false;
    }


    adminAuthorized = true;

    return true;
}


// ============================================================
// DÉCONNEXION ADMINISTRATEUR
// ============================================================

async function logoutAdmin() {

    try {

        await auth.signOut();

        console.log(
            "✅ Administrateur déconnecté."
        );

        window.location.href =
            "connexion.html";

    } catch (error) {

        console.error(
            "❌ Erreur de déconnexion :",
            error
        );

        alert(
            "Erreur lors de la déconnexion :\n\n" +
            error.message
        );
    }
}