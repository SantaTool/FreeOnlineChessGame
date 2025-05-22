const initialBoard = [
  ["r","n","b","q","k","b","n","r"],
  ["p","p","p","p","p","p","p","p"],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["","","","","","","",""],
  ["P","P","P","P","P","P","P","P"],
  ["R","N","B","Q","K","B","N","R"]
];
const pieceUnicode = {
  K: "&#9812;", Q: "&#9813;", R: "&#9814;", B: "&#9815;", N: "&#9816;", P: "", // Pawn handled separately
  k: "&#9818;", q: "&#9819;", r: "&#9820;", b: "&#9821;", n: "&#9822;", p: "" // Pawn handled separately
};
let board = JSON.parse(JSON.stringify(initialBoard));
let selected = null;
let currentPlayer = "white";
function renderBoard() {
  const boardDiv = document.getElementById("chessboard");
  boardDiv.innerHTML = "";
  let legalMoves = [];
  if (selected) {
    const [fr, fc] = selected;
    for (let tr = 0; tr < 8; tr++) {
      for (let tc = 0; tc < 8; tc++) {
        if ((fr !== tr || fc !== tc) && isValidMove([fr, fc], [tr, tc], {enPassant: enPassantTarget, castling: castlingRights[currentPlayer]})) {
          // Simulate move to ensure king safety
          const backup = JSON.parse(JSON.stringify(board));
          const captured = board[tr][tc];
          board[tr][tc] = board[fr][fc];
          board[fr][fc] = "";
          let kingSafe = !isKingInCheck(currentPlayer === "white");
          board[fr][fc] = board[tr][tc];
          board[tr][tc] = captured;
          if (kingSafe) legalMoves.push(tr + "," + tc);
        }
      }
    }
  }
  // Find checked king position
  let checkedKing = null;
  const isWhite = currentPlayer === 'white';
  if (isKingInCheck(isWhite)) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((isWhite && board[r][c] === 'K') || (!isWhite && board[r][c] === 'k')) {
          checkedKing = [r, c];
        }
      }
    }
  }
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      square.className = `square ${(row+col)%2===0 ? 'light' : 'dark'}`;
      if (checkedKing && checkedKing[0] === row && checkedKing[1] === col) {
        square.classList.add("king-in-check");
      }
      square.dataset.row = row;
      square.dataset.col = col;
      if (selected && selected[0] === row && selected[1] === col) {
        square.classList.add("selected");
      }
      const piece = board[row][col];
      if (piece === "P" || piece === "p") {
        const pawn = document.createElement("div");
        pawn.className = `pawn ${piece === "p" ? 'black' : ''}`;
        square.appendChild(pawn);
      } else if (piece) {
        square.innerHTML = pieceUnicode[piece];
      }
      // Add move dot if this is a legal move
      if (legalMoves.includes(row + "," + col)) {
        const dot = document.createElement("div");
        dot.className = "move-dot";
        square.appendChild(dot);
      }
      square.onclick = () => handleSquareClick(row, col);
      boardDiv.appendChild(square);
    }
  }
}
let audioMuted = false;
const moveSound = new Audio('audio/move-sound.mp3');
const captureSound = new Audio('audio/capture-sound.mp3');
const winSound = new Audio('audio/win-sound.mp3');
const drawSound = new Audio('audio/gamedraw-sound.mp3');
const newGameSound = new Audio('audio/board-start.mp3');
const promotionSound = new Audio('audio/promotion-sound.mp3');
function playSound(sound) {
  if (!audioMuted) {
    sound.currentTime = 0;
    sound.play();
  }
}
function isValidMove(from, to, options = {}) {
  const [fr, fc] = from, [tr, tc] = to;
  const piece = board[fr][fc];
  if (!piece) return false;
  const target = board[tr][tc];
  const isWhite = /[A-Z]/.test(piece);
  const isBlack = /[a-z]/.test(piece);
  if ((isWhite && /[A-Z]/.test(target)) || (isBlack && /[a-z]/.test(target))) return false;
  const dr = tr - fr, dc = tc - fc;
  // Pawn
  if (piece === "P" || piece === "p") {
    const dir = piece === "P" ? -1 : 1;
    const startRow = piece === "P" ? 6 : 1;
    // Single move
    if (dc === 0 && dr === dir && !target) return true;
    // Double move from start
    if (dc === 0 && fr === startRow && dr === 2 * dir && !board[fr + dir][fc] && !target) return true;
    // Capture
    if (Math.abs(dc) === 1 && dr === dir && target && ((piece === "P" && /[a-z]/.test(target)) || (piece === "p" && /[A-Z]/.test(target)))) return true;
    // En passant (requires options.enPassant)
    if (Math.abs(dc) === 1 && dr === dir && !target && options.enPassant && options.enPassant[0] === tr && options.enPassant[1] === tc) return true;
    return false;
  }
  // Knight
  if (piece.toLowerCase() === "n") {
    return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
  }
  // Bishop
  if (piece.toLowerCase() === "b") {
    if (Math.abs(dr) !== Math.abs(dc)) return false;
    for (let i = 1; i < Math.abs(dr); i++) {
      if (board[fr + i * Math.sign(dr)][fc + i * Math.sign(dc)]) return false;
    }
    return true;
  }
  // Rook
  if (piece.toLowerCase() === "r") {
    if (dr !== 0 && dc !== 0) return false;
    if (dr === 0) {
      for (let i = 1; i < Math.abs(dc); i++) {
        if (board[fr][fc + i * Math.sign(dc)]) return false;
      }
    } else {
      for (let i = 1; i < Math.abs(dr); i++) {
        if (board[fr + i * Math.sign(dr)][fc]) return false;
      }
    }
    return true;
  }
  // Queen
  if (piece.toLowerCase() === "q") {
    if (Math.abs(dr) === Math.abs(dc)) {
      for (let i = 1; i < Math.abs(dr); i++) {
        if (board[fr + i * Math.sign(dr)][fc + i * Math.sign(dc)]) return false;
      }
      return true;
    }
    if (dr === 0 || dc === 0) {
      if (dr === 0) {
        for (let i = 1; i < Math.abs(dc); i++) {
          if (board[fr][fc + i * Math.sign(dc)]) return false;
        }
      } else {
        for (let i = 1; i < Math.abs(dr); i++) {
          if (board[fr + i * Math.sign(dr)][fc]) return false;
        }
      }
      return true;
    }
    return false;
  }
  // King
  if (piece.toLowerCase() === "k") {
    if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) return true;
    // Castling (requires options.castling)
    if (fr === tr && Math.abs(dc) === 2 && options.castling) {
      // King-side
      if (dc === 2 && options.castling.kingside && !board[fr][fc+1] && !board[fr][fc+2]) return true;
      // Queen-side
      if (dc === -2 && options.castling.queenside && !board[fr][fc-1] && !board[fr][fc-2] && !board[fr][fc-3]) return true;
    }
    return false;
  }
  return false;
}
function isKingInCheck(isWhite) {
  let kingRow = -1, kingCol = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (isWhite && piece === 'K') { kingRow = r; kingCol = c; }
      if (!isWhite && piece === 'k') { kingRow = r; kingCol = c; }
    }
  }
  return isSquareUnderAttack(kingRow, kingCol, !isWhite);
}

