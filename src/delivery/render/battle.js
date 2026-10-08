// ---- THE BATTLEFIELD's pillboxes (their shooting: ../gunfire.js; the armies are traffic: render/cars.js) ----
// Each a squat six-sided concrete bunker beside the road (the model: render/battleModels.js), a band of its
// army's colour round it (green, the player's; red, the enemy's), its firing slit to the road, its army's
// flag flapping on top.
import * as THREE from 'three';
import { Track } from '../track.js';
import { Gunfire } from '../gunfire.js';
import { scene, tmp } from './scene.js';
import { makePillbox } from './battleModels.js';

const group = new THREE.Group();
scene.add(group);
let built = null, meshes = [];

export const syncBattle = () => {
  // (the pillboxes are set out as a run starts: see Gunfire.reset)
  if (built !== Gunfire.pillboxes) {
    group.clear();
    built = Gunfire.pillboxes;
    meshes = built.map(box => {
      const mesh = makePillbox(box.team);
      const h = Track.toWorld(box.s, box.lat, tmp);
      mesh.position.copy(tmp);
      mesh.rotation.y = h + (box.side < 0 ? Math.PI / 2 : -Math.PI / 2); // (its slit to the road)
      group.add(mesh);
      return mesh;
    });
  }
  const t = performance.now() / 1000;
  meshes.forEach((mesh, i) => { mesh.userData.flag.rotation.y = Math.sin(t * 3 + i) * 0.3; }); // (flapping)
};
