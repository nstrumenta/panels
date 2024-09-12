import {
  BoxGeometry,
  Color,
  Mesh,
  MeshNormalMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

export default class GameScene {
  public canvas: HTMLCanvasElement;
  public scene: Scene;
  mesh: Mesh;

  renderer: WebGLRenderer;
  camera: PerspectiveCamera;

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new Scene();

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.camera = new PerspectiveCamera(70, width / height, 0.01, 10);
    this.camera.position.z = 1;

    const geometry = new BoxGeometry(0.2, 0.2, 0.2);
    const material = new MeshNormalMaterial();
    this.mesh = new Mesh(geometry, material);
    this.scene.add(this.mesh);
    this.scene.background = new Color(0, 0, 0);

    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0xff00ff, 1);
  }

  public setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.width, this.canvas.height, true);
    this.renderer.render(this.scene, this.camera);
  }
}
