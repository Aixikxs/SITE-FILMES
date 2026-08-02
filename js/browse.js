// ============================================
// SITEFLIX - BROWSE PAGE
// Página de navegação com filtros
// ============================================

let currentPage = 1;
let currentType = 'all';
let isLoading = false;
let hasMore = true;

document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    setupEventListeners();
});

/**
 * Inicializa a página
 */
async function initializePage() {
    // Verifica se há resultados de busca
    const searchResults = sessionStorage.getItem('searchResults');
    const searchQuery = sessionStorage.getItem('searchQuery');

    if (searchResults) {
        const results = JSON.parse(searchResults);
        const container = document.getElementById('contentGrid');
        container.innerHTML = '';
        
        const formattedResults = results.map(item => ({
            ...item,
            type: item.media_type || 'movie'
        }));
        
        UI.renderCards(formattedResults, container);
        sessionStorage.removeItem('searchResults');
        sessionStorage.removeItem('searchQuery');
    } else {
        // Verifica tipo de filtro na URL
        const params = new URLSearchParams(window.location.search);
        currentType = params.get('type') || 'all';
        
        await loadContent();
    }
}

/**
 * Carrega conteúdo com filtros
 */
async function loadContent() {
    if (isLoading || !hasMore) return;

    isLoading = true;
    const container = document.getElementById('contentGrid');

    // Mostra skeletons
    for (let i = 0; i < 12; i++) {
        container.appendChild(UI.createSkeleton());
    }

    let data;

    if (currentType === 'movies') {
        data = await API.getMoviesList(currentPage, 20);
    } else if (currentType === 'series') {
        data = await API.getSeriesList(currentPage, 20);
    } else {
        data = await API.getTrending();
    }

    // Remove skeletons
    const skeletons = container.querySelectorAll('.skeleton');
    skeletons.forEach(sk => sk.remove());

    if (data && data.results) {
        const items = data.results.map(item => ({
            ...item,
            type: item.media_type || currentType === 'series' ? 'series' : 'movie'
        }));

        if (currentPage === 1) {
            container.innerHTML = '';
        }

        UI.renderCards(items, container);
        
        hasMore = data.results.length === 20;
        currentPage++;
    }

    isLoading = false;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Filtro de tipo
    const typeSelect = document.getElementById('typeFilter');
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            currentType = e.target.value;
            currentPage = 1;
            hasMore = true;
            document.getElementById('contentGrid').innerHTML = '';
            loadContent();
        });
    }

    // Load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadContent);
    }

    // Filtro de gênero (placeholder)
    const genreSelect = document.getElementById('genreFilter');
    if (genreSelect) {
        genreSelect.addEventListener('change', (e) => {
            // Implementar filtro de gênero
            console.log('Filtro de gênero:', e.target.value);
        });
    }

    // Ordenação
    const sortSelect = document.getElementById('sortFilter');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            // Implementar ordenação
            console.log('Ordenação:', e.target.value);
        });
    }

    // Infinite scroll
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            if (!isLoading && hasMore) {
                loadContent();
            }
        }
    });
}