const admin = require('firebase-admin');

console.log("Démarrage du script de regroupement...");

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("ERREUR : Le secret FIREBASE_SERVICE_ACCOUNT est introuvable.");
    process.exit(1);
}

let db, fcm;

try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    fcm = admin.messaging();
} catch (e) {
    console.error("ERREUR lors de l'initialisation :", e.message);
    process.exit(1);
}

async function checkAndSend() {
    try {
        const now = Date.now();
        const snapshot = await db.collection('reminders')
            .where('sent', '==', false)
            .where('scheduledFor', '<=', now)
            .get();

        if (snapshot.empty) {
            console.log('Aucun rappel à envoyer.');
            return;
        }

        // --- ÉTAPE 1 : REGROUPER PAR TOKEN ---
        const notificationsGrouped = {};

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const token = data.userToken;
            if (token) {
                if (!notificationsGrouped[token]) {
                    notificationsGrouped[token] = {
                        movies: [],
                        docRefs: []
                    };
                }
                notificationsGrouped[token].movies.push(data.movieTitle);
                notificationsGrouped[token].docRefs.push(doc.ref);
            }
        });

        // --- ÉTAPE 2 : ENVOYER UNE SEULE NOTIF PAR TOKEN ---
        for (const token in notificationsGrouped) {
            const group = notificationsGrouped[token];
            const count = group.movies.length;
            
            let messageTitle = "Rappel CinéNotes";
            let messageBody = "";

            if (count === 1) {
                messageTitle = `CinéNotes : ${group.movies[0]}`;
                messageBody = `N'oublie pas d'écrire ton avis sur ce film !`;
            } else {
                messageTitle = `Tu as ${count} films à noter !`;
                messageBody = group.movies.join(', '); // Liste les titres séparés par une virgule
            }

            const message = {
                notification: {
                    title: messageTitle,
                    body: messageBody
                },
                token: token
            };

            try {
                await fcm.send(message);
                // Marquer tous les documents du groupe comme envoyés
                const batch = db.batch();
                group.docRefs.forEach(ref => batch.update(ref, { sent: true }));
                await batch.commit();
                
                console.log(`✅ Notification groupée envoyée (${count} films)`);
            } catch (error) {
                console.error(`❌ Erreur d'envoi groupé:`, error.message);
            }
        }
    } catch (error) {
        console.error("Erreur générale :", error);
    }
}

checkAndSend();