import * as THREE from 'three';

type Surface = 'stone' | 'wood' | 'linen' | 'plaster' | 'metal' | 'tile' | 'asphalt' | 'turf';

// World-aligned UVs keep tile size and grain consistent across rooms and clipped corridor pieces.
export function createFloorGeometry(areas: readonly { x: number; z: number; width: number; depth: number }[], offset = { x: 0, z: 0 }) {
  const positions: number[] = [], uvs: number[] = [];
  for (const a of areas) {
    const left = a.x - a.width / 2, right = a.x + a.width / 2, back = a.z - a.depth / 2, front = a.z + a.depth / 2;
    for (const [x, z] of [[left, back], [left, front], [right, front], [left, back], [right, front], [right, back]]) {
      positions.push(x, 0, z); uvs.push((x + offset.x) / 1.2, (z + offset.z) / 1.2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals(); return geometry;
}

export function surfaceTexture(kind: Surface) {
  const size = 256, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const noise = hash - Math.floor(hash) - .5;
    const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2;
    const grain = Math.sin(u * 12 + Math.sin(v) * 1.8) + Math.sin(u * 37 + Math.sin(v * 2)) * .2;
    const vein = Math.abs(Math.sin(u + v + Math.sin(v * 2) * .35));
    const value = kind === 'tile' ? (x < 2 || y < 2 ? 210 : 243 + noise * 8 + Math.sin(u * 2 + Math.cos(v)) * 3 - (noise > .44 ? 22 : 0))
      : kind === 'asphalt' ? 219 + noise * 44 - (noise > .38 ? 14 : 0)
      : kind === 'turf' ? 230 + noise * 32 + Math.sin(v * 32 + Math.sin(u * 12)) * 7
      : kind === 'wood' ? 230 + grain * 12 + noise * 5
      : kind === 'linen' ? 232 + Math.sin(u * 64) * Math.cos(v * 64) * 13 + noise * 6
      : kind === 'metal' ? 238 + Math.sin(v * 96) * 5 + noise * 3
      : kind === 'plaster' ? 240 + noise * 12 + Math.sin(u * 8 + v * 6) * 3
      : 244 + noise * 5 - Math.pow(vein, 32) * 15;
    const offset = (y * size + x) * 4;
    const shade = Math.max(0, Math.min(255, Math.round(value)));
    pixels[offset] = shade; pixels[offset + 1] = shade; pixels[offset + 2] = shade; pixels[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

export function createSurfaceMaterials() {
  const textures = new Map<Surface, { color: THREE.DataTexture; relief: THREE.DataTexture }>();
  for (const kind of ['stone', 'wood', 'linen', 'plaster', 'metal', 'tile', 'asphalt', 'turf'] as const) {
    const color = surfaceTexture(kind), relief = color.clone();
    color.repeat.setScalar(kind === 'tile' ? 1 : kind === 'linen' ? 4 : 2);
    color.anisotropy = relief.anisotropy = 4;
    relief.repeat.copy(color.repeat); relief.colorSpace = THREE.NoColorSpace; relief.needsUpdate = true;
    textures.set(kind, { color, relief });
  }
  const cache = new Map<string, THREE.MeshStandardMaterial>();
  return (color: string, finish?: Surface | 'shell') => {
    const kind = finish || (['#b68a5d', '#926b47', '#d7b991', '#bd9d74', '#66503d', '#ab9b85', '#7d4723', '#866043', '#a37038', '#573d26'].includes(color) ? 'wood'
      : ['#d9cebd', '#e8dfd0', '#dbcfbe', '#d9d2c6', '#e3ddcc', '#d8d2bd', '#b8ad9e', '#f3efe0'].includes(color) ? 'stone'
      : color === '#ede6dc' ? 'plaster' : ['#faf9f5', '#ffffff'].includes(color) ? 'linen'
      : ['#242a28', '#829491', '#2d3238', '#1c1c1e', '#5e646e'].includes(color) ? 'metal' : undefined);
    const key = color + '/' + (kind || 'paint');
    if (!cache.has(key)) {
      const material = new THREE.MeshStandardMaterial({ color, roughness: .7, envMapIntensity: .65 });
      if (kind === 'shell') { material.roughness = .36; material.metalness = .12; }
      else if (kind) {
        const texture = textures.get(kind)!;
        material.map = texture.color; material.bumpMap = texture.relief;
        material.roughnessMap = texture.relief;
        material.bumpScale = kind === 'linen' ? .028 : kind === 'wood' ? .018 : kind === 'plaster' ? .018 : .008;
        material.roughness = kind === 'tile' ? .48 : kind === 'stone' ? .32 : kind === 'wood' ? .5 : kind === 'metal' ? .42 : .95;
        material.metalness = kind === 'metal' ? .65 : 0;
      }
      cache.set(key, material);
    }
    return cache.get(key)!;
  };
}

// Keep the original finish when multiple source materials share a palette colour.
export function createOfficeMaterials() {
  const material = createSurfaceMaterials();
  const palette: Record<string, string> = {
    '#ede6dc': '#f3efe0', '#e8e1d7': '#f3efe0', '#e8dfd0': '#f3efe0', '#e3ddcc': '#f3efe0',
    '#d8d2bd': '#b8ad9e', '#d9cebd': '#b8ad9e', '#c9bba8': '#b8ad9e', '#ab9b85': '#70665a',
    '#d7b991': '#a37038', '#b68a5d': '#866043', '#926b47': '#7d4723', '#66503d': '#573d26',
    '#30302c': '#2d3238', '#252622': '#1c1c1e', '#faf9f5': '#f3efe0', '#617c70': '#597d27',
    '#829491': '#5e646e', '#49382b': '#26181b', '#bd8970': '#b33924', '#d7dfcf': '#f3efe0',
  };
  const cache = new Map<string, THREE.MeshStandardMaterial>();
  return (source: string, finish?: Surface) => {
    const key = source + '/' + (finish || 'default');
    if (!cache.has(key)) {
      const selected = material(source, finish).clone();
      selected.color.set(palette[source] || source);
      cache.set(key, selected);
    }
    return cache.get(key)!;
  };
}
