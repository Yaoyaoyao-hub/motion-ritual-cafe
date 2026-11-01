import { useEffect, useRef } from "react";
import * as THREE from "three";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function addBox(group, size, position, color, options = {}) {
  const geometry = new THREE.BoxGeometry(...size);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0.02,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  group.add(mesh);
  return mesh;
}

function addCylinder(group, radiusTop, radiusBottom, height, position, color, segments = 20) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    new THREE.MeshStandardMaterial({ color, roughness: 0.78 }),
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createCafeWorld(scene) {
  const world = new THREE.Group();
  scene.add(world);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 24),
    new THREE.MeshStandardMaterial({ color: 0xdedfcf, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  world.add(ground);

  addBox(world, [13.5, 0.22, 10.5], [0, 0.02, -0.5], 0xd5b783, { castShadow: false });
  for (let i = -6; i <= 6; i += 1.25) {
    addBox(world, [0.035, 0.024, 10.2], [i, 0.145, -0.5], 0xb69664, { castShadow: false });
  }

  addBox(world, [13.5, 5.8, 0.35], [0, 2.9, -5.6], 0xc6a57c);
  addBox(world, [0.35, 5.8, 10.5], [-6.75, 2.9, -0.5], 0xc8a87e);
  addBox(world, [13.5, 0.32, 1.1], [0, 5.25, -5.18], 0x855f43);
  addBox(world, [0.65, 5.1, 0.65], [-6.25, 2.45, -4.95], 0x77533c);

  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0xb9d2c7, roughness: 0.25, metalness: 0.05 });
  [-3.7, 3.7].forEach((x) => {
    const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 0.12), windowMaterial);
    windowMesh.position.set(x, 3.25, -5.36);
    world.add(windowMesh);
    addBox(world, [0.12, 2.6, 0.2], [x, 3.25, -5.27], 0xf1e6cf);
    addBox(world, [2.7, 0.12, 0.2], [x, 3.25, -5.27], 0xf1e6cf);
  });

  addBox(world, [10.5, 1.05, 1.65], [0.45, 0.65, -3.75], 0x647a59);
  addBox(world, [10.7, 0.22, 1.85], [0.45, 1.27, -3.75], 0xe5d4ac);
  addBox(world, [1.5, 1.75, 1.05], [0, 2.15, -4.15], 0xb7b9ac, { roughness: 0.35, metalness: 0.42 });
  addBox(world, [1.15, 0.7, 0.22], [0, 2.15, -3.58], 0x455047, { roughness: 0.25 });
  addCylinder(world, 0.23, 0.28, 0.4, [-0.38, 1.47, -3.35], 0xd5c3a1);
  addCylinder(world, 0.23, 0.28, 0.4, [0.38, 1.47, -3.35], 0xd5c3a1);

  const glow = new THREE.PointLight(0xffd98f, 1.9, 6.5, 2);
  glow.position.set(0, 2.1, -2.9);
  world.add(glow);

  [-4.3, 3.9].forEach((x) => {
    addCylinder(world, 1.0, 1.12, 0.2, [x, 0.22, 1.35], 0x987052);
    addCylinder(world, 0.18, 0.22, 1.05, [x, 0.72, 1.35], 0x72513e);
    addCylinder(world, 1.2, 1.2, 0.18, [x, 1.27, 1.35], 0xc49a6e);
    addCylinder(world, 0.52, 0.62, 0.42, [x + 0.2, 0.36, 2.55], 0xa87a58);
  });

  [[-5.5, -3.8], [5.6, -3.7], [-5.5, 3.75], [5.55, 4.05]].forEach(([x, z], index) => {
    addCylinder(world, 0.42, 0.55, 0.72, [x, 0.35, z], index % 2 ? 0xa86f54 : 0xb88761);
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 14, 10),
      new THREE.MeshStandardMaterial({ color: index % 2 ? 0x88a56f : 0x9db47e, roughness: 0.95 }),
    );
    crown.scale.y = 1.3;
    crown.position.set(x, 1.25, z);
    crown.castShadow = true;
    world.add(crown);
  });

  addBox(world, [3.8, 1.5, 0.18], [3.7, 3.15, -5.22], 0x405443);
  for (let i = 0; i < 5; i += 1) {
    addCylinder(world, 0.19, 0.16, 0.32, [-2.7 + i * 0.75, 1.55, -3.7], 0xf4ead6, 18);
  }

  return { machinePosition: new THREE.Vector3(0, 0, -2.9), glow };
}

