let bollardIsPlaced;
let newBollardTileId = null;
const BOLLARDS = {};
function placeBollard(playerId, tile) {
    newBollardTileId = tile.id;
    const bollard    = document.createElement("div");
    bollard.classList.add("bollard", "player" + playerId);
    bollard.id = "bollard" + tile.id;
    bollard.dataset.turnsLeft = "3";

    BOLLARDS[tile.id] = bollard;
    board.appendChild(bollard);
    bollard.style.left = tile.style.left;
    bollard.style.top  = tile.style.top;

    tile.classList.add("blocked");
    tile.classList.remove("destination");
    player.removeBlockedPaths(tile);
    bollardIsPlaced?.(); // Resolving a promise waiting for bollard placement
}

function removeBollard(id) {
    const bollard = BOLLARDS[id];
    delete BOLLARDS[id];
    board.removeChild(bollard);
    TILES[id].classList.remove("blocked");
}

function updateBollards() {
    newBollardTileId = null; // This function is called at the beginning of a new turn so this fits here
    for(const id in BOLLARDS) {
        const bollard = BOLLARDS[id];
        if(isPlayerTurn() + bollard.classList.contains("player" + player.id) == 1) continue;
        // ^^^ At the start of MY turn (when this runs) YOUR turn has ended so MY bollards tick down.

        const turnsLeft = bollard.dataset.turnsLeft - 1;
        bollard.dataset.turnsLeft = "" + turnsLeft;
        if(!turnsLeft) removeBollard(id);
    }
}

class Effect {
    constructor(name, effect, descr, canRespond = (effectName) => false) {
        this.name       = name;
        this.effect     = effect;
        this.canRespond = canRespond;

        this.card = document.createElement("div");
        this.card.classList.add("secret", "card");
        this.card.dataset.isVisible = true;
        this.card.innerHTML = `<span class = "secret-name">${name}</span>
            <p class = "secret-description">${descr}</p>`;
    }

    getCard() { return this.card.cloneNode(true); }
}

let canPlaceBollard   = false;
let forcedRoll1Turns  = 0;
const SECRETS = {
    Bollard: new Effect("Bollard",
        async (sender, receiver) => {
            if(!isPlayerTurn()) return;

            canPlaceBollard = true;
            await new Promise(success => bollardIsPlaced = success);
        },
        "Place a barrier on any tile, blocking the opponent from crossing for 3 of their turns."),
    
    Load: new Effect("Load",
        (sender, receiver) => forcedRoll1Turns = 3 * !isPlayerTurn(),
        "Force next 3 opponent rolls to be a 1."),
    
    Heal: new Effect("Heal",
        (sender, receives) => sender.heal(1),
        "Gain +1 HP.", (effectName) => effectName === "Damage"),
    
    Damage: new Effect("Damage",
        (sender, receiver) => receiver.heal(-1),
        "Inflict -1 HP on opponent."),

    Trap: new Effect("Trap",
        (sender, receiver) => receiver.isTrapped = true,
        "Force opponent to skip a turn."),

    Bail: new Effect("Bail",
        (sender, receiver) => sender.isTrapped = false,
        "Escape entrapment.", (effectName) => effectName === "Trap"),
};
const SECRETS_AMT = Object.keys(SECRETS).length;

function getRandomSecret() {
    return Object.values(SECRETS)[getRandomIndex(SECRETS_AMT)];
}

// Actions
function onPapercutAction() {
    const availableSecretIds = [];
    player.secrets.forEach((secret, i) => {
        if(secret) availableSecretIds.push(i);
    });

    if(availableSecretIds) player.removeSecret(
        availableSecretIds[getRandomIndex(availableSecretIds.length)]);
}

const ACTIONS = {
    Heal: SECRETS.Heal,
    Damage: new Effect("Damage",
        () => player.heal(-1),
        "Lose 1 HP."),

    Trap: new Effect("Trap",
        () => player.isTrapped = true,
        "Skip a turn."),

    Nothing: new Effect("Nothing", () => {}, "Nothing happens."),
    Papercut: new Effect("Papercut", onPapercutAction, "Lose 1 secret at random."),
}
const ACTIONS_AMT = Object.keys(ACTIONS).length;

function getRandomAction() {
    return Object.values(ACTIONS)[getRandomIndex(ACTIONS_AMT)];
}

function displayActionCard(card) {
    const banner = document.createElement("div");
    banner.classList.add("banner", "action");
    banner.appendChild(card);
    document.body.appendChild(banner);
}