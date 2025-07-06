const boardSize = 9;
const ships = [4, 3, 3, 2, 1];

let isHorizontal = true;
let playerBoard, computerBoard;
let playerHits = 0,
    computerHits = 0;
let placedShips = [];

const totalShipCells = ships.reduce((a, b) => a + b, 0);
const playerGrid = document.getElementById("player-board");
const computerGrid = document.getElementById("computer-board");
const infoText = document.getElementById("info-text");
const rotateBtn = document.getElementById("rotate-btn");
const restartBtn = document.getElementById("restart-btn");
const shipSidebar = document.querySelector(".ship-sidebar");

let draggedShip = null;
let triedCells = new Set();
let huntQueue = [];
let hitStack = [];
let direction = null;
let reversed = false;

rotateBtn.addEventListener("click", () => {
    isHorizontal = !isHorizontal;
    rotateBtn.textContent = isHorizontal ? "🔄 Rotate" : "🔄 Rotate";
    shipSidebar.classList.toggle("vertical", !isHorizontal);
});

restartBtn.addEventListener("click", restartGame);

function restartGame() {
    playerGrid.innerHTML = "";
    computerGrid.innerHTML = "";
    shipSidebar.innerHTML = `<h3>Drag Ships</h3>`;

    ships.forEach(size => {
        const ship = document.createElement("div");
        ship.classList.add("ship");
        ship.setAttribute("draggable", true);
        ship.setAttribute("data-size", size);

        for (let i = 0; i < size; i++) {
            const block = document.createElement("div");
            block.classList.add("ship-block");
            ship.appendChild(block);
        }

        shipSidebar.appendChild(ship);
    });

    playerBoard = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
    computerBoard = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
    playerHits = 0;
    computerHits = 0;
    placedShips = [];
    draggedShip = null;
    triedCells = new Set();
    huntQueue = [];
    hitStack = [];
    direction = null;
    reversed = false;

    createBoard(playerGrid, null);
    createBoard(computerGrid, null);
    setupDragEvents();
    infoText.textContent = "Drag and drop your ships to place them.";
}

function createBoard(container, clickHandler) {
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.row = r;
            cell.dataset.col = c;
            if (clickHandler) {
                cell.addEventListener("click", () => clickHandler(r, c, cell));
            }
            container.appendChild(cell);
        }
    }
}

function setupDragEvents() {
    document.querySelectorAll(".ship").forEach(ship => {
        ship.addEventListener("dragstart", () => {
            draggedShip = ship;
            ship.classList.add("dragging");
        });

        ship.addEventListener("dragend", () => {
            draggedShip = null;
            ship.classList.remove("dragging");
        });
    });

    playerGrid.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("dragover", e => e.preventDefault());
        cell.addEventListener("drop", () => {
            if (!draggedShip) return;
            const size = parseInt(draggedShip.dataset.size);
            const r = +cell.dataset.row;
            const c = +cell.dataset.col;

            if (canPlaceShip(playerBoard, r, c, size, isHorizontal)) {
                placeShip(playerBoard, r, c, size, isHorizontal, playerGrid);
                placedShips.push(size);
                draggedShip.remove();

                if (placedShips.length === ships.length) {
                    infoText.textContent = "Start attacking the computer!";
                    placeShipsRandom(computerBoard);
                    setupGame();
                } else {
                    infoText.textContent = `Place ${ships.length - placedShips.length} more ship(s).`;
                }
            }
        });
    });
}

function canPlaceShip(board, r, c, size, horizontal) {
    if ((horizontal && c + size > boardSize) || (!horizontal && r + size > boardSize)) return false;
    for (let i = 0; i < size; i++) {
        const rr = r + (horizontal ? 0 : i);
        const cc = c + (horizontal ? i : 0);
        if (board[rr][cc] === 1) return false;
    }
    return true;
}

function placeShip(board, r, c, size, horizontal, grid) {
    for (let i = 0; i < size; i++) {
        const rr = r + (horizontal ? 0 : i);
        const cc = c + (horizontal ? i : 0);
        board[rr][cc] = 1;
        const cell = grid.querySelector(`[data-row="${rr}"][data-col="${cc}"]`);
        if (cell) cell.classList.add("ship-cell");
    }
}

