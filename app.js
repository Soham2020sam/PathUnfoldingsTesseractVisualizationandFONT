/**
 * Main Application Logic
 */

class TesseractApp {
    constructor() {
        this.grid = this.createEmptyGrid(3, 3);
        this.validator = new TesseractValidator();
        this.visualizer = null;
        this.validationResult = null;

        this.initElements();
        this.initGrid();
        this.bindEvents();
    }

    initElements() {
        // Editor elements
        this.gridContainer = document.getElementById('grid-container');
        this.cellCountEl = document.getElementById('cell-count');
        this.clearBtn = document.getElementById('clear-btn');
        this.validateBtn = document.getElementById('validate-btn');
        this.visualizeBtn = document.getElementById('visualize-btn');
        this.validationMessage = document.getElementById('validation-message');

        // Visualization elements
        this.editorMode = document.getElementById('editor-mode');
        this.vizMode = document.getElementById('viz-mode');
        this.backBtn = document.getElementById('back-btn');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.labelsBtn = document.getElementById('labels-btn');
        this.speedSlider = document.getElementById('speed-slider');
        this.speedValue = document.getElementById('speed-value');
        this.stepCounter = document.getElementById('step-counter');
        this.progressFill = document.getElementById('progress-fill');
    }

    createEmptyGrid(rows, cols) {
        return Array(rows).fill(null).map(() => Array(cols).fill('?'));
    }

    initGrid() {
        this.renderGrid();
        this.updateCellCount();
    }

