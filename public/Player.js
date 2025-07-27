async function sleep(ms) { await new Promise(success => setTimeout(success, ms)); }

class Player {
    constructor(isPlayer1, username) {
        this.id      = 1 + !isPlayer1;
        this.hp      = 5;
        this.secrets = [];
        this.flags   = 0;
        
        const className = "player" + this.id;
        this.sprite = document.createElement("div");
        this.sprite.id = className + "-sprite";
        this.sprite.classList.add(className, "sprite");
        board.appendChild(this.sprite);
        
        this.infoCard          = document.getElementById(className + "-info");
        this.infoCard.username = this.infoCard.getElementsByClassName("username")[0];
        this.infoCard.hpBar    = this.infoCard.getElementsByClassName("hp-bar")[0];
        this.infoCard.secrets  = this.infoCard.getElementsByClassName("secrets")[0];
        this.infoCard.username.textContent = username;

        this.spawnTile = isPlayer1 ? p1Start : p2Start;
    }

    moveToSpawn() {
        this.moveToTile(this.spawnTile);
        this.currentTile = this.spawnTile;
    }

    reset() {
        this.moveToSpawn();
        this.heal(5);
        this.setOpacity(1);
    }

    sync({hp, secretsNames}) {
        this.hp = hp;
        this.infoCard.hpBar.style.setProperty("--hp", this.hp);

        secretsNames.forEach((secretName, i) => this.getNewSecret(SECRETS[secretName], i));
    }

    getNewSecret(secret, pos = this.secrets.length) {
        if(this.secrets.length >= 3) return;

        this.secrets[pos] = secret;
        this.infoCard.secrets.children[pos].innerHTML = secret.getCard().outerHTML;
    }

    heal(amt) {
        this.hp = Math.min(Math.max(this.hp + amt, 0), 5);
        this.infoCard.hpBar.style.setProperty("--hp", this.hp);
    }
    
    setOpacity(amt) { this.sprite.style.opacity = amt; }

    moveToTile(tile) {
        this.sprite.style.left = tile.style.left;
        this.sprite.style.top  = tile.style.top;
    }

    addDestination(tile, path) {
        if(tile.classList.contains("blocked")) return; // Extra protection, probably not needed

        tile.classList.add("destination");
        this.paths[tile.id] = path;

        if(areOverlapping(this.sprite, tile)) this.setOpacity(0.5);
        if(areOverlapping(this.opponent.sprite, tile)) this.opponent.setOpacity(0.5);
    }

    computeMoves(roll) {
        this.paths = {};
        setDestinations(this.currentTile, roll);
    }

    get hasFlag() { return this.sprite.classList.contains("holding-flag"); }

    // TODO: this has nothing to do with the player
    passFlag(fromNode, toNode) {
        fromNode.classList.remove("holding-flag");
        toNode.classList.add("holding-flag");
    }

    async moveSprite(path) {
        this.setOpacity(1);
        this.opponent.setOpacity(1);
        this.moveToTile(path[0]);
        for(let i = 1; i < path.length; i++) {
            this.sprite.classList.remove('hop');
            void player.sprite.offsetWidth; // Force reflow
            this.sprite.classList.add('hop');
            this.moveToTile(path[i]);
            await sleep(300);
        }

        if(areOverlapping(this.sprite, this.opponent.sprite)) {
            this.setOpacity(0.5);
            this.opponent.setOpacity(0.5);
        }

        this.currentTile = path[path.length - 1];
        if(this.currentTile.classList.contains("holding-flag"))
            this.passFlag(this.currentTile, this.sprite);
        
        if(this.currentTile.classList.contains("player" + this.id) && this.hasFlag) {
            this.passFlag(this.sprite, this.currentTile);
            this.flags++; // + eventual ability and game end logic
        }
    }

    async goToDestination(destinationTile) {
        const path = this.paths[destinationTile.id];
        for(const destId in this.paths) {
            if(destId != destinationTile.id) TILES[destId].classList.remove("destination");
        }
        
        await this.moveSprite(path);
        destinationTile.classList.remove("destination");
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

let p1, p2, player;
function setupPlayers() {
    p1 = new Player(true, "P1");
    p2 = new Player(false, "P2");

    p1.opponent = p2;
    p2.opponent = p1;
}