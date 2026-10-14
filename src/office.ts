import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { State, FacilitySession } from './domain';
import { divisionLayouts, facilityLayouts, workstationItems, officeWalkways, walkwayTiles, officeSite, founderFloor, routeLength, sampleRoute, type WalkPoint } from './layout';
import { facilitySeats, serverAgent, medicalPatients, coffeeSpot } from './facilities';
import { createNavigation, type Footprint } from './navigation';
import { characterLook, agentActivity, serverIndicatorIntensity } from './visuals';
import { workflowManagerActivity } from './n8n';
import { createCharacter } from './character';
import { createMonitor } from './monitor';
import { socialVisit, advanceTravel, courtPlay } from './social';
import { createSurfaceMaterials, createOfficeMaterials, createFloorGeometry } from './materials';
import { builderAgent, builderSession } from './builder-room';
import { captureFounderPreview } from './office-preview';
import { icon } from './ui-icons';

export function createOffice(container: HTMLElement, label: HTMLElement, onSelect: () => void) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f3efe0');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const environment = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environment, .04, .1, 100, { size: 128 }).texture;
  scene.environmentIntensity = .65;
  environment.dispose(); pmrem.dispose();
  container.appendChild(renderer.domElement);
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, .1, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  controls.enableDamping = !reducedMotion.matches;
  controls.dampingFactor = .08;
  controls.minZoom = .65;
  controls.maxZoom = 2.8;
  controls.minPolarAngle = Math.PI / 8;
  controls.maxPolarAngle = Math.PI / 2.25;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  const ambient = new THREE.HemisphereLight('#fff5e6', '#80786c', 1.05);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight('#fff0d9', 3);
  sun.position.set(-3, 12, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: .5, far: 35 });
  sun.shadow.normalBias = .025; sun.shadow.bias = -.0001; sun.shadow.radius = 3;
  scene.add(sun, sun.target);
  const warm = new THREE.PointLight('#ffc483', 0, 16, 1.5); warm.position.set(0, 4, 0); scene.add(warm);
  const surfaces = createSurfaceMaterials();
  const mat = (color: string) => surfaces(color, 'shell');
  const officeMat = createOfficeMaterials();
  const glass = new THREE.MeshStandardMaterial({ color: '#c4d8da', transparent: true, opacity: .19, roughness: .16, metalness: .12, depthWrite: false });
  const serverIndicators: THREE.MeshStandardMaterial[] = [];
  function box(w: number, h: number, d: number, x: number, y: number, z: number, color: string, parent: THREE.Object3D = scene, radius = 0) {
    const mesh = new THREE.Mesh(radius ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d), officeMat(color)); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function floorSurface(areas: readonly Footprint[], color: string, parent: THREE.Object3D = scene) {
    const mesh = new THREE.Mesh(createFloorGeometry(areas, { x: parent.position.x, z: parent.position.z }), officeMat(color, 'tile'));
    mesh.position.y = .272; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(r1: number, r2: number, h: number, x: number, y: number, z: number, color: string, parent: THREE.Object3D = scene, segments = 16) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, segments), officeMat(color)); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function sphere(r: number, x: number, y: number, z: number, color: string, parent: THREE.Object3D = scene) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), officeMat(color)); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  function rug(parent: THREE.Object3D, x: number, z: number, width: number, depth: number, color = '#b8ad9e') {
    const mesh = box(width, .012, depth, x, .279, z, color, parent, .006);
    mesh.material = officeMat(color, 'linen'); mesh.userData.navigationIgnore = true;
  }
  function glazing(width: number, height: number, x: number, z: number, parent: THREE.Object3D, rotation = 0) {
    const panel = new THREE.Group(); panel.position.set(x, .3, z); panel.rotation.y = rotation; parent.add(panel);
    const pane = box(width, height, .035, 0, height / 2, 0, '#c4d8da', panel);
    pane.material = glass; pane.castShadow = false;
    const columns = Math.ceil(width / 1.4), rows = Math.ceil(height / 1.05);
    for (let i = 0; i <= columns; i++) box(.045, height + .045, .065, -width / 2 + width * i / columns, height / 2, 0, '#1c1c1e', panel);
    for (let i = 0; i <= rows; i++) box(width, .045, .065, 0, height * i / rows, 0, '#1c1c1e', panel);
    return panel;
  }
  function roomPartitions(width: number, depth: number, parent: THREE.Object3D) {
    glazing(depth - .2, 1.35, -width / 2 + .04, 0, parent, Math.PI / 2);
    glazing(depth - .2, 1.35, width / 2 - .04, 0, parent, Math.PI / 2);
    const wing = (width - 2.4) / 2;
    for (const side of [-1, 1]) glazing(wing, 1.35, side * (1.2 + wing / 2), depth / 2, parent);
    // Open doorway: no invisible leaf crosses the navigation aperture.
    for (const side of [-1.2, 1.2]) box(.055, 2.5, .07, side, 1.55, depth / 2, '#1c1c1e', parent);
    box(2.45, .065, .09, 0, 2.82, depth / 2, '#1c1c1e', parent);
  }
  function sign(text: string, subtitle: string, w: number, h: number, x: number, y: number, z: number, background = '#30302c', ink = '#fbf4e8', parent: THREE.Object3D = scene) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 320;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 320); ctx.fillStyle = ink;
    ctx.textAlign = 'center'; ctx.font = `600 ${Math.min(110, 1300 / Math.max(text.length, 1))}px sans-serif`; ctx.fillText(text, 512, 160, 950); ctx.font = '26px sans-serif'; ctx.fillText(subtitle, 512, 234, 950);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture })); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  const lampMaterial = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffce89', emissiveIntensity: 1.3 });
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64;
  const glowContext = glowCanvas.getContext('2d')!, gradient = glowContext.createRadialGradient(32, 10, 0, 32, 20, 38);
  gradient.addColorStop(0, '#ffd38999'); gradient.addColorStop(1, '#ffd38900');
  glowContext.fillStyle = gradient; glowContext.fillRect(0, 0, 64, 64);
  const glowTexture = new THREE.CanvasTexture(glowCanvas); glowTexture.colorSpace = THREE.SRGBColorSpace;
  const glowMaterial = new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false });
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 64;
  const shadowContext = shadowCanvas.getContext('2d')!, shadowGradient = shadowContext.createRadialGradient(32, 32, 5, 32, 32, 32);
  shadowGradient.addColorStop(0, '#201a154a'); shadowGradient.addColorStop(.55, '#201a152b'); shadowGradient.addColorStop(1, '#201a1500');
  shadowContext.fillStyle = shadowGradient; shadowContext.fillRect(0, 0, 64, 64);
  const contactTexture = new THREE.CanvasTexture(shadowCanvas); contactTexture.colorSpace = THREE.SRGBColorSpace;
  const contactMaterial = new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  function contactShadow(w: number, d: number, x: number, z: number, parent: THREE.Object3D = scene, y = .315) {
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(w, d), contactMaterial);
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(x, y, z); shadow.userData.navigationIgnore = true; parent.add(shadow);
  }
  function wallLights(width: number, back: number, height: number, parent: THREE.Object3D = scene) {
    for (let x = -width / 2 + 1; x < width / 2; x += 2.5) {
      box(.24, .10, .18, x, height, back + .13, '#252622', parent, .025);
      box(.18, .018, .12, x, height - .06, back + .14, '#fff3d6', parent).material = lampMaterial;
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.75), glowMaterial);
      glow.position.set(x, height - .88, back + .115); glow.userData.navigationIgnore = true; parent.add(glow);
      const wash = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.55), glowMaterial);
      wash.rotation.x = -Math.PI / 2; wash.position.set(x, .278, back + .85); wash.userData.navigationIgnore = true; parent.add(wash);
    }
  }
  const founderLook = characterLook('Founder', { name: 'Kael', role: 'Founder', manager: false });
  function desktop(parent: THREE.Object3D, top: number, manager: boolean, look: ReturnType<typeof characterLook>) {
    box(1.32, .018, .84, 0, top + .01, -.02, '#66503d', parent, .025);
    for (const item of workstationItems(manager)) {
      const { x, z, width: w, depth: d } = item;
      if (item.kind === 'monitor-base') box(w, .035, d, x, top + .035, z, '#252622', parent, .025);
      if (item.kind === 'keyboard') {
        box(w, .035, d, x, top + .04, z, '#c9bba8', parent, .025);
        for (let row = 0; row < 3; row++) for (let key = 0; key < 10; key++) box(.043, .006, .037, x - .27 + key * .06, top + .061, z - .06 + row * .055, '#c9bba8', parent);
      }
      if (item.kind === 'mouse') { const mouse = sphere(.075, x, top + .055, z, '#c9bba8', parent); mouse.scale.set(.72, .45, 1); box(.012, .006, .035, x, top + .089, z - .025, '#778978', parent); }
      if (item.kind === 'cup') {
        cylinder(.09, .075, .16, x, top + .08, z, '#faf9f5', parent, 24).material = surfaces('#f3efe0', 'shell');
        cylinder(.071, .071, .004, x, top + .163, z, '#6b5039', parent, 24);
        const handle = new THREE.Mesh(new THREE.TorusGeometry(.046, .013, 6, 16), surfaces('#f3efe0', 'shell')); handle.position.set(x - .09, top + .09, z); parent.add(handle);
        cylinder(.12, .12, .013, x, top + .007, z, '#d7b991', parent, 24);
      }
      if (item.kind === 'notebook') {
        box(w, .035, d, x, top + .025, z, '#30302c', parent, .015);
        box(w - .04, .02, d - .035, x + .008, top + .048, z, '#faf9f5', parent);
        box(.018, .012, d - .02, x - w / 2 + .025, top + .062, z, '#b7a477', parent);
        const pen = box(.018, .018, .25, x + .055, top + .071, z, '#252622', parent); pen.rotation.y = -.25;
      }
      if (item.kind === 'lamp') {
        box(w, .035, d, x, top + .023, z, '#d7b991', parent, .035);
        cylinder(.018, .018, .48, x, top + .28, z, '#927c53', parent);
        box(.35, .055, .16, x + .1, top + .54, z, '#66503d', parent, .04);
        box(.28, .014, .11, x + .1, top + .505, z, '#eee2bb', parent);
      }
    }
    const w = manager ? 1.3 : 1.08, h = manager ? .8 : .68, y = top + .64;
    cylinder(.035, .035, .36, 0, top + .21, -.28, '#252622', parent);
    box(w, h, .08, 0, y, -.28, '#30302c', parent, .025);
    const screen = createMonitor(look, manager);
    const display = new THREE.Mesh(new THREE.PlaneGeometry(w - .08, h - .08), new THREE.MeshBasicMaterial({ map: screen.texture })); display.position.set(0, y, -.233); parent.add(display);
    return screen;
  }
  function sofa(parent: THREE.Object3D, x: number, z: number, rotation = 0) {
    const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = rotation; parent.add(s);
    contactShadow(4, 1.85, 0, 0, s);
    box(3.2, .32, 1.1, 0, .64, 0, '#926b47', s, .14);
    box(3.2, .72, .20, 0, .98, .44, '#faf9f5', s, .095);
    for (const side of [-1.48, 1.48]) box(.24, .54, 1.1, side, .85, 0, '#926b47', s, .115);
    for (const side of [-.69, .69]) {
      box(1.25, .18, .83, side, .88, -.03, '#faf9f5', s, .085);
      box(1.22, .015, .018, side, .88, -.445, '#c9bba8', s);
      for (const end of [-.35, .35]) cylinder(.045, .045, .16, side * 1.74, .4, end, '#252622', s);
    }
    for (const [x, color] of [[-.94, '#3a6263'], [.98, '#c08b2d']] as const) { const c = box(.43, .42, .17, x, 1.15, .2, color, s, .07); c.material = officeMat(color, 'linen'); c.rotation.z = x * -.15; }
    box(.42, .025, .72, .62, .99, -.1, '#3a6263', s, .02).material = officeMat('#3a6263', 'linen');
    for (let i = 0; i < 6; i++) box(.018, .008, .69, .46 + i * .06, 1.006, -.1, '#ab9b85', s);
  }
  // Founder furniture stays in place inside the shared building shell.
  box(200, .1, 200, 0, -.79, 0, '#e8e1d7');
  box(10.25, .33, 8.3, 0, .015, -.3, '#d9cebd');
  box(10, .09, 8, 0, .22, -.3, '#d9cebd');
  floorSurface([{ x: 0, z: -.3, width: 10.25, depth: 8.3 }], '#f3efe0');
  // Back and side walls, trimmed at the open front for visibility.
  box(10.3, 3.7, .2, 0, 2.05, -4.4, '#ede6dc');
  box(10.4, .13, .3, 0, 3.94, -4.4, '#ede6dc');
  box(10, .13, .09, 0, .38, -4.26, '#ab9b85');
  const founderPartition = new THREE.Group(); founderPartition.position.z = -.3; scene.add(founderPartition);
  roomPartitions(10.4, 8.6, founderPartition);
  wallLights(10, -4.27, 3.72);
  // Founder accent wall, wood battens and a picture window.
  box(4.2, 3.5, .055, .1, 2.05, -4.27, '#30302c');
  for (let i = 0; i < 13; i++) box(.065, 3.4, .07, -1.88 + i * .325, 2.05, -4.21, '#b68a5d');
  box(2.84, 1.0, .1, .13, 2.73, -4.11, '#30302c');
  sign('KAEL', 'F O U N D E R   O F F I C E', 2.7, .9, .13, 2.73, -4.04);
  box(2.25, 2.3, .15, 3.52, 2.35, -4.21, '#ab9b85');
  box(2.03, 2.1, .08, 3.52, 2.35, -4.1, '#c9bba8');
  box(.06, 2.14, .12, 3.52, 2.35, -4.02, '#ede6dc');
  box(2.08, .06, .12, 3.52, 2.35, -4.02, '#ede6dc');
  box(2.5, .12, .45, 3.52, 1.22, -4.02, '#d7b991');
  // Rug and furniture.
  rug(scene, .5, -.65, 4.8, 3.8);
  // Executive desk.
  box(3.5, .16, 1.45, .5, 1.45, -.9, '#926b47', scene, .075);
  box(3.54, .05, 1.5, .5, 1.55, -.9, '#b68a5d', scene, .035);
  contactShadow(4.6, 2.45, .5, -.9, scene, .34);
  box(.65, 1.02, 1.2, -.81, .85, -.9, '#faf9f5', scene, .045);
  for (let i = 0; i < 3; i++) { box(.67, .018, 1.18, -.81, .56 + i * .28, -.89, '#926b47'); box(.19, .035, .045, -.81, .72 + i * .28, -.265, '#544e3b'); }
  box(.1, 1.06, 1.2, 1.95, .9, -.9, '#252622');
  const founderDesktop = new THREE.Group(); founderDesktop.position.set(.5, 0, -.9); scene.add(founderDesktop); desktop(founderDesktop, 1.59, true, founderLook);
  // Chair with wheels.
  function chair(x: number, z: number) {
    cylinder(.07, .07, .45, x, .54, z, '#414a40');
  box(.95, .15, .85, x, .82, z, '#faf9f5', scene, .05);
    box(.95, .85, .18, x, 1.22, z + .37, '#faf9f5', scene, .085);
    for (const dx of [-.47, .47]) { box(.08, .43, .08, x + dx, 1.0, z, '#252622'); box(.13, .08, .6, x + dx, 1.23, z, '#252622'); }
    box(1.02, .06, .1, x, .34, z, '#252622'); box(.1, .06, 1.02, x, .34, z, '#252622');
  }
  chair(.5, .5);
  // Reading sofa.
  sofa(scene, -3.9, 1.28, -Math.PI / 2);
  cylinder(.55, .55, .09, -2.39, .87, 1.3, '#faf9f5', scene, 48);
  cylinder(.22, .24, .55, -2.39, .56, 1.3, '#c9bba8', scene, 32);
  box(.38, .07, .43, -2.42, .95, 1.23, '#66503d');
  // Book cabinet at back left.
  box(1.3, 1.4, .6, -3.8, 1, -3.76, '#926b47');
  for (const y of [.45, 1.06, 1.66]) box(1.4, .07, .65, -3.8, y, -3.75, '#b68a5d');
  const bookColors = ['#3a6263', '#c08b2d', '#866043', '#1c75bc', '#69656a'];
  for (let i = 0; i < 6; i++) box(.13, .4 + i % 3 * .055, .37, -4.27 + i * .17, 1.3, -3.65, bookColors[i % 5]);
  for (let i = 0; i < 3; i++) box(.45, .09, .4, -3.96, .56 + i * .1, -3.67, bookColors[i + 1]);
  // Planters inside and trees outside.
  function plant(x: number, z: number, scale = 1, base = .3, parent: THREE.Object3D = scene) {
    cylinder(.28 * scale, .21 * scale, .48 * scale, x, base + .24 * scale, z, '#d3ccb3', parent);
    cylinder(.24 * scale, .24 * scale, .04, x, base + .48 * scale, z, '#6a6346', parent);
    cylinder(.028 * scale, .035 * scale, .78 * scale, x, base + .87 * scale, z, '#617c70', parent);
    for (let i = 0; i < 7; i++) { const a = i * 2.4; const leaf = sphere(.27 * scale, x + Math.cos(a) * .22 * scale, base + (.72 + i * .08) * scale, z + Math.sin(a) * .22 * scale, i % 3 ? '#597d27' : '#4c6a22', parent); leaf.scale.set(.7, 1.1, .6); leaf.rotation.z = Math.cos(a) * .7; }
  }
  plant(4.15, -2.85, 1.2); plant(4.2, 2.6, 1.35); plant(-3.75, -3.76, .53, 1.72);
  // Floor lamp.
  cylinder(.3, .3, .065, -2.85, .34, 2.85, '#666b54'); cylinder(.032, .032, 2.2, -2.85, 1.45, 2.85, '#656953');
  cylinder(.26, .46, .43, -2.85, 2.65, 2.85, '#f4e7c5');
  const founder = createCharacter(founderLook, mat), kael = founder.root;
  scene.add(kael); kael.position.set(.5, .255, .25); kael.rotation.y = Math.PI;
  // A small brass nameplate on the desk front.
  box(.64, .17, .03, .5, 1.38, -.15, '#d7b991');
  sign('KAEL', '', .52, .15, .5, 1.38, -.129, '#c7aa76', '#394b36');
  let status: 'focus' | 'idle' | 'offline' = 'focus';
  const divisionWorld = new THREE.Group(); scene.add(divisionWorld);
  const agentModels = new Map<string, THREE.Object3D>();
  type Actor = { member: ReturnType<typeof divisionLayouts>[number]['members'][number]; room: ReturnType<typeof divisionLayouts>[number]; character: ReturnType<typeof createCharacter>; bubble: HTMLButtonElement; activity: ReturnType<typeof agentActivity>; screen: ReturnType<typeof createMonitor>; title: string; workflow?: { name: string; status: string; checkedAt: string; executions: string[] }; session?: FacilitySession; mount: number; trip: { route: WalkPoint[]; distance: number; speed: number; delay: number; ambient: boolean; leaveAt: number; returning: boolean; arrived: boolean; roomId: string; seatIndex: number; sessionId: string; medical?: boolean; coffee?: boolean } | null };
  const actors: Actor[] = [];
  let receptionist: ReturnType<typeof createCharacter> | null = null, receptionBubble: HTMLButtonElement | null = null, greetingUntil = 0;
  let navigation: ReturnType<typeof createNavigation>;
  const coffeeSteam = new THREE.Group();
  let basketball: THREE.Group | null = null;
  const facilityLabels: { element: HTMLButtonElement; model: THREE.Group }[] = [];
  const overlays = document.createElement('div'); overlays.className = 'agent-overlays'; container.after(overlays);
  let layoutRooms: ReturnType<typeof divisionLayouts> = [], teamSignature = '', officeMode: 'founder' | 'all' | 'division' | 'agent' = 'founder', activeRoom = '', activeAgent = '';
  let motionPaused = false, elapsed = 0, previousTime = 0, lastScreen = -1;
  let activityState: State | null = null, nextSocial = 10, socialCycle = 0;
  let nextCoffee = 18;
  function homeAnchor(actor: Actor) {
    const { member: m, room: r } = actor;
    return [[1, 1.05], [-1, 1.05], [1.25, .9], [-1.25, .9]].map(([x, z]) => ({ x: r.x + m.x + x, z: r.z + m.z + z })).find(p => navigation?.walkable(p));
  }
  const routeCache = new Map<string, WalkPoint[]>();
  function beginTrip(actor: Actor, roomId: string, seatIndex: number, options: { medical?: boolean; coffee?: boolean; delay?: number; sessionId?: string } = {}) {
    if (actor.trip) return false;
    const room = facilityLayouts.find(r => r.id === roomId), seat = options.coffee ? coffeeSpot : facilitySeats(roomId)[seatIndex], home = homeAnchor(actor);
    if (!room || !seat || !home) return false;
    const goal = { x: room.x + seat.walkX, z: room.z + seat.walkZ }, key = `${actor.member.id}/${roomId}/${seatIndex}/${!!options.coffee}`;
    if (!routeCache.has(key)) routeCache.set(key, navigation.route(home, goal));
    const route = routeCache.get(key)!; if (route.length < 2) return false;
    actor.trip = { route, distance: 0, speed: 0, delay: elapsed + (options.delay || 0), ambient: !options.medical && !options.sessionId, leaveAt: Infinity, returning: false, arrived: false, roomId, seatIndex, sessionId: options.sessionId || '', medical: options.medical, coffee: options.coffee };
    return true;
  }
  function requestCoffee() {
    const reserved = actors.some(a => a.trip?.coffee) || activityState?.facilitySessions?.some(s => s.status === 'active' && s.roomId === 'lounge');
    const guest = !reserved && actors.find(a => a.activity.canWalk && !a.trip);
    const started = !!guest && beginTrip(guest, 'lounge', 0, { coffee: true });
    window.dispatchEvent(new CustomEvent('kael:notice', { detail: started ? `${guest!.member.name} menuju mesin kopi. Aktivitas visual, bukan pekerjaan AI.` : 'Belum bisa membuat kopi: lounge dipakai, semua anggota sibuk/bepergian, atau jalur terhalang.' }));
  }
  window.addEventListener('kael:coffee', requestCoffee);
  window.addEventListener('kael:sport', () => {
    if (motionPaused || reducedMotion.matches) { window.dispatchEvent(new CustomEvent('kael:notice', { detail: 'Gerak sedang dijeda atau reduced motion aktif. Aktifkan gerak untuk bermain basket.' })); return; }
    if (actors.some(a => a.trip?.roomId === 'sport') || activityState?.facilitySessions?.some(s => s.status === 'active' && s.roomId === 'sport')) { window.dispatchEvent(new CustomEvent('kael:notice', { detail: 'Lapangan sedang digunakan. Tunggu pemain kembali atau akhiri sesi fasilitas terlebih dahulu.' })); return; }
    const players = actors.filter(a => a.activity.canWalk && !a.trip).slice(0, 2).filter((a, i) => beginTrip(a, 'sport', i, { delay: i * 1.2 }));
    window.dispatchEvent(new CustomEvent('kael:notice', { detail: players.length ? `${players.map(a => a.member.name).join(' & ')} menuju lapangan untuk latihan basket visual.` : 'Tidak ada agent luang atau jalur ke lapangan terhalang.' }));
  });
  window.addEventListener('kael:route-audit', async event => {
    const checked: { agent: string; goal: string; safe: boolean; length: number }[] = [];
    for (const actor of actors) for (const room of facilityLayouts) for (const [index, seat] of [...facilitySeats(room.id), ...(room.kind === 'lounge' ? [coffeeSpot] : [])].entries()) {
      const home = homeAnchor(actor), goal = { x: room.x + seat.walkX, z: room.z + seat.walkZ };
      const route = home ? navigation.route(home, goal) : [];
      checked.push({ agent: actor.member.name, goal: `${room.name}/${index}`, safe: route.length >= 2 && route.slice(1).every((p, i) => navigation.clearSegment(route[i], p)), length: routeLength(route) });
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    (event as CustomEvent<(result: typeof checked) => void>).detail(checked);
  });
  const campusRooms = () => [...facilityLayouts, ...layoutRooms];
  function updateActivity(state: State) {
    activityState = state;
    for (const room of facilityLayouts) {
      const board = divisionWorld.getObjectByName(`session-board-${room.id}`) as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | undefined;
      const canvas = board?.material.map?.image as HTMLCanvasElement | undefined;
      if (!canvas) continue;
      const session = state.facilitySessions?.find(s => s.roomId === room.id && s.status === 'active'), ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#30302c'; ctx.fillRect(0, 0, 1024, 320); ctx.fillStyle = '#f1e7d8'; ctx.textAlign = 'center'; ctx.font = '600 48px sans-serif';
      ctx.fillText(session?.title || 'KAEL / COLLABORATION', 512, 145, 930); ctx.font = '28px sans-serif';
      ctx.fillText(session ? `${session.participantIds.length} PESERTA / ${session.purpose.toUpperCase()}` : 'TERSEDIA / BRIEFING & REVIEW', 512, 220, 930); board!.material.map!.needsUpdate = true;
    }
    for (const actor of actors) {
      actor.activity = agentActivity(state, actor.member);
      actor.session = state.facilitySessions?.find(s => s.status === 'active' && s.roomId !== 'meeting-alt' && s.participantIds.includes(actor.member.id));
      actor.title = state.tasks.find(t => t.agentId === actor.member.id && !['done', 'cancelled'].includes(t.status))?.title || '';
      const binding = state.workflowBindings?.find(b => b.agentId === actor.member.id), snapshot = state.n8n?.find(w => w.workflowId === binding?.workflowId);
      actor.workflow = binding ? { name: snapshot?.workflowName || binding.workflowName, status: actor.activity.text, checkedAt: snapshot?.checkedAt || '', executions: (snapshot?.recent || []).slice(0, 4).map(e => '#' + e.id + ' / ' + e.status) } : undefined;
      if (workflowManagerActivity(state, actor.member.id)) {
        const team = (state.workflowBindings || []).filter(b => state.agents.some(a => a.id === b.agentId && a.divisionId === actor.member.divisionId));
        const checks = team.map(b => state.n8n?.find(w => w.workflowId === b.workflowId)?.checkedAt || '');
        const checkedAt = checks.every(t => Number.isFinite(Date.parse(t))) ? checks.sort((a, b) => Date.parse(a) - Date.parse(b))[0] : '';
        actor.workflow = { name: 'DIVISI / ' + actor.room.name, status: actor.activity.text, checkedAt, executions: team.map(b => { const agent = state.agents.find(a => a.id === b.agentId)!; return agent.name + ' / ' + agentActivity(state, agent).text; }) };
      }
      actor.screen.draw(elapsed, actor.title, actor.workflow, state.builderChat);
    }
  }
  function buildArchitecture() {
    const site = officeSite(campusRooms()), { left, right, back, front } = site;
    const shell = new THREE.Group(); shell.name = 'kael-building'; divisionWorld.add(shell);
    for (const [height, y, color] of [[.39, .025, '#b8ad9e'], [.07, .22, '#f3efe0']] as const) {
      const surface = new THREE.InstancedMesh(new THREE.BoxGeometry(1, height, 1), officeMat(color, 'stone'), site.tiles.length);
      const transform = new THREE.Object3D();
      site.tiles.forEach((tile, index) => { transform.position.set(tile.x, y, tile.z); transform.scale.set(tile.width, 1, tile.depth); transform.updateMatrix(); surface.setMatrixAt(index, transform.matrix); });
      surface.receiveShadow = true; shell.add(surface);
    }
    // Share room boundaries instead of drawing a second facade over their existing partitions.
    for (const wall of site.walls) {
      const horizontal = wall.depth === .14, a = (horizontal ? wall.x - wall.width / 2 : wall.z - wall.depth / 2), b = horizontal ? wall.x + wall.width / 2 : wall.z + wall.depth / 2;
      const fixed = horizontal ? wall.z : wall.x;
      const contacts = [founderFloor, ...campusRooms().filter(r => r.z + r.depth / 2 > site.back)].filter(r => horizontal
        ? Math.abs(Math.abs(fixed - r.z) - r.depth / 2) < .001
        : Math.abs(Math.abs(fixed - r.x) - r.width / 2) < .001);
      const cuts = [...new Set([a, b, ...contacts.flatMap(r => horizontal ? [r.x - r.width / 2, r.x + r.width / 2] : [r.z - r.depth / 2, r.z + r.depth / 2]).filter(v => v > a && v < b)])].sort((x, y) => x - y);
      for (let i = 1; i < cuts.length; i++) {
        const centre = (cuts[i - 1] + cuts[i]) / 2, length = cuts[i] - cuts[i - 1];
        if (contacts.some(r => horizontal ? Math.abs(centre - r.x) < r.width / 2 : Math.abs(centre - r.z) < r.depth / 2)) continue;
        const x = horizontal ? centre : fixed, z = horizontal ? fixed : centre;
        box(horizontal ? length : .14, .22, horizontal ? .14 : length, x, .365, z, '#b8ad9e', shell);
        glazing(length, horizontal && z === back ? 2.8 : 1.35, x, z, shell, horizontal ? 0 : Math.PI / 2);
      }
    }
    const doorway = (z: number, doorX: number, doorWidth: number) => {
      for (const x of [doorX - doorWidth / 2, doorX + doorWidth / 2]) box(.12, 3.25, .18, x, 1.9, z, '#1c1c1e', shell);
      box(doorWidth + .15, .15, .2, doorX, 3.52, z, '#1c1c1e', shell);
      // Sliding door panels are drawn parked beside the open doorway.
      for (const side of [-1, 1]) {
        const x = doorX + side * (doorWidth / 2 + .55);
        glazing(1.05, 2.7, x, z + .11, shell);
        box(.035, .48, .06, x - side * .37, 1.6, z + .17, '#d4af37', shell);
      }
      box(doorWidth, .025, .5, doorX, .285, z, '#737373', shell);
    };
    doorway(back, site.gardenDoor.x, site.gardenDoor.width);
    doorway(front, site.entrance.x, site.entrance.width);
    // Lobby: the centre axis remains open from the front door to both office corridors.
    const lobbyZ = site.lobby.z;
    box(5.2, 2.45, .10, 14.2, 1.5, front - 5.85, '#866043', shell, .04);
    for (let i = 0; i < 24; i++) box(.035, 2.35, .035, 11.8 + i * .21, 1.5, front - 5.77, '#a37038', shell);
    sign('KAEL HQ', 'WELCOME TO THE WORKSPACE', 2.6, .65, 14.2, 2.1, front - 5.73, '#2d3238', '#f3efe0', shell);
    box(4.4, 1.0, .16, 14.2, .82, front - 3.63, '#866043', shell, .05);
    for (const x of [12.06, 16.34]) box(.12, 1.0, 1.05, x, .82, front - 4.1, '#866043', shell, .035);
    box(4.5, .10, 1.16, 14.2, 1.38, front - 4.1, '#f3efe0', shell, .07);
    for (let i = 0; i < 22; i++) box(.04, .8, .04, 12.25 + i * .18, .87, front - 3.525, '#a37038', shell);
    sign('RECEPTION', 'NIA / WELCOME DESK', 1.65, .35, 14.2, .99, front - 3.485, '#866043', '#f3efe0', shell);
    box(.75, .45, .055, 13.25, 1.7, front - 4.35, '#2d3238', shell, .025);
    cylinder(.035, .035, .25, 13.25, 1.48, front - 4.35, '#1c1c1e', shell);
    box(.5, .025, .18, 13.25, 1.45, front - 4.45, '#5e646e', shell, .01);
    box(.4, .08, .45, 15.65, 1.47, front - 4.1, '#3a6263', shell, .015);
    plant(12.45, front - 4.1, .3, 1.43, shell);
    cylinder(.1, .1, .025, 14.95, 1.45, front - 3.85, '#d4af37', shell, 24);
    sphere(.07, 14.95, 1.5, front - 3.85, '#d4af37', shell);
    box(.8, .13, .7, 14.2, .81, front - 5.1, '#3a6263', shell, .055);
    box(.8, .7, .13, 14.2, 1.12, front - 5.42, '#3a6263', shell, .055);
    cylinder(.045, .045, .48, 14.2, .5, front - 5.1, '#1c1c1e', shell);
    receptionist = createCharacter(characterLook('Lobby', { name: 'Nia', role: 'Resepsionis', manager: false }, 1), mat);
    receptionist.root.scale.setScalar(.8); receptionist.root.position.set(14.2, .363, front - 5.1); shell.add(receptionist.root);
    receptionBubble = document.createElement('button'); receptionBubble.className = 'reception-bubble'; receptionBubble.setAttribute('aria-label', 'Sapa Nia, resepsionis dekoratif');
    receptionBubble.innerHTML = '<strong>Nia <small>Resepsionis</small></strong><span aria-live="polite" hidden>Selamat datang di Kael HQ. Mau melihat aktivitas tim? Pilih ruangan atau agent.</span>';
    receptionBubble.onclick = () => { greetingUntil = performance.now() + 7000; }; overlays.append(receptionBubble);
    // Reception seating occupies a single rug; the approach and corridor remain clear.
    rug(shell, -1.85, front - 4.25, 5.6, 3.5, '#b8ad9e');
    sofa(shell, -2.45, front - 4.9);
    const loungeChair = new THREE.Group(); loungeChair.position.set(.2, 0, front - 3.7); loungeChair.rotation.y = Math.PI / 2; shell.add(loungeChair);
    contactShadow(1.6, 1.5, 0, 0, loungeChair);
    box(1.0, .18, .95, 0, .8, 0, '#866043', loungeChair, .07);
    box(.95, .16, .82, 0, .96, -.03, '#f3efe0', loungeChair, .06).material = officeMat('#f3efe0', 'linen');
    box(1.12, .64, .18, 0, 1.15, .4, '#3a6263', loungeChair, .08).material = officeMat('#3a6263', 'linen');
    for (const x of [-.51, .51]) box(.14, .45, .94, x, .99, 0, '#866043', loungeChair, .06);
    for (const x of [-.4, .4]) for (const z of [-.33, .33]) cylinder(.035, .045, .4, x, .5, z, '#866043', loungeChair);
    cylinder(.55, .55, .10, -1.65, .85, front - 3.45, '#f3efe0', shell, 40);
    cylinder(.28, .32, .5, -1.65, .55, front - 3.45, '#866043', shell, 32);
    box(.34, .06, .42, -1.7, .94, front - 3.5, '#3a6263', shell, .01);
    plant(1.6, front - 5.25, 1.05, .3, shell);
    plant(19, lobbyZ - .7, 1.15, .3, shell);
    box(2.0, .8, .7, 19.35, .7, front - 3.6, '#866043', shell, .045);
    for (let i = 0; i < 4; i++) box(.42, .055, .35, 18.9, 1.14 + i * .055, front - 3.6, bookColors[i], shell);
    plant(19.9, front - 3.6, .35, 1.13, shell);
    // Entrance canopy, clear pedestrian approach and a separate vehicle parking apron.
    box(7, .16, 2.5, 0, 3.6, front + .8, '#1c1c1e', shell, .07);
    for (const x of [-3.3, 3.3]) box(.11, 3.25, .11, x, 1.9, front + 1.75, '#1c1c1e', shell);
    sign('KAEL HQ', 'VIRTUAL OFFICE', 3.7, .55, 0, 3.28, front + 2.08, '#1c1c1e', '#f3efe0', shell);
    sign('GARDEN / SPORT', 'OUTDOOR ACCESS', 2.2, .36, site.gardenDoor.x, 3.2, back + .15, '#1c1c1e', '#f3efe0', shell);
    box(site.parking.width, .10, site.parking.depth, site.parking.x, .13, site.parking.z, '#5e646e', shell).material = officeMat('#5e646e', 'asphalt');
    const asphalt = new THREE.Mesh(createFloorGeometry([site.parking]), officeMat('#5e646e', 'asphalt'));
    asphalt.position.y = .185; asphalt.receiveShadow = true; shell.add(asphalt);
    // A short entry landing ends at the parking edge; no raised strip cuts across the vehicle apron.
    box(site.approach.width, .13, site.approach.depth, site.approach.x, .19, site.approach.z, '#b8ad9e', shell);
    const bays = [-15, -11, -7, 7, 11, 15, 19];
    for (const x of bays) {
      for (const dx of [-1.8, 1.8]) box(.065, .014, 5, x + dx, .19, front + 5.2, '#f3efe0', shell);
      box(3.6, .014, .065, x, .19, front + 2.7, '#f3efe0', shell);
      box(1.3, .11, .16, x, .24, front + 3.2, '#b8ad9e', shell, .03);
    }
    const car = (x: number, color: string, compact = false) => {
      const g = new THREE.Group(); g.position.set(x, 0, front + 5.3); shell.add(g);
      if (compact) g.scale.z = .91;
      contactShadow(2.4, 4.7, 0, 0, g, .194);
      box(1.85, .5, 4.2, 0, .68, 0, color, g, .22).material = surfaces(color, 'shell');
      box(1.58, .58, 2.25, 0, 1.18, -.1, color, g, .23).material = surfaces(color, 'shell');
      const frontGlass = box(1.37, .39, .035, 0, 1.18, -.99, '#2d3238', g, .06); frontGlass.rotation.x = -.35;
      const rearGlass = box(1.34, .35, .035, 0, 1.17, .88, '#2d3238', g, .05); rearGlass.rotation.x = .35;
      for (const side of [-1, 1]) {
        box(.028, .32, 1.52, side * .797, 1.19, -.05, '#2d3238', g, .05);
        box(.045, .39, .055, side * .816, 1.2, .04, color, g);
        box(.18, .10, .2, side * .96, .99, -.65, color, g, .055);
        for (const z of [-1.32, 1.32]) {
          const wheel = cylinder(.34, .34, .2, side * .9, .52, z, '#1c1c1e', g, 24); wheel.rotation.z = Math.PI / 2;
          const hub = cylinder(.18, .18, .018, side * 1.01, .52, z, '#b8ad9e', g, 16); hub.rotation.z = Math.PI / 2;
        }
        box(.46, .11, .04, side * .58, .81, -2.075, '#f3efe0', g, .035);
        box(.39, .09, .04, side * .59, .81, 2.075, '#b33924', g, .025);
      }
      box(.75, .13, .035, 0, .58, -2.11, '#1c1c1e', g, .02);
    };
    car(-15, '#2d3238'); car(-7, '#f3efe0', true); car(11, '#3a6263'); car(19, '#b8ad9e', true);
    for (const x of [left + 1, right - 1]) {
      box(1.2, .42, 2.2, x, .47, front + .7, '#b8ad9e', shell, .1);
      plant(x, front + .7, 1.4, .68, shell);
    }
  }
  function buildWalkways() {
    const rooms = campusRooms(), paths = officeWalkways(rooms);
    const site = officeSite(rooms);
    // All public floor uses the same tile finish, including the foyer between the corridors.
    const tiles = [...site.publicTiles, ...walkwayTiles(paths).filter(tile => tile.z < site.back || tile.z > site.front)];
    floorSurface(tiles, '#f3efe0', divisionWorld);
    const edges: THREE.Matrix4[] = [], transform = new THREE.Object3D();
    const floorBounds = [...rooms, ...site.floors, founderFloor];
    tiles.forEach(tile => {
      for (const [dx, dz] of tile.edges) {
        const x = tile.x + dx * tile.width / 2, z = tile.z + dz * tile.depth / 2;
        if (floorBounds.some(r => Math.abs(x - r.x) <= r.width / 2 + .015 && Math.abs(z - r.z) <= r.depth / 2 + .015)) continue;
        transform.position.set(x, .285, z); transform.scale.set(dx ? .035 : tile.width, 1, dz ? .035 : tile.depth); transform.updateMatrix(); edges.push(transform.matrix.clone());
      }
    });
    const curbs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .06, 1), officeMat('#ab9b85'), edges.length); edges.forEach((m, i) => curbs.setMatrixAt(i, m)); divisionWorld.add(curbs);
    // Keep the inter-room spine clear; the old bollards visually blocked the walkway and navigation.
  }
  function buildFacilities() {
    for (const room of facilityLayouts) {
      const g = new THREE.Group(); g.position.set(room.x, 0, room.z); divisionWorld.add(g);
      const back = -room.depth / 2, front = room.depth / 2, half = room.width / 2, indoor = ['meeting', 'lounge', 'server', 'medical', 'builder'].includes(room.kind);
      box(room.width, .42, room.depth, 0, .025, 0, '#d9cebd', g, .06);
      // The room finish sits above the continuous slab; coplanar faces caused flickering patches.
      const roomFloor = box(room.width - .12, .07, room.depth - .12, 0, .23, 0, room.kind === 'server' ? '#d9d2c6' : indoor ? '#e8dfd0' : '#617c70', g);
      if (!indoor) roomFloor.material = officeMat('#617c70', 'turf');
      if (indoor) {
        floorSurface([{ x: 0, z: 0, width: room.width - .12, depth: room.depth - .12 }], room.kind === 'server' ? '#b8ad9e' : '#f3efe0', g);
        box(room.width, 2.85, .14, 0, 1.68, back, '#ede6dc', g);
        box(room.width, .12, .10, 0, .36, back + .10, '#ab9b85', g);
        box(room.width, .08, .18, 0, 3.12, back, '#ab9b85', g);
        wallLights(room.width, back + .01, 3.04, g);
        roomPartitions(room.width, room.depth, g);
        sign(room.kind === 'builder' ? 'BUILDER STUDIO' : room.kind === 'medical' ? 'RECOVERY / 04' : room.kind === 'server' ? 'INFRASTRUCTURE' : room.kind === 'meeting' ? 'MEETING' : 'SOCIAL CLUB', room.kind === 'builder' ? 'DESIGN / BUILD / REFINE' : room.kind === 'medical' ? 'AGENT HEALTH' : room.kind === 'server' ? 'KAEL / KNOWLEDGE SYSTEMS' : room.kind === 'meeting' ? `${room.capacity} SEATS` : 'COFFEE / READ / RESET', 2.1, .48, -half + 1.6, 2.75, back + .10, '#ede6dc', '#4b594e', g);
        if (room.kind !== 'server' && room.kind !== 'builder') {
          box(2.3, 1.55, .07, 3.5, 2.03, back + .12, '#926b47', g);
          box(2.15, 1.4, .025, 3.5, 2.03, back + .17, '#c9bba8', g);
          box(.03, 1.4, .025, 3.5, 2.03, back + .20, '#ede6dc', g);
        }
        if (room.kind !== 'builder') for (const x of [-half + .65, half - .65]) plant(x, front - .9, .8, .3, g);
      }
      if (room.kind === 'server' || room.kind === 'builder') {
        const resident = room.kind === 'builder' ? builderAgent : serverAgent;
        if (room.kind === 'server') {
        // Decorative hardware glow is independent of Obsidian connection status.
        box(4.6, .025, 1.6, -1.35, .28, -2.7, '#66503d', g, .04);
        box(4.85, 2.25, .035, -1.35, 1.52, back + .09, '#242a28', g, .025);
        const stripMaterial = new THREE.MeshStandardMaterial({ color: '#55ffff', emissive: '#00aaaa', emissiveIntensity: .65, roughness: .3 });
        serverIndicators.push(stripMaterial);
        box(4.6, .025, .045, -1.35, 2.68, back + .14, '#242a28', g).material = stripMaterial;
        const serverFill = new THREE.PointLight('#a6c9db', 7, 6, 2); serverFill.position.set(-1.35, 1.7, -1.6); g.add(serverFill);
        for (let i = 0; i < 3; i++) {
          const rack = new THREE.Group(); rack.position.set(-2.75 + i * 1.4, 0, -2.7); g.add(rack);
          contactShadow(1.55, 1.4, 0, 0, rack, .298);
          box(1.15, 2.25, 1.1, 0, 1.45, 0, '#242a28', rack, .045);
          box(1.03, 2.02, .035, 0, 1.45, .575, '#242a28', rack, .025);
          for (const x of [-.43, .43]) box(.035, 1.93, .045, x, 1.45, .61, '#829491', rack);
          for (let j = 0; j < 7; j++) {
            const y = .65 + j * .235;
            box(.78, .18, .055, 0, y, .62, '#829491', rack, .012);
            for (let k = 0; k < 5; k++) box(.07, .012, .012, -.27 + k * .09, y, .656, '#2d3531', rack);
            const indicator = new THREE.MeshStandardMaterial({ color: j % 3 ? '#00c2ce' : '#fbb024', emissive: j % 3 ? '#00aaaa' : '#c08b2d', emissiveIntensity: .65, roughness: .3 });
            serverIndicators.push(indicator);
            box(.045, .028, .02, .3, y, .665, '#242a28', rack, .006).material = indicator;
            box(.018, .018, .02, .36, y, .665, '#242a28', rack).material = stripMaterial;
          }
          const door = box(.94, 1.96, .015, 0, 1.45, .69, '#c9bba8', rack); door.material = glass;
          box(.04, .3, .06, .39, 1.4, .72, '#b7c2bc', rack, .012);
          for (const x of [-.48, .48]) for (const y of [.48, 2.42]) { const screw = cylinder(.018, .018, .015, x, y, .635, '#829491', rack, 8); screw.rotation.x = Math.PI / 2; }
          sign(`0${i + 1}`, ['COMPUTE', 'STORAGE', 'NETWORK'][i], .7, .19, 0, 2.45, .72, '#30302c', '#e5eadd', rack);
        }
        box(4.5, .09, .24, -1.35, 2.75, -3.3, '#73847d', g);
        for (let i = 0; i < 14; i++) box(.045, .025, .19, -3.4 + i * .31, 2.81, -3.3, '#a5b3ab', g);
        box(1.1, 2.3, .8, 2.7, 1.43, -2.85, '#faf9f5', g, .06).material = officeMat('#faf9f5', 'metal');
        for (const y of [1.2, 1.85]) {
          const vent = cylinder(.24, .24, .025, 2.7, y, -2.425, '#242a28', g, 24); vent.rotation.x = Math.PI / 2;
          const ring = new THREE.Mesh(new THREE.TorusGeometry(.19, .012, 6, 24), officeMat('#829491')); ring.position.set(2.7, y, -2.405); g.add(ring);
        }
        for (let i = 0; i < 10; i++) box(.83, .045, .025, 2.7, .6 + i * .14, -2.43, '#83958d', g);
        sign('COOLING', 'AIR HANDLING', .8, .22, 2.7, 2.37, -2.43, '#faf9f5', '#51685e', g);
        for (const x of [-2.75, -1.35, .05]) {
          box(.9, .018, .5, x, .283, -1.55, '#8b9b92', g);
          for (let i = 0; i < 7; i++) box(.7, .009, .018, x, .297, -1.73 + i * .055, '#596f68', g);
        }
        } else {
          rug(g, -.85, .9, 3.6, 2.45);
          box(3.4, 1.5, .09, -.1, 2, back + .12, '#30302c', g, .04);
          sign('IDEA  /  PLAN  /  BUILD', 'CODEX / BUILDER', 3.15, 1.25, -.1, 2, back + .18, '#30302c', '#f3efe0', g);
          box(1.1, 2.25, .6, 2.05, 1.43, back + .45, '#926b47', g, .04);
          for (const y of [.5, 1.12, 1.74, 2.5]) box(1.15, .06, .65, 2.05, y, back + .45, '#b68a5d', g, .02);
          for (let i = 0; i < 5; i++) box(.12, .42, .3, 1.68 + i * .16, .75, back + .48, bookColors[i], g, .01);
          plant(2.05, back + .45, .4, 1.77, g);
        }
        box(3.25, .13, 1.15, -.9, 1.15, .8, '#b68a5d', g, .06);
        contactShadow(3.7, 1.7, -.9, .8, g);
        for (const x of [-2.26, .46]) box(.10, .79, .9, x, .68, .8, '#66503d', g);
        box(1.65, .8, .07, -.95, 1.7, .52, '#30302c', g, .04);
        const look = characterLook(room.kind === 'builder' ? 'Builder studio' : 'Server & Obsidian', resident, 3), screen = createMonitor(look, false, room.kind === 'builder' ? builderSession : undefined);
        const display = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .64), new THREE.MeshBasicMaterial({ map: screen.texture })); display.position.set(-.95, 1.7, .565); g.add(display);
        box(.08, .18, .09, -.95, 1.25, .52, '#66503d', g); box(.48, .035, .28, -.95, 1.23, .52, '#66503d', g, .03);
        box(.8, .035, .25, -.95, 1.24, 1.13, '#faf9f5', g, .025); box(.14, .035, .2, -.3, 1.24, 1.13, '#66503d', g, .04);
        box(.35, .035, .45, -2.12, 1.24, .9, '#6f7c70', g, .025);
        box(.7, .13, .68, -.9, .81, 1.55, '#66503d', g, .07); box(.7, .64, .13, -.9, 1.12, 1.82, '#66503d', g, .05);
        cylinder(.045, .045, .49, -.9, .51, 1.55, '#252622', g); box(.65, .05, .07, -.9, .28, 1.55, '#252622', g); box(.07, .05, .65, -.9, .28, 1.55, '#252622', g);
        const character = createCharacter(look, mat); character.root.scale.setScalar(.8); character.root.position.set(-.9, .15, 1.55); character.root.rotation.y = Math.PI; g.add(character.root); agentModels.set(resident.id, character.root);
        const bubble = document.createElement('button'); bubble.className = 'agent-bubble';
        const residentName = document.createElement('strong'); residentName.textContent = resident.name;
        const residentRole = document.createElement('em'); residentRole.textContent = room.kind === 'builder' ? 'BUILDER' : 'KNOWLEDGE';
        const residentActivity = document.createElement('span'); residentActivity.className = 'bubble-activity';
        const errorIcon = document.createElement('span'); errorIcon.className = 'agent-error-icon'; errorIcon.innerHTML = icon('alert');
        bubble.append(residentName, residentRole, residentActivity, errorIcon);
        bubble.setAttribute('aria-label', `Buka profil ${resident.name}`); bubble.onclick = () => window.dispatchEvent(new CustomEvent('kael:agent', { detail: resident.id })); overlays.append(bubble);
        const member = { ...resident, ordinal: 3, x: -.9, z: .8 };
        const actorRoom = { ...room, entrance: { x: 0, z: front }, furniture: [], rugs: [], members: [member] };
        actors.push({ member, room: actorRoom, character, bubble, screen, title: '', activity: { kind: 'idle', text: room.kind === 'builder' ? 'Diskusi di Codex' : 'Menunggu Obsidian', typing: false, canWalk: room.kind !== 'builder' }, trip: null, mount: 0 });
        if (room.kind === 'server') {
        box(1.45, .8, .75, 2.75, .68, .9, '#ab9b85', g, .045); box(1.53, .07, .83, 2.75, 1.12, .9, '#dce0d6', g, .03);
        for (const x of [2.38, 3.12]) { box(.015, .65, .025, x, .7, 1.29, '#677d71', g); box(.16, .025, .04, x + .18, .9, 1.31, '#c8d0c5', g); }
        box(.65, .32, .46, 2.6, 1.32, .9, '#66503d', g, .035);
        sign('UPS', 'POWER RESERVE', .44, .15, 2.6, 1.35, 1.14, '#66503d', '#e5eadd', g);
        }
        if (room.kind === 'server') sign('LOCAL KNOWLEDGE', 'OBSIDIAN BELUM TERHUBUNG / LAMPU DEKORATIF', 2.7, .55, .4, 2.77, back + .16, '#ede6dc', '#4b594e', g);
      }
      if (room.kind === 'medical') {
        for (const [i, bed] of facilitySeats(room.id).entries()) {
          const z = -.6;
          box(1.65, .18, 2.7, bed.x, .68, z, '#ab9b85', g, .06);
          box(1.58, .22, 2.6, bed.x, .88, z, '#faf9f5', g, .08);
          box(1.2, .04, .45, bed.x, 1.01, -1.55, '#faf9f5', g, .04);
        box(1.6, .055, 1.15, bed.x, 1.03, -.1, '#3a6263', g, .035).material = officeMat('#3a6263', 'linen');
          box(1.72, .7, .09, bed.x, 1.0, -2.0, '#ab9b85', g, .05);
          box(1.72, .35, .09, bed.x, .78, .8, '#ab9b85', g, .04);
          for (const x of [-.63, .63]) for (const dz of [-1.08, 1.08]) { box(.06, .36, .06, bed.x + x, .46, z + dz, '#66503d', g); sphere(.07, bed.x + x, .3, z + dz, '#66503d', g); }
          sign(`0${i + 1}`, 'RECOVERY', .55, .22, bed.x, 1.38, -1.94, '#ab9b85', '#faf9f5', g);
        }
        box(6.5, .8, .55, 0, .7, back + .4, '#ab9b85', g, .04);
        box(6.6, .07, .62, 0, 1.14, back + .4, '#faf9f5', g, .03);
        box(.55, .6, .22, 0, 1.48, back + .4, '#faf9f5', g, .03);
        box(.28, .06, .025, 0, 1.48, back + .52, '#8c584b', g); box(.06, .28, .025, 0, 1.48, back + .52, '#8c584b', g);
        for (const x of [-2.3, 2.3]) cylinder(.11, .11, .22, x, 1.3, back + .4, '#e6e0cd', g);
      }
      if (room.kind === 'meeting') {
        const length = room.capacity === 8 ? 4.8 : 2.9;
        rug(g, 0, -.7, 5.6, length + 1.4);
        box(2.9, .16, length, 0, 1.28, -.7, '#926b47', g, .18);
        box(2.86, .025, length - .04, 0, 1.37, -.7, '#b68a5d', g, .16);
        for (const z of [-length / 3, length / 3]) box(1.8, .88, .14, 0, .78, -.7 + z, '#252622', g);
        for (const seat of facilitySeats(room.id)) {
          const c = new THREE.Group(); c.position.set(seat.x, 0, seat.z); c.rotation.y = -seat.heading; g.add(c);
          box(.72, .14, .70, 0, .76, 0, '#3a6263', c, .07).material = officeMat('#3a6263', 'linen');
          box(.72, .65, .14, 0, 1.08, .29, '#3a6263', c, .06).material = officeMat('#3a6263', 'linen');
          for (const side of [-.38, .38]) { box(.035, .3, .04, side, .95, .1, '#252622', c); box(.06, .04, .4, side, 1.1, .05, '#ab9b85', c, .015); }
          cylinder(.045, .045, .47, 0, .48, 0, '#252622', c); box(.62, .04, .07, 0, .27, 0, '#252622', c); box(.07, .04, .62, 0, .27, 0, '#252622', c);
          const side = Math.sign(seat.x);
          box(.29, .027, .4, side * .95, 1.41, seat.z, '#faf9f5', g, .015);
          cylinder(.06, .06, .11, side * .8, 1.45, seat.z + .33, '#f3eee3', g);
        }
        box(.54, .025, .42, 0, 1.41, -.7, '#30302c', g, .045);
        for (const z of [-2, .8]) box(.06, .01, .25, 0, 1.41, z, '#252622', g);
        box(6.8, .8, .60, 0, .69, back + .48, '#ab9b85', g, .03);
        for (let i = 0; i < 6; i++) box(.02, .68, .015, -2.8 + i * 1.12, .72, back + .79, '#ab9b85', g);
        box(6.9, .07, .67, 0, 1.12, back + .48, '#faf9f5', g, .025);
        box(3.6, 1.45, .09, 0, 2.12, back + .13, '#30302c', g, .04);
        const board = sign('KAEL / COLLABORATION', 'TERSEDIA / BRIEFING & REVIEW', 3.4, 1.25, 0, 2.12, back + .19, '#30302c', '#f1e7d8', g); board.name = `session-board-${room.id}`;
        plant(-2.85, back + .48, .45, 1.15, g); cylinder(.12, .12, .28, 2.8, 1.3, back + .48, '#d5c9b0', g);
        for (const z of [-1.7, .7]) { cylinder(.012, .012, .55, 0, 3.55, z, '#766d58', g); box(2.1, .08, .23, 0, 3.24, z, '#ab9b85', g, .035); box(1.9, .012, .16, 0, 3.19, z, '#f1e5bc', g); }
      }
      if (room.kind === 'lounge') {
        rug(g, 0, -.7, 7.2, 4.1);
        sofa(g, -2.8, -.7, -Math.PI / 2); sofa(g, 2.8, -.7, Math.PI / 2);
        const table = cylinder(.82, .82, .1, -.15, .85, -.7, '#faf9f5', g, 48); table.material = officeMat('#f3efe0', 'stone'); table.scale.z = .83;
        cylinder(.34, .37, .48, -.15, .56, -.7, '#c9bba8', g, 32);
        box(.42, .045, .50, -.4, .94, -.7, '#30302c', g, .015); plant(.2, -.7, .3, .91, g);
        box(6.2, .9, .72, .9, .75, back + .5, '#926b47', g, .04); box(6.3, .09, .82, .9, 1.25, back + .5, '#faf9f5', g, .03);
        for (const x of [-1.3, -.2, .9, 2, 3.1]) box(.018, .72, .018, x, .77, back + .87, '#ab9b85', g);
        box(.65, .53, .42, 2.1, 1.56, back + .5, '#252622', g, .04); box(.22, .16, .13, 2.1, 1.36, back + .76, '#c9bba8', g);
        box(.3, .19, .05, 2.1, 1.62, back + .73, '#c9bba8', g, .02);
        coffeeSteam.clear(); coffeeSteam.position.set(2.1, 1.88, back + .65); g.add(coffeeSteam);
        for (let i = 0; i < 3; i++) { const vapor = sphere(.04, (i - 1) * .09, i * .09, 0, '#faf9f5', coffeeSteam); vapor.scale.y = 2; }
        coffeeSteam.visible = false;
        for (let i = 0; i < 3; i++) cylinder(.075, .075, .13, 3 + i * .25, 1.37, back + .5, '#faf9f5', g);
        for (const y of [1.75, 2.35]) { box(2.4, .07, .38, -.4, y, back + .35, '#b68a5d', g); for (let i = 0; i < 8; i++) box(.13, .32 + i % 3 * .06, .23, -1.35 + i * .25, y + .21, back + .35, bookColors[i % 5], g); }
        for (const x of [-1.2, 1.2]) { cylinder(.3, .3, .08, x, .92, 3.25, '#b68a5d', g); cylinder(.035, .035, .62, x, .57, 3.25, '#252622', g); }
        box(3.7, .1, .65, 0, 1.25, 2.3, '#b68a5d', g, .07); for (const x of [-1.45, 1.45]) box(.06, .92, .5, x, .75, 2.3, '#252622', g);
      }
      if (room.kind === 'garden') {
        box(1.7, .04, room.depth - .15, 0, .28, 0, '#d6d0bf', g); box(9.8, .04, 1.3, 0, .28, .9, '#d6d0bf', g);
        floorSurface(walkwayTiles([{ x: 0, z: 0, width: 1.7, depth: room.depth - .15 }, { x: 0, z: .9, width: 9.8, depth: 1.3 }]), '#b8ad9e', g).position.y = .302;
        for (const x of [-4.65, 4.65]) { box(.65, .35, 7.8, x, .42, -.5, '#926b47', g, .05); for (let z = -3.6; z < 3; z += 1.1) plant(x, z, .72, .58, g); }
        for (const x of [-4.1, -1.4]) for (const z of [-3.5, -.1]) box(.10, 2.6, .10, x, 1.6, z, '#926b47', g);
        for (let i = 0; i < 7; i++) box(3.1, .10, .10, -2.75, 2.95, -3.6 + i * .6, '#b68a5d', g);
        box(2.5, .12, .7, -2.55, .8, -2.2, '#b68a5d', g, .05); box(2.5, .55, .1, -2.55, 1.05, -2.5, '#b68a5d', g, .035);
        for (const x of [-3.4, -1.7]) box(.08, .45, .5, x, .52, -2.2, '#252622', g);
        cylinder(1.3, 1.3, .18, 2.6, .38, -2.4, '#b8b69c', g, 48); cylinder(1.12, 1.12, .015, 2.6, .48, -2.4, '#8aaea5', g, 48);
        cylinder(.34, .48, .26, 2.6, .61, -2.4, '#d4cfb9', g, 32);
        for (let i = 0; i < 7; i++) { const p = sphere(.16, 1.7 + i % 4 * .55, .4, -.1 + Math.floor(i / 4) * .5, i % 2 ? '#b6a77d' : '#ddd4bd', g); p.scale.y = .6; }
        box(2.2, .12, .65, 3.05, .78, 2.3, '#b68a5d', g, .04);
        sign('COURTYARD', 'PAUSE / REFLECT', 1.9, .42, -3.5, 1.5, 4.2, '#e0dccb', '#536454', g);
      }
      if (room.kind === 'sport') {
        box(9.8, .025, 8.3, -1.3, .29, -.6, '#617c70', g, .05).material = officeMat('#617c70', 'plaster');
        for (const x of [-6, 3.4]) box(.045, .012, 7.9, x, .315, -.6, '#d7dfcf', g);
        for (const z of [-4.55, 3.35]) box(9.4, .012, .045, -1.3, .315, z, '#d7dfcf', g);
        for (const x of [-3, .4]) box(.045, .012, 3.1, x, .315, -3, '#d7dfcf', g);
        box(3.4, .012, .045, -1.3, .315, -1.45, '#d7dfcf', g);
        const arc = new THREE.Mesh(new THREE.TorusGeometry(2.9, .025, 6, 48, Math.PI), officeMat('#d7dfcf')); arc.rotation.x = Math.PI / 2; arc.position.set(-1.3, .32, -2.6); g.add(arc);
        box(.13, 2.8, .13, -1.3, 1.7, -4.7, '#66503d', g); box(1.5, .9, .08, -1.3, 2.9, -4.7, '#e9dfd0', g, .03);
        box(.55, .35, .015, -1.3, 2.85, -4.65, '#b3aa8e', g);
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(.27, .025, 8, 32), officeMat('#bd8970')); hoop.rotation.x = Math.PI / 2; hoop.position.set(-1.3, 2.55, -4.35); g.add(hoop);
        box(1.8, .04, 4.2, 5, .31, -1.2, '#c2baa5', g, .05);
        for (const z of [-2.2, -.3]) box(1.25, .035, .65, 5, .35, z, '#617c70', g, .08);
        box(3.1, .12, .65, 3.5, .78, 4.4, '#b68a5d', g, .04); for (const x of [2.4, 4.6]) box(.1, .42, .5, x, .51, 4.4, '#66503d', g);
        basketball = new THREE.Group(); basketball.userData.navigationIgnore = true; g.add(basketball);
        sphere(.21, 0, 0, 0, '#b8784f', basketball);
        for (const turn of [0, Math.PI / 2]) { const seam = new THREE.Mesh(new THREE.TorusGeometry(.212, .009, 6, 24), officeMat('#49382b')); seam.rotation.y = turn; basketball.add(seam); }
        basketball.position.set(-.2, .53, 1.5); plant(6, -4.4, .95, .3, g);
        sign('ACTIVE COURT', 'OUTDOOR / MOVE / RESET', 2.5, .45, 4.6, 1.7, -4.8, '#d8d4c5', '#536454', g);
      }
      box(1.8, .035, .22, 0, .28, front - .1, '#b68a5d', g);
      const element = document.createElement('button'); element.className = 'agent-bubble facility-bubble'; element.setAttribute('aria-label', `Buka ${room.name}`);
      const title = document.createElement('strong'); title.textContent = room.name;
      element.append(title); element.onclick = () => window.dispatchEvent(new CustomEvent('kael:select-room', { detail: room.id })); overlays.append(element); facilityLabels.push({ element, model: g });
    }
  }
  function syncTeams(state: State) {
    const signature = JSON.stringify([state.divisions, state.agents]);
    if (signature === teamSignature) { updateActivity(state); return; }
    teamSignature = signature;
    for (const actor of actors) actor.character.root.removeFromParent();
    receptionist?.root.removeFromParent(); receptionist = null; receptionBubble?.remove(); receptionBubble = null;
    divisionWorld.traverse(o => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
      if (o instanceof THREE.InstancedMesh) o.dispose();
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial && o.material !== glowMaterial && o.material !== contactMaterial) { o.material.map?.dispose(); o.material.dispose(); }
    });
    for (const indicator of serverIndicators) indicator.dispose(); serverIndicators.length = 0;
    divisionWorld.clear(); agentModels.clear(); actors.length = 0; facilityLabels.length = 0; overlays.replaceChildren(); layoutRooms = divisionLayouts(state);
    buildArchitecture(); buildWalkways(); buildFacilities();
    {
      const rooms = campusRooms(), site = officeSite(rooms), maxX = site.right, minX = site.left, maxZ = site.parking.z + site.parking.depth / 2, minZ = Math.min(site.back, ...rooms.map(r => r.z - r.depth / 2));
      const extent = Math.max(maxX - minX + 12, maxZ + 15), cx = (maxX + minX) / 2;
      sun.position.set(cx - 12, extent, maxZ / 2 + 20); sun.target.position.set(cx, 0, maxZ / 2);
      sun.updateMatrixWorld(); sun.target.updateMatrixWorld(); sun.shadow.updateMatrices(sun);
      const shadowBounds = new THREE.Box3(new THREE.Vector3(minX - 2, -1, minZ - 2), new THREE.Vector3(maxX + 2, 5, maxZ + 2)).applyMatrix4(sun.shadow.camera.matrixWorldInverse);
      Object.assign(sun.shadow.camera, { left: shadowBounds.min.x, right: shadowBounds.max.x, top: shadowBounds.max.y, bottom: shadowBounds.min.y, far: extent * 3 }); sun.shadow.camera.updateProjectionMatrix();
    }
    for (const room of layoutRooms) {
      const group = new THREE.Group(); group.position.set(room.x, 0, room.z); divisionWorld.add(group);
      box(room.width, .42, room.depth, 0, .025, 0, '#d9cebd', group);
      box(room.width - .15, .07, room.depth - .15, 0, .23, 0, '#e8dfd0', group);
      for (const area of room.rugs) rug(group, area.x, area.z, area.width, area.depth);
      floorSurface([{ x: 0, z: 0, width: room.width - .15, depth: room.depth - .15 }], '#f3efe0', group);
      box(room.width, 3.15, .18, 0, 1.75, -room.depth / 2, '#ede6dc', group);
      const nookWidth = room.width / 2 - .65, nookX = -room.width / 4 - .3;
      box(nookWidth, 2.8, .05, nookX, 1.8, -room.depth / 2 + .12, '#926b47', group);
      for (let i = 0; i < nookWidth / .22; i++) box(.035, 2.8, .045, -room.width / 2 + .15 + i * .22, 1.8, -room.depth / 2 + .16, '#b68a5d', group);
      box(room.width, .08, .22, 0, 3.365, -room.depth / 2, '#ab9b85', group);
      wallLights(room.width, -room.depth / 2 + .01, 3.27, group);
      roomPartitions(room.width, room.depth, group);
      sign(room.name, 'TEAM STUDIO', Math.min(3.1, nookWidth - .5), .62, nookX, 2.62, -room.depth / 2 + .21, '#926b47', '#f5eddd', group);
      const wallZ = -room.depth / 2 + .15;
      const windowX = .9;
      box(2.4, 1.65, .08, windowX, 2, wallZ, '#ab9b85', group);
      box(2.2, 1.45, .025, windowX, 2, wallZ + .05, '#c9bba8', group);
      box(.035, 1.45, .04, windowX, 2, wallZ + .08, '#ede6dc', group);
      // The manager has a separate executive nook, with an opening to the centre aisle.
      const partition = box(nookWidth, .72, .055, nookX, .8, -room.depth / 2 + 3.6, '#c9bba8', group); partition.material = glass;
      box(nookWidth, .035, .07, nookX, 1.18, -room.depth / 2 + 3.6, '#252622', group);
      for (const x of [nookX - nookWidth / 2, nookX + nookWidth / 2]) box(.04, .8, .07, x, .76, -room.depth / 2 + 3.6, '#252622', group);
      for (const item of room.furniture) {
        const { x, z } = item;
        if (item.kind === 'plant') plant(x, z, .9, .3, group);
        if (item.kind === 'huddle') {
          cylinder(.66, .66, .1, x, 1.13, z, '#bd9d74', group, 32); cylinder(.22, .4, .8, x, .68, z, '#586b5b', group);
          box(.3, .03, .4, x, 1.2, z, '#faf9f5', group);
          for (const dx of [-.98, .98]) { cylinder(.28, .28, .1, x + dx, .8, z, '#748674', group); cylinder(.035, .035, .48, x + dx, .51, z, '#586b5b', group); }
        }
        if (item.kind === 'sofa') {
          sofa(group, x, z);
        }
        if (item.kind === 'coffee-table') {
          cylinder(.45, .45, .08, x, .82, z, '#b68a5d', group);
          cylinder(.1, .16, .48, x, .54, z, '#252622', group);
          box(.3, .05, .34, x, .89, z, '#30302c', group);
        }
        if (item.kind === 'cabinet' || item.kind === 'bookshelf') {
          const height = item.kind === 'bookshelf' ? 1.75 : .95;
          if (item.kind === 'bookshelf') {
            box(item.width, height, .06, x, .3 + height / 2, z - item.depth / 2, '#926b47', group);
            for (const dx of [-item.width / 2, item.width / 2]) box(.07, height, item.depth, x + dx, .3 + height / 2, z, '#926b47', group);
            for (const y of [.45, 1.18, 2.03]) box(item.width + .08, .065, item.depth + .07, x, y, z, '#b68a5d', group);
            for (const y of [.7, 1.45]) for (let i = 0; i < 7; i++) box(.14, .42 + i % 3 * .05, .33, x - .58 + i * .18, y, z + .05, bookColors[i % 5], group);
          } else {
            box(item.width, height, item.depth, x, .3 + height / 2, z, '#926b47', group, .035);
            for (const side of [-.61, .61]) { box(1.15, .75, .035, x + side, .77, z + .37, '#b68a5d', group); box(.15, .035, .03, x + side, .85, z + .4, '#252622', group); }
            plant(x + .75, z, .45, 1.27, group);
            for (let i = 0; i < 3; i++) box(.48, .06, .36, x - .65, 1.29 + i * .06, z, bookColors[i], group);
          }
        }
      }
      for (const member of room.members) {
        const desk = new THREE.Group(); desk.position.set(member.x, 0, member.z); group.add(desk);
        contactShadow(member.manager ? 3.8 : 2.8, 1.8, 0, 0, desk);
        box(member.manager ? 3.2 : 2.15, .11, member.manager ? 1.3 : 1.05, 0, 1.25, 0, member.manager ? '#926b47' : '#b68a5d', desk, .04);
        box(member.manager ? 3.2 : 2.15, .025, .035, 0, 1.32, .50, '#d7b991', desk);
        // Cable tray and inset grommet fit under/on the existing tabletop footprint.
        box(1.25, .10, .16, 0, 1.07, -.34, '#2d3238', desk, .025).material = officeMat('#2d3238', 'metal');
        cylinder(.055, .055, .012, .66, 1.313, -.34, '#2d3238', desk, 20);
        for (const dx of [-.83, .83]) box(.08, .96, .78, dx, .75, 0, '#252622', desk);
        const look = characterLook(room.name, member, member.ordinal), screen = desktop(desk, 1.32, member.manager, look);
        if (member.manager) {
          box(.55, .8, 1.1, -1.18, .85, -.02, '#30302c', desk);
          for (let drawer = 0; drawer < 3; drawer++) box(.18, .025, .035, -1.18, .63 + drawer * .22, .55, '#d7b991', desk);
          box(.68, .16, .08, 1.2, 1.4, .48, '#d7b991', desk, .015);
          sign(member.name, 'DIVISION MANAGER', .65, .15, 1.2, 1.41, .526, '#d7b991', '#30302c', desk);
        }
        const upholstery = member.manager ? '#3a6263' : '#f3efe0';
        box(.69, .13, .6, 0, .72, .83, upholstery, desk, .05).material = officeMat(upholstery, 'linen');
        box(member.manager ? .8 : .69, member.manager ? .9 : .62, .13, 0, member.manager ? 1.18 : 1.05, 1.07, upholstery, desk, .06).material = officeMat(upholstery, 'linen');
        cylinder(.06, .06, .45, 0, .44, .83, '#252622', desk);
        box(.72, .04, .09, 0, .32, .83, '#252622', desk); box(.09, .04, .72, 0, .32, .83, '#252622', desk);
        for (const [x, z] of [[-.32, .83], [.32, .83], [0, .5], [0, 1.16]]) sphere(.065, x, .29, z, '#384c40', desk);
        const character = createCharacter(look, mat), avatar = character.root;
        avatar.scale.setScalar(.8); avatar.position.set(member.x, .15, member.z + .75); avatar.rotation.y = Math.PI; group.add(avatar); agentModels.set(member.id, avatar);
        const bubble = document.createElement('button'); bubble.className = 'agent-bubble'; bubble.dataset.manager = String(member.manager);
        const name = document.createElement('strong'); name.textContent = member.name;
        const role = document.createElement('em'); role.textContent = member.manager ? 'MANAGER' : 'AGENT';
        const activity = document.createElement('span'); activity.className = 'bubble-activity';
        const errorIcon = document.createElement('span'); errorIcon.className = 'agent-error-icon'; errorIcon.innerHTML = icon('alert');
        bubble.append(name, role, activity, errorIcon); bubble.onclick = () => window.dispatchEvent(new CustomEvent('kael:agent', { detail: member.id })); overlays.append(bubble);
        actors.push({ member, room, character, bubble, activity: agentActivity(state, member), screen, title: '', trip: null, mount: 0 });
      }
    }
    routeCache.clear(); scene.updateMatrixWorld(true);
    const obstacles: Footprint[] = [];
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      for (let parent: THREE.Object3D | null = object; parent; parent = parent.parent) if (parent.userData.character || parent.userData.navigationIgnore) return;
      const bounds = new THREE.Box3().setFromObject(object);
      if (bounds.max.y <= .4 || bounds.min.y >= 2.3) return;
      obstacles.push({ x: (bounds.min.x + bounds.max.x) / 2, z: (bounds.min.z + bounds.max.z) / 2, width: bounds.max.x - bounds.min.x, depth: bounds.max.z - bounds.min.z });
    });
    const areas = [...campusRooms(), ...officeSite(campusRooms()).floors, ...officeWalkways(campusRooms())];
    navigation = createNavigation(areas, obstacles);
    nextSocial = elapsed + 10; updateActivity(state);
    if (officeMode === 'all') overview();
  }
  function frameRoom(id: string) {
    const room = campusRooms().find(r => r.id === id); if (!room) { reset(); return; }
    officeMode = 'division'; activeRoom = id; controls.target.set(room.x - .5, .6, room.z + (id === 'server' ? .2 : 1.5)); camera.position.set(room.x + 16, 18, room.z + 23); camera.zoom = id === 'server' ? 1.4 : Math.min(.95, 16 / (room.depth + 4)); controls.update(); camera.updateProjectionMatrix();
  }
  function overview() {
    officeMode = 'all';
    greetingUntil = performance.now() + 6000;
    const rooms = campusRooms(), site = officeSite(rooms), maxX = site.right + 1, maxZ = site.parking.z + site.parking.depth / 2 + 1;
    const minZ = Math.min(site.back, ...rooms.map(r => r.z - r.depth / 2)) - 1, minX = site.left - 1;
    const bounds = new THREE.Box3(new THREE.Vector3(minX, -.8, minZ), new THREE.Vector3(maxX, 4.2, maxZ));
    bounds.getCenter(controls.target); camera.position.copy(controls.target).add(new THREE.Vector3(28, 34, 38));
    controls.minZoom = .05; controls.update(); camera.updateMatrixWorld();
    const size = bounds.clone().applyMatrix4(camera.matrixWorldInverse).getSize(new THREE.Vector3());
    camera.zoom = Math.min(1, (camera.right - camera.left) / size.x * .96, (camera.top - camera.bottom) / size.y * .9); camera.updateProjectionMatrix();
  }
  function reset() {
    officeMode = 'founder';
    controls.reset(); camera.position.set(13, 12.5, 16); controls.target.set(0, 1, -.1); camera.zoom = 1; camera.updateProjectionMatrix(); controls.update();
  }
  function resize() {
    const width = container.clientWidth, height = container.clientHeight;
    if (!width || !height) return;
    const aspect = width / Math.max(height, 1);
    const span = Math.max(13.3, 18.6 / aspect);
    camera.left = -span * aspect / 2; camera.right = span * aspect / 2; camera.top = span / 2; camera.bottom = -span / 2;
    camera.updateProjectionMatrix(); renderer.setSize(width, height);
    if (officeMode === 'all') overview();
  }
  buildArchitecture(); buildWalkways(); buildFacilities(); resize(); reset();
  new ResizeObserver(resize).observe(container);
  const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); let down = { x: 0, y: 0 };
  renderer.domElement.addEventListener('pointerdown', event => { down = { x: event.clientX, y: event.clientY }; });
  renderer.domElement.addEventListener('pointerup', event => {
    if (event.button !== 0 || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return;
    const rect = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const candidates = [kael, ...agentModels.values(), ...(receptionist ? [receptionist.root] : [])].filter(model => model.visible);
    const hit = raycaster.intersectObjects(candidates, true)[0];
    if (hit) {
      let root: THREE.Object3D | null = hit.object;
      while (root && !candidates.includes(root)) root = root.parent;
      if (root === receptionist?.root) greetingUntil = performance.now() + 7000;
      else if (root === kael) onSelect();
      else { const agentId = [...agentModels].find(([, model]) => model === root)?.[0]; if (agentId) window.dispatchEvent(new CustomEvent('kael:agent', { detail: agentId })); }
    }
  });
  container.addEventListener('keydown', event => {
    const offsets: Record<string, [number, number]> = { ArrowLeft: [-.4, 0], ArrowRight: [.4, 0], ArrowUp: [0, -.4], ArrowDown: [0, .4] };
    if (!offsets[event.key]) return; event.preventDefault();
    const [x, z] = offsets[event.key]; camera.position.x += x; camera.position.z += z; controls.target.x += x; controls.target.z += z; controls.update();
  });
  const projected = new THREE.Vector3();
  renderer.setAnimationLoop((time) => {
    if (!container.clientWidth || !container.clientHeight) return;
    const still = reducedMotion.matches || motionPaused;
    const dt = previousTime ? Math.min(.05, (time - previousTime) / 1000) : 0; previousTime = time;
    if (!still) elapsed += dt;
    if (!motionPaused) serverIndicators.forEach((material, index) => { material.emissiveIntensity = serverIndicatorIntensity(elapsed, index, reducedMotion.matches); });
    founder.animate(elapsed, 0, status === 'focus', dt, still);
    receptionist?.animate(elapsed, 0, false, dt, still);
    if (!still && elapsed > nextCoffee && !actors.some(a => a.trip?.coffee) && !activityState?.facilitySessions?.some(s => s.status === 'active' && s.roomId === 'lounge')) {
      const guest = actors.find(a => a.activity.canWalk && !a.trip);
      if (guest) beginTrip(guest, 'lounge', 0, { coffee: true });
      nextCoffee = elapsed + 45;
    }
    if (!still && activityState && elapsed > nextSocial) {
      const visit = socialVisit(activityState, socialCycle++, actors.filter(a => a.trip).map(a => ({ agentId: a.member.id, roomId: a.trip!.roomId })));
      const guests = visit?.participantIds.map(id => actors.find(a => a.member.id === id));
      if (visit && guests?.every(a => a && !a.trip)) guests.forEach((guest, i) => {
        const actor = guest!;
        beginTrip(actor, visit.roomId, visit.seatIndices[i], { delay: i * 1.2 });
      });
      nextSocial = elapsed + 12;
    }
    const patients = activityState ? medicalPatients(activityState) : [];
    const players = actors.filter(a => a.trip?.roomId === 'sport' && a.trip.arrived && !a.trip.returning && (a.trip.ambient ? a.activity.canWalk : !!a.session) && !patients.some(p => p.agent.id === a.member.id)).sort((a, b) => a.trip!.seatIndex - b.trip!.seatIndex);
    const play = courtPlay(elapsed, players.map(a => facilitySeats('sport')[a.trip!.seatIndex]));
    if (basketball) { basketball.position.set(play?.x ?? -.2, play?.y ?? .53, play?.z ?? 1.5); if (!still && play) basketball.rotation.x += dt * 4; }
    for (const actor of actors) {
      const { character, member, bubble } = actor;
      if (member.id === builderAgent.id && activityState) actor.activity = agentActivity(activityState, member);
      const patient = patients.find(p => p.agent.id === member.id);
      if (!actor.trip && patient && patient.bedIndex >= 0) beginTrip(actor, 'meeting-alt', patient.bedIndex, { medical: true });
      if (!actor.trip && actor.session) {
        const seatIndex = actor.session.participantIds.indexOf(member.id);
        beginTrip(actor, actor.session.roomId, seatIndex, { sessionId: actor.session.id, delay: seatIndex * 1.2 });
      }
      if (actor.trip && (actor.trip.medical ? !patient || patient.bedIndex !== actor.trip.seatIndex : actor.trip.ambient ? !actor.activity.canWalk || elapsed >= actor.trip.leaveAt || activityState?.facilitySessions?.some(s => s.status === 'active' && s.roomId === actor.trip!.roomId) : actor.trip.sessionId !== actor.session?.id)) { actor.trip.returning = true; actor.trip.arrived = false; }
      actor.mount = still ? actor.trip?.arrived ? 1 : 0 : THREE.MathUtils.damp(actor.mount, actor.trip?.arrived ? 1 : 0, 6, dt);
      if (actor.trip && !actor.trip.arrived && !still && elapsed >= actor.trip.delay && actor.mount < .02) {
        const trip = actor.trip, length = routeLength(trip.route);
        Object.assign(trip, advanceTravel(trip.distance, trip.speed, length, trip.returning, dt));
        if (trip.distance >= length && !trip.returning) { trip.distance = length; trip.arrived = true; trip.speed = 0; trip.leaveAt = trip.medical ? Infinity : elapsed + (trip.coffee ? 9 : trip.roomId === 'sport' ? 36 : 18); }
        if (trip.returning && trip.distance <= 0) actor.trip = null;
      }
      if (actor.trip && reducedMotion.matches && !motionPaused) {
        if (actor.trip.returning) actor.trip = null;
        else { actor.trip.distance = routeLength(actor.trip.route); actor.trip.arrived = true; }
      }
      const trip = actor.trip, traveling = !!trip && !trip.arrived && trip.distance > 0;
      const coffee = trip?.coffee && trip.arrived ? trip.leaveAt - elapsed > 3 ? 1 : 2 : 0;
      const basketPose = trip?.arrived && !trip.returning && play && players[play.playerIndex] === actor ? play.action === 'shoot' || play.action === 'flight' ? 2 : play.action === 'dribble' ? 1 : 0 : 0;
      const activity = trip ? { kind: patient ? 'error' : trip.ambient ? 'social' : 'facility', text: trip.returning ? 'Kembali ke meja' : trip.arrived ? trip.medical ? '⚠ Error · Pemulihan' : trip.coffee ? coffee === 1 ? 'Menyiapkan kopi · Visual' : 'Minum kopi · Visual' : trip.ambient ? trip.roomId === 'sport' ? 'Main bersama · Visual' : 'Ngobrol · Visual' : actor.activity.text : elapsed >= trip.delay ? trip.medical ? '⚠ Error · Menuju medis' : trip.coffee ? 'Menuju mesin kopi' : 'Menuju fasilitas' : 'Bersiap jalan', typing: false } : patient ? { ...actor.activity, text: patient.bedIndex < 0 ? '⚠ Error · Menunggu kasur' : '⚠ Error · Jalur medis terhalang' } : actor.activity;
      const seat = trip ? trip.coffee ? coffeeSpot : facilitySeats(trip.roomId)[trip.seatIndex] : null;
      const standing = !!trip && (!trip.arrived || !seat?.seated) && (trip.distance > 0 || elapsed >= trip.delay);
      const movingSpeed = traveling && actor.mount < .02 ? Math.abs(trip!.speed) : 0;
      if (trip?.roomId === 'sport' && trip.arrived && !trip.returning) activity.text = `${basketPose === 1 ? 'Dribble basket' : basketPose === 2 ? 'Menembak ring' : 'Latihan basket'} · Visual`;
      const seated = character.animate(basketPose ? elapsed : elapsed + member.ordinal * .7, movingSpeed / 1.55, activity.typing, dt, still, !!trip?.arrived && !trip.medical && !trip.coffee && !basketPose && (trip.ambient || actor.session?.purpose === 'break'), standing, !!seat?.lying && actor.mount > .01, coffee, basketPose);
      const destination = trip ? sampleRoute(trip.route, trip.distance) : null;
      const home = homeAnchor(actor) || { x: actor.room.x + member.x, z: actor.room.z + member.z + .75 };
      const point = destination ? { x: destination.x - actor.room.x, z: destination.z - actor.room.z, heading: trip!.arrived || actor.mount > .01 ? seat!.heading : destination.heading + (trip!.returning ? Math.PI : 0) } : { x: home.x - actor.room.x, z: home.z - actor.room.z, heading: Math.PI };
      let height = .22;
      if (trip && actor.mount > .001) {
        point.x = THREE.MathUtils.lerp(point.x, facilityLayouts.find(r => r.id === trip.roomId)!.x + seat!.x - actor.room.x, actor.mount);
        point.z = THREE.MathUtils.lerp(point.z, facilityLayouts.find(r => r.id === trip.roomId)!.z + seat!.z - actor.room.z, actor.mount);
        height = THREE.MathUtils.lerp(.22, seat!.lying ? seat!.height : seat!.seated ? seat!.height - .512 : .22, actor.mount) + (seat!.lying ? .5 : seat!.seated ? .2 : 0) * Math.sin(actor.mount * Math.PI);
      } else if (!trip || trip.distance < .75 && !trip.returning) {
        point.x = THREE.MathUtils.lerp(point.x, member.x, seated); point.z = THREE.MathUtils.lerp(point.z, member.z + .75, seated);
        height = THREE.MathUtils.lerp(.22, member.id === 'nate' || member.id === builderAgent.id ? .363 : .273, seated) + .15 * Math.sin(seated * Math.PI);
      }
      character.root.position.set(point.x, height, point.z);
      character.root.rotation.x = seat?.lying ? -Math.PI / 2 * actor.mount : 0;
      const heading = point.heading;
      const delta = Math.atan2(Math.sin(heading - character.root.rotation.y), Math.cos(heading - character.root.rotation.y));
      character.root.rotation.y += delta * (still ? 1 : 1 - Math.exp(-6 * dt));
      if (bubble.dataset.activity !== activity.kind || bubble.querySelector('.bubble-activity')!.textContent !== activity.text) {
        bubble.dataset.activity = activity.kind; bubble.querySelector('.bubble-activity')!.textContent = activity.text;
        bubble.setAttribute('aria-label', `${member.name}, ${member.role}. ${activity.text}. Buka detail anggota.`); bubble.title = `${member.name} · ${member.role} · ${activity.text}`;
      }
      if (actor.workflow && activityState) { actor.activity = agentActivity(activityState, actor.member); actor.workflow.status = actor.activity.text; }
      if (elapsed - lastScreen > .6) actor.screen.draw(elapsed, actor.title, actor.workflow, activityState?.builderChat);
    }
    if (elapsed - lastScreen > .6) lastScreen = elapsed;
    controls.update();
    coffeeSteam.visible = !still && actors.some(a => a.trip?.coffee && a.trip.arrived && a.trip.leaveAt - elapsed > 3);
    coffeeSteam.scale.y = 1 + Math.sin(elapsed * 3) * .12;
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    function placeBubble(element: HTMLElement, model: THREE.Object3D, height: number, visible: boolean, offsets = [0, -36, -72, -108]) {
      if (!visible) { element.hidden = true; return; }
      model.localToWorld(projected.set(0, height, 0)); projected.y += .35; projected.project(camera);
      if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || projected.z < -1 || projected.z > 1) { element.hidden = true; return; }
      const errorMarker = element.dataset.activity === 'error';
      const w = errorMarker ? 40 : element.classList.contains('facility-bubble') ? 110 : 98, h = errorMarker ? 40 : window.innerWidth < 700 ? 40 : 28;
      const x = THREE.MathUtils.clamp((projected.x * .5 + .5) * container.clientWidth - w / 2, 8, container.clientWidth - w - 8);
      const headY = (-projected.y * .5 + .5) * container.clientHeight - h - 12;
      for (const offset of errorMarker ? [0] : offsets) {
        const y = headY + offset;
        if (y < (errorMarker ? 8 : window.innerWidth < 700 ? 100 : 35) || y + h > container.clientHeight - 75 || !errorMarker && placed.some(p => Math.abs(x + w / 2 - p.x - p.w / 2) < (w + p.w) / 2 + 5 && Math.abs(y + h / 2 - p.y - p.h / 2) < (h + p.h) / 2 + 5)) continue;
        element.hidden = false; element.style.width = `${w}px`; element.style.transform = `translate(${x}px, ${y}px)`; placed.push({ x, y, w, h }); return;
      }
      element.hidden = true;
    }
    placeBubble(label, kael, 2.68, status !== 'offline' && (officeMode === 'founder' || officeMode === 'all'));
    for (const actor of actors) placeBubble(actor.bubble, actor.character.root, 2.15, officeMode === 'agent' && actor.member.id === activeAgent || officeMode === 'all' && (actor.member.manager || actor.member.id === 'nate' || !!actor.trip || actor.activity.kind === 'error') || officeMode === 'division' && (actor.trip ? actor.trip.roomId === activeRoom : actor.room.id === activeRoom));
    for (const facility of facilityLabels) placeBubble(facility.element, facility.model, .6, officeMode === 'all', [0]);
    if (receptionBubble && receptionist) {
      receptionist.root.localToWorld(projected.set(0, 2.4, 0)); projected.project(camera);
      const greeting = performance.now() < greetingUntil, width = Math.min(greeting ? 235 : 150, container.clientWidth - 24);
      receptionBubble.hidden = officeMode !== 'all' || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || projected.z < -1 || projected.z > 1;
      receptionBubble.querySelector('span')!.hidden = !greeting;
      receptionBubble.style.width = `${width}px`;
      receptionBubble.style.transform = `translate(${THREE.MathUtils.clamp((projected.x * .5 + .5) * container.clientWidth - width / 2, 12, container.clientWidth - width - 12)}px, ${THREE.MathUtils.clamp((-projected.y * .5 + .5) * container.clientHeight - (greeting ? 110 : 38), 62, container.clientHeight - 150)}px)`;
    }
    renderer.render(scene, camera);
  });
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); renderer.setAnimationLoop(null); const state = document.querySelector<HTMLElement>('#scene-state')!; state.hidden = false; state.innerHTML = '<strong>Koneksi grafis terputus.</strong><button id="reload-scene">Muat ulang ruangan</button>'; document.querySelector<HTMLButtonElement>('#reload-scene')!.onclick = () => location.reload(); });
  const portraits = new Map<string, string>();
  function portrait(id = 'founder') {
    const actor = actors.find(a => a.member.id === id);
    const look = id === serverAgent.id ? characterLook('Server & Obsidian', serverAgent, 3) : actor ? characterLook(actor.room.name, actor.member, actor.member.ordinal) : founderLook;
    const key = JSON.stringify(look); if (portraits.has(key)) return portraits.get(key)!;
    const studio = new THREE.Scene(); studio.background = new THREE.Color('#f3efe0');
    studio.environment = scene.environment; studio.environmentIntensity = .65;
    studio.add(new THREE.HemisphereLight('#fff5e6', '#ab9b85', 1.6));
    const light = new THREE.DirectionalLight('#fff0d9', 2.6); light.position.set(-3, 5, 4); studio.add(light);
    const character = createCharacter(look, mat); character.animate(0, 1, false, 1, true); character.root.rotation.y = -.22; studio.add(character.root);
    const lens = new THREE.OrthographicCamera(-1.3, 1.3, 1.56, -1.56, .1, 20); lens.position.set(0, 1.55, 6); lens.lookAt(0, 1.35, 0);
    renderer.setSize(300, 360, false); renderer.render(studio, lens);
    const image = renderer.domElement.toDataURL('image/png'); portraits.set(key, image);
    studio.clear(); resize(); renderer.render(scene, camera); return image;
  }
  return {
    syncTeams, overview, frameRoom, portrait,
    focusAgent(id: string) { const model = agentModels.get(id); if (!model) return; officeMode = 'agent'; activeAgent = id; model.getWorldPosition(controls.target); controls.target.y = 1; camera.position.copy(controls.target).add(new THREE.Vector3(12, 12, 16)); camera.zoom = 1.4; controls.update(); camera.updateProjectionMatrix(); },
    pauseMotion(value: boolean) { motionPaused = value; },
    preview(width = 900, height = 500) {
      try { return captureFounderPreview(renderer, scene, width, height); }
      finally { if (container.clientWidth && container.clientHeight) renderer.render(scene, camera); }
    },
    reset,
    zoom(factor: number) { camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, .12, 2.8); camera.updateProjectionMatrix(); },
    rotate() { const delta = camera.position.clone().sub(controls.target); delta.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6); camera.position.copy(controls.target).add(delta); controls.update(); },
    focus() { reset(); controls.target.set(kael.position.x, 1, kael.position.z); camera.zoom = 1.55; camera.updateProjectionMatrix(); controls.update(); },
    setStatus(next: typeof status) { status = next; kael.visible = next !== 'offline'; kael.position.set(next === 'idle' ? -3.7 : .5, next === 'idle' ? .33 : .255, next === 'idle' ? 1.3 : .25); kael.rotation.y = next === 'idle' ? Math.PI / 2 : Math.PI; },
    setNight(night: boolean) { scene.background = new THREE.Color(night ? '#1e122a' : '#f3efe0'); scene.environmentIntensity = night ? .22 : .65; ambient.intensity = night ? .4 : 1.05; sun.intensity = night ? .5 : 3; sun.color.set(night ? '#b9c5d1' : '#fff0d9'); warm.intensity = night ? 16 : 0; officeMat('#e8e1d7').color.set(night ? '#1e122a' : '#f3efe0'); },
  };
}


