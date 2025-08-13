const data = loadGameState();
var engine = new Engine();
var book = [];
var botName = ''
var pieceFolder = data && data.piece ? data.piece : 'traditional_pieces';

const MOVE_SOUND = new Audio('game/sounds/move.wav');
const CAPTURE_SOUND = new Audio('game/sounds/capture.wav');
const CHECK_SOUND = new Audio('game/sounds/check.mp3');
const WIN_SOUND = new Audio('game/sounds/win.mp3');
const LOSE_SOUND = new Audio('game/sounds/lose.mp3');
const DRAW_SOUND = new Audio('game/sounds/draw.mp3');
const MUSIC = new Audio('game/sounds/music.m4a');

const CELL_WIDTH = 46;
const CELL_HEIGHT = 46;
const SELECT_COLOR = 'brown';
var flip = 0;
const personPlayerImage = document.getElementById('person-player-wrapper');
const botPlayerImage = document.getElementById('bot-player-wrapper');

function setBot(bot) {
    botName = bot;
    saveGameState({botLevel: bot});
    document.getElementById('current-bot-image').src = bots[bot].image;
    document.getElementById('bot-player-image').src = bots[bot].image;
    document.getElementById('bot-player-name').innerText = bot === 'Ongnoi' ? 'Ông Nội' : bot === 'Baba' ? 'Ba Ba' : bot === 'Phuvuong' ? 'Phụ Vương' : bot === 'Laoba' ? 'Lão Ba' : bot === 'Hoangde' ? 'Hoàng Đế' : bot === 'Ongchu' ? 'Ông Chú' : bot === 'Laogia' ? 'Lão Già' : bot === 'Laoho' ? 'Lão Hổ' : bot === 'Daivuong' && 'Đại Vương';
    fixedTime = bots[bot].time;
    fixedDepth = bots[bot].depth;
    book = JSON.parse(JSON.stringify(bots[bot].book));
}

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
var nonCaptureMoveCounter = 0;

function dropPiece(event, square) {
    userTarget = square;
    let valid = validateMove(userSource, userTarget);
    clickLock = 0;

    if (engine.getPiece(userTarget) === 0 && valid === 0) {
        drawBoard();
    }

    event.preventDefault();
    if (valid) {
        if (engine.getPiece(userTarget) !== 0) {
            nonCaptureMoveCounter = 0;
        } else {
            nonCaptureMoveCounter++;
        }
        const afterPlayerMove = () => {
            personPlayerImage.classList.remove('is-thinking');
            botPlayerImage.classList.add('is-thinking');
            setTimeout(think, 100);
        };
        animateAndMovePiece(userSource, userTarget, valid, afterPlayerMove);
    }
}

function tapPiece(square) {
    const clickSquare = parseInt(square, 10);
    const clickedPiece = engine.getPiece(clickSquare);
    const playerSide = engine.getSide();

    if (clickLock) {
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
            if (engine.getPiece(userTarget) !== 0) {
                nonCaptureMoveCounter = 0;
            } else {
                nonCaptureMoveCounter++;
            }
            const afterPlayerMove = () => {
                personPlayerImage.classList.remove('is-thinking');
                botPlayerImage.classList.add('is-thinking');
                setTimeout(think, 100);
            };
            animateAndMovePiece(userSource, userTarget, valid, afterPlayerMove);
        } else {
            drawBoard();
        }

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
        gameResult = (engine.getSide() === 0 ? 'game/images/misc/lose.png' : 'game/images/misc/win.png');
        return 1;
    }

    if (nonCaptureMoveCounter >= 120) {
        gameResult = 'game/images/misc/draw.png';
        DRAW_SOUND.play();
        return 1;
    }
    return 0;
}

function think() {
    if (document.getElementById('editMode').checked == true) return;
    engine.resetTimeControl();

    let timing = engine.getTimeControl();
    let startTime = new Date().getTime();

    if (fixedTime) {
        fixedDepth = 64;
        timing.timeSet = 1;
        timing.time = fixedTime * 1000;
        timing.stopTime = startTime + timing.time
        engine.setTimeControl(timing);
    }

    let bookMoveFlag = 0;
    let delayMove = 0;
    let bestMove = getBookMove();

    if (botName == 'Ongnoi') {
        let moves = engine.generateLegalMoves();
        try {
            bestMove = moves[Math.floor(Math.random() * moves.length)].move;
        } catch (e) { }
    } else {
        if (bestMove) bookMoveFlag = 1;
        else if (bestMove == 0) bestMove = engine.search(fixedDepth);
    }

    if (bestMove == 0) return;
    if (bookMoveFlag || fixedDepth || typeof (guiScore) == 'string') delayMove = 1000;

    let sourceSquare = engine.getSourceSquare(bestMove);
    let targetSquare = engine.getTargetSquare(bestMove);

    if (engine.getPiece(targetSquare) !== 0) {
        nonCaptureMoveCounter = 0;
    } else {
        nonCaptureMoveCounter++;
    }

    setTimeout(function () {
        animateAndMovePiece(sourceSquare, targetSquare, bestMove);
        userTime = Date.now();
        botPlayerImage.classList.remove('is-thinking');
        personPlayerImage.classList.add('is-thinking');
    }, delayMove);
}

function undo() {
    gameResult = '*';
    lastMoveSource = null;
    const isEditMode = document.getElementById('editMode').checked;
    try {
        if (isEditMode) {
            engine.takeBack();
        } else {
            engine.takeBack();
            engine.takeBack();
        }
        drawBoard();
        updateCapturedPieces();
    } catch (e) {

    }
}

function newGame() {
    guiScore = 0;
    guiDepth = 0;
    guiTime = 0;
    guiPv = '';
    gameResult = '';
    userTime = 0;
    allowBook = 1;
    lastMoveSource = null;
    nonCaptureMoveCounter = 0;
    const tableChess = data && data.board ? data.board : 'game/images/boards/board-ccbridge.png';
    document.getElementById("xiangqiboard").style.backgroundImage = "url("+tableChess+")";
    document.getElementById("current-board-image").src = tableChess;
    document.getElementById("current-piece-image").src = 'game/images/'+pieceFolder+'/7.svg';
    engine.setBoard(engine.START_FEN);
    drawBoard();
    updateCapturedPieces();
    personPlayerImage.classList.add('is-thinking');
    botPlayerImage.classList.remove('is-thinking');
}

newGame();
if (data && data.music) {
    MUSIC.play();
    MUSIC.loop = true;
}
setBot(data && data.botLevel ? data.botLevel : 'Ongnoi');
const botImage = document.getElementById('bot-player-image');
const personImage = document.getElementById('person-player-image');
const imageModalOverlay = document.getElementById('image-modal-overlay');
const modalImageContent = document.getElementById('modal-image-content');

botImage.addEventListener('click', showLargeImage);
personImage.addEventListener('click', showLargeImage);
imageModalOverlay.addEventListener('click', hideLargeImage);
