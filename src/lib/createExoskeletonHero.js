import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const defaults = {
  leftModel: "/models/Exoskeleton_L.web.glb",
  rightModel: "/models/Exoskeleton_R.web.glb",
  componentsModel: "/models/Components.glb",
  componentsManifest: "/models/rhino-components-web-manifest.json",
  uiFramesBase: "/ui-frames",
  frameCount: 13,
  background: 0xffffff,
  metalness: 0.18,
  roughness: 0.58,
  accent: 0xf2f2ee,
  componentAccent: 0xcfd5d9,
};

const initialRotation = new THREE.Euler(Math.PI / 2, 0.22, 0.02);

export function createExoskeletonHero(container, options = {}) {
  if (!container) {
    throw new Error("createExoskeletonHero requires a container element.");
  }

  const settings = { ...defaults, ...options };
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(settings.background);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
  camera.position.set(0.35, 0.5, 6.6);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
  renderer.setClearColor(settings.background, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environmentMap;

  const pivot = new THREE.Group();
  pivot.rotation.copy(initialRotation);
  scene.add(pivot);

  const assembly = new THREE.Group();
  pivot.add(assembly);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.autoRotate = !prefersReducedMotion.matches;
  controls.autoRotateSpeed = 0.42;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.72;
  controls.minDistance = 3.8;
  controls.maxDistance = 13.5;
  controls.target.set(0, 0.04, 0);

  const key = new THREE.DirectionalLight(0xfff0dc, 5.8);
  key.position.set(3.8, 3.4, 1.1);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xd8e8ff, 0.1);
  fill.position.set(-3.8, 0.5, 1.4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 6.8);
  rim.position.set(-3.4, 2.8, -3.9);
  scene.add(rim);

  const sideSoftbox = new THREE.RectAreaLight(0xffffff, 5.0, 0.75, 4.4);
  sideSoftbox.position.set(3.1, 1.5, 0.8);
  sideSoftbox.lookAt(0, 0, 0);
  scene.add(sideSoftbox);

  const frontSoftbox = new THREE.RectAreaLight(0xfffbf3, 0.28, 3.4, 2.8);
  frontSoftbox.position.set(0.25, 1.0, 3.2);
  frontSoftbox.lookAt(0, 0, 0);
  scene.add(frontSoftbox);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbcc8cd, 0.16));

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const textureLoader = new THREE.TextureLoader();
  const frameUrls = Array.from(
    { length: settings.frameCount },
    (_, index) => `${settings.uiFramesBase}/${index + 1}.png`
  );
  const frameTextures = frameUrls.map((url) => {
    const texture = textureLoader.load(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
    texture.flipY = true;
    return texture;
  });

  const exoskeletonMaterial = new THREE.MeshStandardMaterial({
    color: 0xcfd8d2,
    metalness: 0,
    roughness: 0.96,
    envMapIntensity: 0.46,
    transparent: true,
    opacity: 0.9,
    depthWrite: true,
  });
  const componentMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b4d50,
    metalness: 0.04,
    roughness: 0.6,
    envMapIntensity: 0.65,
  });
  const buttonMaterial = new THREE.MeshStandardMaterial({
    color: 0x030303,
    metalness: 0.06,
    roughness: 0.38,
    envMapIntensity: 0.75,
  });
  const buttonActiveMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.08,
    roughness: 0.3,
    envMapIntensity: 1,
  });
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: frameTextures[0],
    color: 0xffffff,
    toneMapped: false,
  });
  const boardMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b4d50,
    metalness: 0.02,
    roughness: 0.58,
    envMapIntensity: 0.72,
  });
  const pcbMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b4d50,
    metalness: 0.02,
    roughness: 0.64,
    envMapIntensity: 0.58,
  });
  const palePlasticMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b4d50,
    metalness: 0.02,
    roughness: 0.58,
    envMapIntensity: 0.65,
  });
  const screwMaterial = new THREE.MeshStandardMaterial({
    color: 0x4b4d50,
    metalness: 0.18,
    roughness: 0.34,
    envMapIntensity: 0.92,
  });
  let loaded = 0;
  let boundsReady = false;
  const clock = new THREE.Clock();
  let frameId = 0;
  let baseY = 0;
  let compositionReady = false;
  let userMoved = false;
  let normalizedScale = 1;
  let activeFrame = 0;
  let activeMode = "startup";
  let menuSelection = 0;
  let screenPlane;
  const buttonTargets = [];
  const buttonMeshes = [];
  const buttonCenterMeshes = [[], [], []];
  const flowTimers = new Set();
  let flowInterval = 0;
  const pointerStart = new THREE.Vector2();
  let pressedButton = null;
  let controlsEnabledBeforePress = true;
  let loadedBytes = 0;
  let expectedBytes = 1;
  let lastProgress = 0;

  let totalModels = 0;

  const exoskeletonConfigs = [
    {
      path: settings.leftModel,
      x: 0,
      y: 0,
      z: 0,
      spin: 0,
      scale: 1,
      material: exoskeletonMaterial,
    },
    {
      path: settings.rightModel,
      x: 0,
      y: 0,
      z: 0,
      spin: 0,
      scale: 1,
      material: exoskeletonMaterial,
    },
  ];

  function prepareModel(gltf, config) {
    const model = gltf.scene;
    model.updateWorldMatrix(true, true);
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = getMaterialForMesh(child, config.material);
        registerButtonCenter(child, config);
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });

    model.position.set(config.x, config.y, config.z);
    model.rotation.y = config.spin;
    model.scale.setScalar(config.scale);
    assembly.add(model);
    loaded += 1;
    if (config.bytes && !config.progressAccounted) {
      loadedBytes += config.bytes;
      config.progressAccounted = true;
    }
    updateLoadingProgress();

    if (loaded === totalModels) {
      addInteractiveDetails();
      composeRoot();
      startStartupSequence();
      container.classList.add("is-loaded");
      boundsReady = true;
    }
  }

  function getMaterialForMesh(child, fallbackMaterial) {
    if (fallbackMaterial === exoskeletonMaterial) return fallbackMaterial;

    const name = child.name || "";
    if (isButtonCenterMesh(name)) return buttonMaterial;
    return fallbackMaterial;
  }

  function isButtonCenterMesh(name) {
    return /^Body11_(10|267|293)$/.test(name || "");
  }

  function registerButtonCenter(child, config) {
    if (config.material !== componentMaterial || !isButtonCenterMesh(child.name)) return;

    const buttonIndex = config.buttonIndex;
    if (typeof buttonIndex === "number") {
      child.userData.baseY = child.position.y;
      buttonCenterMeshes[buttonIndex].push(child);
    }
  }

  function addInteractiveDetails() {
    const frontY = 0.01234;

    screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.0282, 0.0282), screenMaterial);
    screenPlane.name = "NaRa_UI_Frame_Display";
    screenPlane.position.set(-0.00065, frontY + 0.00032, 0.01685);
    screenPlane.rotation.x = -Math.PI / 2;
    screenPlane.renderOrder = 5;
    assembly.add(screenPlane);

    const targetGeometry = new THREE.BoxGeometry(0.0062, 0.0042, 0.0062);
    const zPositions = [0.00828, 0.01828, 0.02828];

    zPositions.forEach((z, index) => {
      const hitTarget = new THREE.Mesh(
        targetGeometry,
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitTarget.name = `NaRa_Button_Target_${index + 1}`;
      hitTarget.position.set(0.02055, 0.013, z);
      hitTarget.userData.buttonIndex = index;
      assembly.add(hitTarget);
      buttonTargets.push(hitTarget);
      buttonMeshes.push(hitTarget);
    });
  }

  function setFrame(index) {
    if (!screenPlane) return;

    activeFrame = THREE.MathUtils.euclideanModulo(index, frameTextures.length);
    screenMaterial.map = frameTextures[activeFrame];
    screenMaterial.needsUpdate = true;
  }

  function clearFlowTimers() {
    flowTimers.forEach((timer) => window.clearTimeout(timer));
    flowTimers.clear();
    if (flowInterval) {
      window.clearInterval(flowInterval);
      flowInterval = 0;
    }
  }

  function queueFrame(delay, frameIndex, mode = activeMode) {
    const timer = window.setTimeout(() => {
      flowTimers.delete(timer);
      activeMode = mode;
      setFrame(frameIndex);
    }, delay);
    flowTimers.add(timer);
  }

  function startStartupSequence() {
    clearFlowTimers();
    activeMode = "startup";
    setFrame(0);
    queueFrame(2600, 1, "main");
  }

  function startConfirmHold() {
    if (activeMode === "menu" || activeMode === "lexicon" || activeMode === "history") return;

    clearFlowTimers();
    activeMode = "confirming";
    let index = 2;
    setFrame(index);
    flowInterval = window.setInterval(() => {
      index = index >= 4 ? 2 : index + 1;
      setFrame(index);
    }, 420);
  }

  function finishConfirm() {
    if (activeMode === "menu") {
      activeMode = menuSelection === 1 ? "history" : "lexicon";
      setFrame(menuSelection === 1 ? 11 : 7);
      return;
    }
    if (activeMode === "lexicon" || activeMode === "history") return;

    clearFlowTimers();
    activeMode = "answering";
    setFrame(2);
    queueFrame(420, 3, "answering");
    queueFrame(840, 4, "answering");
    queueFrame(1400, 6, "answer");
  }

  function goBack() {
    clearFlowTimers();
    activeMode = "main";
    setFrame(1);
  }

  function openMenu() {
    clearFlowTimers();
    const wasMenu = activeMode === "menu";
    activeMode = "menu";
    menuSelection = wasMenu ? (menuSelection + 1) % 3 : 0;
    setFrame([5, 10, 9][menuSelection]);
  }

  function buttonAtPointer(event) {
    if (buttonTargets.length === 0) return null;

    const rect = renderer.domElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    let closest = null;
    let closestDistance = 96;
    const candidates = [];

    buttonTargets.forEach((buttonMesh, index) => {
      candidates.push({ buttonMesh, index, useBounds: false });
    });
    buttonCenterMeshes.forEach((meshes, index) => {
      meshes.forEach((buttonMesh) => candidates.push({ buttonMesh, index, useBounds: true }));
    });

    candidates.forEach(({ buttonMesh, index, useBounds }) => {
      const position = useBounds
        ? new THREE.Box3().setFromObject(buttonMesh).getCenter(new THREE.Vector3())
        : new THREE.Vector3().setFromMatrixPosition(buttonMesh.matrixWorld);
      position.project(camera);

      const screenX = (position.x * 0.5 + 0.5) * rect.width;
      const screenY = (-position.y * 0.5 + 0.5) * rect.height;
      const distance = Math.hypot(screenX - clickX, screenY - clickY);

      if (distance < closestDistance) {
        closestDistance = distance;
        closest = buttonTargets[index];
      }
    });

    return closest;
  }

  function pressButton(button) {
    pressedButton = button;
    controlsEnabledBeforePress = controls.enabled;
    controls.enabled = false;
    const buttonIndex = button.userData.buttonIndex;
    setButtonMaterial(buttonIndex, buttonActiveMaterial);
  }

  function releaseButton() {
    if (!pressedButton) return;

    const buttonIndex = pressedButton.userData.buttonIndex;
    setButtonMaterial(buttonIndex, buttonMaterial);
    pressedButton = null;
    controls.enabled = controlsEnabledBeforePress;
  }

  function setButtonMaterial(buttonIndex, material) {
    const isActive = material === buttonActiveMaterial;
    buttonCenterMeshes[buttonIndex].forEach((mesh) => {
      mesh.material = material;
      mesh.position.y = mesh.userData.baseY + (isActive ? -0.00035 : 0);
    });
  }

  function handleButtonClick(button) {
    userMoved = true;
    controls.autoRotate = false;

    const buttonIndex = button.userData.buttonIndex;
    if (buttonIndex === 0) finishConfirm();
    if (buttonIndex === 1) goBack();
    if (buttonIndex === 2) openMenu();
  }

  function composeRoot() {
    const box = new THREE.Box3().setFromObject(assembly);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z);

    assembly.position.sub(center);
    normalizedScale = maxAxis > 0 ? 3.65 / maxAxis : 1;
    compositionReady = true;
    frameAssembly();
  }

  function frameAssembly() {
    if (!compositionReady) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const aspect = width / height;
    const isNarrow = aspect < 0.75;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

    pivot.scale.setScalar(normalizedScale);
    pivot.position.set(0, 0, 0);

    const framedBox = new THREE.Box3().setFromObject(pivot);
    const framedCenter = framedBox.getCenter(new THREE.Vector3());
    const framedSize = framedBox.getSize(new THREE.Vector3());
    const fitHeightDistance = framedSize.y / (2 * Math.tan(vFov / 2));
    const fitWidthDistance = framedSize.x / (2 * Math.tan(hFov / 2));
    const distance = Math.max(fitHeightDistance, fitWidthDistance) * (isNarrow ? 1.32 : 1.06);
    const cameraDirection = new THREE.Vector3(isNarrow ? 0.08 : 0.16, 0.12, 1).normalize();

    controls.target.copy(framedCenter);
    camera.position.copy(framedCenter).add(cameraDirection.multiplyScalar(distance));
    camera.near = Math.max(0.01, distance / 100);
    camera.far = Math.max(100, distance * 100);
    camera.updateProjectionMatrix();

    pivot.position.y += isNarrow ? 0.02 : 0;
    baseY = pivot.position.y;
    controls.minDistance = distance * 0.58;
    controls.maxDistance = distance * 2.2;
    controls.update();
  }

  function loadModels() {
    loadModelConfigs().then((modelConfigs) => {
      totalModels = modelConfigs.length;
      expectedBytes = modelConfigs.reduce((sum, config) => sum + (config.bytes || 1), 0);
      updateLoadingProgress(4);
      modelConfigs.forEach((config) => {
        loader.load(
          config.path,
          (gltf) => prepareModel(gltf, config),
          (event) => {
            if (!event.total || !config.bytes || config.progressAccounted) return;
            const loadedRatio = THREE.MathUtils.clamp(event.loaded / event.total, 0, 1);
            updateLoadingProgress(((loadedBytes + config.bytes * loadedRatio) / expectedBytes) * 100);
          },
          (error) => {
            console.error(`Unable to load ${config.path}`, error);
            container.classList.add("has-error");
          }
        );
      });
    }).catch((error) => {
      console.error("Unable to build model list", error);
      container.classList.add("has-error");
    });
  }

  async function loadModelConfigs() {
    const componentConfigs = [];
    if (settings.componentsManifest) {
      const response = await fetch(settings.componentsManifest);
      if (!response.ok) {
        throw new Error(`Unable to load ${settings.componentsManifest}`);
      }
      const manifest = await response.json();
      manifest
        .filter((entry) => entry.status === "exported" && entry.relativeFile)
        .forEach((entry) => {
          componentConfigs.push({
            path: entry.relativeFile,
            x: 0,
            y: 0,
            z: 0,
            spin: 0,
            scale: 1,
            material: componentMaterial,
            buttonIndex: buttonIndexForComponent(entry.relativeFile),
            bytes: entry.bytes,
          });
        });
    } else {
      componentConfigs.push({
        path: settings.componentsModel,
        x: 0,
        y: 0,
        z: 0,
        spin: 0,
        scale: 1,
        material: componentMaterial,
        bytes: 1,
      });
    }

    return [
      ...componentConfigs,
      ...exoskeletonConfigs.map((config) => ({ ...config, bytes: config.path.includes(".web.") ? 400000 : 1 })),
    ];
  }

  function updateLoadingProgress(value = (loadedBytes / expectedBytes) * 100) {
    lastProgress = Math.max(lastProgress, THREE.MathUtils.clamp(value, 0, 100));
    container.style.setProperty("--load-progress", lastProgress.toFixed(1));
  }

  function buttonIndexForComponent(path) {
    if (path.includes("f0f92ec8")) return 0;
    if (path.includes("a8a6f2ba")) return 1;
    if (path.includes("e6cdf430")) return 2;
    return undefined;
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, true);
    frameAssembly();
  }

  function resetView() {
    userMoved = false;
    controls.autoRotate = !prefersReducedMotion.matches;
    pivot.rotation.copy(initialRotation);
    frameAssembly();
  }

  function animate() {
    const elapsed = clock.getElapsedTime();

    if (boundsReady) {
      pivot.position.y =
        baseY + (prefersReducedMotion.matches ? 0 : Math.sin(elapsed * 0.55) * 0.035);

      if (!userMoved && !prefersReducedMotion.matches) {
        pivot.rotation.x = initialRotation.x + Math.sin(elapsed * 0.28) * 0.025;
        pivot.rotation.z = initialRotation.z + Math.sin(elapsed * 0.22) * 0.012;
      }
    }

    controls.update();
    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(animate);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  controls.addEventListener("start", () => {
    userMoved = true;
    controls.autoRotate = false;
  });

  function handlePointerDown(event) {
    pointerStart.set(event.clientX, event.clientY);
    const button = buttonAtPointer(event);
    if (button) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderer.domElement.setPointerCapture?.(event.pointerId);
      pressButton(button);
      if (button.userData.buttonIndex === 0) startConfirmHold();
      return;
    }
  }

  function handlePointerUp(event) {
    if (pressedButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    }
    const button = buttonAtPointer(event);
    if (pressedButton) {
      handleButtonClick(button || pressedButton);
    }
    releaseButton();
  }

  function handlePointerMove(event) {
    if (pressedButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    renderer.domElement.style.cursor = buttonAtPointer(event) ? "pointer" : "grab";
  }

  function handleDoubleClick(event) {
    if (buttonAtPointer(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    resetView();
  }

  function handlePointerLeave() {
    if (activeMode === "confirming") goBack();
    releaseButton();
  }

  const pointerOptions = { capture: true };
  renderer.domElement.addEventListener("pointerdown", handlePointerDown, pointerOptions);
  renderer.domElement.addEventListener("pointermove", handlePointerMove, pointerOptions);
  renderer.domElement.addEventListener("pointerup", handlePointerUp, pointerOptions);
  renderer.domElement.addEventListener("pointerleave", handlePointerLeave, pointerOptions);
  renderer.domElement.addEventListener("dblclick", handleDoubleClick, pointerOptions);

  resize();
  loadModels();
  animate();

  return {
    scene,
    camera,
    renderer,
    dispose() {
      window.cancelAnimationFrame(frameId);
      clearFlowTimers();
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("dblclick", handleDoubleClick, pointerOptions);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown, pointerOptions);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove, pointerOptions);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp, pointerOptions);
      renderer.domElement.removeEventListener("pointerleave", handlePointerLeave, pointerOptions);
      controls.dispose();
      assembly.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
      });
      frameTextures.forEach((texture) => texture.dispose());
      exoskeletonMaterial.dispose();
      componentMaterial.dispose();
      buttonMaterial.dispose();
      buttonActiveMaterial.dispose();
      screenMaterial.dispose();
      boardMaterial.dispose();
      pcbMaterial.dispose();
      palePlasticMaterial.dispose();
      screwMaterial.dispose();
      environmentMap.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
