// ============================================
// SITEFLIX - HOME PAGE
// Página inicial com conteúdo em destaque
// ============================================

let currentPage = 1;
let isLoading = false;

document.addEventListener('DOMContentLoaded', async () => {
    await loadTrendingContent();
    await loadMoviesContent();
    await loadSeriesContent();
    setupEventListeners();
});

/**
 * Carrega conteúdo em destaque
 */
async function loadTrendingContent() {
    const container = document.getElementById('trendingContainer');
    if (!container) return;

    // Mostra skeletons
    for (let i = 0; i < 6; i++) {
        container.appendChild(UI.createSkeleton());
    }

    const data = await API.getTrending();
    
    container.innerHTML = '';

    if (data && data.results) {
        UI.renderCards(data.results.slice(0, 6), container);
    } else {
        container.innerHTML = '<p style="color: #b0b0b0; text-align: center; padding: 40px;">Erro ao carregar conteúdo em destaque</p>';
    }
}

/**
 * Carrega filmes populares
 */
async function loadMoviesContent() {
    const container = document.getElementById('moviesContainer');
    if (!container) return;

    // Mostra skeletons
    for (let i = 0; i < 8; i++) {
        container.appendChild(UI.createSkeleton());
    }

    const data = await API.getMoviesList(1, 8);
    
    container.innerHTML = '';

    if (data && data.results) {
        const movies = data.results.map(movie => ({
            ...movie,
            type: 'movie'
        }));
        UI.renderCards(movies, container);
    } else {
        container.innerHTML = '<p style="color: #b0b0b0;">Erro ao carregar filmes</p>';
    }
}

/**
 * Carrega séries populares
 */
async function loadSeriesContent() {
    const container = document.getElementById('seriesContainer');
    if (!container) return;

    // Mostra skeletons
    for (let i = 0; i < 8; i++) {
        container.appendChild(UI.createSkeleton());
    }

    const data = await API.getSeriesList(1, 8);
    
    container.innerHTML = '';

    if (data && data.results) {
        const series = data.results.map(s => ({
            ...s,
            type: 'series'
        }));
        UI.renderCards(series, container);
    } else {
        container.innerHTML = '<p style="color: #b0b0b0;">Erro ao carregar séries</p>';
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // View all links
    const viewAllButtons = document.querySelectorAll('.view-all-link');
    viewAllButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const type = btn.dataset.type || 'all';
            window.location.href = `browse.html?type=${type}`;
        });
    });
}

/**
 * Handle busca
 */
async function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();

    if (!query) return;

    const results = await API.search(query);
    
    if (results && results.length > 0) {
        // Redireciona com resultados
        sessionStorage.setItem('searchResults', JSON.stringify(results));
        sessionStorage.setItem('searchQuery', query);
        window.location.href = 'browse.html?search=true';
    } else {
        alert('Nenhum resultado encontrado');
    }
}
