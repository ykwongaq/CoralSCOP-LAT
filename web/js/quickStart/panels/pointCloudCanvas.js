import * as THREE from "../../three/three.module.js";

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
    }

    init() {
        window.addEventListener("resize", this.resizeCanvas.bind(this));
    }

    startRender() {
        const scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.parentElement.clientWidth / this.parentElement.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvasDom,
            antialias: true,
        });

        setTimeout(() => {
            this.resizeCanvas();
        }, 100);

        // Set the canvas background color to white
        this.renderer.setClearColor(0xffffff, 1); // Color: white, Opacity: 1

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        const animate = () => {
            requestAnimationFrame(animate);

            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;

            this.renderer.render(scene, this.camera);
        };

        animate();
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

        console.log("resize canvas", width, height);
    }
}
