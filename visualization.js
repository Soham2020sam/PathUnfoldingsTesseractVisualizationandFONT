/**
 * Three.js Visualization - Faithful port of C++ animation
 */

class TesseractVisualizer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.tesseractGroup = null;
        this.unfoldingGroup = null;
        this.animatingCube = null;

        this.currentStep = 0;
        this.totalSteps = 24;
        this.animationProgress = 0;
        this.isAnimating = false;
        this.showLabels = true;
        this.animationSpeed = 0.001;

        this.cameraAngleX = 0.0;
        this.cameraAngleY = 0.0;

        this.faceLabels = [];
        this.gridPositions = [];
        this.pathOrder = [];
        this.unfoldingPositions = [];
        this.faceColors = [];

        this.lastAddedEdges = []; // track edges of most recently added face

        this.tesseractVertices = this.initTesseractVertices();
        this.initScene();
    }

    // Create a cylinder between two points (thick edge that actually renders)
    createThickEdge(p1, p2, radius, color) {
        const a = new THREE.Vector3(...p1);
        const b = new THREE.Vector3(...p2);
        const dir = new THREE.Vector3().subVectors(b, a);
        const len = dir.length();
        const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);

        const geometry = new THREE.CylinderBufferGeometry(radius, radius, len, 6, 1);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const cyl = new THREE.Mesh(geometry, material);

        cyl.position.copy(mid);
        // Align cylinder (default Y-axis) to direction
        const axis = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(axis, dir.normalize());
        cyl.setRotationFromQuaternion(quat);

        return cyl;
    }

    initTesseractVertices() {
        return [
            // Outer cube (ABCD + EFGH)
            [-1.0, 1.0, 1.0],   // 0: A
            [1.0, 1.0, 1.0],    // 1: B
            [1.0, 1.0, -1.0],   // 2: C
            [-1.0, 1.0, -1.0],  // 3: D
            [-1.0, -1.0, 1.0],  // 4: E
            [1.0, -1.0, 1.0],   // 5: F
            [1.0, -1.0, -1.0],  // 6: G
            [-1.0, -1.0, -1.0], // 7: H
            // Inner cube (abcd + efgh)
            [-0.5, 0.5, 0.5],   // 8: a
            [0.5, 0.5, 0.5],    // 9: b
            [0.5, 0.5, -0.5],   // 10: c
            [-0.5, 0.5, -0.5],  // 11: d
            [-0.5, -0.5, 0.5],  // 12: e
            [0.5, -0.5, 0.5],   // 13: f
            [0.5, -0.5, -0.5],  // 14: g
            [-0.5, -0.5, -0.5]  // 15: h
        ];
    }

    initScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf9fafb);

        // Use orthographic camera to avoid perspective distortion
        const width = this.canvas.parentElement.clientWidth;
        const height = this.canvas.parentElement.clientHeight;
        const aspect = width / height;
        const frustumSize = 10;
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 10);
        this.camera.zoom = 1;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(
            this.canvas.parentElement.clientWidth,
            this.canvas.parentElement.clientHeight
        );
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Use flat lighting for consistent appearance (matches C++ flat rendering)
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        // Mouse and keyboard controls
        this.addMouseControls();
        this.addKeyboardControls();

        // Handle resize
        window.addEventListener('resize', () => this.onResize());

        // Start animation loop
        this.animate();
    }

    addMouseControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            // Smooth rotation with reasonable sensitivity
            this.cameraAngleY += deltaX * 0.3;
            this.cameraAngleX -= deltaY * 0.3;

            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.camera.zoom += e.deltaY * -0.001;
            this.camera.zoom = Math.max(0.5, Math.min(2, this.camera.zoom));
            this.camera.updateProjectionMatrix();
        });
    }

    addKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            const rotationSpeed = 5;
            switch(e.key) {
                case 'ArrowLeft':
                    this.cameraAngleY -= rotationSpeed;
                    break;
                case 'ArrowRight':
                    this.cameraAngleY += rotationSpeed;
                    break;
                case 'ArrowUp':
                    this.cameraAngleX += rotationSpeed;
                    break;
                case 'ArrowDown':
                    this.cameraAngleX -= rotationSpeed;
                    break;
            }
        });
    }

    onResize() {
        const width = this.canvas.parentElement.clientWidth;
        const height = this.canvas.parentElement.clientHeight;
        const aspect = width / height;
        const frustumSize = 10;

        // Update orthographic camera
        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    setupVisualization(faceLabels, gridPositions, pathOrder) {
        this.faceLabels = faceLabels;
        this.gridPositions = gridPositions;
        this.pathOrder = pathOrder;
        this.currentStep = 0;
        this.animationProgress = 0;
        this.totalSteps = pathOrder.length;

        // Use bright visible colors for testing
        this.faceColors = Array(24).fill(null).map(() => [0.7, 0.9, 1.0]);

        // Calculate unfolding positions
        this.calculateUnfoldingPositions();

        // Clear scene
        if (this.tesseractGroup) this.scene.remove(this.tesseractGroup);
        if (this.unfoldingGroup) this.scene.remove(this.unfoldingGroup);
        if (this.animatingCube) this.scene.remove(this.animatingCube);

        // Create groups
        this.tesseractGroup = new THREE.Group();
        this.tesseractGroup.position.x = 4;
        this.scene.add(this.tesseractGroup);

        this.unfoldingGroup = new THREE.Group();
        this.unfoldingGroup.position.x = -4;
        this.scene.add(this.unfoldingGroup);

        // Create tesseract wireframe
        this.createTesseractWireframe();

        // Create unfolding
        this.createUnfolding();
    }

    calculateUnfoldingPositions() {
        const minRow = Math.min(...this.gridPositions.map(p => p.row));
        const maxRow = Math.max(...this.gridPositions.map(p => p.row));
        const minCol = Math.min(...this.gridPositions.map(p => p.col));
        const maxCol = Math.max(...this.gridPositions.map(p => p.col));

        const spacing = 1.0;
        const totalWidth = (maxCol - minCol + 1) * spacing;
        const totalHeight = (maxRow - minRow + 1) * spacing;
        const startX = -totalWidth / 2;
        const startY = totalHeight / 2;

        this.unfoldingPositions = this.gridPositions.map(pos => [
            startX + (pos.col - minCol) * spacing,
            startY - (pos.row - minRow) * spacing
        ]);
    }

    createTesseractWireframe() {
        // All tesseract edges as cylinders for consistent visibility
        const wireframeRadius = 0.015;
        const wireframeColor = 0x333333;

        const allEdges = [
            // Outer cube
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7],
            // Inner cube
            [8, 9], [9, 10], [10, 11], [11, 8],
            [12, 13], [13, 14], [14, 15], [15, 12],
            [8, 12], [9, 13], [10, 14], [11, 15],
            // Connecting edges
            [0, 8], [1, 9], [2, 10], [3, 11],
            [4, 12], [5, 13], [6, 14], [7, 15]
        ];

        allEdges.forEach(([i, j]) => {
            const cyl = this.createThickEdge(
                this.tesseractVertices[i],
                this.tesseractVertices[j],
                wireframeRadius,
                wireframeColor
            );
            this.tesseractGroup.add(cyl);
        });

        // Add vertex labels
        if (this.showLabels) {
            this.createVertexLabels();
        }
    }

    createVertexLabels() {
        const vertexNames = [
            'A', 'B', 'C', 'D',
            'E', 'F', 'G', 'H',
            'a', 'b', 'c', 'd',
            'e', 'f', 'g', 'h'
        ];

        vertexNames.forEach((name, idx) => {
            // Create new canvas for each label
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 64;

            // Draw text with transparent background
            context.clearRect(0, 0, 64, 64); // Ensure transparent background
            context.font = 'Bold 48px Arial';
            context.fillStyle = 'black';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(name, 32, 32);

            // Create sprite that always renders on top (matches C++ glDisable(GL_DEPTH_TEST))
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.renderOrder = 999; // Render after everything else

            // Position label slightly offset from vertex for better visibility
            const vx = this.tesseractVertices[idx][0];
            const vy = this.tesseractVertices[idx][1];
            const vz = this.tesseractVertices[idx][2];
            sprite.position.set(vx * 1.2, vy * 1.2, vz * 1.2);
            sprite.scale.set(0.2, 0.2, 1);

            this.tesseractGroup.add(sprite);
        });
    }

    createUnfolding() {
        const squareSize = 0.8;

        for (let i = 0; i < this.faceLabels.length; i++) {
            // Create square geometry with single segment to avoid diagonal line artifacts
            const geometry = new THREE.PlaneGeometry(squareSize, squareSize, 1, 1);
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(0.6, 0.8, 1.0),
                transparent: true,
                opacity: 0.45,
                side: THREE.DoubleSide
            });

            const square = new THREE.Mesh(geometry, material);
            square.position.set(this.unfoldingPositions[i][0], this.unfoldingPositions[i][1], 0);
            square.userData = { index: i };
            this.unfoldingGroup.add(square);

            // Add border manually (just the 4 outer edges, no diagonal)
            const borderGeometry = new THREE.BufferGeometry();
            const borderPositions = new Float32Array([
                -squareSize/2, -squareSize/2, 0,  squareSize/2, -squareSize/2, 0,
                squareSize/2, -squareSize/2, 0,   squareSize/2, squareSize/2, 0,
                squareSize/2, squareSize/2, 0,   -squareSize/2, squareSize/2, 0,
                -squareSize/2, squareSize/2, 0,  -squareSize/2, -squareSize/2, 0
            ]);
            borderGeometry.setAttribute('position', new THREE.BufferAttribute(borderPositions, 3));
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 24 });
            const border = new THREE.LineSegments(borderGeometry, lineMaterial);
            border.position.copy(square.position);
            this.unfoldingGroup.add(border);
        }
    }

    updateAnimation() {
        // Only update animation when actively animating
        if (!this.isAnimating || this.currentStep >= this.totalSteps) return;

        this.animationProgress += this.animationSpeed;

        if (this.animationProgress >= 1.0) {
            // Animation step complete
            this.animationProgress = 0;

            // Add face to tesseract
            const completedFaceIdx = this.pathOrder[this.currentStep];
            this.addFaceToTesseract(completedFaceIdx);

            this.currentStep++;

            if (this.currentStep >= this.totalSteps) {
                this.isAnimating = false;
            } else {
                // Mark the next face white as it starts flying off
                const nextFaceIdx = this.pathOrder[this.currentStep];
                this.unfoldingGroup.children.forEach(child => {
                    if (child.userData.index === nextFaceIdx && child instanceof THREE.Mesh) {
                        child.material.color.setRGB(1, 1, 1); // White
                        child.material.opacity = 0.3;
                    }
                });
            }
        }

        // Animate current face with smooth interpolation
        if (this.currentStep < this.totalSteps) {
            this.drawAnimatedFace();
        }
    }

    drawAnimatedFace() {
        // Remove previous animating cube
        if (this.animatingCube) {
            this.scene.remove(this.animatingCube);
        }

        const faceIdx = this.pathOrder[this.currentStep];
        const label = this.faceLabels[faceIdx];

        // Get target vertices
        const vertices = label.split('').map(c => {
            const idx = VERTEX_MAP[c];
            return this.tesseractVertices[idx];
        });

        // Calculate center in tesseract
        const centerX = vertices.reduce((sum, v) => sum + v[0], 0) / 4;
        const centerY = vertices.reduce((sum, v) => sum + v[1], 0) / 4;
        const centerZ = vertices.reduce((sum, v) => sum + v[2], 0) / 4;

        // Apply tesseract rotation to get destination
        const angleXRad = this.cameraAngleX * Math.PI / 180;
        const angleYRad = this.cameraAngleY * Math.PI / 180;

        // Rotate around Y then X
        const afterY_X = centerX * Math.cos(angleYRad) + centerZ * Math.sin(angleYRad);
        const afterY_Y = centerY;
        const afterY_Z = -centerX * Math.sin(angleYRad) + centerZ * Math.cos(angleYRad);

        const afterX_X = afterY_X;
        const afterX_Y = afterY_Y * Math.cos(angleXRad) - afterY_Z * Math.sin(angleXRad);
        const afterX_Z = afterY_Y * Math.sin(angleXRad) + afterY_Z * Math.cos(angleXRad);

        const dstX = afterX_X + 4.0;
        const dstY = afterX_Y;
        const dstZ = afterX_Z;

        // Source position (unfolding)
        const srcX = this.unfoldingPositions[faceIdx][0] - 4.0;
        const srcY = this.unfoldingPositions[faceIdx][1];
        const srcZ = 0.0;

        // Smoothstep interpolation (same as C++)
        const t = this.animationProgress;
        const smoothT = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);

        // Interpolate position
        const worldX = srcX + (dstX - srcX) * smoothT;
        const worldY = srcY + (dstY - srcY) * smoothT;
        const worldZ = srcZ + (dstZ - srcZ) * smoothT;

        // Create geometry with interpolated vertices
        const squareSize = 0.8;
        const sourceVertices = [
            [-squareSize/2, -squareSize/2, 0],
            [squareSize/2, -squareSize/2, 0],
            [squareSize/2, squareSize/2, 0],
            [-squareSize/2, squareSize/2, 0]
        ];

        const geometry = new THREE.BufferGeometry();
        const positions = [];

        // Interpolate each vertex
        for (let i = 0; i < 4; i++) {
            const relX = vertices[i][0] - centerX;
            const relY = vertices[i][1] - centerY;
            const relZ = vertices[i][2] - centerZ;

            const vx = sourceVertices[i][0] + (relX - sourceVertices[i][0]) * smoothT;
            const vy = sourceVertices[i][1] + (relY - sourceVertices[i][1]) * smoothT;
            const vz = sourceVertices[i][2] + (relZ - sourceVertices[i][2]) * smoothT;

            positions.push(vx, vy, vz);
        }

        // Add triangles
        const indices = [0, 1, 2, 0, 2, 3];
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(...this.faceColors[faceIdx]),
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        this.animatingCube = new THREE.Group();
        const mesh = new THREE.Mesh(geometry, material);
        this.animatingCube.add(mesh);

        // Add border manually (4 outer edges only, no diagonal)
        const borderGeo = new THREE.BufferGeometry();
        const borderPos = new Float32Array([
            positions[0], positions[1], positions[2],  positions[3], positions[4], positions[5],
            positions[3], positions[4], positions[5],  positions[6], positions[7], positions[8],
            positions[6], positions[7], positions[8],  positions[9], positions[10], positions[11],
            positions[9], positions[10], positions[11], positions[0], positions[1], positions[2]
        ]);
        borderGeo.setAttribute('position', new THREE.BufferAttribute(borderPos, 3));
        const edgesMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 24 });
        const edges = new THREE.LineSegments(borderGeo, edgesMat);
        this.animatingCube.add(edges);

        this.animatingCube.position.set(worldX, worldY, worldZ);
        this.animatingCube.rotation.x = this.cameraAngleX * Math.PI / 180 * smoothT;
        this.animatingCube.rotation.y = this.cameraAngleY * Math.PI / 180 * smoothT;

        this.scene.add(this.animatingCube);
    }

    addFaceToTesseract(faceIndex) {
        const label = this.faceLabels[faceIndex];
        const vertices = label.split('').map(c => {
            const idx = VERTEX_MAP[c];
            return this.tesseractVertices[idx];
        });

        const geometry = new THREE.BufferGeometry();
        const positions = [];

        // Add both sides
        positions.push(...vertices[0], ...vertices[1], ...vertices[2]);
        positions.push(...vertices[0], ...vertices[2], ...vertices[3]);

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeVertexNormals();

        // Use MeshBasicMaterial for flat shading
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(...this.faceColors[faceIndex]),
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        const face = new THREE.Mesh(geometry, material);
        this.tesseractGroup.add(face);

        // Fade previous highlight edges back to black
        this.lastAddedEdges.forEach(edge => {
            edge.material.color.setHex(0x000000);
        });

        // Add thick cylinder-based borders (visible at any scale)
        const edgeRadius = 0.02;
        const highlightColor = 0xff6600; // orange for newest face
        const newEdges = [];
        const edgePairs = [[0,1],[1,2],[2,3],[3,0]];
        edgePairs.forEach(([a, b]) => {
            const cyl = this.createThickEdge(vertices[a], vertices[b], edgeRadius, highlightColor);
            this.tesseractGroup.add(cyl);
            newEdges.push(cyl);
        });

        this.lastAddedEdges = newEdges;
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update animation state if animating
        this.updateAnimation();

        // Apply user rotation to tesseract (independent of animation state)
        if (this.tesseractGroup) {
            this.tesseractGroup.rotation.x = this.cameraAngleX * Math.PI / 180;
            this.tesseractGroup.rotation.y = this.cameraAngleY * Math.PI / 180;
        }

        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }

    play() {
        this.isAnimating = true;

        // Mark the first face white as it starts flying off
        if (this.currentStep === 0 && this.pathOrder.length > 0) {
            const firstFaceIdx = this.pathOrder[0];
            this.unfoldingGroup.children.forEach(child => {
                if (child.userData.index === firstFaceIdx && child instanceof THREE.Mesh) {
                    child.material.color.setRGB(1, 1, 1); // White
                    child.material.opacity = 0.3;
                }
            });
        }
    }

    pause() {
        this.isAnimating = false;
    }

    reset() {
        this.currentStep = 0;
        this.animationProgress = 0;
        this.isAnimating = false;

        // Reset unfolding opacity
        this.unfoldingGroup.children.forEach(child => {
            if (child.userData.index !== undefined && child instanceof THREE.Mesh) {
                child.material.opacity = 0.45;
            }
        });

        // Clear everything from tesseract group
        while (this.tesseractGroup.children.length > 0) {
            this.tesseractGroup.remove(this.tesseractGroup.children[0]);
        }

        // Remove animating cube
        if (this.animatingCube) {
            this.scene.remove(this.animatingCube);
            this.animatingCube = null;
        }

        // Re-add wireframe and labels
        this.createTesseractWireframe();
    }

    setSpeed(speed) {
        this.animationSpeed = speed;
    }

    toggleLabels() {
        this.showLabels = !this.showLabels;

        // Remove existing labels
        const labelsToRemove = [];
        this.tesseractGroup.children.forEach(child => {
            if (child instanceof THREE.Sprite) {
                labelsToRemove.push(child);
            }
        });
        labelsToRemove.forEach(sprite => this.tesseractGroup.remove(sprite));

        // Add labels if enabled
        if (this.showLabels) {
            this.createVertexLabels();
        }
    }

    getProgress() {
        return this.currentStep / this.totalSteps;
    }

    getCurrentStep() {
        return this.currentStep;
    }
}
