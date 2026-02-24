# Tesseract Unfolding Visualizer

An interactive web-based tool for designing and visualizing 2-face path unfoldings of the tesseract (4D hypercube). Draw a 24-omino on a grid, verify whether it is a valid path unfolding, and watch it fold into a 3D tesseract projection with smooth animation.

**Live demo:** [soham2020sam.github.io/PathUnfoldingsTesseractVisualizationandFONT](https://soham2020sam.github.io/PathUnfoldingsTesseractVisualizationandFONT/)

## Overview

The tesseract has 24 square 2-faces. A *path unfolding* cuts edges of the 2-skeleton so that all 24 faces unfold into a connected polyomino whose dual graph is a Hamiltonian path. This tool lets you:

1. **Design** a candidate 24-omino on an interactive grid
2. **Verify** whether it folds into the tesseract via a Hamiltonian path
3. **Visualize** the folding process with a 3D animation

## How to Use

### Editor Mode

- Click cells in the grid to paint or unpaint them (the grid auto-expands at edges).
- The cell counter shows your current count; you need exactly **24 cells**.
- Click **Check Path Unfolding** to run the verification algorithm.
- If valid, click **Visualize Unfolding** to see the 3D animation.

### Visualization Mode

| Control | Action |
|---------|--------|
| Play / Pause | Start or pause the folding animation |
| Reset | Return to the initial flat unfolding |
| Speed slider | Adjust animation speed (0.1x -- 5.0x) |
| Mouse drag | Rotate the tesseract projection |
| Scroll wheel | Zoom in / out |
| `Space` | Play / Pause |
| `R` | Reset |
| `L` | Toggle vertex labels |
| Arrow keys | Rotate camera |

## Algorithm

The verification algorithm uses recursive backtracking to simultaneously:

- Traverse a potential Hamiltonian path in the dual graph of the polyomino
- Walk through the face-adjacency graph of the tesseract
- Verify that adjacencies in the polyomino correspond to valid face adjacencies in the tesseract

If all 24 squares are successfully mapped, the tool returns the face labeling and computes an animation path order.

### Animation Mathematics

Each face animates from its flat 2D position to its 3D position in the tesseract projection using:

- **Smoothstep interpolation:** s(t) = 6t^5 - 15t^4 + 10t^3 for smooth ease-in/ease-out
- **Vertex morphing:** each vertex interpolates independently from flat to 3D orientation
- **Orthographic projection:** preserves parallel lines and avoids perspective distortion

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML structure |
| `styles.css` | UI styling |
| `tesseract-logic.js` | Verification algorithm (ported from C++) |
| `visualization.js` | Three.js 3D animation |
| `app.js` | Application logic and UI bindings |

## Requirements

- A modern web browser with WebGL support
- Internet connection (Three.js is loaded from CDN)

No build step is needed. Open `index.html` directly or serve with any static file server.

## References

- H. A. Akitaya and S. Samanta, "Path-Unfolding the Tesseract," Proc. 31st Fall Workshop on Computational Geometry, 2024.
- H. A. Akitaya and N. V. Kandarpa, "Unfolding Skeletons," Proc. 24th JCDCGGG, 2022.
- E. D. Demaine and J. O'Rourke, *Geometric Folding Algorithms*, Cambridge University Press, 2007.

## License

MIT License
