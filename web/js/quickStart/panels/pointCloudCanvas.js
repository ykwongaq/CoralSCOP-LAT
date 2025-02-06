import * as THREE from "../../three/three.module.js";
import { OrbitControls } from "../../three/orbitControls.js";

export class PointCloudCanvas {
    constructor(canvasDom) {
        if (PointCloudCanvas.instance) {
            return PointCloudCanvas.instance;
        }
        PointCloudCanvas.instance = this;

        this.canvasDom = canvasDom;
        this.parentElement = this.canvasDom.parentElement;
        this.renderer = null;
        this.camera = null;
        this.controls = null;
        this.scene = null;
    }

    init() {
        window.addEventListener("resize", this.resizeCanvas.bind(this));
    }

    renderPointCloud(colorList, depthList, rows, cols) {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvasDom,
            antialias: true,
        });

        // Set the background color to very very pale gray
        this.renderer.setClearColor(0xf0f0f0, 1);

        this.camera = new THREE.PerspectiveCamera(
            75,
            this.parentElement.clientWidth / this.parentElement.clientHeight,
            0.1,
            1500
        );

        // Set the camera position
        const distance = Math.max(rows, cols);
        this.camera.position.z = distance;

        // Create an OrbitControls for user interaction
        this.controls = new OrbitControls(this.camera, this.canvasDom);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        this.scene = new THREE.Scene();

        const numPoints = rows * cols;
        const positions = new Float32Array(numPoints * 3);

        // ----------------------------------------------------
        // 1) Determine the min and max depth values in the array
        //    for adaptive scaling.
        // ----------------------------------------------------
        let minDepthValue = 255;
        let maxDepthValue = 0;
        for (let i = 0; i < depthList.length; i++) {
            const depth = depthList[i];
            if (depth < minDepthValue) minDepthValue = depth;
            if (depth > maxDepthValue) maxDepthValue = depth;
        }

        // Prevent division by zero if all depth values are identical
        const depthRange = Math.max(1, maxDepthValue - minDepthValue);

        // Set a target "height" for the 3D point cloud.
        // You can adjust this based on your preference.
        const maxDimension = Math.max(rows, cols);
        // 0.3 is just a heuristic; tweak as needed
        const desiredMaxDepth = 0.5 * maxDimension;
        // We'll map [minDepthValue, maxDepthValue] -> [0, desiredMaxDepth].

        let ptr = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const rawDepth = depthList[idx];
                // Normalize the raw depth into [0..1] relative to minDepthValue
                const normDepth = (rawDepth - minDepthValue) / depthRange;
                // Map the normalized depth into [0..desiredMaxDepth]
                const zVal = normDepth * desiredMaxDepth;

                positions[ptr] = c - cols / 2; // X
                positions[ptr + 1] = -(r - rows / 2); // Y
                positions[ptr + 2] = zVal; // Z
                ptr += 3;
            }
        }

        // Create a BufferGeometry and set the position attribute
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(positions, 3)
        );
        geometry.setAttribute("color", new THREE.BufferAttribute(colorList, 3));

        // Create a Points material (color = blue)
        const material = new THREE.PointsMaterial({
            vertexColors: true,
            size: 1.0,
            sizeAttenuation: true,
        });

        // Create the point cloud, add to scene
        const pointCloud = new THREE.Points(geometry, material);
        this.scene.add(pointCloud);

        setTimeout(() => {
            this.resizeCanvas();
        }, 100);

        this.animate();
    }

    extractColorList(imagePath, x1, y1, x2, y2) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                try {
                    // Ensure that x1, y1 refer to the top-left corner and x2, y2 refer to the bottom-right corner
                    if (x1 > x2) {
                        [x1, x2] = [x2, x1];
                    }
                    if (y1 > y2) {
                        [y1, y2] = [y2, y1];
                    }

                    const cropWidth = x2 - x1;
                    const cropHeight = y2 - y1;

                    const offCanvas = document.createElement("canvas");
                    offCanvas.width = cropWidth;
                    offCanvas.height = cropHeight;
                    const ctx = offCanvas.getContext("2d");

                    ctx.drawImage(
                        image,
                        x1,
                        y1,
                        cropWidth,
                        cropHeight,
                        0,
                        0,
                        cropWidth,
                        cropHeight
                    );

                    // Grab the pixel data (RGBA)
                    const imageData = ctx.getImageData(
                        0,
                        0,
                        cropWidth,
                        cropHeight
                    );
                    const data = imageData.data;

                    const colorArray = new Float32Array(
                        cropWidth * cropHeight * 3
                    );

                    let ptr = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        colorArray[ptr] = data[i] / 255; // R
                        colorArray[ptr + 1] = data[i + 1] / 255; // G
                        colorArray[ptr + 2] = data[i + 2] / 255; // B
                        ptr += 3;
                    }

                    resolve(colorArray);
                } catch (error) {
                    reject(error);
                }
            };
            image.onerror = (error) => {
                reject(error);
            };
            image.src = imagePath;
        });
    }

    // startRender() {
    //     const scene = new THREE.Scene();
    //     this.camera = new THREE.PerspectiveCamera(
    //         75,
    //         this.parentElement.clientWidth / this.parentElement.clientHeight,
    //         0.1,
    //         1000
    //     );
    //     this.camera.position.z = 5;

    //     this.renderer = new THREE.WebGLRenderer({
    //         canvas: this.canvasDom,
    //         antialias: true,
    //     });

    //     setTimeout(() => {
    //         this.resizeCanvas();
    //     }, 100);

    //     // Set the canvas background color to white
    //     this.renderer.setClearColor(0xffffff, 1); // Color: white, Opacity: 1

    //     const geometry = new THREE.BoxGeometry(1, 1, 1);
    //     const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    //     const cube = new THREE.Mesh(geometry, material);
    //     scene.add(cube);

    //     const animate = () => {
    //         requestAnimationFrame(animate);

    //         cube.rotation.x += 0.01;
    //         cube.rotation.y += 0.01;

    //         this.renderer.render(scene, this.camera);
    //     };

    //     animate();
    // }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    resizeCanvas() {
        const rect = this.parentElement.getBoundingClientRect();

        const width = rect.width;
        const height = rect.width / 2;
        this.canvasDom.width = width;
        this.canvasDom.height = height;

        if (this.renderer) {
            this.renderer.setSize(width, height);
        }

        if (this.camera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }
}
