const express = require("express");
const app     = express();
const http    = require("http").createServer(app);
app.use(express.static("public"));

class GameManager {
    constructor() {
        this.server = require("socket.io")(http);
        this.p1     = null;
        this.p2     = null;

        this.server.on("connection", this.onConnect.bind(this));
    }

    onConnect(client) {
        console.log(`User ${client.id} connected.`);
        client.on("disconnect", () => {
            console.log(`User ${client.id} disconnected.`);
            if(     client.id === this.p1?.id) this.p1 = null;
            else if(client.id === this.p2?.id) this.p2 = null;
            else return;

            client.broadcast.emit("opponent-disconnect");
        });

        if(this.p1 && this.p2) {
            client.emit("game-full");
            client.disconnect();
            return;
        }

        client.on("game-start", this.onGameStart.bind(this));
        client.on("opponent-move", path => client.broadcast.emit("opponent-move", path));
        client.on("proceed", () => this.server.emit("proceed"));
        
        const isPlayer1 = this.p1 === null;
        this[isPlayer1 ? "p1" : "p2"] = client;
        
        // Both are connected, we can proceed
        if(this.p1 && this.p2) {
            this.p1.emit("pick-hero", true); // Am I player 1?
            this.p2.emit("pick-hero", false);
        }
    }

    get isPlayersTurn() { return this.turn % 2 == (player.turnId); }

    onGameStart() {
        this.server.emit("game-start", this.getFirstToMove());
    }

    getFirstToMove() { return 1 + (Math.random() >= 0.5); }

    update() {

    }
}
gm = new GameManager();

const PORT = 8888;
http.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
});