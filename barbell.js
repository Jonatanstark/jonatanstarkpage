(function () {
  const canvas  = document.getElementById('barbell-canvas');
  const section = document.querySelector('.barbell-section');

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(section.clientWidth, section.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── Scene / Camera ──
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, section.clientWidth / section.clientHeight, 0.1, 100);
  camera.position.set(0, 1.6, 6.2);
  camera.lookAt(0, 0, 0);

  // ── Lights ──
  scene.add(new THREE.AmbientLight(0xffffff, 0.28));
  const key = new THREE.DirectionalLight(0xfff8e8, 2.6);
  key.position.set(5, 8, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8c8ff, 0.6);
  fill.position.set(-6, -2, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.0);
  rim.position.set(0, 3, -7);
  scene.add(rim);
  const under = new THREE.DirectionalLight(0xc9a96e, 0.35);
  under.position.set(0, -5, 0);
  scene.add(under);

  // ── Shared Materials ──
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d4, metalness: 1.0, roughness: 0.12 });
  const knurlMat  = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.85, roughness: 0.5 });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0xc9a96e, metalness: 0.92, roughness: 0.18 });
  const hubMat    = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7,  roughness: 0.35 });

  function cyl(rT, rB, h, seg, mat) {
    return new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), mat);
  }
  function addX(group, mesh, x) {
    mesh.rotation.z = Math.PI / 2;
    mesh.position.x = x;
    group.add(mesh);
  }

  // ── Static bar structure ──
  const barbell = new THREE.Group();

  addX(barbell, cyl(0.038, 0.038, 2.0, 24, knurlMat),   0);       // knurled centre
  addX(barbell, cyl(0.038, 0.038, 0.28, 16, chromeMat),  1.14);   // smooth R
  addX(barbell, cyl(0.038, 0.038, 0.28, 16, chromeMat), -1.14);   // smooth L
  addX(barbell, cyl(0.056, 0.056, 1.06, 20, chromeMat),  1.81);   // sleeve R
  addX(barbell, cyl(0.056, 0.056, 1.06, 20, chromeMat), -1.81);   // sleeve L
  addX(barbell, cyl(0.062, 0.062, 0.04, 20, chromeMat),  2.365);  // end cap R
  addX(barbell, cyl(0.062, 0.062, 0.04, 20, chromeMat), -2.365);  // end cap L

  barbell.rotation.z = 0.07;
  scene.add(barbell);

  // ── Plate definitions ──
  // IPF colours: 20kg=blue, 10kg=green, 5kg=white/light
  const PLATES = {
    20:  { r: 0.52, t: 0.070, color: 0x1a4fcc },  // blue
    10:  { r: 0.44, t: 0.058, color: 0x16a34a },  // green
    5:   { r: 0.36, t: 0.048, color: 0xd4d4d4 },  // white
  };

  // Per lift: plates stacked from inner sleeve outward (one side)
  const PRESETS = {
    squat:    [20, 20, 20, 20, 10],  // 90 kg/side → 200 kg total
    bench:    [20, 20, 20, 5],       // 65 kg/side → 150 kg total
    deadlift: [20, 20, 20, 20],      // 80 kg/side → 180 kg total
  };

  // ── Build plate meshes for a preset ──
  function buildPlates(weights) {
    const group = new THREE.Group();
    [1, -1].forEach(side => {
      let x = side * 1.30;  // inner sleeve start

      weights.forEach(w => {
        const { r, t, color } = PLATES[w];
        x += side * (t / 2);

        // Disc
        const disc = cyl(r, r, t, 48,
          new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.45 }));
        disc.rotation.z = Math.PI / 2;
        disc.position.x = x;
        group.add(disc);

        // Hub ring
        const hub = cyl(0.095, 0.095, t + 0.003, 24, hubMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.x = x;
        group.add(hub);

        x += side * (t / 2 + 0.013);
      });

      // Gold collar
      const collar = cyl(0.071, 0.071, 0.16, 24, collarMat);
      collar.rotation.z = Math.PI / 2;
      collar.position.x = x + side * 0.08;
      group.add(collar);
    });
    return group;
  }

  // ── Plate container inside barbell group ──
  const platesContainer = new THREE.Group();
  barbell.add(platesContainer);

  let currentGroup = buildPlates(PRESETS.squat);
  platesContainer.add(currentGroup);

  // ── Transition state ──
  let outGroup   = null;
  let inGroup    = null;
  let phase      = 'idle';  // 'out' | 'in' | 'idle'
  let tProgress  = 0;
  const SPEED    = 4;       // transition speed multiplier

  function switchTo(presetName) {
    if (phase !== 'idle') return;

    outGroup  = currentGroup;
    inGroup   = buildPlates(PRESETS[presetName]);
    inGroup.scale.set(0, 0, 0);
    platesContainer.add(inGroup);

    phase     = 'out';
    tProgress = 0;

    document.querySelectorAll('.lift-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.lift === presetName));
  }

  document.querySelectorAll('.lift-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTo(btn.dataset.lift)));

  // ── Animate ──
  let lastT = 0;
  let clock = 0;

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t)  { return t * t * t; }

  function animate(ts) {
    requestAnimationFrame(animate);
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    clock += dt;

    // Spin & float
    barbell.rotation.y  = clock * 0.5;
    barbell.position.y  = Math.sin(clock * 0.4) * 0.09;

    // Plate transition
    if (phase === 'out') {
      tProgress += dt * SPEED;
      const s = Math.max(0, 1 - easeIn(Math.min(tProgress, 1)));
      outGroup.scale.set(s, s, s);

      if (tProgress >= 1) {
        platesContainer.remove(outGroup);
        outGroup  = null;
        phase     = 'in';
        tProgress = 0;
        currentGroup = inGroup;
      }
    } else if (phase === 'in') {
      tProgress += dt * SPEED;
      const s = easeOut(Math.min(tProgress, 1));
      inGroup.scale.set(s, s, s);

      if (tProgress >= 1) {
        inGroup.scale.set(1, 1, 1);
        inGroup   = null;
        phase     = 'idle';
      }
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);

  // ── Resize ──
  window.addEventListener('resize', () => {
    const w = section.clientWidth;
    const h = section.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
})();
