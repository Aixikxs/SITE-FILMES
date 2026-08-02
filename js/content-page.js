document.addEventListener("DOMContentLoaded", async () => {
    const grid = document.getElementById("moviesGrid");

    if (!grid) return;

    grid.innerHTML = "<h2>Carregando filmes...</h2>";

    try {
        const ids = await getMovies();

        grid.innerHTML = "";

        for (const id of ids.slice(0, 24)) {
            const movie = await getMovie(id);

            const card = document.createElement("div");
            card.className = "movie-card";

            card.innerHTML = `
                <img src="${movie.poster}" alt="${movie.title}">
                <div class="movie-info">
                    <h3>${movie.title}</h3>
                    <p>${movie.year ?? ""}</p>
                </div>
            `;

            card.onclick = () => {
                window.location.href = `player.html?id=${id}&type=filme`;
            };

            grid.appendChild(card);
        }

    } catch (e) {
        console.error(e);
        grid.innerHTML = "<h2>Erro ao carregar os filmes.</h2>";
    }
});