function hasLegalMoves(isWhite) {
  for (let fr = 0; fr < 8; fr++) {
    for (let fc = 0; fc < 8; fc++) {
      const piece = board[fr][fc];
      if (!piece) continue;
      if (isWhite && !/[A-Z]/.test(piece)) continue;
      if (!isWhite && !/[a-z]/.test(piece)) continue;
      for (let tr = 0; tr < 8; tr++) {
        for (let tc = 0; tc < 8; tc++) {
          // Try all possible moves
          if (isValidMove([fr, fc], [tr, tc], {enPassant: enPassantTarget, castling: castlingRights[isWhite ? 'white' : 'black']})) {
            // Make the move on a copy of the board
            const backup = JSON.parse(JSON.stringify(board));
            const captured = board[tr][tc];
            board[tr][tc] = board[fr][fc];
            board[fr][fc] = "";
            const inCheck = isKingInCheck(isWhite);
            // Undo move
            board[fr][fc] = board[tr][tc];
            board[tr][tc] = captured;
            if (!inCheck) return true;
          }
        }
      }
    }
  }
  return false;
}

function updateStatus() {
  const isWhite = currentPlayer === 'white';
  if (isKingInCheck(isWhite)) {
    if (!hasLegalMoves(isWhite)) {
      document.getElementById("gameStatus").textContent = (isWhite ? "Black" : "White") + " wins by checkmate!";
      playSound(winSound);
      return;
    } else {
      document.getElementById("gameStatus").textContent = (isWhite ? "White" : "Black") + " is in check!";
      return;
    }
  } else if (!hasLegalMoves(isWhite)) {
    document.getElementById("gameStatus").textContent = "Draw by stalemate!";
    playSound(drawSound);
    return;
  }
  document.getElementById("gameStatus").textContent = `${currentPlayer.charAt(0).toUpperCase()+currentPlayer.slice(1)}'s turn`;
}
window.onload = () => {
  renderBoard();
  updateStatus();
  document.getElementById('audioIcon').textContent = audioMuted ? '🔇' : '🔊';
  document.getElementById('newGameBtn').onclick = () => {
    board = JSON.parse(JSON.stringify(initialBoard));
    selected = null;
    currentPlayer = "white";
    castlingRights = {white: {kingside: true, queenside: true}, black: {kingside: true, queenside: true}};
    enPassantTarget = null;
    renderBoard();
    updateStatus();
    playSound(newGameSound);
  };
  document.getElementById('audioBtn').onclick = () => {
    audioMuted = !audioMuted;
    document.getElementById('audioIcon').textContent = audioMuted ? '🔇' : '🔊';
    document.getElementById('audioBtn').onclick = () => {
      audioMuted = !audioMuted;
      document.getElementById('audioIcon').textContent = audioMuted ? '🔇' : '🔊';
      document.getElementById('audioBtn').title = audioMuted ? 'Unmute Audio' : 'Mute Audio';
    };    
    document.getElementById('audioBtn').title = audioMuted ? 'Unmute Audio' : 'Mute Audio';
  };
  document.getElementById('fullscreenBtn').onclick = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };
  document.getElementById('themeSelect').onchange = (e) => {
    setTheme(e.target.value);
  };
  document.getElementById('instructionsBtn').onclick = () => {
    const instr = document.getElementById('instructions');
    instr.style.display = instr.style.display === 'none' ? 'block' : 'none';
  };
  document.getElementById('historyBtn').onclick = () => {
    const hist = document.getElementById('history');
    hist.style.display = hist.style.display === 'none' ? 'block' : 'none';
  };
};
let castlingRights = {white: {kingside: true, kingside: true}, black: {kingside: true, queenside: true}};
let enPassantTarget = null;

