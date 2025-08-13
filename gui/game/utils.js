//Lưu trữ và lấy trạng thái cờ tướng trong localStorage
function saveGameState(newData) {
    const oldState = loadGameState() || {};
    const updatedState = {
        ...oldState,
        ...newData
    };
    localStorage.setItem("gameState", JSON.stringify(updatedState));
}

function loadGameState() {
    const savedData = localStorage.getItem("gameState");
    return savedData ? JSON.parse(savedData) : null;
}

function clearGameState() {
    localStorage.removeItem("gameState");
}

//Lưu trữ và lấy trạng thái cờ thế trong localStorage
function getSolvedPuzzles() {
    const solved = localStorage.getItem('solvedPuzzles');
    return solved ? JSON.parse(solved) : [];
}

function saveSolvedPuzzles(solvedList) {
    localStorage.setItem('solvedPuzzles', JSON.stringify(solvedList));
}

function markPuzzleAsSolved(puzzleId) {
    let solvedList = getSolvedPuzzles();
    if (!solvedList.includes(puzzleId)) {
        solvedList.push(puzzleId);
        saveSolvedPuzzles(solvedList);
    }
}


//Vẽ bàn cờ tướng
function drawBoard() {
    var chessBoard = '<table cellspacing="0"><tbody>'
    for (let row = 0; row < 14; row++) {
        chessBoard += '<tr>'
        for (let col = 0; col < 11; col++) {
            let file, rank;

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

            pieceImage += 'src="game/images/' + pieceFolder + '/' + piece + '.svg' + '"></img>';
            if (engine.squareToString(square) != 'xx') {
                let styles = '';
                if (square == lastMoveSource) {
                    styles = 'style="background-image: radial-gradient(circle, rgba(38, 126, 17, 0.47) 25%, transparent 26%); background-position: center; background-repeat: no-repeat;"';
                }

                chessBoard +=
                    '<td align="center" id="' + square +
                    '" width="' + CELL_WIDTH + 'px" height="' + CELL_HEIGHT + 'px" ' +
                    styles +
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

function highlightKingInCheck() {
    const sides = [0, 1];
    sides.forEach(side => {
        if (engine.inCheck(side)) {
            const kingSquare = engine.getKingSquare(side);
            const td = document.getElementById(kingSquare);
            if (td && td.firstChild && td.firstChild.tagName === 'IMG') {
                td.firstChild.style.boxShadow = '0 0 8px 2px red';
                td.firstChild.style.borderRadius = '50%';
            }
        }
    });
}

function flipBoard() {
  flip ^= 1;
  drawBoard();
}

function setBoardTheme(theme) {
    saveGameState({board: theme});
    document.getElementById("current-board-image").src = theme;
    document.getElementById('xiangqiboard').style.backgroundImage = 'url(' + theme + ')';
    drawBoard();
}

function setPieceTheme(theme) {
    saveGameState({piece: theme});
    document.getElementById("current-piece-image").src = 'game/images/'+theme+'/7.svg';
    pieceFolder = theme;
    drawBoard();
}

function playSound(move) {
    const sound = loadGameState().sound;
    if(!sound) return;
    if (engine.getCaptureFlag(move)) CAPTURE_SOUND.play();
    else MOVE_SOUND.play();
}

function highlightPiece(square) {
    if (document.getElementById('editMode') && document.getElementById('editMode').checked) return;
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

function dragPiece(event, square) {
    userSource = square;
    highlightMoves(square);
}

function dragOver(event, square) {
    event.preventDefault();
    if (square == userSource) event.target.src = '';
}

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

function movePiece(userSource, userTarget) {
    lastMoveSource = parseInt(userSource);

    let moveString = engine.squareToString(userSource) + engine.squareToString(userTarget);
    engine.loadMoves(moveString);
    drawBoard();

    if (isGameOver()) {
        if (gameResult.includes('win.png')) {
            WIN_SOUND.play();
        } else if (gameResult.includes('lose.png')) {
            LOSE_SOUND.play();
        } else if (gameResult.includes('draw.png')) {
            DRAW_SOUND.play();
        }

        const gameOverImg = document.getElementById('gameover-img');
        gameOverImg.src = gameResult;
        gameOverImg.style.display = 'block';
        setTimeout(function () {
            gameOverImg.style.display = 'none';
        }, 3000);
    } else if (engine.inCheck(engine.getSide())) {
        CHECK_SOUND.play();
    }
}

function animateAndMovePiece(source, target, move, onComplete) {
    const sourceTD = document.getElementById(source);
    const targetTD = document.getElementById(target);

    if (!sourceTD || !targetTD || !sourceTD.firstChild) {
        movePiece(source, target);
        playSound(move);
        if (onComplete) onComplete();
        return;
    }

    const pieceToAnimate = sourceTD.firstChild;
    const sourceRect = sourceTD.getBoundingClientRect();
    const targetRect = targetTD.getBoundingClientRect();
    
    const animatedPiece = pieceToAnimate.cloneNode(true);
    animatedPiece.style.position = 'absolute';
    animatedPiece.style.left = `${sourceRect.left}px`;
    animatedPiece.style.top = `${sourceRect.top}px`;
    animatedPiece.style.zIndex = '1000';
    animatedPiece.style.transition = 'left 0.3s ease-in-out, top 0.3s ease-in-out';
    
    document.body.appendChild(animatedPiece);
    pieceToAnimate.style.visibility = 'hidden';

    requestAnimationFrame(() => {
        animatedPiece.style.left = `${targetRect.left}px`;
        animatedPiece.style.top = `${targetRect.top}px`;
    });

    setTimeout(() => {
        document.body.removeChild(animatedPiece);
        movePiece(source, target);  
        playSound(move);
        if (onComplete) {
            onComplete();
        }
    }, 300); 
}

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

function highlightMoves(square) {
    if (document.getElementById('showMoves') && document.getElementById('showMoves').checked == false) return;

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