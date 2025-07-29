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
    console.log("I am player " + (1 + !isPlayer1));
    
    TILES.forEach(tile => tile.addEventListener("click", _=> {
        if(canPlaceBollard) {
            placeBollard(tile);
            canPlaceBollard = false;
            return;
        }

        if(tile.classList.contains("destination")) gm.movePlayer(tile);
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
    
    console.log("First to move is player " + firstToMove);
    gm.turn = -1; // It gets updated in startNewTurn
    gm.startNewTurn();
});

let opponentMovementAnimation = Promise.resolve();
client.on("opponent-move", path => {
    opponentMovementAnimation = opponent.moveSprite(path.map(id => TILES[id]));
});

client.on("proceed", async data => {
    await opponentMovementAnimation;

    console.log("hi", data, player.id, gm.turn);
    opponent.sync(data);
    gm.startNewTurn();
    console.log(gm.turn);
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

class LocalGameManager {
    constructor() {
        this.turn = 0;
    }

    init() {
        setupBoard();
        setupPlayers();
        p1.proceedBtn.onclick = this.proceed.bind(this);
        p2.proceedBtn.onclick = this.proceed.bind(this);
    }

    startNewTurn() {
        this.turn++;
        updateBollards();
        if(isPlayerTurn()) this.showPossibleMoves();
    }

    rollDice() {
        const roll = forcedRoll1Turns ? 1 : Math.floor(Math.random() * 3) + 1;
        if(forcedRoll1Turns) forcedRoll1Turns--;

        // Display...
        console.log("rolled a " + roll);
        return roll;
    }

    showPossibleMoves() {
        player.computeMoves(this.rollDice());
    }

    async movePlayer(destinationTile) {
        client.emit("opponent-move", player.paths[destinationTile.id].map(tile => tile.id));
        await player.goToDestination(destinationTile);
        if(player.hasJustWon) {
            client.emit(player.flags < 5 ? "game-start" : "match-end", player.id); // data ignored in game-start
            return;
        }

        // Now wait for player to respond to effect or click proceed
    }

    proceed() { // This is essentially the proceed button's listener
        player.proceed();
        player.experienceIncomingEffect();
        client.emit("proceed", {
            hp : player.hp,
            secretsNames : player.secrets.map(secret => secret?.name ?? "")
        });
        player.tryDie(); // Here because this way I can send the 0 hp and synchronize
        gm.startNewTurn();
    }
}
gm = new LocalGameManager();

// Sending playerMove from the client to the server
//socket.emit("playerMove", {} /*data*/);

/* Turn checklist:
identify player that can move -> opponent computes this
wait: player action => if: player uses secret or ability
    player is affected by secret -> inform opponent of HP, action, secrets, flag position
    wait: opponent responds
        if: opponent uses secret or ability
            opponent is affected by secret (own)
        
        opponent is affected by secret -> inform player of everything about opponent

roll dice
player.computeMoves(roll)
wait: player chooses destination -> inform opponent of destination
player.goToDestination(dest) -> opponent computes animation
player is informed of destination effect
wait: player action => if: player uses secret (effect response specific)
    player is affected by secret -> inform opponent of HP, action, secrets, flag position

player is affected by destination -> inform opponent of everything about player
turn ends -> inform opponent
*/