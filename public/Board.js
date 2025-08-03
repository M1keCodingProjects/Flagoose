class Vec2D {
    constructor(x, y) {
        this.x = x ?? 0;
        this.y = y ?? 0;
    }

    static fromPolar(mag, angle) {
        return new Vec2D(mag * Math.cos(angle), mag * Math.sin(angle));
    }

    add(v, y) {
        this.x += v.x ?? v;
        this.y += v.y ?? y;
        return this;
    }

    sub(v, y) {
        this.x -= v.x ?? v;
        this.y -= v.y ?? y;
        return this;
    }

    mult(n) {
        this.x *= n;
        this.y *= n;
        return this;
    }

    div(n) {
        this.x /= n;
        this.y /= n;
        return this;
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        this.x    = this.x * cos - this.y * sin;
        this.y    = this.x * sin + this.y * cos;
        return this;
    }

    mid(v) {
        return this.add(v).div(2);
    }

    copy() { return new Vec2D(this.x, this.y); }
}

class QuadBezier {
    constructor(start, end, ctrl) {
        this.start = start;
        this.end   = end;
        this.ctrl  = ctrl;
    }

    getPoint(t, asDerivative = false) {
        return asDerivative ?
            this.ctrl.copy().sub(this.start).mult(2 * (1 - t))
            .add(this.end.copy().sub(this.ctrl).mult(2 * t)) :

            this.start.copy().mult((1 - t) ** 2)
            .add(this.ctrl.copy().mult(2 * t * (1 - t)))
            .add(this.end.copy().mult(t ** 2))
    }
}

function becomeNeighbours(tile1, tile2) {
    tile1.neighs.push(tile2);
    tile2.neighs.push(tile1);
}

function addTile(angle, pos, isFirstOfPath = false) {
    const tile      = document.createElement("div");
    tile.id         = START_ID++;
    tile.className  = "tile";
    tile.style.left = `calc(var(--tile-w) * ${pos.x})`;
    tile.style.top  = `calc(var(--tile-w) * ${pos.y})`;
    tile.style.setProperty('--tile-rotation', `${angle}rad`);

    const img = document.createElement("div");
    img.className = "tile-img";
    tile.appendChild(img);

    board.appendChild(tile);
    TILES.push(tile);
    
    tile.neighs    = []; // This is a newly created tile so we never delete data here
    const prevTile = TILES[TILES.length - 2];
    if(!isFirstOfPath) becomeNeighbours(tile, prevTile);
}

function addLinearPath(fromId, steps) {
    const angle    = Math.PI / 15 * fromId;
    const rot      = 0.01 - 0.015 * (angle > Math.PI);
    const mov      = Vec2D.fromPolar(1.15, angle);
    const startPos = getTilePosInCirclePath(fromId);
    for(let i = 0; i < steps; i++)
        addTile(angle, startPos.add(mov).rotate(rot), !i);

    becomeNeighbours(TILES[fromId], TILES[TILES.length - steps]);
    // No knowledge about endpoint: you need to connect the end of the path yourself
}

function addCirclePath(steps) {
    for(let i = 0; i < steps; i++)
        addTile(Math.PI / 15 * i, getTilePosInCirclePath(i), !i);

    becomeNeighbours(TILES[0], TILES[TILES.length - 1]);
}

function getTilePosInCirclePath(tileId) {
    const angle = Math.PI / 15 * tileId;
    return new Vec2D(6 * (1 - Math.cos(angle)), 5.5 * (1 - Math.sin(angle)));
}

function addCurvedPath(fromId, toId, steps, tweakCtrl) {
    startPos = getTilePosInCirclePath(fromId);
    endPos   = getTilePosInCirclePath(toId);
    ctrlPt   = startPos.copy().mid(endPos).add(tweakCtrl);
    curve    = new QuadBezier(startPos, endPos, ctrlPt);

    for (let i = 1; i <= steps; i++) {
        const t  = (i / (steps + 1.5)) ** 1.27 + i * 0.01;
        const dp = curve.getPoint(t, true);
        addTile(Math.atan2(dp.y, dp.x), curve.getPoint(t), i == 1);
    }

    becomeNeighbours(TILES[fromId], TILES[TILES.length - steps]);
    becomeNeighbours(TILES[toId], TILES[TILES.length - 1]);
}

function nudge(tileId, x = 0, y = 0) {
    TILES[tileId].style.left = `calc(${TILES[tileId].style.left} + var(--tile-w) * ${x})`;
    TILES[tileId].style.top  = `calc(${TILES[tileId].style.top} + var(--tile-w) * ${y})`;
}

function setRole(tile, role) {
    tile.classList.add(role);
    tile.style.setProperty("--type", role);
}

function setRoleMany(role, ...tileIds) {
    tileIds.forEach(tileId => setRole(TILES[tileId], role));
}

const board  = document.getElementById("board");
const TILES  = [];
let START_ID = 0;
let p1Start, p2Start, flagTile;

let boardIsSet = false;
function setupBoard() {
    if(boardIsSet) return;

    addCirclePath(30);
    addCurvedPath(13, 24, 7, new Vec2D(-3, -0.4));
    addCurvedPath(28,  9, 7, new Vec2D(3, 0.4));
    addLinearPath(4, 4);
    // Since #47 was created as part of a linear path we need to remove its connection to #46:
    flagTile  = TILES[47];
    flagTile.neighs = [];
    TILES[46].neighs.pop();
    becomeNeighbours(TILES[46], TILES[40]);
    becomeNeighbours(flagTile, TILES[40]);
    becomeNeighbours(flagTile, TILES[33]);

    addLinearPath(19, 3);
    becomeNeighbours(TILES[33], TILES[50]);

    // Manual nudges:
    nudge(37, 0.2, -0.05);
    nudge(38, 0.05, -0.1);
    nudge(40, -0.1, 0.12);
    nudge(41, -0.1, 0.12);
    nudge(43, -0.05, 0.05);

    nudge(30, -0.1, 0.03);
    nudge(31, 0, -0.1);
    nudge(32, 0.1, -0.05);
    nudge(33, 0.15, -0.15);
    nudge(34, 0.18, -0.2);
    nudge(35, 0.16, -0.1);
    nudge(36, 0.1, -0.1);

    nudge(47, 1.1, 0.5);

    p1Start = TILES[0];
    p1Start.classList.add("start", "player1");

    p2Start = TILES[15];
    p2Start.classList.add("start", "player2");

    flagTile.classList.add("flag", "holding-flag");

    setRoleMany("damage", 2, 17, 46, 50);
    setRoleMany("trap", 31, 35, 38, 42);
    setRoleMany("heal", 11, 26);
    setRoleMany("action", 6, 10, 21, 25, 30, 37);
    setRoleMany("secret", 7, 14, 22, 29, 45, 49);

    // Counter rotation fix for those with assets:
    for(const tile of TILES) {
        if(tile.classList.length === 1 || tile.classList.contains("trap") || tile.classList.contains("start"))
            tile.style.setProperty('--tile-rotation', "0deg");
    }

    boardIsSet = true;
}