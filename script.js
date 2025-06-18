const boardSize = 9;
const ships = [4, 3, 3, 2, 1];
let isHorizontal = true;

let playerBoard, computerBoard;
let playerHits = 0;
let computerHits = 0;
let placedShips = [];

const totalShipCells = ships.reduce((a, b) => a + b, 0);

const playerGrid = document.getElementById("player-board");
const computerGrid = document.getElementById("computer-board");
const infoText = document.getElementById("info-text");
const rotateBtn = document.getElementById("rotate-btn");
const restartBtn = document.getElementById("restart-btn");
const shipSidebar = document.querySelector(".ship-sidebar");

let draggedShip = null;
let lastHit = null;
let huntQueue = [];
let currentDirection = null;
let triedDirections = new Set();

rotateBtn.addEventListener("click", () => {
    isHorizontal = !isHorizontal;
    rotateBtn.textContent = isHorizontal ? "🔄 Rotate (Horizontal)" : "🔄 Rotate (Vertical)";
    shipSidebar.classList.toggle("vertical", !isHorizontal);
});

restartBtn.addEventListener("click", () => {
    restartGame();
});

function restartGame() {
    playerGrid.innerHTML = "";
    computerGrid.innerHTML = "";
    shipSidebar.innerHTML = `
    <h3>Drag Ships</h3>
    <div class="ship" draggable="true" data-size="4"></div>
    <div class="ship" draggable="true" data-size="3"></div>
    <div class="ship" draggable="true" data-size="3"></div>
    <div class="ship" draggable="true" data-size="2"></div>
    <div class="ship" draggable="true" data-size="1"></div>
  `;

    playerBoard = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
    computerBoard = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
    playerHits = 0;
    computerHits = 0;
    placedShips = [];
    draggedShip = null;
    lastHit = null;
    huntQueue = [];
    currentDirection = null;
    triedDirections = new Set();

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

    document.querySelectorAll("#player-board .cell").forEach(cell => {
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

                if (placedShips.length === 5) {
                    infoText.textContent = "Start attacking the computer!";
                    placeShipsRandom(computerBoard);
                    setupGame();
                } else {
                    infoText.textContent = `Place ${5 - placedShips.length} more ship(s).`;
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
        cell.classList.add("ship-cell");
    }
}

function placeShipsRandom(board) {
    for (let size of ships) {
        let placed = false;
        while (!placed) {
            const isH = Math.random() < 0.5;
            const row = Math.floor(Math.random() * (isH ? boardSize : boardSize - size + 1));
            const col = Math.floor(Math.random() * (isH ? boardSize - size + 1 : boardSize));
            let clear = true;
            for (let i = 0; i < size; i++) {
                const r = row + (isH ? 0 : i);
                const c = col + (isH ? i : 0);
                if (board[r][c] === 1) {
                    clear = false;
                    break;
                }
            }
            if (clear) {
                for (let i = 0; i < size; i++) {
                    const r = row + (isH ? 0 : i);
                    const c = col + (isH ? i : 0);
                    board[r][c] = 1;
                }
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

    setTimeout(computerTurn, 800);
}

function computerTurn() {
    let r, c, cell;

    function isValidCell(rr, cc) {
        return rr >= 0 && rr < boardSize && cc >= 0 && cc < boardSize &&
            !playerGrid.querySelector(`[data-row="${rr}"][data-col="${cc}"]`).classList.contains("hit") &&
            !playerGrid.querySelector(`[data-row="${rr}"][data-col="${cc}"]`).classList.contains("miss") &&
            !playerGrid.querySelector(`[data-row="${rr}"][data-col="${cc}"]`).classList.contains("computer-hit") &&
            !playerGrid.querySelector(`[data-row="${rr}"][data-col="${cc}"]`).classList.contains("computer-miss");
    }

    // 1. Continue in current direction
    if (lastHit && currentDirection) {
        const [lr, lc] = lastHit;
        const [dr, dc] = currentDirection;
        r = lr + dr;
        c = lc + dc;

        if (!isValidCell(r, c)) {
            currentDirection = null;
            computerTurn();
            return;
        }
    }

    // 2. Use huntQueue (neighbours of last hit)
    else if (huntQueue.length > 0) {
        [r, c] = huntQueue.shift();
    }

    // 3. If last hit exists but no direction yet — generate 4 neighbours
    else if (lastHit) {
        const [lr, lc] = lastHit;
        const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1]
        ];

        for (const [dr, dc] of directions) {
            const rr = lr + dr;
            const cc = lc + dc;
            if (isValidCell(rr, cc)) huntQueue.push([rr, cc]);
        }

        if (huntQueue.length > 0) {
            [r, c] = huntQueue.shift();
        } else {
            lastHit = null;
            computerTurn();
            return;
        }
    }

    // 4. If nothing else — pick random
    else {
        r = Math.floor(Math.random() * boardSize);
        c = Math.floor(Math.random() * boardSize);
        cell = playerGrid.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (cell.classList.contains("hit") || cell.classList.contains("miss") || cell.classList.contains("computer-hit") || cell.classList.contains("computer-miss")) {
            computerTurn();
            return;
        }
    }

    // Final cell reference
    cell = playerGrid.querySelector(`[data-row="${r}"][data-col="${c}"]`);

    if (playerBoard[r][c] === 1) {
        cell.classList.add("computer-hit");
        computerHits++;
        infoText.textContent = "Computer hit!";

        if (!lastHit) {
            lastHit = [r, c]; // first hit
        } else if (!currentDirection) {
            // Set direction from lastHit to current hit
            currentDirection = [r - lastHit[0], c - lastHit[1]];
        }

        // Keep going in same direction
        if (currentDirection) {
            const nextR = r + currentDirection[0];
            const nextC = c + currentDirection[1];
            if (isValidCell(nextR, nextC)) {
                huntQueue.unshift([nextR, nextC]); // push to front
            }
        }

    } else {
        cell.classList.add("computer-miss");
        infoText.textContent = "Computer miss!";

        // If in direction mode and missed, reset direction
        if (currentDirection) {
            currentDirection = null;
        }

        if (huntQueue.length === 0) {
            lastHit = null;
        }
    }

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

// Start the game when the page loads
restartGame();