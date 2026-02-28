import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDmMzx6MK7GyxQ5GbU6BR2Fdc2hEple-mc",
    authDomain: "notes-app-zenith-99.firebaseapp.com",
    projectId: "notes-app-zenith-99",
    storageBucket: "notes-app-zenith-99.firebasestorage.app",
    messagingSenderId: "977687759982",
    appId: "1:977687759982:web:cf6bb4e98326086b482a7f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let API_KEY = localStorage.getItem('tmdb_api_key');
if (!API_KEY) {
    API_KEY = prompt("Veuillez saisir votre clé API TMDB pour continuer :");
    if (API_KEY) localStorage.setItem('tmdb_api_key', API_KEY);
}

const BASE_URL = 'https://api.themoviedb.org/3';
const movieForm = document.getElementById('movie-form');
const movieTitleInput = document.getElementById('movie-title');
const resultPreview = document.getElementById('result-preview');
const listContainer = document.getElementById('list-container');
const doneContainer = document.getElementById('done-container');

// --- GESTION DE LA RECHERCHE MULTIPLE ---

movieForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = movieTitleInput.value;
    resultPreview.innerHTML = '<p style="color:white; padding:10px;">Recherche en cours...</p>';
    resultPreview.classList.remove('hidden');

    try {
        const searchRes = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`);
        const searchData = await searchRes.json();
        
        // On affiche les 5 premiers résultats
        const topResults = searchData.results.slice(0, 5);
        resultPreview.innerHTML = ''; 

        if (topResults.length === 0) {
            resultPreview.innerHTML = '<p style="color:white; padding:10px;">Aucun film trouvé.</p>';
            return;
        }

        for (const movie of topResults) {
            // Récupération du réalisateur
            const creditsRes = await fetch(`${BASE_URL}/movie/${movie.id}/credits?api_key=${API_KEY}`);
            const creditsData = await creditsRes.json();
            const director = creditsData.crew.find(person => person.job === 'Director');
            const directorName = director ? director.name : 'Inconnu';
            
            // Gestion de l'affiche (poster)
            const posterPath = movie.poster_path 
                ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` 
                : 'https://via.placeholder.com/92x138?text=No+Image';

            // Création de l'élément HTML pour chaque choix
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-choice-card';
            movieCard.innerHTML = `
                <img src="${posterPath}" alt="${movie.title}">
                <div class="choice-details">
                    <strong>${movie.title}</strong>
                    <p>Réal: ${directorName}</p>
                    <button onclick="selectAndSaveMovie('${movie.title.replace(/'/g, "\\'")}', '${directorName.replace(/'/g, "\\'")}')">Ajouter</button>
                </div>
            `;
            resultPreview.appendChild(movieCard);
        }
    } catch (error) { 
        console.error("Erreur API:", error); 
    }
});

// --- FONCTION DE SAUVEGARDE (Appelée au clic sur "Ajouter") ---

window.selectAndSaveMovie = async (title, director) => {
    const currentToken = localStorage.getItem('fcm_token');
    
    if (!currentToken) {
        alert("Action impossible : le système de notifications n'est pas prêt. Vérifie que tu as bien installé l'app sur ton écran d'accueil iPhone.");
        return;
    }

    const movieData = {
        id: Date.now(),
        title: title,
        director: director,
        date: new Date().toLocaleDateString('fr-FR'),
        done: false
    };

    // 1. Sauvegarde Locale (Historique)
    const history = JSON.parse(localStorage.getItem('movieHistory')) || [];
    history.push(movieData);
    localStorage.setItem('movieHistory', JSON.stringify(history));

    // 2. Sauvegarde Firestore (Notifications)
    try {
        await addDoc(collection(db, "reminders"), {
            movieTitle: movieData.title,
            director: movieData.director,
            userToken: currentToken,
            createdAt: serverTimestamp(),
            scheduledFor: Date.now() + (20 * 3600 * 1000), // +20h pour être sûr
            sent: false
        });
        
        // Nettoyage de l'interface
        resultPreview.classList.add('hidden');
        movieTitleInput.value = '';
        window.renderHistory();
        alert(`"${title}" ajouté au journal !`);
    } catch (e) {
        console.error("Erreur Firestore : ", e);
        alert("Erreur lors de la sauvegarde.");
    }
};

// --- FONCTIONS DE L'INTERFACE (HISTORIQUE) ---

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
    
    listContainer.innerHTML = history.filter(m => !m.done).map(movie => `
        <div class="movie-item">
            <input type="checkbox" onclick="toggleMovie(${movie.id})" style="transform:scale(1.3);">
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <p>${movie.director}</p>
            </div>
            <button onclick="deleteMovie(${movie.id})" style="color:#ff4d4d;">✕</button>
        </div>
    `).reverse().join('');

    const filteredDone = history.filter(m => {
        return m.done && (m.title.toLowerCase().includes(searchQuery) || m.director.toLowerCase().includes(searchQuery));
    });

    doneContainer.innerHTML = filteredDone.map(movie => `
        <div class="movie-item finished">
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <p>${movie.director} • Le ${movie.date}</p>
            </div>
            <button onclick="deleteMovie(${movie.id})" style="color:#ff4d4d;">✕</button>
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
    if(!confirm("Supprimer ce film ?")) return;
    let history = JSON.parse(localStorage.getItem('movieHistory'));
    history = history.filter(m => m.id !== id);
    localStorage.setItem('movieHistory', JSON.stringify(history));
    window.renderHistory();
};

window.renderHistory();