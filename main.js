import * as THREE from 'three';

// ---------- Basic setup ----------
const R = 5; // planet radius
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1026);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xbcd0ff, 0x2a3a2a, 0.9));
const sun = new THREE.DirectionalLight(0xfff1cc, 1.4);
sun.position.set(8, 12, 6);
scene.add(sun);

// Small deterministic random generator so the planet looks the same every time
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(42);

function randDir() {
  const u = rnd() * 2 - 1;
  const t = rnd() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return new THREE.Vector3(s * Math.cos(t), u, s * Math.sin(t));
}

const UP = new THREE.Vector3(0, 1, 0);
function placeOnPlanet(obj, dir, offset = 0) {
  obj.position.copy(dir).multiplyScalar(R + offset);
  obj.quaternion.setFromUnitVectors(UP, dir);
}

// ---------- Background stars ----------
{
  const count = 600;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const d = randDir().multiplyScalar(90 + rnd() * 30);
    pos.set([d.x, d.y, d.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true })));
}

// ---------- Planet ----------
const planet = new THREE.Mesh(
  new THREE.IcosahedronGeometry(R, 3),
  new THREE.MeshStandardMaterial({ color: 0x3fa66b, flatShading: true, roughness: 1 })
);
scene.add(planet);

// ---------- Trees ----------
for (let i = 0; i < 16; i++) {
  const dir = randDir();
  if (dir.y > 0.85) continue; // keep the spawn point clear
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true })
  );
  trunk.position.y = 0.2;
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.9, 7),
    new THREE.MeshStandardMaterial({ color: 0x1f7a45, flatShading: true })
  );
  crown.position.y = 0.85;
  tree.add(trunk, crown);
  tree.scale.setScalar(0.8 + rnd() * 0.7);
  placeOnPlanet(tree, dir, -0.05);
  scene.add(tree);
}

// ---------- The rose under a glass dome ----------
{
  const rose = new THREE.Group();
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.35, 5),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
  );
  stem.position.y = 0.175;
  const bloom = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.13, 0),
    new THREE.MeshStandardMaterial({ color: 0xd81b3c, flatShading: true })
  );
  bloom.position.y = 0.42;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xaad8ff, transparent: true, opacity: 0.22, roughness: 0.1 })
  );
  rose.add(stem, bloom, dome);
  placeOnPlanet(rose, new THREE.Vector3(0.6, 0.3, 0.74).normalize(), 0);
  scene.add(rose);
}

// ---------- Player (pivot at planet center, body offset to the surface) ----------
const pivot = new THREE.Group();
scene.add(pivot);

const player = new THREE.Group();
const bodyMesh = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.2, 0.35, 4, 10),
  new THREE.MeshStandardMaterial({ color: 0x2f6fd6, flatShading: true })
);
bodyMesh.position.y = 0.38;
const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.16, 14, 10),
  new THREE.MeshStandardMaterial({ color: 0xffd9b0 })
);
head.position.y = 0.78;
const hair = new THREE.Mesh(
  new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0xffd23f })
);
hair.position.y = 0.8;
player.add(bodyMesh, head, hair);
player.position.y = R;
pivot.add(player);

// Chase camera is a child of the pivot, so it follows the player around the planet.
camera.position.set(0, R + 3.2, 5.2);
camera.lookAt(0, R + 0.5, 0);
pivot.add(camera);

// ---------- Collectible stars ----------
const stars = [];
const starGeo = new THREE.OctahedronGeometry(0.26);
const starMat = new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffb300, emissiveIntensity: 0.9, flatShading: true });
const TOTAL = 12;
for (let i = 0; i < TOTAL; i++) {
  const dir = randDir();
  if (dir.y > 0.9) { i--; continue; }
  const m = new THREE.Mesh(starGeo, starMat);
  m.userData = { dir, phase: rnd() * 6.28 };
  m.position.copy(dir).multiplyScalar(R + 0.9);
  scene.add(m);
  stars.push(m);
}

const hud = document.getElementById('hud');
const msg = document.getElementById('msg');
let score = 0;
function updateHud() { hud.textContent = `Stars: ${score} / ${TOTAL}`; }
updateHud();
document.getElementById('again').addEventListener('click', () => location.reload());

// ---------- Input: keyboard ----------
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

// ---------- Input: touch joystick ----------
const stick = document.getElementById('stick');
const knob = document.getElementById('knob');
const stickInput = { x: 0, y: 0 };
let stickPointer = null;
const STICK_MAX = 45;

function moveStick(e) {
  const rect = stick.getBoundingClientRect();
  let dx = e.clientX - (rect.left + rect.width / 2);
  let dy = e.clientY - (rect.top + rect.height / 2);
  const len = Math.hypot(dx, dy);
  if (len > STICK_MAX) { dx = (dx / len) * STICK_MAX; dy = (dy / len) * STICK_MAX; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  stickInput.x = dx / STICK_MAX;
  stickInput.y = dy / STICK_MAX;
}
function resetStick() {
  stickPointer = null;
  knob.style.transform = 'translate(0, 0)';
  stickInput.x = 0;
  stickInput.y = 0;
}
stick.addEventListener('pointerdown', (e) => {
  stickPointer = e.pointerId;
  stick.setPointerCapture(e.pointerId);
  moveStick(e);
});
stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickPointer) moveStick(e); });
stick.addEventListener('pointerup', (e) => { if (e.pointerId === stickPointer) resetStick(); });
stick.addEventListener('pointercancel', resetStick);

// ---------- Game loop ----------
const SPEED = 3.2;      // units per second along the surface
const TURN_SPEED = 2.4; // radians per second
const clock = new THREE.Clock();
const worldPos = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  let turn = stickInput.x;
  let forward = -stickInput.y;
  if (keys.ArrowLeft || keys.KeyA) turn -= 1;
  if (keys.ArrowRight || keys.KeyD) turn += 1;
  if (keys.ArrowUp || keys.KeyW) forward += 1;
  if (keys.ArrowDown || keys.KeyS) forward -= 1;
  turn = THREE.MathUtils.clamp(turn, -1, 1);
  forward = THREE.MathUtils.clamp(forward, -1, 1);

  // Turning spins the pivot around the local up axis; walking rolls it around the local X axis.
  pivot.rotateY(-turn * TURN_SPEED * dt);
  pivot.rotateX(-forward * (SPEED / R) * dt);

  // Little walking bob
  bodyMesh.position.y = 0.38 + Math.abs(forward) * Math.sin(t * 12) * 0.03;

  // Stars: spin, bob, and collect
  player.getWorldPosition(worldPos);
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];
    const r = R + 0.9 + Math.sin(t * 2 + s.userData.phase) * 0.12;
    s.position.copy(s.userData.dir).multiplyScalar(r);
    s.rotation.y += dt * 2;
    if (s.position.distanceTo(worldPos) < 0.9) {
      scene.remove(s);
      stars.splice(i, 1);
      score++;
      updateHud();
      if (score === TOTAL) msg.style.display = 'flex';
    }
  }

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
