importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDmMzx6MK7GyxQ5GbU6BR2Fdc2hEple-mc",
    authDomain: "notes-app-zenith-99.firebaseapp.com",
    projectId: "notes-app-zenith-99",
    messagingSenderId: "977687759982",
    appId: "1:977687759982:web:cf6bb4e98326086b482a7f"
});

const messaging = firebase.messaging();

// Gère l'affichage quand l'app est en arrière-plan
messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/web-app-manifest-192x192.png'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});