function createAvatar(scene) {
  const avatar = new THREE.Group();
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 24),
    new THREE.MeshBasicMaterial({ color: 0x3e4b3d, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  avatar.add(shadow);

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 0.65, 6, 14),
    new THREE.MeshStandardMaterial({ color: 0x88a6c9, roughness: 0.72 }),
  );
  body.position.y = 1.05;
  body.castShadow = true;
  avatar.add(body);

  const face = addBox(avatar, [0.82, 0.52, 0.12], [0, 1.24, -0.45], 0x273746, { roughness: 0.38 });
  face.rotation.x = -0.03;
  [-0.22, 0.22].forEach((x) => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff4d9 }),
    );
    eye.position.set(x, 1.27, -0.525);
    avatar.add(eye);
  });

  const tray = addBox(avatar, [1.1, 0.1, 0.75], [0, 0.82, -0.82], 0xc69b67, { roughness: 0.84 });
  tray.rotation.x = -0.06;
  avatar.position.set(0, 0, 3.65);
  scene.add(avatar);
  return { avatar, body, shadow };
}

function createPet(scene, pet) {
  if (!pet) return null;
  const companion = new THREE.Group();
  const color = new THREE.Color(pet.color || "#d49a6a");

  if (pet.imageUrl) {
    const texture = new THREE.TextureLoader().load(pet.imageUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(1.55, 1.55, 1.55);
    sprite.position.y = 0.8;
    companion.add(sprite);
  } else {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 18, 14),
      new THREE.MeshStandardMaterial({ color, roughness: 0.78 }),
    );
    body.scale.y = pet.species === "bird" ? 0.85 : 1.1;
    body.position.y = 0.52;
    body.castShadow = true;
    companion.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 18, 14),
      new THREE.MeshStandardMaterial({ color: color.clone().offsetHSL(0, -0.03, 0.08), roughness: 0.72 }),
    );
    head.position.set(0, 0.95, -0.16);
    head.castShadow = true;
    companion.add(head);

    const earGeometry = pet.species === "bird"
      ? new THREE.ConeGeometry(0.12, 0.28, 10)
      : new THREE.ConeGeometry(0.14, 0.34, 10);
    [-0.17, 0.17].forEach((x) => {
      const ear = new THREE.Mesh(earGeometry, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
      ear.position.set(x, 1.25, -0.13);
      ear.rotation.z = x < 0 ? 0.18 : -0.18;
      companion.add(ear);
    });

    [-0.11, 0.11].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0x2d3a32 }));
      eye.position.set(x, 1.0, -0.45);
      companion.add(eye);
    });
  }

  const petShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.44, 20),
    new THREE.MeshBasicMaterial({ color: 0x3e4b3d, transparent: true, opacity: 0.14, depthWrite: false }),
  );
  petShadow.rotation.x = -Math.PI / 2;
  petShadow.position.y = 0.02;
  companion.add(petShadow);
  companion.position.set(-1.2, 0, 4.25);
  scene.add(companion);
  return companion;
}

