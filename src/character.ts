import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { characterLook } from './visuals';

const round = new THREE.SphereGeometry(1, 32, 24);
const shell = new RoundedBoxGeometry(1, 1, 1, 6, .28);
const earRing = new THREE.TorusGeometry(.155, .012, 8, 40);
const smile = new THREE.TorusGeometry(.065, .018, 8, 28, Math.PI);
const led = new THREE.MeshStandardMaterial({ color: '#f3efe0', emissive: '#f3efe0', emissiveIntensity: .8, roughness: .3 });
const visor = new THREE.MeshStandardMaterial({ color: '#090e15', roughness: .23, metalness: .28 });

export function createCharacter(look: ReturnType<typeof characterLook>, mat: (color: string) => THREE.Material) {
  const root = new THREE.Group();
  root.userData.character = true;
  function mesh(geometry: THREE.BufferGeometry, size: number[], at: number[], color: string | THREE.Material, parent: THREE.Object3D = root) {
    const m = new THREE.Mesh(geometry, typeof color === 'string' ? mat(color) : color);
    m.scale.set(size[0], size[1], size[2]); m.position.set(at[0], at[1], at[2]);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const soft = (size: number[], at: number[], color: string, parent = root) => mesh(round, size, at, color, parent);
  const box = (size: number[], at: number[], color: string | THREE.Material, parent = root) => mesh(shell, size, at, color, parent);
  // Keep the shared pelvis/limb anchors so furniture contact and travel stay unchanged.
  const body = soft([.34, .49, .25], [0, 1.13, 0], look.color);
  soft([.1, .11, .1], [0, 1.56, 0], '#4a5156');
  const head = new THREE.Group(); head.position.y = 1.96; root.add(head);
  box([.90, .88, .80], [0, 0, 0], look.color, head);
  box([.80, .69, .10], [0, -.025, .387], '#4a5156', head);
  box([.76, .65, .09], [0, -.025, .415], visor, head);
  const happy = new THREE.Group(), working = new THREE.Group(); head.add(happy, working);
  for (const side of [-1, 1]) {
    mesh(smile, [1, 1, 1], [side * .16, -.02, .466], led, happy);
    box([.085, .06, .016], [side * .16, -.015, .466], led, working);
    soft([.06, .19, .19], [side * .44, -.01, 0], '#252622', head);
    const rim = mesh(earRing, [1, 1, 1], [side * .486, -.01, 0], led, head); rim.rotation.y = Math.PI / 2;
    const cap = mesh(new THREE.CircleGeometry(.137, 32), [1, 1, 1], [side * .488, -.01, 0], look.accent, head); cap.rotation.y = side * Math.PI / 2;
  }
  box([.09, .015, .015], [0, -.185, .467], look.accent, head);
  const badge = box([.14, .10, .025], [0, 1.32, .247], led);
  for (const x of [-.035, .035]) box([.018, .018, .012], [x, 1.33, .266], visor);
  box([.018, .035, .018], [0, 1.39, .25], look.accent);
  if (look.manager) box([.15, .025, .025], [0, 1.15, .25], look.accent);
  // Recessed rear service panel and small shoulder accents stay inside the existing rig envelope.
  box([.28, .32, .024], [0, 1.18, -.242], '#2d3238');
  for (const y of [1.1, 1.16, 1.22]) box([.16, .013, .012], [0, y, -.261], look.accent);
  const arms: { upper: THREE.Group; lower: THREE.Group }[] = [];
  const legs: { upper: THREE.Group; lower: THREE.Group }[] = [];
  for (const side of [-1, 1]) {
    const upper = new THREE.Group(); upper.position.set(side * .31, 1.5, 0); root.add(upper);
    soft([.12, .20, .13], [side * .025, -.17, 0], look.color, upper);
    const lower = new THREE.Group(); lower.position.y = -.32; upper.add(lower);
    soft([.105, .18, .115], [0, -.14, 0], look.color, lower);
    soft([.105, .11, .085], [0, -.32, .018], look.color, lower);
    box([.16, .035, .15], [0, -.25, 0], look.accent, lower);
    arms.push({ upper, lower });
    const thigh = new THREE.Group(); thigh.position.set(side * .16, .85, 0); root.add(thigh);
    soft([.15, .22, .16], [0, -.15, 0], look.color, thigh);
    const shin = new THREE.Group(); shin.position.y = -.32; thigh.add(shin);
    soft([.125, .20, .135], [0, -.15, 0], look.color, shin);
    soft([.155, .105, .20], [0, -.35, .065], look.color, shin);
    box([.28, .025, .34], [0, -.44, .07], '#4a5156', shin);
    legs.push({ upper: thigh, lower: shin });
  }
  const cup = mesh(new THREE.CylinderGeometry(.075, .06, .14, 16), [1, 1, 1], [0, -.32, .12], '#faf9f5', arms[1].lower);
  cup.visible = false;
  let seated = 1;
  function animate(time: number, walking: number, typing: boolean, dt: number, still = false, social = false, standing = false, lying = false, coffee = 0, basketball = 0) {
    const target = walking > 0 || standing ? 0 : 1;
    seated = still ? target : THREE.MathUtils.damp(seated, target, 9, dt);
    legs.forEach((leg, i) => {
      leg.upper.rotation.x = -seated * Math.PI / 2 + (still ? 0 : Math.sin(time * 6 + i * Math.PI) * .4 * (1 - seated) * walking);
      leg.lower.rotation.x = seated * Math.PI / 2 + (still ? 0 : Math.max(0, Math.sin(time * 6 + i * Math.PI)) * .3 * (1 - seated) * walking);
    });
    arms.forEach((arm, i) => {
      const upper = lying ? 0 : typing ? -1.35 * seated : coffee && i === 1 ? coffee === 2 ? -1.4 : -1.25 : -.15 * seated;
      const lower = lying ? 0 : typing ? -.15 * seated : coffee && i === 1 ? coffee === 2 ? -1.0 : -.1 : -.75 * seated;
      arm.upper.rotation.x = basketball === 2 ? -2.3 : basketball === 1 && i === 1 ? -.65 + Math.sin(time * Math.PI * 4) * .15 : upper + (still ? 0 : Math.sin(time * 6 + i * Math.PI + Math.PI) * .28 * (1 - seated) * walking) + (social && !still && i === 1 ? -.45 - Math.sin(time * 1.8) * .12 : 0);
      arm.lower.rotation.x = basketball === 2 ? -.6 : basketball === 1 && i === 1 ? -.55 : lower + (typing && !still ? Math.sin(time * 15 + i * 1.8) * .075 : 0);
    });
    body.position.y = 1.13 + (still ? 0 : Math.sin(time * (walking ? 14 : 2)) * (walking ? .014 : .004));
    badge.position.y = body.position.y + .19;
    head.rotation.x = typing && !still ? .035 + Math.sin(time * 2) * .015 : 0;
    head.rotation.y = social && !still ? Math.sin(time * .85) * .16 : 0;
    head.position.z = still ? lying ? .2 : 0 : THREE.MathUtils.damp(head.position.z, lying ? .2 : 0, 9, dt);
    happy.visible = !typing && !lying; working.visible = typing || lying;
    cup.visible = coffee === 2;
    return seated;
  }
  animate(0, 0, false, 1, true);
  return { root, animate };
}
