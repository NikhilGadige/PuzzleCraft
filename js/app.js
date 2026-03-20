let game = new PuzzleGame();
let selectedImage = null;
let gameCanvas = null;
let piecesContainer = null;
let draggedElement = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    gameCanvas = document.getElementById('gameCanvas');
    piecesContainer = document.getElementById('piecesContainer');

    setupBackgroundDots();
    setupUploadArea();
    setupGameEvents();
});

// Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function goToMenu() {
    // Clear the game state and DOM when returning to menu
    game = new PuzzleGame();
    selectedImage = null;
    draggedElement = null;
    boardDragState = null;
    
    // Clear the board overlay and pieces container
    const overlay = document.getElementById('boardOverlay');
    if (overlay) overlay.innerHTML = '';
    const piecesContainer = document.getElementById('piecesContainer');
    if (piecesContainer) piecesContainer.innerHTML = '';
    
    // Reset preview and slider display
    document.getElementById('previewCanvas').style.display = 'none';
    const sliderCount = document.getElementById('sliderCount');
    const sliderGrid = document.getElementById('sliderGrid');
    if (sliderCount) sliderCount.textContent = '4';
    if (sliderGrid) sliderGrid.textContent = '2x2';
    const slider = document.getElementById('pieceSlider');
    if (slider) slider.value = 0;
    
    showScreen('homeScreen');
}

function goToUpload() {
    // show merged home screen
    showScreen('homeScreen');
    selectedImage = null;
    document.getElementById('previewCanvas').style.display = 'none';
    // reset slider display
    const sliderCount = document.getElementById('sliderCount');
    const sliderGrid = document.getElementById('sliderGrid');
    if (sliderCount) sliderCount.textContent = '4';
    if (sliderGrid) sliderGrid.textContent = '2x2';
}

function startPuzzle() {
    if (!selectedImage) {
        alert('Please select an image first');
        return;
    }

    // slider maps indices to perfect-square piece counts
    const squares = [4,9,16,25,36,49,64,81,100];
    const slider = document.getElementById('pieceSlider');
    const idx = slider ? parseInt(slider.value) : 0;
    const pieceCount = squares[idx] || 4;

    try {
        game = new PuzzleGame();
        game.setImage(selectedImage);
        game.setPieceCount(pieceCount);
        game.createPuzzle();
        
        showScreen('gameScreen');
        document.getElementById('totalCount').textContent = pieceCount;
        document.getElementById('placedCount').textContent = '0';
        
        game.renderPieces(piecesContainer);
        renderGameBoard();
    } catch (error) {
        alert('Error creating puzzle: ' + error.message);
    }
}

// Upload Area Setup
function setupUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const photoInput = document.getElementById('photoInput');

    uploadArea.addEventListener('click', () => photoInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragging');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragging');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragging');
        handleFileSelect(e.dataTransfer.files[0]);
    });

    photoInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files[0]);
    });
}

function handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            selectedImage = img;
            displayPreview(img);
            document.getElementById('pieceSelection').style.display = 'block';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function displayPreview(img) {
    const previewCanvas = document.getElementById('previewCanvas');
    previewCanvas.style.display = 'block';
    previewCanvas.width = 300;
    previewCanvas.height = 300;
    
    const ctx = previewCanvas.getContext('2d');
    // Draw with aspect ratio preservation
    const scale = Math.min(300 / img.width, 300 / img.height);
    const x = (300 - img.width * scale) / 2;
    const y = (300 - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
}

// Game Events
function setupGameEvents() {
    gameCanvas.addEventListener('dragover', handleDragOver);
    gameCanvas.addEventListener('drop', handleDrop);
    // pointer events will be used for moving pieces on the board
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    piecesContainer.addEventListener('dragstart', handleDragStart);
    piecesContainer.addEventListener('dragend', handleDragEnd);
}

function handleDragStart(e) {
    const piece = e.target.closest('.puzzle-piece');
    if (piece) {
        draggedElement = piece;
        piece.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }
}

function handleDragEnd(e) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    if (!draggedElement) return;

    const pieceId = parseInt(draggedElement.dataset.pieceId);
    const rect = gameCanvas.getBoundingClientRect();
    // compute top-left placement so the cursor is roughly centered on the piece
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const dropX = rawX - (game.pieceWidth / 2);
    const dropY = rawY - (game.pieceHeight / 2);

    // Remove original element from side panel
    if (draggedElement && draggedElement.parentElement === piecesContainer) {
        draggedElement.parentElement.removeChild(draggedElement);
    }

    // mark model that the piece is on the board
    game.tryPlacePiece(pieceId, dropX, dropY);

    // Create a DOM element representing the piece on the board overlay
    createBoardPieceElement(pieceId, dropX, dropY);

    // Update placed counter
    document.getElementById('placedCount').textContent = game.getPlacedCount();

    if (game.isComplete()) {
        showCelebration();
    }

    renderGameBoard();
}

// --- Board overlay dragging state ---
let boardDragState = null; // { el, pieceId, offsetX, offsetY }

function createBoardPieceElement(pieceId, x, y) {
    const overlay = document.getElementById('boardOverlay');
    if (!overlay) return;
    const piece = game.getPieceById(pieceId);
    if (!piece) return;

    // create wrapper
    const el = document.createElement('div');
    el.className = 'board-piece';
    el.dataset.pieceId = pieceId;
    el.style.left = x + 'px';
    el.style.top = y + 'px';

    // create inner canvas showing the piece image
    const c = document.createElement('canvas');
    c.width = piece.canvas.width;
    c.height = piece.canvas.height;
    c.style.width = piece.canvas.width + 'px';
    c.style.height = piece.canvas.height + 'px';
    const ctx = c.getContext('2d');
    ctx.drawImage(piece.canvas, 0, 0);

    el.appendChild(c);
    overlay.appendChild(el);

    // update model current pos
    piece.onBoard = true;
    piece.currentX = x;
    piece.currentY = y;

    // If it's already correct (tryPlacePiece marked placed), lock it
    if (piece.placed) {
        el.classList.add('locked');
        el.style.pointerEvents = 'none';
        // snap exactly
        el.style.left = piece.correctX + 'px';
        el.style.top = piece.correctY + 'px';
        return;
    }

    // for movable (incorrect) pieces, enable pointer dragging
    el.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        startBoardDrag(ev, el, pieceId);
    });
}

