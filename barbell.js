(function () {
  const canvas  = document.getElementById('barbell-canvas');
  const section = document.querySelector('.barbell-section');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(section.clientWidth, section.clientHeight);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, section.clientWidth / section.clientHeight, 0.1, 100);
  camera.position.set(0, 1.2, 7.0);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xfff4e0, 2.2);
  key.position.set(5, 8, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd0e8ff, 0.5);
  fill.position.set(-6, -2, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(0, 3, -7);
  scene.add(rim);
  const under = new THREE.DirectionalLight(0xfff0d0, 0.3);
  under.position.set(0, -5, 2);
  scene.add(under);

  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d4, metalness: 1.0, roughness: 0.12 });
  const knurlMat  = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.85, roughness: 0.5 });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0xc9a96e, metalness: 0.92, roughness: 0.18 });
  const hubMat    = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7,  roughness: 0.35 });

  function cyl(rT, rB, h, seg, mat) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg), mat);
    m.rotation.z = Math.PI / 2;
    return m;
  }

  // ── Bar (static) ──
  const barbell = new THREE.Group();
  barbell.rotation.z = 0.06;
  scene.add(barbell);

  function addPart(mesh, x) { mesh.position.x = x; barbell.add(mesh); }
  addPart(cyl(0.038, 0.038, 2.0,  24, knurlMat),   0);
  addPart(cyl(0.038, 0.038, 0.28, 16, chromeMat),  1.14);
  addPart(cyl(0.038, 0.038, 0.28, 16, chromeMat), -1.14);
  addPart(cyl(0.056, 0.056, 1.06, 20, chromeMat),  1.81);
  addPart(cyl(0.056, 0.056, 1.06, 20, chromeMat), -1.81);
  addPart(cyl(0.062, 0.062, 0.04, 20, chromeMat),  2.365);
  addPart(cyl(0.062, 0.062, 0.04, 20, chromeMat), -2.365);

  // ── Plate definitions (Eleiko IPF colours) ──
  const PLATE_DEF = {
    20: { r: 0.52, t: 0.072, color: 0x1a47a0 },  // Eleiko blue
    10: { r: 0.52, t: 0.060, color: 0x1e6b2e },  // Eleiko green (same width, thinner)
     5: { r: 0.36, t: 0.050, color: 0xf0f0f0 },  // white
  };

  const PRESETS = {
    squat:    [20, 20, 20, 20, 10],
    bench:    [20, 20, 20, 5],
    deadlift: [20, 20, 20, 20],
  };

  function buildPlates(weights) {
    const group = new THREE.Group();

    [1, -1].forEach(side => {
      let x = side * 1.30;
      weights.forEach(w => {
        const { r, t, color } = PLATE_DEF[w];
        x += side * (t / 2);

        // Coloured cylinder body
        const disc = cyl(r, r, t, 48,
          new THREE.MeshStandardMaterial({ color, metalness: 0.35, roughness: 0.55 }));
        disc.position.x = x;
        group.add(disc);

        // Hub ring
        const hub = cyl(0.09, 0.09, t + 0.006, 24, hubMat);
        hub.position.x = x;
        group.add(hub);

        x += side * (t / 2 + 0.010);
      });

      const collar = cyl(0.071, 0.071, 0.16, 24, collarMat);
      collar.position.x = x + side * 0.08;
      group.add(collar);
    });
    return group;
  }

  function disposeGroup(group) {
    group.traverse(obj => {
      if (!obj.isMesh) return;
      obj.geometry.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(m => { if (m) { if (m.map) m.map.dispose(); m.dispose(); } });
    });
  }

  const platesContainer = new THREE.Group();
  barbell.add(platesContainer);

  let activeGroup = buildPlates(PRESETS.squat);
  platesContainer.add(activeGroup);

  // ── Transition state ──
  let nextPreset  = null;
  let phase       = 'idle';
  let elapsed     = 0;
  let floatClock  = 0;
  let impactClock = -1;   // clock value at moment of impact

  const OUT_DUR  = 0.28;   // seconds to fall off-screen
  const IN_DUR   = 0.78;   // seconds for drop + settle
  const DROP_TOP =  6.5;   // y-spawn point above screen
  const DROP_BOT = -6.0;   // y-exit point below screen

  // Normalized y [0=floor, 1=drop_top]: heavy weight physics — fast fall, hard stop, one low thud
  function dropBounce(t) {
    if (t < 0.60) {
      // Free-fall: constant acceleration (s = ½gt²)
      const ft = t / 0.60;
      return 1 - ft * ft;
    } else if (t < 0.78) {
      // One low bounce: ~5% of drop height (bumper plates, not rubber)
      const bt = (t - 0.60) / 0.18;
      return 0.05 * 4 * bt * (1 - bt);
    } else if (t < 0.92) {
      // Micro-settle: barely lifts off again
      const bt = (t - 0.78) / 0.14;
      return 0.012 * 4 * bt * (1 - bt);
    }
    return 0;
  }

  function easeInCubic(t) { return t * t * t; }
  function lerp(a, b, t)  { return a + (b - a) * t; }

  // ── Buttons ──
  function switchTo(presetName) {
    if (phase !== 'idle') return;
    nextPreset = presetName;
    phase      = 'out';
    elapsed    = 0;
    document.querySelectorAll('.lift-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.lift === presetName));
  }

  document.querySelectorAll('.lift-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTo(btn.dataset.lift)));

  // ── Render loop — only runs while section is visible ──
  let lastT = 0, clock = 0, visible = false;

  const visObs = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
  }, { threshold: 0 });
  visObs.observe(section);

  function animate(ts) {
    requestAnimationFrame(animate);
    if (!visible) return;
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    clock += dt;

    barbell.rotation.y = clock * 0.45;

    if (phase === 'out') {
      elapsed += dt;
      const t = Math.min(elapsed / OUT_DUR, 1);
      barbell.position.y = lerp(0, DROP_BOT, easeInCubic(t));

      if (elapsed >= OUT_DUR) {
        platesContainer.remove(activeGroup);
        disposeGroup(activeGroup);
        activeGroup = buildPlates(PRESETS[nextPreset]);
        platesContainer.add(activeGroup);
        nextPreset  = null;
        impactClock = -1;

        barbell.position.y = DROP_TOP;
        phase   = 'in';
        elapsed = 0;
      }

    } else if (phase === 'in') {
      elapsed += dt;
      const t = Math.min(elapsed / IN_DUR, 1);
      barbell.position.y = DROP_TOP * dropBounce(t);

      // Trigger impact wobble the first frame the barbell hits floor (t >= 0.60)
      if (impactClock < 0 && elapsed >= IN_DUR * 0.60) {
        impactClock = clock;
      }

      if (elapsed >= IN_DUR) {
        barbell.position.y = 0;
        floatClock = 0;
        phase = 'idle';
      }

    } else {
      floatClock += dt;
      barbell.position.y = Math.sin(floatClock * 0.4) * 0.09;
    }

    // Impact wobble: sharp jolt on z-rotation that decays fast
    if (impactClock >= 0) {
      const wt = clock - impactClock;
      const wobble = 0.07 * Math.sin(wt * 22) * Math.exp(-16 * wt);
      barbell.rotation.z = 0.06 + wobble;
    } else {
      barbell.rotation.z = 0.06;
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);

  window.addEventListener('resize', () => {
    const w = section.clientWidth;
    const h = section.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
})();
