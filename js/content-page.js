document.addEventListener("DOMContentLoaded", async () => {
    const grid = document.getElementById("moviesGrid");

    if (!grid) return;

    const ids = await getMovies();

    for (const id of ids.slice(0, 20)) {
        const movie = await getMovie(id);

        const card = document.createElement("div");

        card.innerHTML = `
            <h3>${movie.title || "Filme"}</h3>
            <p>ID: ${id}</p>
        `;

        grid.appendChild(card);
    }
});