function startBoardDrag(ev, el, pieceId) {
    el.setPointerCapture(ev.pointerId);
    const rect = el.getBoundingClientRect();
    const overlayRect = document.getElementById('boardOverlay').getBoundingClientRect();
    const offsetX = ev.clientX - rect.left;
    const offsetY = ev.clientY - rect.top;
    boardDragState = { el, pieceId, offsetX, offsetY };
    el.classList.add('dragging');
}

function handlePointerMove(ev) {
    if (!boardDragState) return;
    const { el, pieceId, offsetX, offsetY } = boardDragState;
    const overlayRect = document.getElementById('boardOverlay').getBoundingClientRect();
    // compute new top-left relative to overlay
    const x = ev.clientX - overlayRect.left - offsetX;
    const y = ev.clientY - overlayRect.top - offsetY;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    // update model current pos while dragging
    const piece = game.getPieceById(pieceId);
    if (piece) {
        piece.currentX = x;
        piece.currentY = y;
    }
}

function handlePointerUp(ev) {
    if (!boardDragState) return;
    const { el, pieceId } = boardDragState;
    boardDragState = null;
    el.classList.remove('dragging');

    // check if now correctly placed
    const piece = game.getPieceById(pieceId);
    if (!piece) return;
    const placedNow = game.tryPlacePiece(pieceId, piece.currentX, piece.currentY);
    if (placedNow) {
        // snap DOM and lock
        el.style.left = piece.correctX + 'px';
        el.style.top = piece.correctY + 'px';
        el.classList.add('locked');
        el.style.pointerEvents = 'none';
    }

    // update placed count
    document.getElementById('placedCount').textContent = game.getPlacedCount();

    if (game.isComplete()) showCelebration();
}

function renderGameBoard() {
    game.renderBoard(gameCanvas);
}

function showCelebration() {
    showScreen('celebrationScreen');
    
    // Render completed puzzle
    const completedCanvas = document.getElementById('completedPuzzleCanvas');
    game.renderCompletedPuzzle(completedCanvas);
    
    // Create confetti
    createConfetti();
}

function createConfetti() {
    const confettiContainer = document.getElementById('confetti');
    confettiContainer.innerHTML = '';

    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];

    for (let i = 0; i < 50; i++) {
        const confettiPiece = document.createElement('div');
        confettiPiece.className = 'confetti-piece';
        confettiPiece.style.left = Math.random() * 100 + '%';
        confettiPiece.style.background = colors[Math.floor(Math.random() * colors.length)];
        confettiPiece.style.animationDelay = Math.random() * 0.5 + 's';
        confettiPiece.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confettiContainer.appendChild(confettiPiece);
    }
}

// Setup slider UI and start button
document.addEventListener('DOMContentLoaded', () => {
    const squares = [4,9,16,25,36,49,64,81,100];
    const slider = document.getElementById('pieceSlider');
    const sliderCount = document.getElementById('sliderCount');
    const sliderGrid = document.getElementById('sliderGrid');
    const startBtn = document.getElementById('startBtn');

    function updateSliderUI() {
        if (!slider) return;
        const idx = parseInt(slider.value) || 0;
        const count = squares[idx] || 4;
        const grid = Math.sqrt(count);
        if (sliderCount) sliderCount.textContent = count;
        if (sliderGrid) sliderGrid.textContent = `${grid}x${grid}`;
    }

    if (slider) {
        slider.addEventListener('input', updateSliderUI);
        // Set initial value to 0 (2x2) and update UI
        slider.value = 0;
        updateSliderUI();
    }

    if (startBtn) {
        startBtn.addEventListener('click', startPuzzle);
    }
});

function setupBackgroundDots() {
    const canvas = document.getElementById('backgroundDots');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dots = [];
    const dotCount = 90;
    let animationId = null;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function resetDot(dot) {
        dot.x = Math.random() * canvas.width;
        dot.y = Math.random() * canvas.height;
        dot.radius = Math.random() * 1.6 + 0.4;
        dot.vx = (Math.random() - 0.5) * 0.25;
        dot.vy = (Math.random() - 0.5) * 0.25;
        dot.alpha = Math.random() * 0.5 + 0.25;
    }

    function initDots() {
        dots.length = 0;
        for (let i = 0; i < dotCount; i++) {
            const dot = {};
            resetDot(dot);
            dots.push(dot);
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const dot of dots) {
            dot.x += dot.vx;
            dot.y += dot.vy;

            if (dot.x < -5) dot.x = canvas.width + 5;
            if (dot.x > canvas.width + 5) dot.x = -5;
            if (dot.y < -5) dot.y = canvas.height + 5;
            if (dot.y > canvas.height + 5) dot.y = -5;

            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${dot.alpha})`;
            ctx.fill();
        }

        animationId = requestAnimationFrame(animate);
    }

    resizeCanvas();
    initDots();
    animate();

    window.addEventListener('resize', () => {
        resizeCanvas();
        initDots();
    });

    window.addEventListener('beforeunload', () => {
        if (animationId) cancelAnimationFrame(animationId);
    });
}
