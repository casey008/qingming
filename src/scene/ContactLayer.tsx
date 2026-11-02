import { useMemo } from 'react'
import * as THREE from 'three'
import { CAMERA_PRESETS, type CameraPresetId } from './cameras'

/**
 * Inner edge of the concept-03 soffit, screen space (x right, y down).
 * Traced from the dark-timber → mist transition and median-smoothed.
 * Stops before the detector jumps off the near arch.
 */
const SOFFIT_SCREEN: [number, number][] = [
  [0.0016, 0.4118],
  [0.0234, 0.3875],
  [0.0453, 0.3597],
  [0.0688, 0.3319],
  [0.0906, 0.3069],
  [0.1125, 0.2847],
  [0.1359, 0.2611],
  [0.1578, 0.2417],
  [0.1797, 0.225],
  [0.2031, 0.2194],
  [0.225, 0.2181],
  [0.2469, 0.2153],
  [0.2703, 0.2167],
  [0.2922, 0.2194],
  [0.3141, 0.2236],
  [0.3375, 0.2319],
  [0.3594, 0.2417],
  [0.3812, 0.2556],
  [0.4047, 0.2722],
  [0.4266, 0.2917],
  [0.4484, 0.3153],
  [0.4719, 0.3444],
]

/** Sit the soft band in the timber shadow, just inside the seam. */
const INTO_WOOD = 0.012
/** Half-width in screen y. Gaussian dies before the geometric edge. */
const HALF_WIDTH = 0.046
const DISTANCE = 4.8
const SAMPLES = 72

function catmull(points: [number, number][], n: number) {
  const out: [number, number][] = []
  const last = points.length - 1
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const f = t * last
    const i0 = Math.floor(f)
    const i1 = Math.min(last, i0 + 1)
    const u = f - i0
    const at = (j: number) => points[Math.max(0, Math.min(last, j))]
    const p0 = at(i0 - 1)
    const p1 = at(i0)
    const p2 = at(i1)
    const p3 = at(i1 + 1)
    const u2 = u * u
    const u3 = u2 * u
    const x =
      0.5 *
      (2 * p1[0] +
        (-p0[0] + p2[0]) * u +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3)
    const y =
      0.5 *
      (2 * p1[1] +
        (-p0[1] + p2[1]) * u +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)
    out.push([x, Math.max(0.002, y)])
  }
  return out
}

function screenPoint(cam: THREE.PerspectiveCamera, sx: number, sy: number, dist: number) {
  const p = new THREE.Vector3(sx * 2 - 1, (1 - sy) * 2 - 1, 0.5).unproject(cam)
  return cam.position.clone().add(p.sub(cam.position).normalize().multiplyScalar(dist))
}

function buildRibbon() {
  const look = CAMERA_PRESETS.waterUp.lookAt
  const cam = new THREE.PerspectiveCamera(38, 16 / 9, 0.08, 80)
  cam.position.set(look[0], look[1], look[2])
  cam.lookAt(look[3], look[4], look[5])
  cam.updateMatrixWorld()
  cam.updateProjectionMatrix()

  const curve = catmull(SOFFIT_SCREEN, SAMPLES)
  const positions: number[] = []
  const side: number[] = []
  const along: number[] = []
  const indices: number[] = []

  curve.forEach(([x, y], i) => {
    const t = i / (curve.length - 1)
    const sy = Math.max(0.002, y - INTO_WOOD)
    const top = screenPoint(cam, x, sy - HALF_WIDTH, DISTANCE)
    const bot = screenPoint(cam, x, sy + HALF_WIDTH, DISTANCE)
    positions.push(top.x, top.y, top.z, bot.x, bot.y, bot.z)
    side.push(-1, 1)
    along.push(t, t)
    if (i < curve.length - 1) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  })

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1))
  geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1))
  geo.setIndex(indices)
  return geo
}

const ribbonMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  depthTest: false,
  toneMapped: false,
  premultipliedAlpha: true,
  uniforms: {},
  vertexShader: /* glsl */ `
    attribute float aSide;
    attribute float aAlong;
    varying float vSide;
    varying float vAlong;
    void main() {
      vSide = aSide;
      vAlong = aAlong;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying float vSide;
    varying float vAlong;
    void main() {
      // Wide gaussian: the mesh edge is already near zero, so no hard rim.
      float across = exp(-vSide * vSide * 3.2);
      float along = smoothstep(0.0, 0.28, vAlong) * smoothstep(1.0, 0.72, vAlong);
      float alpha = across * along * 0.48;
      // Darker than the plate shadow so the blend deepens it, still warm ochre.
      vec3 col = vec3(0.20, 0.14, 0.09);
      gl_FragColor = vec4(col * alpha, alpha);
    }
  `,
})

export function ContactLayer({ plate }: { plate: CameraPresetId }) {
  const geometry = useMemo(() => buildRibbon(), [])
  if (plate !== 'waterUp') return null
  return (
    <mesh geometry={geometry} material={ribbonMaterial} frustumCulled={false} raycast={() => null} />
  )
}
