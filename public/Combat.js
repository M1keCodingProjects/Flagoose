class CombatSetup {
    constructor(combatNode, isOfPlayer) {
        this.draggedItem = null;
        this.holders     = [...combatNode.getElementsByClassName("combat-holder")];
        this.holders.forEach((holder, i) => holder.dataset.pos = i);
        if(!isOfPlayer) return;

        this.createItem("sword",  0, true);        
        this.createItem("shield", 1, true);
        combatNode.parentNode.addEventListener("mousemove", event => {
            if(!this.draggedItem) return;

            this.draggedItem.style.left = event.clientX + "px";
            this.draggedItem.style.top  = event.clientY + "px";
        });

        combatNode.parentNode.addEventListener("mouseup", event => {
            event.preventDefault();
            this.stopDragging();
        });

        this.holders.forEach(holder => holder.addEventListener("mouseup", event => {
            event.preventDefault();
            if(!this.draggedItem) return;
            
            const oldItem   = holder.children?.[0];
            const oldHolder = this.draggedItem.parentNode;
            holder.appendChild(this.draggedItem);
            
            this.stopDragging();
            if(!oldItem) return;

            oldItem.remove();
            oldHolder.appendChild(oldItem);
        }));
    }

    createItem(name, initPos, isOfPlayer = false) {
        const item = document.createElement("div");
        item.className = name;
        this.holders[initPos].appendChild(item);
        this[name] = item;

        if(isOfPlayer) item.addEventListener("mousedown", event => {
            event.preventDefault();
            this.startDragging(item, event.clientX, event.clientY);
        });
    }

    clearItems() {
        this.sword?.remove();
        this.sword = null;

        this.shield?.remove();
        this.shield = null;
    }

    get swordPos()  { return this.sword.parentNode.dataset.pos; }
    get shieldPos() { return this.shield.parentNode.dataset.pos; }

    startDragging(item, mouseX, mouseY) {
        this.draggedItem = item;
        this.draggedItem.style.left = mouseX + "px";
        this.draggedItem.style.top  = mouseY + "px";
        item.classList.add("dragging");
    }

    stopDragging() {
        if(!this.draggedItem) return;

        this.draggedItem.classList.remove("dragging");
        this.draggedItem = null;
    }
}

let playerSetup;
let opponentSetup;
let confirmBtn;
let hasConfirmed = false;
function drawCombatOverlay() {
    const banner = document.createElement("div");
    banner.id    = "combat-overlay";

    banner.classList.add("banner", "combat");
    banner.innerHTML = `<div class = "player1 combat">
        <div class = "sprite player1 ${p1.hero}"></div>
        <div class = "combat-holders">
            <div class = "combat-holder player1"></div>
            <div class = "combat-holder player1"></div>
            <div class = "combat-holder player1"></div>
        </div>
    </div>
    <div class = "proceed-btn">Confirm</div>
    <div class = "player2 combat">
        <div class = "combat-holders">
            <div class = "combat-holder player2"></div>
            <div class = "combat-holder player2"></div>
            <div class = "combat-holder player2"></div>
        </div>
        <div class = "sprite player2 ${p2.hero}"></div>
    </div>`;

    document.body.appendChild(banner);
    playerSetup   = new CombatSetup(banner.getElementsByClassName("player" + player.id)[0], true);
    opponentSetup = new CombatSetup(banner.getElementsByClassName("player" + opponent.id)[0], false);
    confirmBtn    = banner.getElementsByClassName("proceed-btn")[0];
    hasConfirmed  = false;
}

function removeCombatOverlay() {
    document.getElementById("combat-overlay").remove();
}