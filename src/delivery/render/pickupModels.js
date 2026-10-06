// ---- the pickups' models (and the TANK RAGE target's) ------------------------------------------
// Shared by the game (render/items.js) and the power-ups page (powerups.js). Plain three.js:
// nothing here touches the game, so a page of its own can show them.
import * as THREE from 'three';

const lambert = (color) => new THREE.MeshLambertMaterial({ color });

export const TURBO_COLOR = 0x29e0ff;
// the colour of each pickup's pad (and its glow in the HUD)
export const PICKUP_COLOR = { turbo: TURBO_COLOR, ghost: 0xf0f0ff, wrench: 0xffa726, passenger: 0xff8fb1, mystery: 0xb36bff, radarDetector: 0xff3b30, siren: 0x2060ff,
  badGas: 0x6b7a2a, heavyMass: 0x9aa0a8, timePlus: 0x2ecc40, timeMinus: 0xe0302a };
// a part of a pickup model: a mesh at (x, y, z), optionally turned (rx, ry, rz)
const part = (group, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
};
// each pickup is a little model of what it does, about 1.5 m across, centred on the origin
export const PICKUP_MODELS = {
  // a turbocharger: a snail-shell compressor housing with its wheel showing, an inlet pipe
  // on the front, the turbine housing behind, and an exhaust flange
  turbo: () => {
    const group = new THREE.Group();
    const steel = lambert(0xb8bcc4), dark = lambert(0x4a4e57), glow = new THREE.MeshBasicMaterial({ color: TURBO_COLOR });
    part(group, new THREE.TorusGeometry(0.42, 0.26, 10, 24), steel, 0, 0, 0.1);          // compressor snail
    part(group, new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), glow, 0, 0, 0.3, Math.PI / 2); // the wheel's glowing eye
    for (let i = 0; i < 6; i++) { // compressor blades
      part(group, new THREE.BoxGeometry(0.08, 0.5, 0.06), dark, 0, 0, 0.34, 0, 0, i * Math.PI / 6);
    }
    part(group, new THREE.CylinderGeometry(0.22, 0.22, 0.6, 12), steel, 0, 0, 0.6, Math.PI / 2);  // inlet pipe
    part(group, new THREE.CylinderGeometry(0.34, 0.34, 0.5, 14), dark, 0, 0, -0.35, Math.PI / 2); // turbine housing
    part(group, new THREE.BoxGeometry(0.9, 0.16, 0.5), dark, 0, -0.5, -0.3);                       // exhaust flange
    part(group, new THREE.CylinderGeometry(0.18, 0.18, 0.4, 10), steel, 0.5, 0.3, -0.3, 0, 0, Math.PI / 2); // oil line
    return group;
  },
  // a cartoon ghost: a sheet with a round head, a wavy hem, two arms and two eyes
  ghost: () => {
    const group = new THREE.Group();
    const sheet = new THREE.MeshLambertMaterial({ color: 0xf4f4ff, transparent: true, opacity: 0.85 });
    const ink = new THREE.MeshBasicMaterial({ color: 0x1b1b2a });
    part(group, new THREE.SphereGeometry(0.62, 16, 12), sheet, 0, 0.35, 0);                 // head
    part(group, new THREE.CylinderGeometry(0.62, 0.52, 0.9, 16), sheet, 0, -0.1, 0);        // body
    for (let i = 0; i < 5; i++) { // the hem's waves
      const a = i * Math.PI * 2 / 5;
      part(group, new THREE.SphereGeometry(0.2, 10, 8), sheet, Math.cos(a) * 0.42, -0.58, Math.sin(a) * 0.42);
    }
    part(group, new THREE.SphereGeometry(0.17, 10, 8), sheet, -0.68, 0.05, 0.1);           // arms, raised: boo
    part(group, new THREE.SphereGeometry(0.17, 10, 8), sheet, 0.68, 0.05, 0.1);
    part(group, new THREE.SphereGeometry(0.1, 8, 6), ink, -0.22, 0.42, 0.52);               // eyes
    part(group, new THREE.SphereGeometry(0.1, 8, 6), ink, 0.22, 0.42, 0.52);
    part(group, new THREE.SphereGeometry(0.09, 8, 6), ink, 0, 0.18, 0.56);                  // an open mouth
    return group;
  },
  // a combination wrench: an open jaw at one end, a ring at the other
  // (stood on end, head up, so the pickup's spin turns it about its own length)
  wrench: () => {
    const group = new THREE.Group(), wrench = new THREE.Group();
    const orange = lambert(PICKUP_COLOR.wrench), dark = lambert(0x3a3a40);
    part(wrench, new THREE.BoxGeometry(1.3, 0.2, 0.3), orange, 0, 0, 0);                            // handle
    part(wrench, new THREE.CylinderGeometry(0.42, 0.42, 0.2, 14), orange, 0.85, 0, 0);               // open-end head
    part(wrench, new THREE.BoxGeometry(0.34, 0.26, 0.26), dark, 1.0, 0, 0);                          // its jaw
    part(wrench, new THREE.TorusGeometry(0.3, 0.13, 8, 18), orange, -0.85, 0, 0, Math.PI / 2);       // ring end
    wrench.rotation.z = Math.PI / 2;
    wrench.scale.setScalar(0.8);
    group.add(wrench);
    return group;
  },
  // an inflatable passenger: a pink balloon figure, arms up, standing in the road
  passenger: () => {
    const group = new THREE.Group();
    const pink = new THREE.MeshLambertMaterial({ color: PICKUP_COLOR.passenger, emissive: 0x3a1020 });
    const ink = new THREE.MeshBasicMaterial({ color: 0x1b1b2a });
    part(group, new THREE.SphereGeometry(0.34, 14, 10), pink, 0, 0.62, 0);                      // head
    part(group, new THREE.CylinderGeometry(0.3, 0.36, 0.75, 12), pink, 0, 0.0, 0);              // body
    part(group, new THREE.CylinderGeometry(0.11, 0.11, 0.55, 8), pink, -0.42, 0.45, 0, 0, 0, 0.7);  // arms, raised
    part(group, new THREE.CylinderGeometry(0.11, 0.11, 0.55, 8), pink, 0.42, 0.45, 0, 0, 0, -0.7);
    part(group, new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), pink, -0.16, -0.6, 0);          // legs
    part(group, new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), pink, 0.16, -0.6, 0);
    part(group, new THREE.SphereGeometry(0.05, 6, 5), ink, -0.11, 0.68, 0.3);                   // eyes
    part(group, new THREE.SphereGeometry(0.05, 6, 5), ink, 0.11, 0.68, 0.3);
    part(group, new THREE.SphereGeometry(0.06, 6, 5), ink, 0, 0.52, 0.32);                      // a surprised mouth
    return group;
  },
};

