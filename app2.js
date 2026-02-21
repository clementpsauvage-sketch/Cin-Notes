const API_KEY = CONFIG.API_KEY; 
const BASE_URL = 'https://api.themoviedb.org/3';

const movieForm = document.getElementById('movie-form');
const movieTitleInput = document.getElementById('movie-title');
const resultPreview = document.getElementById('result-preview');
const directorNameSpan = document.getElementById('director-name');
const saveMovieBtn = document.getElementById('save-movie');
const listContainer = document.getElementById('list-container');
const doneContainer = document.getElementById('done-container');

let currentMovie = null;



// Navigation entre les pages
window.showPage = (pageId) => {
    document.getElementById('page-add').classList.toggle('hidden', pageId !== 'add');
    document.getElementById('page-history').classList.toggle('hidden', pageId !== 'history');
    
    // Style des boutons
    document.getElementById('btn-nav-add').classList.toggle('active', pageId === 'add');
    document.getElementById('btn-nav-history').classList.toggle('active', pageId === 'history');
    
    renderHistory();
};

// Recherche API TMDB
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

saveMovieBtn.addEventListener('click', () => {
    if (!currentMovie) return;
    const history = JSON.parse(localStorage.getItem('movieHistory')) || [];
    history.push(currentMovie);
    localStorage.setItem('movieHistory', JSON.stringify(history));
    // --- AJOUT POUR WEBPUSHR ---
    if (typeof webpushr !== 'undefined') {
        // On envoie la date actuelle à Webpushr
        // Format YYYY-MM-DD pour que Webpushr puisse l'utiliser facilement
        const today = new Date().toISOString().split('T')[0];
        webpushr('attributes', { "dernier_ajout": today });
        console.log("Attribut envoyé à Webpushr :", today);
    }
    // ---------------------------
    resultPreview.classList.add('hidden');
    movieTitleInput.value = '';
    renderHistory();
});

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('movieHistory')) || [];
    const searchQuery = document.getElementById('search-history').value.toLowerCase();
    
    // Affichage "À voir"
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

    // Affichage "Historique" avec recherche
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
}

window.toggleMovie = (id) => {
    let history = JSON.parse(localStorage.getItem('movieHistory'));
    history = history.map(m => m.id === id ? { ...m, done: true, date: new Date().toLocaleDateString('fr-FR') } : m);
    localStorage.setItem('movieHistory', JSON.stringify(history));
    renderHistory();
};

window.deleteMovie = (id) => {
    let history = JSON.parse(localStorage.getItem('movieHistory'));
    history = history.filter(m => m.id !== id);
    localStorage.setItem('movieHistory', JSON.stringify(history));
    renderHistory();
};

renderHistory();