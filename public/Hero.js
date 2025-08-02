let selectedHeroId = 1;

const usernameInput = document.getElementById("username-input");
const heroCards = [...document.getElementsByClassName("hero-card")];
const [leftScroll, rightScroll] = document.getElementsByClassName("scroll");
document.getElementsByClassName("ready-btn")[0].addEventListener("click", event => {
    client.emit("pick-hero", {
        username : usernameInput.value.toUpperCase(),
        hero : heroCards[selectedHeroId].dataset.name,
    });

    event.target.classList.add("pressed");
    leftScroll.classList.add("disabled");
    rightScroll.classList.add("disabled");
}, { once : true });

function fadeCard(id, isFadeIn) { heroCards[id].style.opacity = +isFadeIn; }

function onHeroCardsScroll(isScrollRight) {
    if(leftScroll.classList.contains("disabled")) return; // One or the other, both are disabled at the same time

    fadeCard(selectedHeroId, false);
    selectedHeroId += isScrollRight * 2 - 1;
    selectedHeroId  = Math.abs(selectedHeroId % heroCards.length);
    fadeCard(selectedHeroId, true);
};
leftScroll.onclick  = () => onHeroCardsScroll(false);
rightScroll.onclick = () => onHeroCardsScroll(true);

function removeHeroSelectionBanner() {
    document.getElementById("hero-selection-banner").remove();
}