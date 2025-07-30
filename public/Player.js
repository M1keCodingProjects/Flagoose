async function sleep(ms) { await new Promise(success => setTimeout(success, ms)); }

class Player {
    constructor(isPlayer1, username, hero) {
        this.id = 1 + !isPlayer1;
        this.hp = 5;
        this.flags = 0;
        this.secrets = [null, null, null];
        this.ability = HEROS[hero];
        this.secretCards = [null, null, null];
        this.incomingEffectName = "";
        
        const className = "player" + this.id;
        this.sprite = document.createElement("div");
        this.sprite.id = className + "-sprite";
        this.sprite.classList.add(className, "sprite", hero);
        this.sprite.style.setProperty("background", `url(./assets/${hero}-${this.id}.svg)`);
        this.sprite.style.setProperty("background-size", "contain");
        this.sprite.style.setProperty("background-repeat", "no-repeat");
        board.appendChild(this.sprite);
        
        const infoCard = document.getElementById(className + "-info");
        this.username  = infoCard.getElementsByClassName("username")[0];
        this.hpBar     = infoCard.getElementsByClassName("hp-bar")[0];
        this.wonFlags  = [...infoCard.getElementsByClassName("flag-token")];
        this.secretsCardHolders = infoCard.getElementsByClassName("secrets")[0];
        this.username.textContent = username;

        this.proceedBtn = document.getElementById("proceed-btn-" + this.id); // click listener set by gm
        this.spawnTile  = isPlayer1 ? p1Start : p2Start;
        this.moveToSpawn(); // Redundant but sets currentTile early (needed for reset)
    }

    moveToSpawn() {
        this.moveToTile(this.spawnTile);
        this.currentTile = this.spawnTile;
    }

    reset() {
        if(this.hasFlag) passFlag(this.sprite, this.hasJustWon ? flagTile : this.currentTile);
        this.hasJustWon = false;
        this.isTrapped  = false;
        this.moveToSpawn();
        this.heal(5);
    }

    tryDie() {
        if(this.hp > 0) return;

        this.reset();
        this.removeSecret(0);
        this.removeSecret(1);
        this.removeSecret(2);
    }

    sync({hp, secretsNames, isTrapped}) {
        this.hp = hp;
        if(!hp) {
            this.tryDie();
            return;
        }

        this.hpBar.style.setProperty("--hp", this.hp);

        secretsNames.forEach((secretName, i) => {
            if(secretName) this.getNewSecret(SECRETS[secretName], i, false);
            else this.removeSecret(i);
        });

        this.isTrapped = isTrapped;
    }

    async setIncomingEffect() {
        let itWasAction = false;
        switch(this.currentTile.style.getPropertyValue("--type")) {
            case "heal":   this.incomingEffectName = "Heal";     break;
            case "damage": this.incomingEffectName = "Damage";   break;
            case "trap":   this.incomingEffectName = "Trap";     break;
            case "secret": this.getNewSecret(getRandomSecret()); break;
            case "action":
                itWasAction  = true;
                const action = getRandomAction();
                this.incomingEffectName = action.name;
                
                const card = action.getCard();
                displayActionCard(card);
                await new Promise(resolve => card.addEventListener("click", () => {
                    card.parentNode.remove();
                    resolve();
                }));
                break;
        }
        (itWasAction ? ACTIONS : SECRETS)[this.incomingEffectName]?.effect();

        let countResponses = 0;
        this.secrets.forEach((secret, i) => {
            if(!secret?.canRespond(this.incomingEffectName)) return;

            this.secretCards[i].classList.add("can-respond");
            countResponses++;
        });
        this.incomingEffectName = "";

        if(countResponses) this.proceedBtn.style.visibility = "visible";
        else this.proceedBtn.onclick();
    }

    proceed() {
        this.proceedBtn.style.visibility = "hidden";
        this.secretCards.forEach(card => card?.classList?.remove("can-respond"));
    }

