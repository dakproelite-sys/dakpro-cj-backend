// Configuration Firebase officielle pour DAKPRO ÉLITE
const firebaseConfig = {
  apiKey: "AIzaSyDR7INHKaazaqZt-xIcjk10JFiy58uXKO8",
  authDomain: "dakproelite.firebaseapp.com",
  databaseURL: "https://dakproelite-default-rtdb.firebaseio.com",
  projectId: "dakproelite",
  storageBucket: "dakproelite.firebasestorage.app",
  messagingSenderId: "580591769206",
  appId: "1:580591769206:web:4f67f8aadbf3d051087157"
};

// Initialisation de Firebase (Format Compat)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
