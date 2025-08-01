const client = io();

client.on("game-full", () => {
    document.body.innerHTML = "<div id = \"error-msg\">2 people are already playing. Wait your turn then refresh the page.</div>";
    throw new Error("Game is full");
});

client.on("opponent-disconnect", () => {
    if(matchEnded) return;

    document.body.innerHTML = "<div id = \"error-msg\">Your opponent disconnected. Game over.</div>";
    throw new Error("Opponent disconnected");
});

client.on("pick-hero", isPlayer1 => {
    gm.init();
    
    player   = isPlayer1 ? p1 : p2;
    opponent = isPlayer1 ? p2 : p1;
    console.log("New match started, I am player " + (1 + !isPlayer1));
    
    TILES.forEach(tile => tile.addEventListener("click", _=> {
        if(canPlaceBollard) {
            placeBollard(player.id, tile);
            canPlaceBollard = false;
            return;
        }

        if(tile.classList.contains("destination") && gm.phase != "solving effects") gm.movePlayer(tile);
    }));

    // Select heros n stuff...
    if(!isPlayer1) client.emit("game-start");
});

client.on("game-start", async firstToMove => {
    await opponentMovementAnimation;

    p1.reset();
    p2.reset();

    // turnId == 0 means you move first:
    p1.turnId = +(firstToMove == 2);
    p2.turnId = +(firstToMove == 1);
    
    console.log("New game in match: first to move is player " + firstToMove);
    gm.turn = -1; // It gets updated in startNewTurn
    gm.startNewTurn();
});

client.on("effect", data => {
    console.log("effect received: ", data);
    gm.phase = GAME_PHASES.solvingEffects;
    player.proceedBtn.addEventListener("click", () => opponent.sync(data), { once: true });

    const usedSecret = opponent.secrets[data.usedSecretPos]; console.log(usedSecret);
    opponent.secretCards[data.usedSecretPos].dataset.isVisible = true;
    SECRETS[usedSecret.name].effect(opponent, player);

    if(data.newBollardTileId !== null) placeBollard(opponent.id, TILES[data.newBollardTileId]);
    player.setResponses(usedSecret.name);
});

client.on("effect-solved", data => {
    console.log("effect solved: ", data);
    opponent.sync(data);
    gm.phase = GAME_PHASES.moving;
});

let opponentMovementAnimation = Promise.resolve();
client.on("opponent-move", path => {
    opponentMovementAnimation = opponent.moveSprite(path.map(id => TILES[id]));
});

client.on("proceed", async data => {
    await opponentMovementAnimation;

    console.log("Opponent ended its turn(" + gm.turn + "), with data: ", data);
    opponent.sync(data);
    gm.startNewTurn();
    console.log("And now the turn is: " + gm.turn);
});

client.on("trapped-sync", data => {
    opponent.sync(data);
    player.isTrapped = false;
    gm.phase = GAME_PHASES.moving;
});

client.on("fight-start", () => {
    drawCombatOverlay();
    confirmBtn.onclick = () => {
        if(hasConfirmed) return;

        hasConfirmed = true;
        confirmBtn.style.opacity = 0.5;
        client.emit("fight", {
            pId       : player.id,
            swordPos  : playerSetup.swordPos,
            shieldPos : playerSetup.shieldPos,
        });
    };
});

client.on("fight", ({ swordPos, shieldPos }) => {
    opponentSetup.clearItems();
    opponentSetup.createItem("sword", swordPos);
    opponentSetup.createItem("shield", shieldPos);

    player.heal(-(swordPos !== playerSetup.shieldPos));
    opponent.heal(-(shieldPos !== playerSetup.swordPos));
    if(!player.hp || !opponent.hp) {
        // To be extra sure this ^^^ is the full guard for making the btn available again
        if(isPlayerTurn()) client.emit("fight-ended"); // Here the if to avoid both clients emitting this
    }
    else {
        confirmBtn.style.opacity = 1;
        hasConfirmed = false;
    }

    player.tryDie();
    opponent.tryDie();
});