    renderGrid() {
        this.gridContainer.innerHTML = '';
        const rows = this.grid.length;
        const cols = this.grid[0].length;

        this.gridContainer.style.gridTemplateColumns = `repeat(${cols}, 50px)`;
        this.gridContainer.style.gridTemplateRows = `repeat(${rows}, 50px)`;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                if (this.grid[i][j] === 'g') {
                    cell.classList.add('filled');
                }
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.addEventListener('click', () => this.toggleCell(i, j));
                this.gridContainer.appendChild(cell);
            }
        }
    }

    toggleCell(row, col) {
        if (this.grid[row][col] === 'g') {
            this.grid[row][col] = '?';
            this.shrinkGrid();
        } else {
            this.grid[row][col] = 'g';
            this.checkAndExpandGrid(row, col);
        }

        this.renderGrid();
        this.updateCellCount();
        this.clearValidation();
    }

    checkAndExpandGrid(row, col) {
        const rows = this.grid.length;
        const cols = this.grid[0].length;

        const onTop = row === 0;
        const onBottom = row === rows - 1;
        const onLeft = col === 0;
        const onRight = col === cols - 1;

        if (onTop) this.expandGrid('top');
        if (onBottom) this.expandGrid('bottom');
        if (onLeft) this.expandGrid('left');
        if (onRight) this.expandGrid('right');
    }

    expandGrid(direction) {
        const rows = this.grid.length;
        const cols = this.grid[0].length;

        if (direction === 'top') {
            this.grid.unshift(Array(cols).fill('?'));
        } else if (direction === 'bottom') {
            this.grid.push(Array(cols).fill('?'));
        } else if (direction === 'left') {
            this.grid.forEach(row => row.unshift('?'));
        } else if (direction === 'right') {
            this.grid.forEach(row => row.push('?'));
        }
    }

    shrinkGrid() {
        // Find bounds
        let minRow = Infinity, maxRow = -1;
        let minCol = Infinity, maxCol = -1;

        for (let i = 0; i < this.grid.length; i++) {
            for (let j = 0; j < this.grid[0].length; j++) {
                if (this.grid[i][j] === 'g') {
                    minRow = Math.min(minRow, i);
                    maxRow = Math.max(maxRow, i);
                    minCol = Math.min(minCol, j);
                    maxCol = Math.max(maxCol, j);
                }
            }
        }

        if (minRow === Infinity) {
            // No filled cells
            this.grid = this.createEmptyGrid(3, 3);
            return;
        }

        // Add 1-cell border
        minRow = Math.max(0, minRow - 1);
        maxRow = Math.min(this.grid.length - 1, maxRow + 1);
        minCol = Math.max(0, minCol - 1);
        maxCol = Math.min(this.grid[0].length - 1, maxCol + 1);

        const newRows = maxRow - minRow + 1;
        const newCols = maxCol - minCol + 1;

        if (newRows < this.grid.length || newCols < this.grid[0].length) {
            const newGrid = Array(newRows).fill(null).map(() => Array(newCols).fill('?'));
            for (let i = 0; i < newRows; i++) {
                for (let j = 0; j < newCols; j++) {
                    newGrid[i][j] = this.grid[minRow + i][minCol + j];
                }
            }
            this.grid = newGrid;
        }
    }

    updateCellCount() {
        const count = this.grid.flat().filter(c => c === 'g').length;
        this.cellCountEl.textContent = count;

        // Color code
        if (count === 24) {
            this.cellCountEl.style.color = 'var(--success)';
        } else if (count > 24) {
            this.cellCountEl.style.color = 'var(--error)';
        } else {
            this.cellCountEl.style.color = 'var(--primary)';
        }
    }

    clearValidation() {
        this.validationMessage.className = 'message';
        this.validationMessage.textContent = '';
        this.visualizeBtn.disabled = true;
        this.validationResult = null;
    }

    bindEvents() {
        this.clearBtn.addEventListener('click', () => {
            this.grid = this.createEmptyGrid(3, 3);
            this.renderGrid();
            this.updateCellCount();
            this.clearValidation();
        });

        this.validateBtn.addEventListener('click', () => this.validateGrid());

        this.visualizeBtn.addEventListener('click', () => this.startVisualization());

        this.backBtn.addEventListener('click', () => this.backToEditor());

        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());

        this.resetBtn.addEventListener('click', () => this.resetAnimation());

        this.labelsBtn.addEventListener('click', () => {
            if (this.visualizer) {
                this.visualizer.toggleLabels();
            }
        });

        this.speedSlider.addEventListener('input', (e) => {
            const sliderValue = parseFloat(e.target.value);
            const speed = sliderValue / 10000; // Halved so 1.0x display feels natural
            const displaySpeed = sliderValue / 10; // Display shows normal values
            this.speedValue.textContent = `${displaySpeed.toFixed(1)}x`;
            if (this.visualizer) {
                this.visualizer.setSpeed(speed);
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.vizMode.style.display !== 'none') {
                if (e.code === 'Space') {
                    e.preventDefault();
                    this.togglePlayPause();
                } else if (e.code === 'KeyR') {
                    this.resetAnimation();
                } else if (e.code === 'KeyL') {
                    if (this.visualizer) this.visualizer.toggleLabels();
                }
            }
        });
    }

    validateGrid() {
        this.clearValidation();
        this.validateBtn.textContent = 'Validating...';
        this.validateBtn.disabled = true;

        // Small delay for UI feedback
        setTimeout(() => {
            try {
                this.validationResult = this.validator.validate(this.grid);

                if (this.validationResult.valid) {
                    // Build path order
                    const pathOrder = this.validator.buildPathOrder(this.validationResult.squares);

                    console.log('Path order:', pathOrder);
                    console.log('Solution:', this.validationResult.solution);

                    this.validationMessage.className = 'message success show';
                    this.validationMessage.textContent = '✓ ' + this.validationResult.message;
                    this.visualizeBtn.disabled = false;
                } else {
                    this.validationMessage.className = 'message error show';
                    this.validationMessage.textContent = '✗ ' + this.validationResult.message;
                }
            } catch (error) {
                console.error('Validation error:', error);
                this.validationMessage.className = 'message error show';
                this.validationMessage.textContent = '✗ Error: ' + error.message;
            }

            this.validateBtn.textContent = 'Check Path Unfolding';
            this.validateBtn.disabled = false;
        }, 100);
    }

    startVisualization() {
        if (!this.validationResult || !this.validationResult.valid) return;

        this.editorMode.style.display = 'none';
        this.vizMode.style.display = 'block';

        // Initialize visualizer if needed
        if (!this.visualizer) {
            const canvas = document.getElementById('viz-canvas');
            this.visualizer = new TesseractVisualizer(canvas);
        }

        // Setup visualization
        const pathOrder = this.validator.buildPathOrder(this.validationResult.squares);
        this.visualizer.setupVisualization(
            this.validationResult.solution,
            this.validationResult.squares,
            pathOrder
        );

        // Start animation update loop
        this.updateVisualizationUI();
    }

    updateVisualizationUI() {
        if (this.vizMode.style.display === 'none') return;

        if (this.visualizer) {
            const progress = this.visualizer.getProgress();
            const step = this.visualizer.getCurrentStep();

            this.stepCounter.textContent = `${step} / ${this.visualizer.totalSteps}`;
            this.progressFill.style.width = `${progress * 100}%`;

            if (this.visualizer.isAnimating) {
                this.playPauseBtn.textContent = 'Pause';
            } else {
                this.playPauseBtn.textContent = 'Play';
            }
        }

        requestAnimationFrame(() => this.updateVisualizationUI());
    }

    backToEditor() {
        this.vizMode.style.display = 'none';
        this.editorMode.style.display = 'block';

        if (this.visualizer) {
            this.visualizer.pause();
        }
    }

    togglePlayPause() {
        if (!this.visualizer) return;

        if (this.visualizer.isAnimating) {
            this.visualizer.pause();
        } else {
            this.visualizer.play();
        }
    }

    resetAnimation() {
        if (!this.visualizer) return;
        this.visualizer.reset();
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new TesseractApp();
    window.tesseractApp = app; // For debugging
});
