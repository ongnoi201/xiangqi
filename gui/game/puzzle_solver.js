var engine = new Engine();
var book = [];
var botName = '';
var playerSide = 0;
var currentPuzzleId = '';
var pieceFolder = 'traditional_pieces';

const MOVE_SOUND = new Audio('game/sounds/move.wav');
const CAPTURE_SOUND = new Audio('game/sounds/capture.wav');
const CHECK_SOUND = new Audio('game/sounds/check.mp3');
const WIN_SOUND = new Audio('game/sounds/win.mp3');
const LOSE_SOUND = new Audio('game/sounds/lose.mp3');
const DRAW_SOUND = new Audio('game/sounds/draw.mp3');

const CELL_WIDTH = 46;
const CELL_HEIGHT = 46;
const SELECT_COLOR = 'brown';
var flip = 0;
var guiScore = 0;
var guiDepth = 0;
var guiTime = 0;
var guiPv = '';
var guiSide = 0;
var userTime = 0;
var gameResult = '*';
var guiFen = '';
var fixedTime = 0;
var fixedDepth = 0;
var clickLock = 0;
var allowBook = 1;
var userSource, userTarget;
var lastMoveSource = null;
var repetitions = 0;

function handlePlayerMove(source, target, move) {
    const afterPlayerMove = () => {
        setTimeout(think, 100);
    };
    animateAndMovePiece(source, target, move, afterPlayerMove);
}

function dropPiece(event, square) {
    userTarget = square;
    let valid = validateMove(userSource, userTarget);
    clickLock = 0;

    if (engine.getPiece(userTarget) === 0 && valid === 0) {
        drawBoard();
    }

    event.preventDefault();
    if (valid) {
        handlePlayerMove(userSource, userTarget, valid);
    }
}

function tapPiece(square) {
    const clickSquare = parseInt(square, 10);
    const clickedPiece = engine.getPiece(clickSquare);
    const currentTurn = engine.getSide(); // Lượt đi hiện tại

    // Chỉ cho phép người chơi tương tác khi đến lượt của họ
    if (currentTurn !== playerSide) return;

    if (clickLock) {
        // Cho phép chọn quân của mình để đổi quân cờ muốn đi
        if (clickedPiece && engine.getPieceColor(clickedPiece) === playerSide) {
            if (clickSquare === userSource) {
                clickLock = 0;
                userSource = null;
                drawBoard();
            } else {
                userSource = clickSquare;
                drawBoard();
                highlightPiece(userSource);
                highlightMoves(userSource);
            }
            return;
        }

        userTarget = clickSquare;
        let valid = validateMove(userSource, userTarget);
        clickLock = 0;

        if (valid) {
            handlePlayerMove(userSource, userTarget, valid);
        } else {
            drawBoard();
        }

        // Chỉ cho phép chọn quân khi chưa có quân nào được chọn
    } else if (clickedPiece && engine.getPieceColor(clickedPiece) === playerSide) {
        drawBoard();
        userSource = clickSquare;
        clickLock = 1;
        highlightPiece(userSource);
        highlightMoves(userSource);
    }
}

function isGameOver() {
    if (engine.generateLegalMoves().length === 0) {
        if (engine.getSide() == playerSide) {
            gameResult = 'game/images/misc/lose.png';
        } else {
            gameResult = 'game/images/misc/win.png';
        }
        return 1;
    }
    return 0;
}

function updatePuzzleListUI() {
    const solvedList = getSolvedPuzzles();
    const puzzleItems = document.querySelectorAll('#puzzles .list-group-item-action');

    puzzleItems.forEach(item => {
        const puzzleId = parseInt(item.id.split('_')[1]);
        if (solvedList.includes(puzzleId)) {
            item.classList.add('puzzle-solved');
        } else {
            item.classList.remove('puzzle-solved');
        }
    });
}

