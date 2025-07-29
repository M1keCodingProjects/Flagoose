const BOLLARDS      = {};
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

    react(incomingEffectName) {
        if(this.canRespond(incomingEffectName)) this.effect();
    }
}

let canPlaceBollard   = false;
let forcedRoll1Turns  = 0;
const SECRETS = {
    Bollard: new Effect("Bollard",
        () => canPlaceBollard = true,
        "Place a barrier on any tile which lasts for 3 turns and cannot be crossed."),
    
    Load: new Effect("Load",
        () => forcedRoll1Turns = 3,
        "Force next 3 opponent rolls to be a 1."),
    
    Heal: new Effect("Heal",
        () => player.heal(1),
        "Gain +1 HP.", (effectName) => effectName === "Damage"),
    
    Damage: new Effect("Damage",
        () => player.heal(-1),
        "Inflict -1 HP on opponent."),

    Trap: new Effect("Trap",
        () => player.isTrapped = true,
        "Force opponent to skip a turn."),

    Bail: new Effect("Bail",
        () => player.isTrapped = false,
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
        SECRETS.Damage.effect,
        "Lose 1 HP."),

    Trap: new Effect("Trap",
        SECRETS.Trap.effect,
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