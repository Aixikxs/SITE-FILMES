// ============================================
// SITEFLIX - PLAYER PAGE
// Página do player de vídeos
// ============================================

let currentItem = null;
let currentEpisode = null;

document.addEventListener('DOMContentLoaded', () => {
    initializePlayer();
    setupEventListeners();
});

/**
 * Inicializa o player
 */
async function initializePlayer() {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('id');
    const itemType = params.get('type') || 'movie';

    if (!itemId) {
        window.location.href = 'index.html';
        return;
    }

    // Carrega informações do item
    let data;
    if (itemType === 'series') {
        data = await API.getSeries(itemId);
    } else {
        data = await API.getMovie(itemId);
    }

    if (!data) {
        document.body.innerHTML = '<p style="color: red; text-align: center; padding: 40px;">Erro ao carregar conteúdo</p>';
        return;
    }

    currentItem = {
        ...data,
        type: itemType,
        id: itemId
    };

    renderPlayerPage();
    loadEpisodes();
}

/**
 * Renderiza a página do player
 */
function renderPlayerPage() {
    const title = document.getElementById('playerTitle');
    const playerContainer = document.getElementById('playerContainer');
    const infoSection = document.getElementById('playerInfo');

    if (title) {
        title.textContent = currentItem.title || currentItem.name;
    }

    // Renderiza o player
    if (playerContainer) {
        const playerUrl = API.getPlayerUrl(currentItem.type, currentItem.id);
        playerContainer.innerHTML = `
            <div class="player-wrapper">
                <iframe src="${playerUrl}" allowfullscreen></iframe>
            </div>
        `;
    }

    // Renderiza informações
    if (infoSection) {
        const isFavorite = STORAGE.isFavorite(currentItem.id);
        infoSection.innerHTML = `
            <div class="info-header">
                <h2 class="info-title">${currentItem.title || currentItem.name}</h2>
                <button class="btn-favorite ${isFavorite ? 'favorited' : ''}" onclick="toggleFavorite()">
                    ${isFavorite ? '❤️' : '🤍'} Favoritar
                </button>
            </div>
            <p class="info-description">${currentItem.overview || 'Sem descrição disponível'}</p>
            <div style="display: flex; gap: 20px; color: #b0b0b0; margin-bottom: 20px;">
                <span>⭐ ${(currentItem.vote_average || 0).toFixed(1)}/10</span>
                <span>📅 ${currentItem.release_date?.split('-')[0] || currentItem.first_air_date?.split('-')[0] || 'N/A'}</span>
                <span>${currentItem.type === 'series' ? '📺 Série' : '🎬 Filme'}</span>
            </div>
        `;
    }

    // Registra no histórico
    STORAGE.addToHistory(currentItem.id, {
        title: currentItem.title || currentItem.name,
        poster: currentItem.poster_path,
        type: currentItem.type
    });
}

/**
 * Carrega episódios (se for série)
 */
async function loadEpisodes() {
    if (currentItem.type !== 'series' || !currentItem.seasons) {
        return;
    }

    const episodesSection = document.getElementById('episodesSection');
    if (!episodesSection) return;

    episodesSection.innerHTML = `
        <h3>Episódios</h3>
        <div class="episodes-list">
            ${currentItem.seasons.map((season, idx) => `
                <div class="episode-item" onclick="selectEpisode(${idx}, 1)">
                    <div class="episode-number">Temporada ${idx + 1}</div>
                    <div class="episode-title">${season.episode_count} episódios</div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Seleciona episódio
 */
async function selectEpisode(season, episode) {
    currentEpisode = { season: season + 1, episode };
    
    const playerContainer = document.getElementById('playerContainer');
    const playerUrl = API.getPlayerUrl(currentItem.type, currentItem.id, season + 1, episode);
    
    if (playerContainer) {
        playerContainer.innerHTML = `
            <div class="player-wrapper">
                <iframe src="${playerUrl}" allowfullscreen></iframe>
            </div>
        `;
    }

    // Atualiza episódio ativo
    document.querySelectorAll('.episode-item').forEach((el, idx) => {
        el.classList.remove('active');
        if (idx === season) {
            el.classList.add('active');
        }
    });
}

/**
 * Toggle favorito
 */
function toggleFavorite() {
    const isFavorite = STORAGE.isFavorite(currentItem.id);
    
    if (isFavorite) {
        STORAGE.removeFavorite(currentItem.id);
    } else {
        STORAGE.addFavorite(currentItem.id, {
            title: currentItem.title || currentItem.name,
            poster: currentItem.poster_path,
            type: currentItem.type
        });
    }

    // Atualiza botão
    const btn = document.querySelector('.btn-favorite');
    if (btn) {
        const isFavNow = STORAGE.isFavorite(currentItem.id);
        btn.classList.toggle('favorited');
        btn.textContent = isFavNow ? '❤️ Favoritar' : '🤍 Favoritar';
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }
}
