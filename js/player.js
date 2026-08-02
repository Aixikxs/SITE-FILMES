const params = new URLSearchParams(window.location.search);

const id = params.get("id");
const type = params.get("type") || "filme";

const playerWrapper = document.getElementById("playerWrapper");
const playerTitle = document.getElementById("playerTitle");
const infoTitle = document.getElementById("infoTitle");
const infoDescription = document.getElementById("infoDescription");

async function loadPlayer() {
    if (!id) {
        playerWrapper.innerHTML = "<h2>Filme não encontrado.</h2>";
        return;
    }

    try {
        const data = await getMovie(id);

        playerTitle.textContent = data.title || "Filme";
        infoTitle.textContent = data.title || "Filme";
        infoDescription.textContent = data.overview || data.synopsis || "";

        playerWrapper.innerHTML = `
            <iframe
                src="https://superflixapi.pro/filme/${id}"
                allow="autoplay *; encrypted-media *; picture-in-picture *; fullscreen *; clipboard-write *; accelerometer *; gyroscope *"
                allowfullscreen
                webkitallowfullscreen
                mozallowfullscreen
                frameborder="0"
                scrolling="no"
                style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px;">
            </iframe>
        `;
    } catch (e) {
        console.error(e);
        playerWrapper.innerHTML = "<h2>Erro ao carregar o player.</h2>";
    }
}

loadPlayer();