// Helper: show a modal for pawn promotion
function showPromotionDialog(isWhite, callback) {
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.left = '0';
  modal.style.top = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.5)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = 9999;
  const choices = isWhite ? ['Q','R','B','N'] : ['q','r','b','n'];
  const box = document.createElement('div');
  box.style.background = '#fff';
  box.style.padding = '24px';
  box.style.borderRadius = '8px';
  box.style.display = 'flex';
  box.style.gap = '16px';
  choices.forEach(piece => {
    const btn = document.createElement('button');
    btn.textContent = piece.toUpperCase();
    btn.style.fontSize = '2rem';
    btn.onclick = () => {
      document.body.removeChild(modal);
      callback(piece);
    };
    box.appendChild(btn);
  });
  modal.appendChild(box);
  document.body.appendChild(modal);
}

// Helper: check if a square is under attack by opponent
function isSquareUnderAttack(row, col, byWhite) {
  // Pawn attacks
  if (byWhite) {
    if (row > 0 && col > 0 && board[row-1][col-1] === 'P') return true;
    if (row > 0 && col < 7 && board[row-1][col+1] === 'P') return true;
  } else {
    if (row < 7 && col > 0 && board[row+1][col-1] === 'p') return true;
    if (row < 7 && col < 7 && board[row+1][col+1] === 'p') return true;
  }
  // Knight attacks
  const knightMoves = [
    [-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]
  ];
  for (const [dr, dc] of knightMoves) {
    const r = row + dr, c = col + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const piece = board[r][c];
      if (byWhite && piece === 'N') return true;
      if (!byWhite && piece === 'n') return true;
    }
  }
  // Sliding pieces: bishop/queen (diagonals)
  for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
    for (let i = 1; i < 8; i++) {
      const r = row + dr*i, c = col + dc*i;
      if (r < 0 || r > 7 || c < 0 || c > 7) break;
      const piece = board[r][c];
      if (!piece) continue;
      if (byWhite && (piece === 'B' || piece === 'Q')) return true;
      if (!byWhite && (piece === 'b' || piece === 'q')) return true;
      break;
    }
  }
  // Sliding pieces: rook/queen (straight lines)
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    for (let i = 1; i < 8; i++) {
      const r = row + dr*i, c = col + dc*i;
      if (r < 0 || r > 7 || c < 0 || c > 7) break;
      const piece = board[r][c];
      if (!piece) continue;
      if (byWhite && (piece === 'R' || piece === 'Q')) return true;
      if (!byWhite && (piece === 'r' || piece === 'q')) return true;
      break;
    }
  }
  // King attacks (adjacent squares)
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const piece = board[r][c];
        if (byWhite && piece === 'K') return true;
        if (!byWhite && piece === 'k') return true;
      }
    }
  }
  return false;
}