    getNewSecret(secret, pos = this.secrets.indexOf(null), isVisible = true) {
        // length also counts nulls so this is the fastest way to say "all 3 exist":
        if(this.secrets[0] && this.secrets[1] && this.secrets[2]) return;
        if(this.secrets[pos]?.name === secret.name) return; // No change

        this.secrets[pos] = secret;
        const card = secret.getCard();
        card.dataset.isVisible = isVisible;
        if(isVisible) card.addEventListener("click", () => {
            if(!card.classList.contains("can-respond")) return;
            
            secret.effect();
            this.removeSecret(pos);

            this.proceedBtn.onclick();
        });

        this.secretCards[pos] = card;
        this.secretsCardHolders.children[pos].appendChild(card); // Should always be empty
    }

    removeSecret(pos) {
        if(!this.secrets[pos]) return;
        // This is also used to set to null synced secrets that may already be null (no change)

        this.secretCards[pos].remove();
        this.secretCards[pos] = null;
        this.secrets[pos]     = null;
    }

    // hp state can be invalid (0) through this method, it's intentional to allow responses after effects
    heal(amt) {
        this.hp = Math.min(Math.max(this.hp + amt, 0), 5);
        this.hpBar.style.setProperty("--hp", this.hp);
    }
    
    moveToTile(tile) {
        this.sprite.style.left = tile.style.left;
        this.sprite.style.top  = tile.style.top;
    }

    addDestination(tile, path) {
        if(tile.classList.contains("blocked")) return; // Extra protection, probably not needed

        tile.classList.add("destination");
        this.paths[tile.id] = path;
    }

    computeMoves(roll) {
        this.paths = {};
        setDestinations(this.currentTile, roll);
    }

    get hasFlag() { return this.sprite.classList.contains("holding-flag"); }

    async moveSprite(path) {
        this.moveToTile(path[0]);
        for(let i = 1; i < path.length; i++) {
            this.sprite.classList.remove('hop');
            void player.sprite.offsetWidth; // Force reflow
            this.sprite.classList.add('hop');
            this.moveToTile(path[i]);
            await sleep(300);
        }

        this.currentTile = path[path.length - 1];
        if(this.currentTile.classList.contains("holding-flag"))
            passFlag(this.currentTile, this.sprite);
        
        if(this.currentTile.classList.contains("player" + this.id) && this.hasFlag) {
            console.log("here", this);
            this.winGame();
            // + eventual ability and game end logic
        }
    }

    async goToDestination(destinationTile) {
        const path = this.paths[destinationTile.id];
        for(const destId in this.paths) {
            if(destId != destinationTile.id) TILES[destId].classList.remove("destination");
        }
        
        await this.moveSprite(path);
        destinationTile.classList.remove("destination");

        if(!this.hasJustWon) await this.setIncomingEffect();
    }

    winGame() {
        this.wonFlags[this.flags].classList.add("full");
        this.flags++;
        this.hasJustWon = true;
    }
}

// Traversal logic:
function setDestinations(currentTile, steps, prevTile = null, currentPath = []) {
    currentPath.push(currentTile);
    let isBranching    = currentTile.neighs.length > (2 - (prevTile === null));
    const pathInCommon = isBranching ? [...currentPath] : null;
    
    if(!steps) { // Going further would be wrong
        player.addDestination(currentTile, currentPath);
        return currentPath; // This will be a complete path
    }

    const paths = [];
    for(const neigh of currentTile.neighs) {
        if(neigh === prevTile || neigh.classList.contains("blocked")) continue;

        paths.push(setDestinations(neigh, steps - 1, currentTile, currentPath));
        if(isBranching) currentPath = [...pathInCommon];
    }

    return isBranching ? paths : paths[0];
}

const HEROS = {
    Ganjalf:   SECRETS.Bollard.effect,
    Babatunde: SECRETS.Load.effect,
};

let p1, p2, player;
function setupPlayers() {
    p1 = new Player(true, "P1", "Ganjalf");
    p2 = new Player(false, "P2", "Babatunde");

    p1.opponent = p2;
    p2.opponent = p1;
}