function placeShipsRandom(board) {
    for (let size of ships) {
        let placed = false;
        while (!placed) {
            const isH = Math.random() < 0.5;
            const r = Math.floor(Math.random() * (isH ? boardSize : boardSize - size + 1));
            const c = Math.floor(Math.random() * (isH ? boardSize - size + 1 : boardSize));
            if (canPlaceShip(board, r, c, size, isH)) {
                placeShip(board, r, c, size, isH, { querySelector: () => null });
                placed = true;
            }
        }
    }
}

function setupGame() {
    computerGrid.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("click", () => {
            const r = +cell.dataset.row;
            const c = +cell.dataset.col;
            playerAttack(r, c, cell);
        });
    });
}

function playerAttack(r, c, cell) {
    if (cell.classList.contains("hit") || cell.classList.contains("miss")) return;

    if (computerBoard[r][c] === 1) {
        cell.classList.add("hit");
        playerHits++;
        infoText.textContent = "Hit!";
    } else {
        cell.classList.add("miss");
        infoText.textContent = "Miss!";
    }

    if (playerHits === totalShipCells) {
        infoText.textContent = "🎉 You win!";
        disableBoard(computerGrid);
        return;
    }

    setTimeout(computerTurn, 700);
}

function computerTurn() {
    const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
    ];

    function isValid(r, c) {
        return r >= 0 && r < boardSize && c >= 0 && c < boardSize && !triedCells.has(`${r},${c}`);
    }

    function attack(r, c) {
        triedCells.add(`${r},${c}`);
        const cell = playerGrid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (!cell) return false;

        if (playerBoard[r][c] === 1) {
            cell.classList.add("computer-hit");
            computerHits++;
            infoText.textContent = "Computer hit!";
            hitStack.push([r, c]);

            if (hitStack.length === 1) {
                for (let [dr, dc] of directions) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (isValid(nr, nc)) huntQueue.push([nr, nc]);
                }
            } else if (hitStack.length === 2 && !direction) {
                const [r1, c1] = hitStack[0];
                const [r2, c2] = hitStack[1];
                direction = [r2 - r1, c2 - c1];
            }
            return true;
        } else {
            cell.classList.add("computer-miss");
            infoText.textContent = "Computer miss!";
            return false;
        }
    }

    // Continue in the same direction
    if (direction && hitStack.length >= 2) {
        const [lastR, lastC] = hitStack[hitStack.length - 1];
        const [dr, dc] = direction;
        const nextR = lastR + dr;
        const nextC = lastC + dc;

        if (isValid(nextR, nextC)) {
            const wasHit = attack(nextR, nextC);
            if (!wasHit) {
                // Try opposite direction from first hit
                const [firstR, firstC] = hitStack[0];
                const revR = firstR - dr;
                const revC = firstC - dc;
                if (isValid(revR, revC)) {
                    attack(revR, revC);
                } else {
                    direction = null;
                    hitStack = [];
                }
            }
            return;
        } else {
            // Try opposite direction from first hit
            const [firstR, firstC] = hitStack[0];
            const revR = firstR - dr;
            const revC = firstC - dc;
            if (isValid(revR, revC)) {
                attack(revR, revC);
            } else {
                direction = null;
                hitStack = [];
            }
            return;
        }
    }

    // Process huntQueue after first hit
    while (huntQueue.length > 0) {
        const [r, c] = huntQueue.shift();
        if (isValid(r, c)) {
            const wasHit = attack(r, c);
            if (wasHit && hitStack.length === 2 && !direction) {
                const [r1, c1] = hitStack[0];
                const [r2, c2] = hitStack[1];
                direction = [r2 - r1, c2 - c1];
            }
            return;
        }
    }

    // Fallback to random
    let r, c;
    do {
        r = Math.floor(Math.random() * boardSize);
        c = Math.floor(Math.random() * boardSize);
    } while (triedCells.has(`${r},${c}`));

    attack(r, c);

    if (computerHits === totalShipCells) {
        infoText.textContent = "💥 Computer wins!";
        disableBoard(computerGrid);
    }
}

function disableBoard(grid) {
    grid.querySelectorAll(".cell").forEach(cell => {
        cell.style.pointerEvents = "none";
    });
}

window.addEventListener("load", () => {
    setTimeout(() => {
        restartGame();
    }, 100);
});