// ============================================
// SITEFLIX - API MODULE
// Gerencia requisições para SuperFlix API
// ============================================

const API = {
    baseURL: 'https://superflixapi.pro',
    cache: new Map(),
    cacheTimeout: 5 * 60 * 1000, // 5 minutos

    /**
     * Faz requisição à API com cache
     */
    async fetch(endpoint) {
        try {
            // Verifica cache
            if (this.cache.has(endpoint)) {
                const cached = this.cache.get(endpoint);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            const response = await fetch(`${this.baseURL}${endpoint}`);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            
            // Armazena em cache
            this.cache.set(endpoint, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('API Error:', error);
            return null;
        }
    },

    /**
     * Busca filme por ID
     */
    async getMovie(id) {
        return await this.fetch(`/filme/${id}`);
    },

    /**
     * Busca série por ID
     */
    async getSeries(id) {
        return await this.fetch(`/serie/${id}`);
    },

    /**
     * Busca episódio específico
     */
    async getEpisode(seriesId, season, episode) {
        return await this.fetch(`/serie/${seriesId}/${season}/${episode}`);
    },

    /**
     * Busca listagem de filmes
     */
    async getMoviesList(page = 1, limit = 20) {
        return await this.fetch(`/filmes?page=${page}&limit=${limit}`);
    },

    /**
     * Busca listagem de séries
     */
    async getSeriesList(page = 1, limit = 20) {
        return await this.fetch(`/series?page=${page}&limit=${limit}`);
    },

    /**
     * Busca conteúdo em destaque
     */
    async getTrending() {
        return await this.fetch('/trending');
    },

    /**
     * Busca por termo
     */
    async search(query) {
        if (!query || query.length < 2) return [];
        return await this.fetch(`/search?q=${encodeURIComponent(query)}`);
    },

    /**
     * Gera URL do player
     */
    getPlayerUrl(type, id, season = null, episode = null) {
        if (type === 'movie') {
            return `${this.baseURL}/filme/${id}`;
        } else if (type === 'series') {
            if (season && episode) {
                return `${this.baseURL}/serie/${id}/${season}/${episode}`;
            }
            return `${this.baseURL}/serie/${id}`;
        }
        return null;
    }
};

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