// Dán để thay thế hàm think() cũ trong file cờ thế.
function think() {
    if (isGameOver()) {
        if (gameResult.includes('win.png')) {
            markPuzzleAsSolved(currentPuzzleId);
            updatePuzzleListUI();
            setTimeout(function () {
                currentPuzzleId++;
                if (currentPuzzleId >= Puzzles.length) currentPuzzleId = 0;
                setPuzzle('puzzle_' + currentPuzzleId);
            }, 3000);
        }
        return;
    }

    engine.resetTimeControl();
    let timing = engine.getTimeControl();
    let startTime = new Date().getTime();

    if (fixedTime) {
        fixedDepth = 64;
        timing.timeSet = 1;
        timing.time = fixedTime * 1000;
        timing.stopTime = startTime + timing.time;
        engine.setTimeControl(timing);
    }

    let bookMoveFlag = 0;
    let delayMove = 500;
    let bestMove = 0;
    bestMove = getBookMove();

    if (bestMove) {
        bookMoveFlag = 1;
    } else {
        bestMove = engine.search(fixedDepth);
        if (bestMove === 0) {
            let legalMoves = engine.generateLegalMoves();
            if (legalMoves.length > 0) {
                bestMove = legalMoves[Math.floor(Math.random() * legalMoves.length)].move;
            }
        }
    }

    if (bestMove === 0) {
        return;
    }

    if (bookMoveFlag || fixedDepth) delayMove = 1000;

    let sourceSquare = engine.getSourceSquare(bestMove);
    let targetSquare = engine.getTargetSquare(bestMove);

    setTimeout(function () {
        animateAndMovePiece(sourceSquare, targetSquare, bestMove);
        userTime = Date.now();

        if (isGameOver() && gameResult.includes('lose.png')) {
            setTimeout(function () {
                if (currentPuzzleId >= Puzzles.length) currentPuzzleId = 0;
                setPuzzle('puzzle_' + currentPuzzleId);
            }, 3000);
        }
    }, delayMove);
}

function replay() {
    setPuzzle('puzzle_' + findNextUnsolvedPuzzle());
}

function setBot(bot) {
    botName = bot;
    document.getElementById('current-bot-image').src = bots[bot].image;
    fixedTime = bots[bot].time;
    fixedDepth = bots[bot].depth;
    book = JSON.parse(JSON.stringify(bots[bot].book));
}

// set puzzle
function setPuzzle(puzzleId) {
    flip = 0;
    guiScore = 0;
    guiDepth = 0;
    guiTime = 0;
    guiPv = '';
    gameResult = '';
    userTime = 0;
    allowBook = 1;

    let puzzle;
    if (puzzleId) {
        document.getElementById('current-puzzle-name').textContent = "Thế cờ " + (parseInt(puzzleId.split('_')[1]) + 1);
        document.getElementById('level').textContent = Puzzles[parseInt(puzzleId.split('_')[1])].title;
        currentPuzzleId = parseInt(puzzleId.split('_')[1]);
        puzzle = Puzzles[currentPuzzleId];
        engine.setBoard(puzzle.fen);
    }

    playerSide = engine.getSide();
    guiSide = playerSide;
    if (playerSide == engine.COLOR['BLACK']) {
        flipBoard();
    }
    drawBoard();
    repetitions = 0;
}


function addPuzzle(count) {
    let puzzle = Puzzles[count];
    let puzzleItem = document.createElement('li');
    puzzleItem.id = 'puzzle_' + count;
    puzzleItem.classList.add('list-group-item-action');
    puzzleItem.classList.add('btn');
    puzzleItem.textContent = (count + 1) + '. ' + puzzle['title'];
    puzzleItem.setAttribute('onclick', 'setPuzzle(this.id)');
    puzzles.appendChild(puzzleItem);
}

// Hàm tìm puzzle đầu tiên chưa được giải
function findNextUnsolvedPuzzle() {
    const solvedList = getSolvedPuzzles();
    if (solvedList.length >= Puzzles.length) {
        alertify.success("Bạn đã giải hết tất cả các thế cờ");
        return 0;
    }

    for (let i = 0; i < Puzzles.length; i++) {
        if (!solvedList.includes(i)) {
            return i;
        }
    }
    return 0;
}

(function initPuzzles() {
    let puzzles = document.getElementById('puzzles');
    for (let count = 0; count < Puzzles.length; count++) addPuzzle(count);
    updatePuzzleListUI();
}());

setBot('Laoba');
const nextPuzzleIndex = findNextUnsolvedPuzzle();
setPuzzle('puzzle_' + nextPuzzleIndex);


