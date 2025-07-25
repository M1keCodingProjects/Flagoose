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
        
        const infoCard    = document.getElementById(className + "-info");
        infoCard.username = infoCard.getElementsByClassName("username")[0];
        infoCard.hpBar    = infoCard.getElementsByClassName("hp-bar")[0];
        infoCard.secrets  = infoCard.getElementsByClassName("secrets")[0];

        infoCard.username.textContent = username;

        this.spawnTile = isPlayer1 ? p1Start : p2Start;
    }

    moveToSpawn() {
        this.moveToTile(this.spawnTile);
        this.currentTile = this.spawnTile;
    }

    reset() {
        this.moveToSpawn();
        this.hp = 5;
        this.setOpacity(1);
    }

    setOpacity(amt) { this.sprite.style.opacity = amt; }

    moveToTile(tile) {
        this.sprite.style.left = tile.style.left;
        this.sprite.style.top  = tile.style.top;
    }

    addDestination(tile, path) {
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
        if(neigh === prevTile) continue;

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