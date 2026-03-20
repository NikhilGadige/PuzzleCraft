// js/puzzle.js
// PuzzleGame: generates jigsaw-shaped piece canvases while keeping the API expected by your app.js

class PuzzleGame {
    constructor() {
        this.image = null;              // HTMLImageElement provided by app.js
        this.pieces = [];               // model pieces
        this.pieceCount = 16;           // total pieces (perfect square)
        this.gridSize = 4;              // sqrt(pieceCount)
        this.pieceWidth = 0;            // logical grid cell width on board (no tab margins)
        this.pieceHeight = 0;           // logical grid cell height on board (no tab margins)
        this.boardWidth = 500;          // match <canvas id="gameCanvas" width="500" ...>
        this.boardHeight = 500;
        this.placedPieces = new Set();  // set of placed piece ids
        this.showReference = false;     // whether to render faint reference image on board (default: false)
    }

    setImage(imageData) {
        this.image = imageData;
    }

    setPieceCount(count) {
        this.pieceCount = count;
        this.gridSize = Math.sqrt(count);
        if (this.gridSize !== Math.floor(this.gridSize)) {
            throw new Error("Piece count must be a perfect square (4, 9, 16, 25, etc.)");
        }
    }

    createPuzzle() {
        if (!this.image) throw new Error("No image loaded");

        // Draw source image scaled to boardWidth x boardHeight while preserving aspect ratio (letterboxed)
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = this.boardWidth;
        srcCanvas.height = this.boardHeight;
        const sctx = srcCanvas.getContext('2d');

        const img = this.image;
        const scale = Math.min(this.boardWidth / img.width, this.boardHeight / img.height);
        const sw = Math.round(img.width * scale);
        const sh = Math.round(img.height * scale);
        const sx = Math.round((this.boardWidth - sw) / 2);
        const sy = Math.round((this.boardHeight - sh) / 2);

        sctx.fillStyle = '#e8e8e8';
        sctx.fillRect(0, 0, srcCanvas.width, srcCanvas.height);
        sctx.drawImage(img, sx, sy, sw, sh);

        // logical piece cell size (the grid cell size on the board, NOT including tab margins)
        const baseW = Math.round(this.boardWidth / this.gridSize);
        const baseH = Math.round(this.boardHeight / this.gridSize);
        this.pieceWidth = baseW;
        this.pieceHeight = baseH;

        this.pieces = [];

        // margin for tabs so shape doesn't get clipped
        const tabMargin = Math.ceil(Math.min(baseW, baseH) * 0.35);

        // helper: draw jigsaw path on ctx at origin (0,0) for width w and height h
        const drawPiecePath = (ctx, w, h, tabs, tabSize) => {
            const r = tabSize;
            ctx.beginPath();
            ctx.moveTo(0, 0);

            // TOP
            ctx.lineTo(w * 0.25, 0);
            if (tabs.top !== 0) {
                const dir = tabs.top;
                const cx = w * 0.5;
                ctx.bezierCurveTo(cx - r * 1.2, -dir * r, cx + r * 1.2, -dir * r, w * 0.75, 0);
            }
            ctx.lineTo(w, 0);

            // RIGHT
            ctx.lineTo(w, h * 0.25);
            if (tabs.right !== 0) {
                const dir = tabs.right;
                const cy = h * 0.5;
                ctx.bezierCurveTo(w + dir * r, cy - r * 1.2, w + dir * r, cy + r * 1.2, w, h * 0.75);
            }
            ctx.lineTo(w, h);

            // BOTTOM
            ctx.lineTo(w * 0.75, h);
            if (tabs.bottom !== 0) {
                const dir = tabs.bottom;
                const cx = w * 0.5;
                ctx.bezierCurveTo(cx + r * 1.2, h + dir * r, cx - r * 1.2, h + dir * r, w * 0.25, h);
            }
            ctx.lineTo(0, h);

            // LEFT
            ctx.lineTo(0, h * 0.75);
            if (tabs.left !== 0) {
                const dir = tabs.left;
                const cy = h * 0.5;
                ctx.bezierCurveTo(-dir * r, cy + r * 1.2, -dir * r, cy - r * 1.2, 0, h * 0.25);
            }
            ctx.closePath();
        };

        // Create pieces row-major, ensuring neighbor tabs match (opposite signs)
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                // Determine tabs: 0 border, 1 out, -1 in. Match neighbors for seamless fit.
                const above = (row === 0) ? 0 : -this.pieces[(row - 1) * this.gridSize + col].tabs.bottom;
                const left = (col === 0) ? 0 : -this.pieces[row * this.gridSize + (col - 1)].tabs.right;
                const right = (col === this.gridSize - 1) ? 0 : (Math.random() > 0.5 ? 1 : -1);
                const bottom = (row === this.gridSize - 1) ? 0 : (Math.random() > 0.5 ? 1 : -1);
                const tabs = { top: above, right: right, bottom: bottom, left: left };

                // piece canvas includes margins so tabs aren't clipped
                const pieceW = baseW;
                const pieceH = baseH;
                const canvasW = pieceW + tabMargin * 2;
                const canvasH = pieceH + tabMargin * 2;
                const pieceCanvas = document.createElement('canvas');
                pieceCanvas.width = canvasW;
                pieceCanvas.height = canvasH;
                const pctx = pieceCanvas.getContext('2d');

                // translate origin to margin so we can draw path at (0..pieceW, 0..pieceH)
                pctx.translate(tabMargin, tabMargin);

                const tabSize = Math.min(pieceW, pieceH) * 0.18;

                // draw path & clip
                drawPiecePath(pctx, pieceW, pieceH, tabs, tabSize);
                pctx.save();
                pctx.clip();

                // compute which area of the scaled source belongs to this piece
                const srcX = col * pieceW;
                const srcY = row * pieceH;
                // draw the scaled source canvas offset so correct region appears inside clipped area
                pctx.drawImage(srcCanvas, -srcX, -srcY);

                pctx.restore();

                // stroke outline for clarity
                pctx.lineWidth = 2;
                pctx.strokeStyle = 'rgba(0,0,0,0.55)';
                drawPiecePath(pctx, pieceW, pieceH, tabs, tabSize);
                pctx.stroke();

                // compute correct top-left position for the piece's canvas inside board-wrapper
                // (we substract tabMargin so the visible portion lines up with the grid cell at col,row)
                const correctX = col * pieceW - tabMargin;
                const correctY = row * pieceH - tabMargin;

                const piece = {
                    id: row * this.gridSize + col,
                    canvas: pieceCanvas,
                    correctRow: row,
                    correctCol: col,
                    correctX: correctX,
                    correctY: correctY,
                    currentX: null,
                    currentY: null,
                    onBoard: false,
                    placed: false,
                    tabs: tabs,
                    pieceW: pieceW,
                    pieceH: pieceH,
                    canvasW: canvasW,
                    canvasH: canvasH
                };

                this.pieces.push(piece);
            }
        }

        // Shuffle side-panel pieces so they don't appear in order
        this.shufflePieces();
    }

    shufflePieces() {
        for (let i = this.pieces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.pieces[i], this.pieces[j]] = [this.pieces[j], this.pieces[i]];
        }
    }

    getPieceById(id) {
        return this.pieces.find(p => p.id === id) || null;
    }

    getPieces() {
        return this.pieces;
    }

    getPlacedCount() {
        return this.placedPieces.size;
    }

    isComplete() {
        return this.placedPieces.size === this.pieces.length;
    }

    tryPlacePiece(pieceId, dropX, dropY) {
        const piece = this.getPieceById(pieceId);
        if (!piece || piece.placed) {
            console.log(`Piece ${pieceId}: Not found or already placed`);
            return false;
        }

        const correctX = piece.correctX;
        const correctY = piece.correctY;
        const tolerance = 60; // you can tune this value

        const distX = Math.abs(dropX - correctX);
        const distY = Math.abs(dropY - correctY);

        console.log(`[Piece ${pieceId}] Drop: (${dropX.toFixed(0)}, ${dropY.toFixed(0)}) | Target: (${correctX.toFixed(0)}, ${correctY.toFixed(0)}) | Dist: (${distX.toFixed(0)}, ${distY.toFixed(0)}) | Tolerance: ${tolerance}`);

        if (distX < tolerance && distY < tolerance) {
            piece.placed = true;
            piece.onBoard = true;
            piece.currentX = piece.correctX;
            piece.currentY = piece.correctY;
            this.placedPieces.add(pieceId);
            console.log(`[OK] PIECE ${pieceId} PLACED`);
            return true;
        }

        // otherwise just set it on the board at dropped location
        piece.onBoard = true;
        piece.currentX = dropX;
        piece.currentY = dropY;
        console.log(`[MISS] Piece ${pieceId} placed on board at (${dropX.toFixed(0)}, ${dropY.toFixed(0)})`);
        return false;
    }

    // Draw only board background/grid. If this.showReference === true, draw a faint composite as a hint.
    renderBoard(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // neutral background
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (this.showReference && this.pieces.length > 0) {
            // build a composite image from piece canvases (they contain the scaled image pixels)
            const comp = document.createElement('canvas');
            comp.width = this.boardWidth;
            comp.height = this.boardHeight;
            const cctx = comp.getContext('2d');
            for (const p of this.pieces) {
                // draw each piece canvas at its correctX/correctY to reconstruct the complete image
                cctx.drawImage(p.canvas, p.correctX, p.correctY);
            }
            ctx.save();
            ctx.globalAlpha = 0.35; // faint hint
            ctx.drawImage(comp, 0, 0);
            ctx.restore();
        }

        // grid overlay to help players (always visible)
        ctx.strokeStyle = '#d0d0d0';
        ctx.lineWidth = 1;
        for (let i = 1; i < this.gridSize; i++) {
            const x = (i / this.gridSize) * canvas.width;
            const y = (i / this.gridSize) * canvas.height;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    // Render side-panel pieces as .puzzle-piece draggable wrappers (compatible with your app.js)
    renderPieces(containerElement) {
        containerElement.innerHTML = '';

        for (const piece of this.pieces) {
            // skip pieces already on board or placed
            if (piece.onBoard || piece.placed) continue;

            const wrapper = document.createElement('div');
            wrapper.className = 'puzzle-piece';
            wrapper.draggable = true;
            wrapper.dataset.pieceId = piece.id;

            // show the full piece.canvas inside scaled small canvas using CSS sizing
            const c = document.createElement('canvas');
            c.width = piece.canvas.width;
            c.height = piece.canvas.height;
            c.style.width = Math.min(120, this.pieceWidth * 1.2) + 'px';
            c.style.height = Math.min(120, this.pieceHeight * 1.2) + 'px';
            const ctx = c.getContext('2d');
            ctx.drawImage(piece.canvas, 0, 0);

            wrapper.appendChild(c);
            containerElement.appendChild(wrapper);
        }
    }

    renderCompletedPuzzle(canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = this.boardWidth;
        canvas.height = this.boardHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the original image centered with preserved aspect ratio.
        if (this.image) {
            const img = this.image;
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const drawW = img.width * scale;
            const drawH = img.height * scale;
            const offsetX = (canvas.width - drawW) / 2;
            const offsetY = (canvas.height - drawH) / 2;

            ctx.fillStyle = '#0b1325';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        }
    }
}
