# PuzzleCraft

PuzzleCraft is a browser-based jigsaw puzzle game where you upload your own image, choose a difficulty level, and solve the puzzle by dragging pieces onto the board.

## Highlights

- Custom image upload (click or drag-and-drop)
- Difficulty slider with 9 puzzle sizes: `4, 9, 16, 25, 36, 49, 64, 81, 100`
- Piece snapping when dropped near the correct position
- Move misplaced pieces again until they lock
- Completion screen with centered final image and confetti

## Quick Start

1. Open `index.html` in any modern browser.
2. Upload an image.
3. Choose piece count with the slider.
4. Click `Create Puzzle`.
5. Drag pieces from the right panel onto the board.
6. When all pieces are placed, enjoy the celebration screen and click `Play Again`.

## Controls

- Drag from side panel to board: place a piece
- Drag a piece already on board: reposition it
- Auto-lock: piece snaps and locks when close enough to target
- `Quit Game`: return to home screen and reset current puzzle

## Project Structure

```text
PuzzleMaker/
|-- assets/
|   `-- puzzle-piece.svg
|-- css/
|   `-- styles.css
|-- js/
|   |-- app.js
|   `-- puzzle.js
|-- index.html
`-- README.md
```

## Tech Stack

- HTML5
- CSS3
- JavaScript (ES6+)
- Canvas API

## Customization

- Theme and UI styles: `css/styles.css`
- Board size: `boardWidth` and `boardHeight` in `js/puzzle.js`
- Snap tolerance: `tolerance` in `tryPlacePiece()` in `js/puzzle.js`
- Piece count options: `squares` array in `js/app.js`
- Background dots behavior: `setupBackgroundDots()` in `js/app.js`

## Browser Support

Works on current versions of Chrome, Edge, Firefox, and Safari.

## Troubleshooting

- If the favicon/icon does not update, hard refresh the page (`Ctrl+F5`).
- If a piece does not snap, drop it closer to the correct location.
- If performance feels slow on low-end devices, reduce piece count.

## License

Free to use and modify.
