/**
 * Tesseract Logic - Ported from C++
 * Handles validation, face labeling, and path finding
 */

// Tesseract face definitions (all 24 faces)
const TESSERACT_FACES = [
    "ABCD", "ABba", "BCcb", "DCcd", "abcd", "ADda",
    "EFGH", "EFfe", "FGgf", "HGgh", "efgh", "EHhe",
    "BCGF", "BbfF", "ABFE", "EHDA", "AEea", "abfe",
    "adhe", "DHhd", "cdhg", "gfbc", "CGgc", "CDHG"
];

// Vertex mapping
const VERTEX_MAP = {
    'A': 0, 'B': 1, 'C': 2, 'D': 3,
    'E': 4, 'F': 5, 'G': 6, 'H': 7,
    'a': 8, 'b': 9, 'c': 10, 'd': 11,
    'e': 12, 'f': 13, 'g': 14, 'h': 15
};

class TesseractValidator {
    constructor() {
        this.edges = {};
        this.adj = [];
        this.solution = [];
        this.removedEdge = { i: -1, j: -1 };
        this.initializeEdges();
    }

    initializeEdges() {
        // Build edge mapping
        for (let i = 0; i < 24; i++) {
            const face = TESSERACT_FACES[i];
            for (let j = 0; j < 4; j++) {
                const edge = face[j] + face[(j + 1) % 4];
                if (!this.edges[edge]) this.edges[edge] = [];
                this.edges[edge].push(face);

                const edgeRev = face[(j + 1) % 4] + face[j];
                if (!this.edges[edgeRev]) this.edges[edgeRev] = [];
                this.edges[edgeRev].push(face);
            }
        }
    }