let fightingProcess; // Promise resolver
client.on("fight-ended", () => {
    console.log("fight ended for player " + player.id);
    removeCombatOverlay();
    if(isPlayerTurn()) fightingProcess();
    else if(opponent.currentTile !== opponent.spawnTile) opponent.evalTileEffect();
    // ^^^ Allowing the opponent to auto-sync picking up the flag but protecting from double winning
});

let matchEnded = false;
client.on("match-end", async winningPlayerId => {
    await opponentMovementAnimation;

    matchEnded = true;
    const banner = document.createElement("div");
    banner.classList.add("banner", winningPlayerId === player.id ? "win" : "lose");
    document.body.appendChild(banner);

    setTimeout(() => client.disconnect(), 3000);
});

function isPlayerTurn() { return player.turnId == (gm.turn % 2); }

const GAME_PHASES = {
    turnStart: "turn start",
    solvingEffects: "solving effects",
    moving: "moving",
};
class LocalGameManager {
    constructor() {
        this.turn  = 0;
        this.phase = GAME_PHASES.turnStart;
    }

    init() {
        setupBoard();
        setupPlayers();
        p1.proceedBtn.addEventListener("click", this.proceed.bind(this));
        p2.proceedBtn.addEventListener("click", this.proceed.bind(this));
    }

    startNewTurn() {
        this.turn++;
        this.phase = GAME_PHASES.turnStart;
        updateBollards();
        if(!isPlayerTurn()) return;

        if(!player.isTrapped) {
            this.showPossibleMoves();
            return;
        }
        
        player.isTrapped = false;
        this.proceed();
    }

    rollDice() {
        const roll = forcedRoll1Turns ? 1 : getRandomIndex(3) + 1; // A number between 1 and 3
        if(forcedRoll1Turns) forcedRoll1Turns--;

        // Display...
        console.log("rolled a " + roll);
        return roll;
    }

    showPossibleMoves() {
        player.computeMoves(this.rollDice());
    }

    async movePlayer(destinationTile) {
        this.phase = GAME_PHASES.moving;
        client.emit("opponent-move", player.paths[destinationTile.id].map(tile => tile.id));
        await player.goToDestination(destinationTile);
        if(player.hasJustWon) {
            client.emit(player.flags < 5 ? "game-start" : "match-end", player.id); // data ignored in game-start
            return;
        }

        // Now wait for player to respond to effect or click proceed
    }

    async fight() {
        player.isReadyToFight   = false;
        opponent.isReadyToFight = false;

        client.emit("fight-start");
        await new Promise(success => fightingProcess = success);
    }

    sendEffect(usedSecretPos) {
        client.emit("effect", {
            hp : player.hp,
            secretsNames : player.secrets.map(secret => secret?.name ?? ""),
            isTrapped : player.isTrapped,
            usedSecretPos,
            newBollardTileId,
        });
    }

    proceed() { // This is essentially the proceed button's listener
        player.proceed();
        const playerData = {
            hp : player.hp,
            secretsNames : player.secrets.map(secret => secret?.name ?? ""),
            isTrapped : player.isTrapped,
        };

        if(this.phase == GAME_PHASES.solvingEffects) {
            client.emit("effect-solved", playerData);
            player.tryDie();
            return;
        }

        client.emit("proceed", playerData);

        player.tryDie(); // Here because this way I can send the 0 hp and synchronize
        this.startNewTurn();
    }
}
gm = new LocalGameManager();

// Sending playerMove from the client to the server
//socket.emit("playerMove", {} /*data*/);

/* Turn checklist:
identify player that can move -> opponent computes this
roll dice
player.computeMoves(roll)
wait: player action
    if: player uses secret or ability
        player is affected by secret -> inform opponent of HP, action, secrets, flag position
        opponent is affected by secret
        wait: opponent responds
            if: opponent uses secret or ability
                opponent is affected by secret (own)
        
        -> inform player of everything about opponent

    if: player chooses destination
        player.goToDestination(dest) -> opponent computes animation
        player is affected by destination
        wait: player action
            if: player clicks proceed or has no response => nothing
            if: player uses secret (effect response specific)
                player is affected by secret
        
        -> inform opponent of HP, action, secrets, flag position

turn ends -> inform opponent
*/