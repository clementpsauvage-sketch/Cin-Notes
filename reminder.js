const admin = require('firebase-admin');

console.log("Démarrage du script...");

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("ERREUR : Le secret FIREBASE_SERVICE_ACCOUNT est introuvable.");
    process.exit(1);
}

try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialisé avec succès.");
} catch (e) {
    console.error("ERREUR lors de l'initialisation (JSON invalide ?) :", e.message);
    process.exit(1);
}
// ... la suite de ton code

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const fcm = admin.messaging();

async function checkAndSend() {
    const now = Date.now();
    // On cherche : pas encore envoyé ET l'heure est passée
    const snapshot = await db.collection('reminders')
        .where('sent', '==', false)
        .where('scheduledFor', '<=', now)
        .get();

    if (snapshot.empty) {
        console.log('Aucun rappel à envoyer.');
        return;
    }

    for (const doc of snapshot.docs) {
        const data = doc.data();
        
        const message = {
            notification: {
                title: `Rappel CinéNotes : ${data.movieTitle}`,
                body: `N'oublie pas d'écrire ton avis sur le film de ${data.director} !`
            },
            token: data.userToken
        };

        try {
            await fcm.send(message);
        await doc.ref.update({ sent: true }); // Marquer comme envoyé
            console.log(`Notification envoyée pour : ${data.movieTitle}`);
        } catch (error) {
            console.error(`Erreur pour ${data.movieTitle}:`, error);
        }
    }
}

checkAndSend();