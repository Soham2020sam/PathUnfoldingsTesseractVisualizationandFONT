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
