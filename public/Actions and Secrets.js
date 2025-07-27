const BOLLARDS      = {};
let canPlaceBollard = false;
function placeBollard(tile) {
    const bollard     = document.createElement("div");
    bollard.className = "bollard";
    bollard.id = "bollard" + tile.id;
    bollard.dataset.turnsLeft = "3";

    BOLLARDS[tile.id] = bollard;
    board.appendChild(bollard);
    bollard.style.left = tile.style.left;
    bollard.style.top  = tile.style.top;

    tile.classList.add("blocked");
}

function removeBollard(id) {
    const bollard = BOLLARDS[id];
    delete BOLLARDS[id];
    board.removeChild(bollard);
    TILES[id].classList.remove("blocked");
}

function updateBollards() {
    for(const id in BOLLARDS) {
        const bollard = BOLLARDS[id];
        const turnsLeft = bollard.dataset.turnsLeft - 1;
        bollard.dataset.turnsLeft = "" + turnsLeft;
        if(!turnsLeft) removeBollard(id);
    }
}

class Secret {
    constructor(name, effect, descr) {
        this.name   = name;
        this.effect = effect;

        this.card = document.createElement("div");
        this.card.classList.add("secret", "card");
        this.card.dataset.isVisible = true;
        this.card.innerHTML = `<span class = "secret-name">${name}</span>
            <p class = "secret-description">${descr}</p>`;
    }

    getCard() { return this.card.cloneNode(true); }
}

const SECRETS = {
    Bollard: new Secret("Bollard",
        () => canPlaceBollard = true,
        "Place a barrier on any tile which lasts for 3 turns and cannot be crossed."),
};
const SECRETS_AMT = Object.keys(SECRETS).length;

function getRandomSecret() {
    return Object.values(SECRETS)[Math.floor(Math.random() * SECRETS_AMT)];
}