// Update handleSquareClick for refined promotion and castling legality
function handleSquareClick(row, col) {
  const piece = board[row][col];
  if (selected) {
    const [fr, fc] = selected;
    const moveOptions = {
      enPassant: enPassantTarget,
      castling: castlingRights[currentPlayer]
    };
    if (isValidMove(selected, [row, col], moveOptions)) {
      // Simulate the move to check for king safety
      const backup = JSON.parse(JSON.stringify(board));
      const captured = board[row][col];
      board[row][col] = board[fr][fc];
      board[fr][fc] = "";
      let kingSafe = true;
      if (isKingInCheck(currentPlayer === "white")) {
        kingSafe = false;
      }
      // Undo the move
      board[fr][fc] = board[row][col];
      board[row][col] = captured;
      if (!kingSafe) {
        selected = null;
        renderBoard();
        // Optionally, show a warning or play a sound here
        return;
      }
      // Castling legality: king cannot castle through/into check
      if (board[fr][fc].toLowerCase() === 'k' && Math.abs(col - fc) === 2) {
        // Prevent castling if king is in check
        if (isKingInCheck(currentPlayer === 'white')) {
          selected = null;
          renderBoard();
          return;
        }
        const step = col > fc ? 1 : -1;
        for (let c = fc; c !== col + step; c += step) {
          if (isSquareUnderAttack(fr, c, currentPlayer === 'black')) {
            selected = null;
            renderBoard();
            return;
          }
        }
        // Move rook for castling
        if (col > fc) {
          board[row][5] = board[row][7];
          board[row][7] = "";
        } else {
          board[row][3] = board[row][0];
          board[row][0] = "";
        }
        castlingRights[currentPlayer].kingside = false;
        castlingRights[currentPlayer].queenside = false;
      }
      // En passant capture
      if (board[fr][fc].toLowerCase() === 'p' && enPassantTarget && row === enPassantTarget[0] && col === enPassantTarget[1] && !piece) {
        board[fr][col] = "";
        playSound(new Audio('audio/move-sound1.mp3'));
      }
      // Move piece
      const isCapture = piece && ((currentPlayer === 'white' && /[a-z]/.test(piece)) || (currentPlayer === 'black' && /[A-Z]/.test(piece)));
      board[row][col] = board[fr][fc];
      board[fr][fc] = "";
      if (isCapture) {
        playSound(new Audio('audio/move-sound1.mp3'));
      } else {
        playSound(moveSound);
      }
      // Pawn promotion with modal
      if ((board[row][col] === 'P' && row === 0) || (board[row][col] === 'p' && row === 7)) {
        showPromotionDialog(/[A-Z]/.test(board[row][col]), function(promoted) {
          board[row][col] = promoted;
          playSound(promotionSound); // Play promotion sound
          renderBoard();
        });
      }
      // Update castling rights
      if (board[row][col].toLowerCase() === 'k') {
        castlingRights[currentPlayer].kingside = false;
        castlingRights[currentPlayer].queenside = false;
      }
      if (board[row][col].toLowerCase() === 'r') {
        if (fr === 7 && fc === 0) castlingRights.white.queenside = false;
        if (fr === 7 && fc === 7) castlingRights.white.kingside = false;
        if (fr === 0 && fc === 0) castlingRights.black.queenside = false;
        if (fr === 0 && fc === 7) castlingRights.black.kingside = false;
      }
      // Set en passant target
      if (board[row][col].toLowerCase() === 'p' && Math.abs(row - fr) === 2) {
        enPassantTarget = [fr + (row - fr) / 2, fc];
      } else {
        enPassantTarget = null;
      }
      selected = null;
      currentPlayer = currentPlayer === "white" ? "black" : "white";
      renderBoard();
      updateStatus();
      return;
    } else {
      selected = null;
      renderBoard();
      return;
    }
  }
  if ((currentPlayer === "white" && /[A-Z]/.test(piece)) || (currentPlayer === "black" && /[a-z]/.test(piece))) {
    selected = [row, col];
    renderBoard();
  }
}
function setTheme(theme) {
  document.body.classList.remove('theme-dark', 'theme-blue', 'theme-green', 'theme-pink', 'theme-classic');
  if (theme === 'dark') document.body.classList.add('theme-dark');
  if (theme === 'blue') document.body.classList.add('theme-blue');
  if (theme === 'green') document.body.classList.add('theme-green');
  if (theme === 'pink') document.body.classList.add('theme-pink');
  if (theme === 'classic') document.body.classList.add('theme-classic');
}