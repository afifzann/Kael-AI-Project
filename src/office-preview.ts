import * as THREE from 'three';
import { founderFloor } from './layout.ts';

export function founderPreviewCamera(aspect = 1.8) {
  if (!Number.isFinite(aspect) || aspect <= 0) throw new Error('Rasio preview tidak valid.');
  const { x, z, width, depth } = founderFloor;
  const bounds = new THREE.Box3(new THREE.Vector3(x - width / 2, 0, z - depth / 2), new THREE.Vector3(x + width / 2, 3.4, z + depth / 2));
  const target = bounds.getCenter(new THREE.Vector3());
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100);
  camera.position.copy(target).add(new THREE.Vector3(13, 12.5, 16)); camera.lookAt(target); camera.updateMatrixWorld();
  const size = bounds.clone().applyMatrix4(camera.matrixWorldInverse).getSize(new THREE.Vector3());
  const halfHeight = Math.max(size.y, size.x / aspect) * .54;
  camera.top = halfHeight; camera.bottom = -halfHeight; camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
  camera.updateProjectionMatrix(); return camera;
}

export function captureFounderPreview(renderer: THREE.WebGLRenderer, scene: THREE.Scene, width = 900, height = 500) {
  if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 2048)) throw new Error('Ukuran preview tidak valid.');
  if (renderer.getContext().isContextLost()) throw new Error('Preview grafis belum tersedia.');
  const size = renderer.getSize(new THREE.Vector2()), ratio = renderer.getPixelRatio();
  try {
    renderer.setPixelRatio(1); renderer.setSize(width, height, false); renderer.render(scene, founderPreviewCamera(width / height));
    return renderer.domElement.toDataURL('image/webp', .9);
  } finally { renderer.setPixelRatio(ratio); renderer.setSize(size.x, size.y, false); }
}
