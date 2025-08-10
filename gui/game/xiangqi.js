/****************************\
 ============================

         INIT ENGINE

 ============================              
\****************************/

// init engine
var engine = new Engine();

// run in browser mode  
console.log('\n  Wukong JS - BROWSER MODE - v' + engine.VERSION);
console.log('  type "engine" for public API reference');


/****************************\
 ============================

           GLOBALS

 ============================              
\****************************/


var book = [];
var botName = ''


/****************************\
 ============================

        XIANGQI BOARD

 ============================              
\****************************/

// piece folder
var pieceFolder = 'traditional_pieces';

// import sounds
const MOVE_SOUND = new Audio('game/sounds/move.wav');
const CAPTURE_SOUND = new Audio('game/sounds/capture.wav');

// square size
const CELL_WIDTH = 46;
const CELL_HEIGHT = 46;

// select color
const SELECT_COLOR = 'brown';

// flip board
var flip = 0;

// flip board
function flipBoard() {
  flip ^= 1;
  drawBoard();
}

// render board in browser
function drawBoard() {
  var chessBoard = '<table cellspacing="0"><tbody>'
  let isCCBridge = document.getElementById('xiangqiboard').style.backgroundImage.includes('ccbridge');

  // board table
  for (let row = 0; row < 14; row++) {
    chessBoard += '<tr>'
    for (let col = 0; col < 11; col++) {
      let file, rank;

      // flip board
      if (flip) {
        file = 11 - 1 - col;
        rank = 14 - 1 - row;
      } else {
        file = col;
        rank = row;
      }

      let square = rank * 11 + file;
      let piece = engine.getPiece(square);
      var pieceImage = '<img style="width: 44px" draggable="true"';
      ///pieceImage += 'src="game/images/' + pieceFolder + '/' + piece + (isCCBridge ? '.png' : '.svg') + '"></img>';
      pieceImage += 'src="game/images/' + pieceFolder + '/' + piece + '.svg' + '"></img>';
      if (engine.squareToString(square) != 'xx') {
        chessBoard +=
          '<td align="center" id="' + square +
          '" width="' + CELL_WIDTH + 'px" height="' + CELL_HEIGHT + 'px" ' +
          ' onclick="tapPiece(this.id)" ' +
          ' ondragstart="dragPiece(event, this.id)" ' +
          ' ondragover="dragOver(event, this.id)"' +
          ' ondrop="dropPiece(event, this.id)">' + (piece ? pieceImage : '') +
          '</td>';
      }
    }

    chessBoard += '</tr>';
  }

  chessBoard += '</tbody></table>';
  document.getElementById('xiangqiboard').innerHTML = chessBoard;
  highlightKingInCheck();
}

// highlight legal moves
function highlightMoves(square) {
  if (document.getElementById('showMoves').checked == false) return;

  let legalMoves = engine.generateLegalMoves();

  for (let count = 0; count < legalMoves.length; count++) {
    let move = legalMoves[count].move;
    let sourceSquare = engine.getSourceSquare(move);
    let targetSquare = engine.getTargetSquare(move);
    if (square == sourceSquare) {
      let parent = document.getElementById(targetSquare);
      parent.style.backgroundImage = 'url("game/images/misc/legal_move.png")';
      parent.style.opacity = '0.50';
      if (parent.childNodes.length) {
        parent.childNodes[0].style.opacity = '0.5';
        parent.style.opacity = '1';
        parent.style.backgroundImage = 'url("game/images/misc/legal_capture.png")';
      }
    }
  }
}

// set bot
function setBot(bot) {
  botName = bot;
  document.getElementById('current-bot-image').src = bots[bot].image;
  document.getElementById('bot-player-image').src = bots[bot].image;
  document.getElementById('bot-player-name').innerText = bot === 'Ongnoi' ? 'Ông Nội' : bot === 'Baba' ? 'Ba Ba' : bot === 'Phuvuong' ? 'Phụ Vương' : bot === 'Laoba' ? 'Lão Ba' : bot === 'Hoangde' ? 'Hoàng Đế' : bot === 'Ongchu' ? 'Ông Chú' : bot === 'Laogia' ? 'Lão Già' : bot;
  fixedTime = bots[bot].time;
  fixedDepth = bots[bot].depth;
  book = JSON.parse(JSON.stringify(bots[bot].book));
}


