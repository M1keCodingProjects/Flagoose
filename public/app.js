const client = io();

client.on("game-full", () => {
    document.body.innerHTML = "<div id = \"error-msg\">2 people are already playing. Wait your turn then refresh the page.</div>";
    throw new Error("Game is full");
});

client.on("opponent-disconnect", () => {
    document.body.innerHTML = "<div id = \"error-msg\">Your opponent disconnected. Game over.</div>";
    throw new Error("Opponent disconnected");
});

client.on("pick-hero", isPlayer1 => {
    setupBoard();
    setupPlayers();
    
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

client.on("game-start", firstToMove => {
    p1.reset();
    p2.reset();

    // Returning flag to middle, redundant until we know somehow who won:
    p1.passFlag(p1.currentTile, flagTile);
    p2.passFlag(p2.currentTile, flagTile);

    gm.turn = 0;
    // turnId == 0 means you move first:
    p1.turnId = +(firstToMove == 2);
    p2.turnId = +(firstToMove == 1);
    
    console.log("First to move is player " + firstToMove);
    if(isPlayerTurn()) gm.showPossibleMoves();
});

client.on("opponent-move", async path => {
    await opponent.moveSprite(path.map(id => TILES[id]));
});

client.on("proceed", data => {
    console.log("hi", data, player.id, gm.turn);
    opponent.sync(data);
    gm.startNewTurn();
    console.log(gm.turn);
});

function isPlayerTurn() { return player.turnId == (gm.turn % 2); }

class LocalGameManager {
    constructor() {
        this.turn = 0;
    }

    startNewTurn() {
        this.turn++;
        updateBollards();
        if(isPlayerTurn()) this.showPossibleMoves();
    }

    rollDice() {
        const roll = Math.floor(Math.random() * 3) + 1;
        // Display...
        console.log("rolled a " + roll);
        return roll;
    }

    showPossibleMoves() {
        player.computeMoves(this.rollDice());
    }

    async movePlayer(destinationTile) {
        client.emit("opponent-move", player.paths[destinationTile.id].map(tile => tile.id));
        const oldFlags = player.flags;
        await player.goToDestination(destinationTile);
        if(oldFlags != player.flags) {
            client.emit("game-start");
            return;
        }

        this.affectPlayer(); // why tf is this here?
        client.emit("proceed", {
            hp : player.hp,
            secretsNames : player.secrets.map(secret => secret.name)
        });
        gm.startNewTurn();
    }

    affectPlayer() {
        switch(player.currentTile.style.getPropertyValue("--type")) {
            case "heal":   player.heal(1); break;
            case "damage": player.heal(-1); break;
            case "secret": player.getNewSecret(getRandomSecret()); break;
        }
    }
}
gm = new LocalGameManager();

// Sending playerMove from the client to the server
//socket.emit("playerMove", {} /*data*/);

/* Turn checklist:
identify player that can move -> opponent computes this
wait: player action
if: player uses secret ...
if: player uses ability ...
if: player rolls
    roll dice -> inform opponent
    wait: opponent response
    if: opponent uses secret ...
    if: proceed
        player.computeMoves(roll)
        wait: player chooses destination -> inform opponent of destination
        player.goToDestination(dest) -> opponent computes animation
        wait: player action
        if: player uses secret ...
        if: proceed
            player is affected by destination -> inform opponent of HP, action, secrets, flag position

turn ends -> inform opponent
*/