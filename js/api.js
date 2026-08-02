const API_URL = "https://superflixapi.pro";

async function api(path) {
    const response = await fetch(`${API_URL}${path}`);

    if (!response.ok) {
        throw new Error("Erro na API");
    }

    return await response.json();
}

// Lista de filmes
async function getMovies() {
    return await api("/lista?category=filme&type=tmdb&format=json");
}

// Informações de um filme
async function getMovie(id) {
    return await api(`/filme/${id}`);
}

// Lista de séries
async function getSeries() {
    return await api("/lista?category=serie&type=tmdb&format=json");
}

// Informações da série
async function getSerie(id) {
    return await api(`/serie/${id}`);
}

// Lista de animes
async function getAnimes() {
    return await api("/lista?category=anime&type=tmdb&format=json");
}

// Informações do anime
async function getAnime(id) {
    return await api(`/anime/${id}`);
}