// set board theme
function setBoardTheme(theme) {
  document.getElementById('xiangqiboard').style.backgroundImage = 'url(' + theme + ')';
  drawBoard();
}

// set piece theme
function setPieceTheme(theme) {
  pieceFolder = theme;
  drawBoard();
}

// play sound
function playSound(move) {
  if (engine.getCaptureFlag(move)) CAPTURE_SOUND.play();
  else MOVE_SOUND.play();
}


/****************************\
 ============================

          USER INPUT

 ============================              
\****************************/

// stats
var guiScore = 0;
var guiDepth = 0;
var guiTime = 0;
var guiPv = '';
var guiSide = 0;
var userTime = 0;
var gameResult = '*';
var guiFen = '';

// difficulty
var fixedTime = 0;
var fixedDepth = 0;

// user input controls
var clickLock = 0;
var allowBook = 1;
var userSource, userTarget;

// 3 fold repetitions
var repetitions = 0;

function highlightPiece(square) {
  if (document.getElementById('editMode').checked) return;
  let piece = engine.getPiece(square);
  if (engine.getPieceColor && engine.getPieceColor(piece) !== guiSide) return;
  document.querySelectorAll('.selected-piece').forEach(img => {
    img.classList.remove('selected-piece');
    img.style.boxShadow = '';
  });

  let td = document.getElementById(square);
  if (td && td.firstChild && td.firstChild.tagName === 'IMG') {
    td.firstChild.classList.add('selected-piece');
  }
}

function highlightKingInCheck() {
    const sides = [0, 1]; // 0 for Red, 1 for Black
    
    sides.forEach(side => {
        // Sử dụng hàm engine.inCheck(side) đã có sẵn
        if (engine.inCheck(side)) {
            // Sử dụng hàm engine.getKingSquare(side) chúng ta vừa thêm
            const kingSquare = engine.getKingSquare(side);
            const td = document.getElementById(kingSquare);
            if (td && td.firstChild && td.firstChild.tagName === 'IMG') {
                td.firstChild.style.boxShadow = '0 0 8px 2px red';
                td.firstChild.style.borderRadius = '50%';
            }
        }
    });
}


// pick piece handler
function dragPiece(event, square) {
  userSource = square;
  highlightMoves(square);
}

// drag piece handler
function dragOver(event, square) {
  event.preventDefault();
  if (square == userSource) event.target.src = '';
}

// drop piece handler
function dropPiece(event, square) {
  userTarget = square;
  let valid = validateMove(userSource, userTarget);
  movePiece(userSource, userTarget);
  if (engine.getPiece(userTarget) == 0) valid = 0;
  clickLock = 0;

  if (engine.getPiece(square) && valid) {
    highlightPiece(square);
    playSound(valid);
  }

  event.preventDefault();
  if (valid) setTimeout(function () { think(); }, 100);
}

// click event handler
function tapPiece(square) {
    const clickSquare = parseInt(square, 10);
    const clickedPiece = engine.getPiece(clickSquare);
    const playerSide = engine.getSide(); // Lấy bên đang có lượt đi

    // --- Trường hợp 1: Đã có một quân cờ được chọn (clickLock = 1) ---
    if (clickLock) {
        // Sử dụng hàm engine.getPieceColor() chúng ta vừa thêm
        // để kiểm tra người dùng có click vào một quân cờ khác CÙNG MÀU không
        if (clickedPiece && engine.getPieceColor(clickedPiece) === playerSide) {
            // Nếu click vào chính nó, hủy chọn
            if (clickSquare === userSource) {
                clickLock = 0;
                userSource = null;
                drawBoard();
            } else {
                // Đây là hành động CHỌN LẠI quân cờ khác
                userSource = clickSquare;
                drawBoard();
                highlightPiece(userSource);
                highlightMoves(userSource);
            }
            return;
        }

        // Nếu không phải là chọn lại, thì đây là một nỗ lực DI CHUYỂN
        userTarget = clickSquare;
        let valid = validateMove(userSource, userTarget);
        clickLock = 0;

        if (valid) {
            playSound(valid);
            movePiece(userSource, userTarget);
            setTimeout(think, 100);
        } else {
            drawBoard();
        }

    // --- Trường hợp 2: Chưa có quân cờ nào được chọn ---
    } else if (clickedPiece && engine.getPieceColor(clickedPiece) === playerSide) {
        drawBoard();
        userSource = clickSquare;
        clickLock = 1;
        highlightPiece(userSource);
        highlightMoves(userSource);
    }
}


