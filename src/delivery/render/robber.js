// ---- THE BANK ROBBER WHO WANTS A LIFT, DRAWN (see ../robber.js; his model: ./pursuitModels.js): standing on the
// shoulder facing the traffic coming, thumb out to the road; and, picked up, riding on the car's roof with his bag.
import { Track } from '../track.js';
import { Player } from '../player.js';
import { Robber } from '../robber.js';
import { scene, tmp } from './scene.js';
import { carMesh } from './cars.js';
import { makeRobber } from './pursuitModels.js';

const standing = [0, 1, 2, 3].map(() => { const man = makeRobber(); man.visible = false; scene.add(man); return man; });
const aboard = makeRobber();
aboard.scale.setScalar(0.8);
aboard.visible = false;
carMesh.add(aboard);

export const syncRobber = (dt, now) => {
  const t = now / 1000;
  // (the nearest few of them: there are only so many models)
  const shown = Robber.spots.filter(spot => !spot.taken && Math.abs(spot.s - Player.s) < 700).slice(0, standing.length);
  standing.forEach((man, k) => {
    const spot = shown[k];
    man.visible = !!spot;
    if (!spot) return;
    man.rotation.y = Track.toWorld(spot.s, spot.lat, tmp) + Math.PI; // (facing back down the road)
    man.position.copy(tmp);
    man.userData.animate(t + k);
  });
  aboard.visible = !!Robber.carrying && Player.active;
  if (aboard.visible) {
    aboard.position.set(0, Player.height - 0.35, -0.3); // (sat on the roof, his legs down through it)
    aboard.userData.animate(t);
  }
};