    expandGrid(grid) {
        // Convert grid to 4x resolution for edge detection
        const rows = grid.length;
        const cols = grid[0].length;
        const n = rows * 4;
        const m = cols * 4;
        const expanded = Array(n).fill(null).map(() => Array(m).fill('x'));

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (grid[i][j] === '?') {
                    for (let k = 0; k <= 3; k++) {
                        for (let l = 0; l <= 3; l++) {
                            expanded[4 * i + k][4 * j + l] = 'x';
                        }
                    }
                } else {
                    // Draw square border
                    expanded[4 * i][4 * j] = '+';
                    expanded[4 * i + 3][4 * j] = '+';
                    expanded[4 * i][4 * j + 3] = '+';
                    expanded[4 * i + 3][4 * j + 3] = '+';
                    expanded[4 * i][4 * j + 1] = '-';
                    expanded[4 * i][4 * j + 2] = '-';
                    expanded[4 * i + 3][4 * j + 1] = '-';
                    expanded[4 * i + 3][4 * j + 2] = '-';
                    expanded[4 * i + 1][4 * j] = '|';
                    expanded[4 * i + 2][4 * j] = '|';
                    expanded[4 * i + 1][4 * j + 3] = '|';
                    expanded[4 * i + 2][4 * j + 3] = '|';
                    for (let k = 1; k <= 2; k++) {
                        for (let l = 1; l <= 2; l++) {
                            expanded[4 * i + k][4 * j + l] = 'x';
                        }
                    }
                }
            }
        }

        return expanded;
    }

    findSquares(grid) {
        const n = grid.length;
        const m = grid[0].length;
        const squares = [];

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < m; j++) {
                if (grid[i][j] === '+') {
                    if (i + 3 < n && j + 3 < m &&
                        grid[i][j + 1] === '-' && grid[i][j + 2] === '-' && grid[i][j + 3] === '+' &&
                        grid[i + 1][j] === '|' && grid[i + 2][j] === '|' &&
                        grid[i + 3][j] === '+' && grid[i + 3][j + 1] === '-' &&
                        grid[i + 3][j + 2] === '-' && grid[i + 1][j + 3] === '|' &&
                        grid[i + 2][j + 3] === '|' && grid[i + 3][j + 3] === '+') {
                        squares.push({ row: i / 4, col: j / 4 });
                    }
                }
            }
        }

        return squares;
    }

    buildAdjacency(squares) {
        this.adj = Array(squares.length).fill(null).map(() => []);

        for (let i = 0; i < squares.length; i++) {
            for (let j = 0; j < squares.length; j++) {
                if (i === j) continue;

                const rowDiff = squares[i].row - squares[j].row;
                const colDiff = squares[i].col - squares[j].col;

                if (rowDiff === 1 && colDiff === 0) {
                    this.adj[i].push({ idx: j, dir: 'N' });
                } else if (rowDiff === -1 && colDiff === 0) {
                    this.adj[i].push({ idx: j, dir: 'S' });
                } else if (colDiff === 1 && rowDiff === 0) {
                    this.adj[i].push({ idx: j, dir: 'W' });
                } else if (colDiff === -1 && rowDiff === 0) {
                    this.adj[i].push({ idx: j, dir: 'E' });
                }
            }
        }
    }

    recurse(cur, visited, visited2, idx) {
        visited[idx] = true;
        const sorted = cur.split('').sort().join('');
        visited2[sorted] = true;

        let curPath = [];

        for (const neighbor of this.adj[idx]) {
            if (visited[neighbor.idx]) continue;

            const dir = neighbor.dir;
            let edgeChars = '';

            if (dir === 'N') edgeChars = cur[0] + cur[1];
            else if (dir === 'E') edgeChars = cur[1] + cur[2];
            else if (dir === 'S') edgeChars = cur[2] + cur[3];
            else if (dir === 'W') edgeChars = cur[3] + cur[0];

            const possibleFaces = this.edges[edgeChars] || [];

            for (const face of possibleFaces) {
                const faceSorted = face.split('').sort().join('');
                if (visited2[faceSorted]) continue;

                // Try all rotations
                let matchedFace = this.tryMatchFace(face, cur, dir);
                if (matchedFace) {
                    const results = this.recurse(matchedFace, [...visited], { ...visited2 }, neighbor.idx);
                    curPath.push(...results);
                }
            }
        }

        if (curPath.length === 0) {
            const solution = Array(24).fill('');
            solution[idx] = cur;
            return [solution];
        }

        const result = [];
        for (const path of curPath) {
            path[idx] = cur;
            const uniqueFaces = new Set(path.filter(f => f !== ''));
            if (uniqueFaces.size === path.filter(f => f !== '').length) {
                result.push(path);
            }
        }

        return result;
    }

    tryMatchFace(face, cur, dir) {
        // Try normal orientation
        for (let rotation = 0; rotation < 4; rotation++) {
            const rotated = this.rotateFace(face, rotation);
            if (this.checkMatch(rotated, cur, dir)) {
                return rotated;
            }
        }

        // Try reversed
        const reversed = face.split('').reverse().join('');
        for (let rotation = 0; rotation < 4; rotation++) {
            const rotated = this.rotateFace(reversed, rotation);
            if (this.checkMatch(rotated, cur, dir)) {
                return rotated;
            }
        }

        return null;
    }

    rotateFace(face, times) {
        let result = face;
        for (let i = 0; i < times; i++) {
            result = result[3] + result[0] + result[1] + result[2];
        }
        return result;
    }

    checkMatch(face, cur, dir) {
        if (dir === 'N') return face[2] === cur[1] && face[3] === cur[0];
        if (dir === 'E') return face[0] === cur[1] && face[3] === cur[2];
        if (dir === 'S') return face[1] === cur[2] && face[0] === cur[3];
        if (dir === 'W') return face[2] === cur[3] && face[1] === cur[0];
        return false;
    }

    validate(grid) {
        console.log('Validating grid...');

        // Expand grid
        const expanded = this.expandGrid(grid);
        const squares = this.findSquares(expanded);

        console.log(`Found ${squares.length} squares`);

        if (squares.length !== 24) {
            return {
                valid: false,
                message: `Not 24 squares in the grid (found ${squares.length})`
            };
        }

        // Build adjacency
        this.buildAdjacency(squares);

        // Find degree-1 node or try removing edges
        let startIdx = this.adj.findIndex(neighbors => neighbors.length === 1);

        if (startIdx !== -1) {
            // Try from degree-1 node
            const visited = Array(24).fill(false);
            const visited2 = {};
            const results = this.recurse('ABCD', visited, visited2, startIdx);

            if (results.some(r => r.filter(f => f !== '').length === 24)) {
                this.solution = results.find(r => r.filter(f => f !== '').length === 24);
                this.removedEdge = { i: -1, j: -1 };
                return { valid: true, message: 'Path Unfolding!', squares, solution: this.solution };
            }
        }

        // Try removing edges
        for (let i = 0; i < squares.length; i++) {
            for (let j = i + 1; j < squares.length; j++) {
                const neighbor = this.adj[i].find(n => n.idx === j);
                if (!neighbor) continue;

                // Remove edge
                this.adj[i] = this.adj[i].filter(n => n.idx !== j);
                this.adj[j] = this.adj[j].filter(n => n.idx !== i);

                // Try validation
                const visited = Array(24).fill(false);
                const visited2 = {};
                const results = this.recurse('ABCD', visited, visited2, i);

                if (results.some(r => r.filter(f => f !== '').length === 24)) {
                    this.solution = results.find(r => r.filter(f => f !== '').length === 24);
                    this.removedEdge = { i, j };
                    return { valid: true, message: 'Path Unfolding!', squares, solution: this.solution };
                }

                // Restore edge
                this.adj[i].push(neighbor);
                this.adj[j].push({ idx: i, dir: this.getOppositeDir(neighbor.dir) });
            }
        }

        return { valid: false, message: 'Not a Tesseract unfolding' };
    }

    getOppositeDir(dir) {
        const opposites = { 'N': 'S', 'S': 'N', 'E': 'W', 'W': 'E' };
        return opposites[dir];
    }

    getFaceVertices(label) {
        return label.split('').map(c => VERTEX_MAP[c]);
    }

    buildPathOrder(squares) {
        if (!this.solution || this.solution.length === 0) return [];

        // Find start position
        let startIdx = this.solution.findIndex(f => f === 'ABCD');
        if (this.removedEdge.i !== -1) {
            startIdx = this.removedEdge.i;
        }

        if (startIdx === -1) return [];

        // DFS to find Hamiltonian path
        const visited = Array(24).fill(false);
        const path = [];

        const dfs = (node) => {
            visited[node] = true;
            path.push(node);

            if (path.length === this.solution.filter(f => f !== '').length) {
                return true;
            }

            for (const neighbor of this.adj[node]) {
                const neighborIdx = neighbor.idx;

                // Skip removed edge
                if (this.removedEdge.i !== -1) {
                    if ((node === this.removedEdge.i && neighborIdx === this.removedEdge.j) ||
                        (node === this.removedEdge.j && neighborIdx === this.removedEdge.i)) {
                        continue;
                    }
                }

                if (visited[neighborIdx] || !this.solution[neighborIdx]) continue;

                // Check tesseract adjacency
                const v1 = this.getFaceVertices(this.solution[node]);
                const v2 = this.getFaceVertices(this.solution[neighborIdx]);
                const common = v1.filter(v => v2.includes(v)).length;

                if (common === 2) {
                    if (dfs(neighborIdx)) return true;
                }
            }

            visited[node] = false;
            path.pop();
            return false;
        };

        dfs(startIdx);
        return path;
    }
}