// the mystery pickup: a purple block with a question mark on every side
PICKUP_MODELS.mystery = () => {
  const group = new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#b36bff';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#5a2a8a';
  g.lineWidth = 6;
  g.strokeRect(3, 3, 58, 58);
  g.fillStyle = '#ffffff';
  g.font = 'bold 48px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('?', 32, 35);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  part(group, new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshLambertMaterial({ map, emissive: 0x2a1040 }), 0, 0, 0)
    .userData.text = true; // (it has writing on it: see render/items.js, readable)
  return group;
};

// a radar detector: a black dash-top box with a red LED readout, three lights and an aerial
PICKUP_MODELS.radarDetector = () => {
  const group = new THREE.Group();
  const glow = (color) => new THREE.MeshBasicMaterial({ color });
  part(group, new THREE.BoxGeometry(1.0, 0.32, 0.7), lambert(0x1b1d22), 0, 0, 0);           // the unit
  part(group, new THREE.BoxGeometry(0.5, 0.06, 0.32), lambert(0x3a3a40), 0, -0.19, 0);      // its mount
  part(group, new THREE.BoxGeometry(0.56, 0.12, 0.02), glow(0xff2a2a), -0.1, 0.03, 0.36);   // LED readout
  [0x39ff6a, 0xffd23f, 0xff3b30].forEach((color, i) => {                                       // lights
    part(group, new THREE.BoxGeometry(0.06, 0.06, 0.02), glow(color), 0.26 + i * 0.08, 0.03, 0.36);
  });
  part(group, new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), lambert(0x8d9096), 0.4, 0.4, -0.25); // aerial
  return group;
};

// a police light bar: red one end, blue the other (userData.red / blue, for flashing)
PICKUP_MODELS.siren = () => {
  const group = new THREE.Group();
  part(group, new THREE.BoxGeometry(1.3, 0.12, 0.34), lambert(0x2a2c31), 0, -0.1, 0);       // the bar
  const red = part(group, new THREE.BoxGeometry(0.55, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xff2020 }), -0.32, 0.06, 0);
  const blue = part(group, new THREE.BoxGeometry(0.55, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0x2060ff }), 0.32, 0.06, 0);
  group.userData = { red, blue };
  return group;
};

