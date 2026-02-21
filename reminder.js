const admin = require('firebase-admin');

console.log("Démarrage du script...");

// 1. Vérification du secret
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("ERREUR : Le secret FIREBASE_SERVICE_ACCOUNT est introuvable.");
    process.exit(1);
}

// 2. Initialisation Globale
let db, fcm;

try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    
    db = admin.firestore();
    fcm = admin.messaging();
    
    console.log("Firebase Admin initialisé avec succès.");
} catch (e) {
    console.error("ERREUR lors de l'initialisation :", e.message);
    process.exit(1);
}

// 3. Fonction de vérification
async function checkAndSend() {
    try {
        const now = Date.now();
        console.log(`Recherche de rappels pour l'heure : ${new Date(now).toLocaleString()}`);

        const snapshot = await db.collection('reminders')
            .where('sent', '==', false)
            .where('scheduledFor', '<=', now)
            .get();

        if (snapshot.empty) {
            console.log('Aucun rappel à envoyer pour le moment.');
            return;
        }

        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // On vérifie que le token existe pour ce document
            if (!data.userToken) {
                console.log(`Document ${doc.id} ignoré (pas de token FCM).`);
                continue;
            }

            const message = {
                notification: {
                    title: `Rappel CinéNotes : ${data.movieTitle}`,
                    body: `N'oublie pas d'écrire ton avis sur le film de ${data.director} !`
                },
                token: data.userToken
            };

            try {
                await fcm.send(message);
                await doc.ref.update({ sent: true });
                console.log(`✅ Notification envoyée pour : ${data.movieTitle}`);
            } catch (error) {
                console.error(`❌ Erreur d'envoi pour ${data.movieTitle}:`, error.message);
            }
        }
    } catch (error) {
        console.error("Erreur lors de la lecture de la base de données :", error);
    }
}

// Lancement du script
checkAndSend();