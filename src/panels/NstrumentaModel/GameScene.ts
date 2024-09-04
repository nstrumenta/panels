import {
  BoxGeometry,
  Color,
  IUniform,
  Mesh,
  MeshNormalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';

import fragmentGlsl from './basic.glsl';

export default class GameScene {
  public canvas: HTMLCanvasElement;
  public scene: Scene;
  mesh: Mesh;
  plane: Mesh;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uniforms: Record<string, IUniform<any>>;
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  isAnimating = false;

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

    this.uniforms = {
      iResolution: {
        value: new Vector3(width, height, 1),
      }, // viewport resolution (in pixels)
      iTime: { value: 0 }, // shader playback time (in seconds)
    };
    this.plane = new Mesh(
      new PlaneGeometry(1, 1),
      new ShaderMaterial({
        uniforms: this.uniforms,
        fragmentShader: fragmentGlsl,
      })
    );

    this.scene.add(this.plane);

    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setAnimationLoop(this.animation.bind(this));
    this.renderer.setClearColor(0xff00ff, 1);
  }

  animation(time: number) {
    this.mesh.rotation.x = time / 2000;
    this.mesh.rotation.y = time / 1000;

    this.renderer.render(this.scene, this.camera);
  }

  public setAnimate = (value: boolean) => {
    this.isAnimating = value;
  };

  public setScroll(scroll: number) {
    this.uniforms.iTime.value = scroll * 0.001;
  }

  public setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.width, this.canvas.height, true);

    this.uniforms.iResolution.value.set(this.canvas.width, this.canvas.height, 0);
  }
}