export function CafeScene({ controlRef, onProximity, onBrew, onMovement, pet, resetToken }) {
  const mountRef = useRef(null);
  const callbacksRef = useRef({ onProximity, onBrew, onMovement });

  useEffect(() => {
    callbacksRef.current = { onProximity, onBrew, onMovement };
  }, [onProximity, onBrew, onMovement]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9eadf);
    scene.fog = new THREE.Fog(0xe9eadf, 22, 36);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.OrthographicCamera(-10, 10, 7, -7, 0.1, 80);
    camera.position.set(13.5, 13, 16.5);
    camera.lookAt(0, 0.7, -0.7);

    scene.add(new THREE.HemisphereLight(0xfff7df, 0x7d8d72, 2.25));
    const sun = new THREE.DirectionalLight(0xffefd1, 3.0);
    sun.position.set(-7, 13, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    scene.add(sun);

    const { machinePosition, glow } = createCafeWorld(scene);
    const { avatar, body, shadow } = createAvatar(scene);
    const companion = createPet(scene, pet);

    const keys = new Set();
    const keyDown = (event) => {
      keys.add(event.key.toLowerCase());
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(event.key.toLowerCase())) event.preventDefault();
      if (!event.repeat && event.key === " ") {
        controlRef.current.jumpToken += 1;
        callbacksRef.current.onMovement("jump", "Jump");
      }
      if (!event.repeat && event.key.toLowerCase() === "e") {
        controlRef.current.interactToken += 1;
        callbacksRef.current.onMovement("interact", "Raise hand");
      }
      if (!event.repeat && ["a", "arrowleft"].includes(event.key.toLowerCase())) callbacksRef.current.onMovement("leanLeft", "Lean left");
      if (!event.repeat && ["d", "arrowright"].includes(event.key.toLowerCase())) callbacksRef.current.onMovement("leanRight", "Lean right");
      if (!event.repeat && ["w", "arrowup"].includes(event.key.toLowerCase())) callbacksRef.current.onMovement("stepForward", "Step closer");
      if (!event.repeat && ["s", "arrowdown"].includes(event.key.toLowerCase())) callbacksRef.current.onMovement("stepBack", "Step back");
    };
    const keyUp = (event) => keys.delete(event.key.toLowerCase());
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    let lastTime = performance.now();
    let verticalVelocity = 0;
    let lastJumpToken = controlRef.current.jumpToken;
    let lastInteractToken = controlRef.current.interactToken;
    let lastProximity = false;

    const resize = () => {
      const width = Math.max(320, mount.clientWidth);
      const height = Math.max(420, mount.clientHeight);
      const aspect = width / height;
      const viewHeight = aspect < 0.85 ? 17 : 13.5;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.left = (-viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const animate = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      const controls = controlRef.current;
      let moveX = controls.x;
      let moveZ = controls.z;

      if (keys.has("a") || keys.has("arrowleft")) moveX = -1;
      if (keys.has("d") || keys.has("arrowright")) moveX = 1;
      if (keys.has("w") || keys.has("arrowup")) moveZ = 1;
      if (keys.has("s") || keys.has("arrowdown")) moveZ = -1;

      const speed = 3.25;
      avatar.position.x = clamp(avatar.position.x + moveX * speed * dt, -5.65, 5.65);
      avatar.position.z = clamp(avatar.position.z - moveZ * speed * dt, -2.72, 4.5);

      if (controls.jumpToken !== lastJumpToken && avatar.position.y < 0.02) {
        verticalVelocity = 5.25;
        lastJumpToken = controls.jumpToken;
      }
      verticalVelocity -= 12.5 * dt;
      avatar.position.y = Math.max(0, avatar.position.y + verticalVelocity * dt);
      if (avatar.position.y === 0 && verticalVelocity < 0) verticalVelocity = 0;

      const moving = Math.abs(moveX) + Math.abs(moveZ) > 0.08;
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, moving ? -moveX * 0.14 : 0, 0.12);
      body.position.y = 1.05 + (moving ? Math.sin(time * 0.012) * 0.06 : Math.sin(time * 0.0022) * 0.025);
      shadow.material.opacity = 0.18 - Math.min(avatar.position.y * 0.09, 0.11);

      if (companion) {
        const targetX = avatar.position.x - 1.0;
        const targetZ = avatar.position.z + 0.85;
        companion.position.x = THREE.MathUtils.lerp(companion.position.x, targetX, 0.045);
        companion.position.z = THREE.MathUtils.lerp(companion.position.z, targetZ, 0.045);
        companion.position.y = 0.03 + Math.sin(time * 0.0045) * 0.05;
        companion.rotation.y = THREE.MathUtils.lerp(companion.rotation.y, Math.atan2(moveX, -moveZ || -0.001), 0.04);
      }

      const distance = Math.hypot(avatar.position.x - machinePosition.x, avatar.position.z - machinePosition.z);
      const near = distance < 2.35;
      if (near !== lastProximity) {
        lastProximity = near;
        callbacksRef.current.onProximity(near);
      }
      glow.intensity = near ? 3.2 + Math.sin(time * 0.006) * 0.5 : 1.75;

      if (controls.interactToken !== lastInteractToken) {
        lastInteractToken = controls.interactToken;
        if (near) callbacksRef.current.onBrew();
      }

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, 13.5 + avatar.position.x * 0.06, 0.025);
      camera.lookAt(avatar.position.x * 0.08, 0.75, -0.65);
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [controlRef, pet, resetToken]);

  return <div className="scene-canvas" ref={mountRef} aria-label="Motion controlled isometric café game" />;
}
