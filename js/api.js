const API_URL = "https://superflixapi.pro";

async function getMovies() {
    const response = await fetch(
        `${API_URL}/lista?category=filme&type=tmdb&format=json`
    );

    const ids = await response.json();

    return ids;
}
