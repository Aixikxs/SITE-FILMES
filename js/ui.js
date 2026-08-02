// ============================================
// SITEFLIX - UI MODULE
// Gerencia interações com a interface
// ============================================

const UI = {
    /**
     * Cria um card de conteúdo
     */
    createCard(item) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = item.id;
        card.dataset.type = item.type || 'movie';

        const isFavorite = STORAGE.isFavorite(item.id);

        card.innerHTML = `
            <img src="${item.poster || 'https://via.placeholder.com/200x300?text=No+Image'}" 
                 alt="${item.title}" 
                 class="card-image"
                 loading="lazy">
            <div class="card-content">
                <h3 class="card-title">${item.title}</h3>
                <div class="card-info">
                    <span class="card-rating">⭐ ${(item.rating || 0).toFixed(1)}</span>
                    <span>${item.year || 'N/A'}</span>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn btn-play" title="Assistir">
                        ▶ Assistir
                    </button>
                    <button class="card-action-btn btn-fav" title="Favoritar">
                        ${isFavorite ? '❤️' : '🤍'} Fav
                    </button>
                </div>
            </div>
        `;

        // Event listeners
        card.querySelector('.btn-play').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openPlayer(item);
        });

        card.querySelector('.btn-fav').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(item, card);
        });

        return card;
    },

    /**
     * Abre o player para um item
     */
    openPlayer(item) {
        const url = API.getPlayerUrl(item.type || 'movie', item.id);
        if (url) {
            window.location.href = `player.html?id=${item.id}&type=${item.type || 'movie'}`;
        }
    },

    /**
     * Toggle favorito
     */
    toggleFavorite(item, cardElement) {
        const isFavorite = STORAGE.isFavorite(item.id);
        
        if (isFavorite) {
            STORAGE.removeFavorite(item.id);
        } else {
            STORAGE.addFavorite(item.id, {
                title: item.title,
                poster: item.poster,
                type: item.type || 'movie'
            });
        }

        // Atualiza o botão
        const favBtn = cardElement.querySelector('.btn-fav');
        const isFavNow = STORAGE.isFavorite(item.id);
        favBtn.textContent = isFavNow ? '❤️ Fav' : '🤍 Fav';
    },

    /**
     * Cria modal de detalhes
     */
    createModal(item) {
        const modal = document.getElementById('detailsModal');
        const modalBody = document.getElementById('modalBody');
        const isFavorite = STORAGE.isFavorite(item.id);

        modalBody.innerHTML = `
            <div style="padding: 30px;">
                <div style="display: flex; gap: 30px; margin-bottom: 30px;">
                    <img src="${item.poster || 'https://via.placeholder.com/200x300?text=No+Image'}" 
                         alt="${item.title}"
                         style="width: 200px; height: 300px; object-fit: cover; border-radius: 12px; box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);">
                    <div style="flex: 1;">
                        <h2 style="font-size: 28px; margin-bottom: 10px; color: #00d4ff;">${item.title}</h2>
                        <div style="display: flex; gap: 20px; margin-bottom: 20px; color: #b0b0b0;">
                            <span>⭐ ${(item.rating || 0).toFixed(1)}/10</span>
                            <span>📅 ${item.year || 'N/A'}</span>
                            <span>${item.type === 'series' ? '📺 Série' : '🎬 Filme'}</span>
                        </div>
                        <p style="color: #b0b0b0; line-height: 1.6; margin-bottom: 20px;">${item.description || 'Sem descrição disponível'}</p>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" onclick="UI.openPlayer(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                                ▶ Assistir Agora
                            </button>
                            <button class="btn btn-secondary" onclick="UI.toggleFavoriteFromModal('${item.id}', ${JSON.stringify(item).replace(/"/g, '&quot;')})">
                                ${isFavorite ? '❤️' : '🤍'} Favoritar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('active');
        STORAGE.addToHistory(item.id, {
            title: item.title,
            poster: item.poster,
            type: item.type || 'movie'
        });
    },

    /**
     * Toggle favorito do modal
     */
    toggleFavoriteFromModal(id, item) {
        const isFavorite = STORAGE.isFavorite(id);
        
        if (isFavorite) {
            STORAGE.removeFavorite(id);
        } else {
            STORAGE.addFavorite(id, {
                title: item.title,
                poster: item.poster,
                type: item.type || 'movie'
            });
        }

        // Atualiza o botão
        const modal = document.getElementById('detailsModal');
        const buttons = modal.querySelectorAll('.btn-secondary');
        buttons.forEach(btn => {
            btn.textContent = STORAGE.isFavorite(id) ? '❤️ Favoritar' : '🤍 Favoritar';
        });
    },

    /**
     * Mostra skeleton loader
     */
    createSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'card skeleton';
        return skeleton;
    },

    /**
     * Renderiza cards em um container
     */
    renderCards(items, container, replace = false) {
        if (replace) {
            container.innerHTML = '';
        }

        items.forEach(item => {
            const card = this.createCard(item);
            container.appendChild(card);
        });
    }
};

// Event listeners globais
document.addEventListener('DOMContentLoaded', () => {
    // Fechar modal
    const modal = document.getElementById('detailsModal');
    const modalClose = document.getElementById('modalClose');
    
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    // Navegação Sidebar
    const menuToggle = document.getElementById('menuToggle');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    if (closeSidebar && sidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }

    // Fechar sidebar ao clicar em um link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (sidebar) {
                sidebar.classList.remove('active');
            }
        });
    });

    // Theme toggle (placeholder)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }
});
