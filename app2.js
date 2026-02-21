// 1. Les imports Firebase (UNE SEULE FOIS EN HAUT)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. La configuration
const firebaseConfig = {
    apiKey: "AIzaSyDmMzx6MK7GyxQ5GbU6BR2Fdc2hEple-mc",
    authDomain: "notes-app-zenith-99.firebaseapp.com",
    projectId: "notes-app-zenith-99",
    storageBucket: "notes-app-zenith-99.firebasestorage.app",
    messagingSenderId: "977687759982",
    appId: "1:977687759982:web:cf6bb4e98326086b482a7f"
};

// 3. Initialisation
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 4. TMDB et Variables
let API_KEY = localStorage.getItem('tmdb_api_key');
if (!API_KEY) {
    API_KEY = prompt("Veuillez saisir votre clé API TMDB pour continuer :");
    if (API_KEY) localStorage.setItem('tmdb_api_key', API_KEY);
}

const BASE_URL = 'https://api.themoviedb.org/3';
const movieForm = document.getElementById('movie-form');
const movieTitleInput = document.getElementById('movie-title');
const resultPreview = document.getElementById('result-preview');
const directorNameSpan = document.getElementById('director-name');
const saveMovieBtn = document.getElementById('save-movie');
const listContainer = document.getElementById('list-container');
const doneContainer = document.getElementById('done-container');

let currentMovie = null;

// --- FONCTIONS GLOBALES (Accessibles depuis index.html) ---

window.showPage = (pageId) => {
    document.getElementById('page-add').classList.toggle('hidden', pageId !== 'add');
    document.getElementById('page-history').classList.toggle('hidden', pageId !== 'history');
    document.getElementById('btn-nav-add').classList.toggle('active', pageId === 'add');
    document.getElementById('btn-nav-history').classList.toggle('active', pageId === 'history');
    window.renderHistory();
};

window.renderHistory = () => {
    const history = JSON.parse(localStorage.getItem('movieHistory')) || [];
    const searchInput = document.getElementById('search-history');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";
    
    // À voir
    listContainer.innerHTML = history.filter(m => !m.done).map(movie => `
        <div class="movie-item">
            <input type="checkbox" onclick="toggleMovie(${movie.id})" style="transform:scale(1.3); cursor:pointer;">
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <p>${movie.director}</p>
            </div>
            <button onclick="deleteMovie(${movie.id})" style="background:none; color:#ff4d4d;">✕</button>
        </div>
    `).reverse().join('');

    // Historique
    const filteredDone = history.filter(m => {
        const matches = m.title.toLowerCase().includes(searchQuery) || m.director.toLowerCase().includes(searchQuery);
        return m.done && matches;
    });

    doneContainer.innerHTML = filteredDone.map(movie => `
        <div class="movie-item" style="border-left: 4px solid #555;">
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <p>${movie.director} • Terminé le ${movie.date}</p>
            </div>
            <button onclick="deleteMovie(${movie.id})" style="background:none; color:#ff4d4d;">✕</button>
        </div>
    `).reverse().join('');
};

window.toggleMovie = (id) => {
    let history = JSON.parse(localStorage.getItem('movieHistory'));
    history = history.map(m => m.id === id ? { ...m, done: true, date: new Date().toLocaleDateString('fr-FR') } : m);
    localStorage.setItem('movieHistory', JSON.stringify(history));
    window.renderHistory();
};

window.deleteMovie = (id) => {
    let history = JSON.parse(localStorage.getItem('movieHistory'));
    history = history.filter(m => m.id !== id);
    localStorage.setItem('movieHistory', JSON.stringify(history));
    window.renderHistory();
};

// --- ÉCOUTEURS D'ÉVÉNEMENTS ---

movieForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = movieTitleInput.value;
    try {
        const searchRes = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`);
        const searchData = await searchRes.json();
        if (searchData.results.length > 0) {
            const movieId = searchData.results[0].id;
            const creditsRes = await fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`);
            const creditsData = await creditsRes.json();
            const director = creditsData.crew.find(person => person.job === 'Director');

            currentMovie = {
                id: Date.now(),
                title: searchData.results[0].title,
                director: director ? director.name : 'Inconnu',
                date: new Date().toLocaleDateString('fr-FR'),
                done: false
            };

            directorNameSpan.textContent = `${currentMovie.title} (Réal: ${currentMovie.director})`;
            resultPreview.classList.remove('hidden');
        }
    } catch (error) { console.error("Erreur API:", error); }
});

saveMovieBtn.addEventListener('click', async () => {
    if (!currentMovie) return;
    
    // Sauvegarde Locale
    const history = JSON.parse(localStorage.getItem('movieHistory')) || [];
    history.push(currentMovie);
    localStorage.setItem('movieHistory', JSON.stringify(history));

    // Sauvegarde Firestore
    try {
        const currentToken = localStorage.getItem('fcm_token'); 
        await addDoc(collection(db, "reminders"), {
            movieTitle: currentMovie.title,
            director: currentMovie.director,
            userToken: currentToken,
            createdAt: serverTimestamp(),
            scheduledFor: Date.now() + ( 10000), // Rappel +24h
            sent: false
        });
        console.log("Rappel enregistré dans Firestore !");
    } catch (e) {
        console.error("Erreur Firestore : ", e);
    }

    // Permission Notifications
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    resultPreview.classList.add('hidden');
    movieTitleInput.value = '';
    window.renderHistory();
    alert(`"${currentMovie.title}" ajouté au journal !`);
});

// Initialisation au chargement
window.renderHistory();