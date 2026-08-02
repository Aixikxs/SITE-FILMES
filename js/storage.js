// ============================================
// SITEFLIX - STORAGE MODULE
// Gerencia localStorage para favoritos e histórico
// ============================================

const STORAGE = {
    FAVORITES_KEY: 'siteflix_favorites',
    HISTORY_KEY: 'siteflix_history',
    MAX_HISTORY: 50,

    /**
     * Adiciona item aos favoritos
     */
    addFavorite(id, data) {
        const favorites = this.getFavorites();
        
        if (!favorites.find(f => f.id === id)) {
            favorites.push({
                id,
                ...data,
                addedAt: new Date().toISOString()
            });
            localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
            this.dispatchEvent('favoriteAdded', { id, data });
            return true;
        }
        return false;
    },

    /**
     * Remove item dos favoritos
     */
    removeFavorite(id) {
        let favorites = this.getFavorites();
        favorites = favorites.filter(f => f.id !== id);
        localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
        this.dispatchEvent('favoriteRemoved', { id });
        return true;
    },

    /**
     * Obtém todos os favoritos
     */
    getFavorites() {
        try {
            const data = localStorage.getItem(this.FAVORITES_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Erro ao obter favoritos:', error);
            return [];
        }
    },

    /**
     * Verifica se item é favorito
     */
    isFavorite(id) {
        return this.getFavorites().some(f => f.id === id);
    },

    /**
     * Adiciona item ao histórico
     */
    addToHistory(id, data) {
        const history = this.getHistory();
        
        // Remove item se já existe para evitar duplicatas
        const filtered = history.filter(h => h.id !== id);
        
        // Adiciona no início
        filtered.unshift({
            id,
            ...data,
            watchedAt: new Date().toISOString()
        });

        // Limita ao máximo
        if (filtered.length > this.MAX_HISTORY) {
            filtered.pop();
        }

        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(filtered));
        this.dispatchEvent('historyAdded', { id, data });
    },

    /**
     * Obtém histórico de visualização
     */
    getHistory() {
        try {
            const data = localStorage.getItem(this.HISTORY_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Erro ao obter histórico:', error);
            return [];
        }
    },

    /**
     * Limpa o histórico
     */
    clearHistory() {
        localStorage.removeItem(this.HISTORY_KEY);
        this.dispatchEvent('historyCleared');
    },

    /**
     * Dispara evento customizado
     */
    dispatchEvent(eventName, detail) {
        window.dispatchEvent(new CustomEvent(`storage:${eventName}`, { detail }));
    }
};

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
    module.exports = STORAGE;
}