/****************************\
 ============================

        ENGINE MOVES

 ============================              
\****************************/

// use opening book
function getBookMove() {
  if (allowBook == 0) return 0;

  let moves = engine.getMoves();
  let lines = [];

  if (moves.length == 0) {
    let randomLine = book[Math.floor(Math.random() * book.length)];
    let firstMove = randomLine.split(' ')[0];
    return engine.moveFromString(firstMove);
  } else if (moves.length) {
    for (let line = 0; line < book.length; line++) {
      let currentLine = moves.join(' ');

      if (book[line].includes(currentLine) && book[line].split(currentLine)[0] == '')
        lines.push(book[line]);
    }
  }

  if (lines.length) {
    let currentLine = moves.join(' ');
    let randomLine = lines[Math.floor(Math.random() * lines.length)];

    try {
      let bookMove = randomLine.split(currentLine)[1].split(' ')[1];
      return engine.moveFromString(bookMove);
    } catch (e) { return 0; }
  }

  return 0;
}

// check for game state
function isGameOver() {
    if (engine.isRepetition()) repetitions++;
    if (repetitions >= 3) {
        gameResult = 'Hòa cờ do lặp lại thế cờ 3 lần!';
        return 1;
    }

    if (engine.getSixty() >= 120) {
        gameResult = 'Hòa cờ theo luật 60 nước đi!';
        return 1;
    }

    if (engine.generateLegalMoves().length === 0) {
        if (engine.inCheck(engine.getSide())) {
            gameResult = (engine.getSide() === 0 ? 'Bên Đen' : 'Bên Đỏ') + ' thắng do chiếu bí!';
        } else {
            gameResult = 'Hòa cờ do hết nước đi hợp lệ!';
        }
        return 1;
    }
    return 0;
}

// engine move
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

  if (botName == 'Baihua') {
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

  setTimeout(function () {
    movePiece(sourceSquare, targetSquare);
    drawBoard();

    if (engine.getPiece(targetSquare)) {
      highlightPiece(targetSquare);
      playSound(bestMove);
      userTime = Date.now();
    }

  }, delayMove);
}

// move piece in GUI
function movePiece(userSource, userTarget) {
    let moveString = engine.squareToString(userSource) + engine.squareToString(userTarget);
    engine.loadMoves(moveString);
    drawBoard();
    if (isGameOver()) {
      setTimeout(function() {
            alert(gameResult);
        }, 150);
    }
}

// take move back
function undo() {
  gameResult = '*';
  try {
    engine.takeBack();
    drawBoard();
  } catch (e) { }
}

// validate move
function validateMove(userSource, userTarget) {
    const legalMoves = engine.generateLegalMoves();
    const attemptedMove = engine.moveFromString(
        engine.squareToString(userSource) + engine.squareToString(userTarget)
    );
    for (let i = 0; i < legalMoves.length; i++) {
        if (legalMoves[i].move === attemptedMove) {
            return attemptedMove;
        }
    }
    return 0;
}

/****************************\
 ============================

        GAME CONTROLS

 ============================              
\****************************/

// start new game
function newGame() {
  guiScore = 0;
  guiDepth = 0;
  guiTime = 0;
  guiPv = '';
  gameResult = '';
  userTime = 0;
  allowBook = 1;
  engine.setBoard(engine.START_FEN);
  drawBoard();
  repetitions = 0;
}

/****************************\
 ============================

          ON STARTUP

 ============================              
\****************************/

newGame();
setBot('Ongnoi');