// bad gas: a cheap army-green jerry can, a little askew and patched with rust, with three
// handles across the top, the stamped X on each side and a spout
PICKUP_MODELS.badGas = () => {
  const group = new THREE.Group();
  const olive = lambert(0x4b5320), darker = lambert(0x363d17), rust = lambert(0x7a4a22);
  const body = part(group, new THREE.BoxGeometry(0.8, 1.05, 0.42), olive, 0, -0.05, 0, 0, 0, 0.04); // the can
  for (const z of [0.215, -0.215]) for (const turn of [0.85, -0.85]) {                     // the stamped X, each side
    part(body, new THREE.BoxGeometry(0.95, 0.07, 0.02), darker, 0, 0, z, 0, 0, turn);
  }
  part(body, new THREE.BoxGeometry(0.22, 0.16, 0.03), rust, 0.2, -0.3, 0.22);               // rust patches
  part(body, new THREE.BoxGeometry(0.12, 0.2, 0.03), rust, -0.26, 0.28, -0.22);
  for (const x of [-0.2, 0, 0.2]) {                                                         // the three handles...
    part(body, new THREE.BoxGeometry(0.06, 0.16, 0.08), darker, x, 0.6, 0);
  }
  part(body, new THREE.BoxGeometry(0.5, 0.06, 0.1), darker, 0, 0.69, 0);                    // ...joined across the top
  part(body, new THREE.CylinderGeometry(0.07, 0.09, 0.26, 8), darker, 0.3, 0.6, 0, 0, 0, -0.5); // spout
  part(body, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 8), rust, 0.37, 0.72, 0, 0, 0, -0.5);    // its cap
  return group;
};

// a 1000 lb weight: a squat iron block, narrower at the top, with a ring to lift it by and
// 1000 LB cast into its front
PICKUP_MODELS.heavyMass = () => {
  const group = new THREE.Group();
  const iron = lambert(0x3c3f45);
  // (a four-sided cylinder turned an eighth is a square block; flat normals keep its faces flat)
  const block = new THREE.CylinderGeometry(0.5, 0.78, 0.95, 4, 1).toNonIndexed();
  block.computeVertexNormals();
  part(group, block, iron, 0, -0.15, 0, 0, Math.PI / 4);
  part(group, new THREE.TorusGeometry(0.22, 0.07, 8, 16), iron, 0, 0.47, 0);               // the ring
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#c9ccd2';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 44px sans-serif';
  g.fillText('1000', 64, 22);
  g.font = 'bold 22px sans-serif';
  g.fillText('LB', 64, 52);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  // on the front face, half way up it, leaning back with it
  const lean = Math.atan((0.78 - 0.5) * Math.SQRT1_2 / 0.95);
  part(group, new THREE.PlaneGeometry(0.62, 0.5), new THREE.MeshBasicMaterial({ map, transparent: true }),
    0, -0.15, (0.5 + 0.78) / 2 * Math.SQRT1_2 + 0.01, -lean).userData.text = true;
  return group;
};

// a stopwatch: a thick chrome case with its crown and button on top, and the same white face
// on both sides with a huge sign across it: a green + (time plus) or a red - (time minus)
const stopwatch = (plus) => () => {
  const group = new THREE.Group();
  const chrome = lambert(0xc4c8cf);
  const sign = new THREE.MeshBasicMaterial({ color: plus ? 0x2ecc40 : 0xe0302a });
  part(group, new THREE.CylinderGeometry(0.62, 0.62, 0.34, 28), chrome, 0, 0, 0, Math.PI / 2); // the case
  part(group, new THREE.CylinderGeometry(0.1, 0.1, 0.16, 10), chrome, 0, 0.7, 0);                // crown stem
  part(group, new THREE.CylinderGeometry(0.17, 0.17, 0.1, 12), chrome, 0, 0.8, 0);               // crown
  part(group, new THREE.BoxGeometry(0.1, 0.14, 0.12), chrome, 0.4, 0.52, 0, 0, 0, -0.65);        // button
  const face = new THREE.MeshLambertMaterial({ color: 0xf6f6f2 });
  for (const side of [1, -1]) {
    const z = side * 0.172;
    part(group, new THREE.CircleGeometry(0.52, 28), face, 0, 0, z, 0, side > 0 ? 0 : Math.PI);  // the face
    part(group, new THREE.BoxGeometry(0.72, 0.18, 0.03), sign, 0, 0, z + side * 0.012);          // the sign's bar...
    if (plus) part(group, new THREE.BoxGeometry(0.18, 0.72, 0.03), sign, 0, 0, z + side * 0.012); // ...crossed
  }
  return group;
};
PICKUP_MODELS.timePlus = stopwatch(true);
PICKUP_MODELS.timeMinus = stopwatch(false);

// TANK RAGE target: a glowing green ring and bull's-eye on a post (userData.ring and .glow spin
// and pulse); the group's origin is the ring's centre
export const makeTargetModel = () => {
  const group = new THREE.Group();
  const green = new THREE.MeshBasicMaterial({ color: 0x39ff6a });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.22, 8, 24), green);
  const bull = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), green);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 12), new THREE.MeshBasicMaterial({
    color: 0x39ff6a, transparent: true, opacity: 0.22, depthWrite: false }));
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.2, 0.2), lambert(0x2b2f38));
  post.position.y = -1.6;
  group.add(ring, bull, glow, post);
  group.userData = { ring, glow };
  return group;
};
