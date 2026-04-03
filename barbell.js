(function () {
  const canvas  = document.getElementById('barbell-canvas');
  const section = document.querySelector('.barbell-section');

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(section.clientWidth, section.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── Scene & Camera ──
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, section.clientWidth / section.clientHeight, 0.1, 100);
  camera.position.set(0, 2.2, 9);
  camera.lookAt(0, 0, 0);

  // ── Lighting ──
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  const key = new THREE.DirectionalLight(0xfff8e8, 2.4);
  key.position.set(5, 8, 5);
  key.castShadow = true;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xa8c8ff, 0.55);
  fill.position.set(-6, -2, 3);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(0, 3, -7);
  scene.add(rim);

  const bottom = new THREE.DirectionalLight(0xc9a96e, 0.3);
  bottom.position.set(0, -5, 0);
  scene.add(bottom);

  // ── Materials ──
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d4, metalness: 1.0, roughness: 0.12,
  });
  const knurlMat = new THREE.MeshStandardMaterial({
    color: 0x999999, metalness: 0.85, roughness: 0.5,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0x111111, metalness: 0.55, roughness: 0.55,
  });
  const plateEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x1e1e1e, metalness: 0.45, roughness: 0.65,
  });
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a, metalness: 0.7, roughness: 0.35,
  });
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0xc9a96e, metalness: 0.92, roughness: 0.18,
  });

  // ── Helpers ──
  function cyl(rTop, rBot, h, segs, mat) {
    return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), mat);
  }

  function addX(group, mesh, x) {
    mesh.rotation.z = Math.PI / 2;
    mesh.position.x = x;
    group.add(mesh);
  }

  // ── Build Barbell ──
  const barbell = new THREE.Group();

  // Center knurled shaft
  addX(barbell, cyl(0.038, 0.038, 2.0, 24, knurlMat), 0);

  // Smooth transition sections
  addX(barbell, cyl(0.038, 0.038, 0.28, 16, chromeMat),  1.14);
  addX(barbell, cyl(0.038, 0.038, 0.28, 16, chromeMat), -1.14);

  // Sleeves (cover bar ends — plates slide onto these)
  addX(barbell, cyl(0.056, 0.056, 1.06, 20, chromeMat),  1.81);
  addX(barbell, cyl(0.056, 0.056, 1.06, 20, chromeMat), -1.81);

  // Sleeve end caps
  addX(barbell, cyl(0.062, 0.062, 0.04, 20, chromeMat),  2.365);
  addX(barbell, cyl(0.062, 0.062, 0.04, 20, chromeMat), -2.365);

  // ── Plates (both sides) ──
  const plateDefs = [
    { r: 0.52, t: 0.072 },  // 20 kg
    { r: 0.52, t: 0.072 },  // 20 kg
    { r: 0.43, t: 0.058 },  // 10 kg
  ];

  [1, -1].forEach(side => {
    let x = side * 1.285; // inner edge of sleeve

    plateDefs.forEach(({ r, t }) => {
      x += side * (t / 2);

      // Main disc face
      addX(barbell, cyl(r, r, t, 48, plateMat), x);
      // Rim highlight ring
      addX(barbell, cyl(r, r - 0.03, t + 0.002, 48, plateEdgeMat), x);
      // Center hub
      addX(barbell, cyl(0.095, 0.095, t + 0.003, 24, hubMat), x);

      x += side * (t / 2 + 0.012);
    });

    // Gold collar
    addX(barbell, cyl(0.071, 0.071, 0.16, 24, collarMat), x + side * 0.08);
  });

  // Slight tilt for visual depth
  barbell.rotation.z = 0.07;
  scene.add(barbell);

  // ── Animate ──
  let clock = 0;
  function animate() {
    requestAnimationFrame(animate);
    clock += 0.012;
    barbell.rotation.y  = clock * 0.55;
    barbell.position.y  = Math.sin(clock * 0.4) * 0.09;
    renderer.render(scene, camera);
  }
  animate();

  // ── Resize ──
  window.addEventListener('resize', () => {
    const w = section.clientWidth;
    const h = section.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
})();
