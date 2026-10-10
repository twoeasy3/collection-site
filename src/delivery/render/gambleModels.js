// ---- Gimmick Road 3's models (the road gambles: ../gambles.js), with no game state: render/gambles.js sets them
// down in a level, and the Gimmicks page (../gimmicks.js) shows them on its cards ----
import * as THREE from 'three';

const lambert = (color, extra) => new THREE.MeshLambertMaterial({ color, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const add = (parent, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// words on a board (a canvas texture): one or two lines
export const makeBoard = (text, bg, fg, w, h) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round(512 * h / w);
  const c = canvas.getContext('2d'), lines = String(text).split('\n');
  c.fillStyle = bg;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = fg;
  c.lineWidth = 10;
  c.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  c.fillStyle = fg;
  c.font = 'bold ' + Math.round(canvas.height * (lines.length > 1 ? 0.36 : 0.55)) + 'px system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  lines.forEach((line, k) => c.fillText(line, canvas.width / 2, canvas.height * (k + 0.5) / lines.length + 2));
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), side: THREE.DoubleSide }));
};
// a board on a post, facing the traffic coming up to it (the model's -z)
export const makeSign = (text, bg = '#ffd23f', fg = '#111', w = 5.4, h = 1.8, post = 4) => {
  const g = new THREE.Group();
  add(g, box(0.2, post, 0.2), lambert(0x8a9096), 0, post / 2, 0);
  const sign = makeBoard(text, bg, fg, w, h);
  sign.position.set(0, post + h / 2 - 0.3, -0.12);
  sign.rotation.y = Math.PI;
  g.add(sign);
  return g;
};

// a windsock on its pole: `sock`, hinged at the top, reaches out along its local +x (see syncGambles)
const POLE = lambert(0xd9dde2), RING = lambert(0x30343a), SOCK = [lambert(0xff6a1a, { side: THREE.DoubleSide }), lambert(0xf4f4f4, { side: THREE.DoubleSide })];
export const makeWindsock = (height = 7.5, length = 4.2) => {
  const g = new THREE.Group(), turn = new THREE.Group(), sock = new THREE.Group();
  add(g, box(0.16, height, 0.16), POLE, 0, height / 2, 0);
  turn.position.y = height;
  add(turn, new THREE.TorusGeometry(0.62, 0.06, 6, 14).rotateY(Math.PI / 2), RING);
  for (let k = 0; k < 5; k++) { // (five bands, orange and white, narrowing to the tail)
    const r0 = 0.6 - k * 0.07, r1 = 0.6 - (k + 1) * 0.07, piece = length / 5;
    add(sock, new THREE.CylinderGeometry(r1, r0, piece, 10, 1, true).rotateZ(-Math.PI / 2), SOCK[k % 2], piece * (k + 0.5), 0, 0);
  }
  turn.add(sock);
  g.add(turn);
  g.userData.turn = turn;
  g.userData.sock = sock;
  // how it hangs: `level` 0 (limp) .. 1 (straight out), blowing to the side `dir` (1: the model's -x), at time t
  g.userData.set = (level, dir, t) => {
    turn.rotation.y = dir > 0 ? Math.PI : 0;
    sock.rotation.z = -(1 - level) * 1.25 + Math.sin(t * 9) * 0.04 * level;
    sock.rotation.y = Math.sin(t * 6.3) * 0.08 * level;
  };
  return g;
};
