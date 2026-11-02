import * as THREE from 'three'

/**
 * Squared timbers with a small chamfer so edges catch the key light.
 * Length is local +X. UVs run along the length so grain doesn't smear.
 */
const geoCache = new Map<string, THREE.BufferGeometry>()

export function getBeamGeometry(
  length: number,
  height: number,
  depth: number,
): THREE.BufferGeometry {
  const key = `${length.toFixed(3)}|${height.toFixed(3)}|${depth.toFixed(3)}`
  const cached = geoCache.get(key)
  if (cached) return cached

  const hx = length / 2
  const hy = height / 2
  const hz = depth / 2
  const chamfer = Math.min(0.045, hy * 0.38, hz * 0.38)
  const profile: [number, number][] = [
    [hy - chamfer, hz],
    [-hy + chamfer, hz],
    [-hy, hz - chamfer],
    [-hy, -hz + chamfer],
    [-hy + chamfer, -hz],
    [hy - chamfer, -hz],
    [hy, -hz + chamfer],
    [hy, hz - chamfer],
  ]
  const n = profile.length
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const uSpan = Math.max(0.35, length * 0.92)

  for (let i = 0; i < n; i++) {
    const a = profile[i]
    const b = profile[(i + 1) % n]
    const edgeY = b[0] - a[0]
    const edgeZ = b[1] - a[1]
    let ny = -edgeZ
    let nz = edgeY
    const nl = Math.hypot(ny, nz) || 1
    ny /= nl
    nz /= nl
    const midY = (a[0] + b[0]) / 2
    const midZ = (a[1] + b[1]) / 2
    const outward = ny * midY + nz * midZ >= 0
    if (!outward) {
      ny = -ny
      nz = -nz
    }

    const v0 = i / n
    const v1 = (i + 1) / n
    const base = positions.length / 3
    const push = (x: number, y: number, z: number, u: number, v: number) => {
      positions.push(x, y, z)
      normals.push(0, ny, nz)
      uvs.push(u, v * Math.max(height, depth) * 4.5)
    }
    // p00, p10, p11, p01. Winding p00-p10-p11 faces (0, -edgeZ, edgeY);
    // if that wasn't outward we flipped the normal, so flip the winding too.
    push(-hx, a[0], a[1], 0, v0)
    push(hx, a[0], a[1], uSpan, v0)
    push(hx, b[0], b[1], uSpan, v1)
    push(-hx, b[0], b[1], 0, v1)
    if (outward) indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    else indices.push(base, base + 2, base + 1, base, base + 3, base + 2)
  }

  const cap = (x: number, positiveX: boolean) => {
    const base = positions.length / 3
    positions.push(x, 0, 0)
    normals.push(positiveX ? 1 : -1, 0, 0)
    uvs.push(0.5, 0.5)
    for (let i = 0; i < n; i++) {
      const [y, z] = profile[i]
      positions.push(x, y, z)
      normals.push(positiveX ? 1 : -1, 0, 0)
      uvs.push(0.5 + (y / height) * 0.45, 0.5 + (z / depth) * 0.45)
    }
    for (let i = 0; i < n; i++) {
      const i1 = (i + 1) % n
      if (positiveX) indices.push(base, base + 1 + i, base + 1 + i1)
      else indices.push(base, base + 1 + i1, base + 1 + i)
    }
  }
  cap(hx, true)
  cap(-hx, false)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geoCache.set(key, geo)
  return geo
}

export type TimberSpec = {
  pos: [number, number, number]
  quat: [number, number, number, number]
  size: [number, number, number]
  tone: 0 | 1 | 2 | 3
}

export const BRIDGE = {
  span: 15.6,
  rise: 4.65,
  spring: 0.28,
  bays: 6,
  ribs: [-1.64, -0.55, 0.55, 1.64] as const,
}

function upperAt(t: number) {
  return {
    x: -BRIDGE.span / 2 + t * BRIDGE.span,
    y: BRIDGE.spring + Math.sin(t * Math.PI) * BRIDGE.rise,
  }
}

function lowerAt(t: number) {
  const s = Math.sin(t * Math.PI)
  return {
    x: -BRIDGE.span / 2 + t * BRIDGE.span,
    y: BRIDGE.spring + s * BRIDGE.rise * 0.7 + (1 - s) * 0.02,
  }
}

const _q = new THREE.Quaternion()
const _dir = new THREE.Vector3()
const _xAxis = new THREE.Vector3()
const _yAxis = new THREE.Vector3()
const _zAxis = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
const _basis = new THREE.Matrix4()

/** Length along local X, thickness (local Y) kept as upright as the direction allows. */
function orientBeam(dir: THREE.Vector3, target: THREE.Quaternion) {
  _xAxis.copy(dir)
  _yAxis.copy(_up).addScaledVector(_xAxis, -_up.dot(_xAxis))
  if (_yAxis.lengthSq() < 1e-8) _yAxis.set(0, 0, 1)
  else _yAxis.normalize()
  _zAxis.crossVectors(_xAxis, _yAxis).normalize()
  _basis.makeBasis(_xAxis, _yAxis, _zAxis)
  target.setFromRotationMatrix(_basis)
}

function pushBeam(
  out: TimberSpec[],
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  height: number,
  depth: number,
  tone: TimberSpec['tone'],
  overhang = 0.16,
) {
  _dir.set(bx - ax, by - ay, bz - az)
  const len = _dir.length()
  if (len < 0.04) return
  _dir.multiplyScalar(1 / len)
  orientBeam(_dir, _q)
  const midX = (ax + bx) / 2
  const midY = (ay + by) / 2
  const midZ = (az + bz) / 2
  out.push({
    pos: [midX, midY, midZ],
    quat: [_q.x, _q.y, _q.z, _q.w],
    size: [len + overhang * 2, height, depth],
    tone,
  })
}

/**
 * Woven timber arch: upper chord, deeper lower chord, bay diagonals,
 * and transverse locks that run past the outer ribs (出头).
 * Members overlap at the joints so the soffit reads as joinery, not a stack of boxes.
 */
export function buildBridge(): TimberSpec[] {
  const timbers: TimberSpec[] = []
  const { bays, ribs } = BRIDGE
  const tones: TimberSpec['tone'][] = [0, 1, 2, 3]

  ribs.forEach((z, ribIndex) => {
    const outward = Math.sign(z) || 1
    for (let i = 0; i < bays; i++) {
      const t0 = i / bays
      const t1 = (i + 1) / bays
      const a = upperAt(t0)
      const b = upperAt(t1)
      const c = lowerAt(t0)
      const d = lowerAt(t1)
      const tone = tones[(i + ribIndex) % 4]

      pushBeam(timbers, a.x, a.y, z, b.x, b.y, z, 0.22, 0.18, tone, 0.2)
      pushBeam(
        timbers,
        c.x,
        c.y,
        z + outward * 0.07,
        d.x,
        d.y,
        z + outward * 0.07,
        0.2,
        0.17,
        tones[(tone + 2) % 4],
        0.18,
      )
      pushBeam(
        timbers,
        c.x,
        c.y,
        z - outward * 0.04,
        b.x,
        b.y - 0.02,
        z - outward * 0.04,
        0.13,
        0.13,
        tones[(tone + 1) % 4],
        0.1,
      )
    }

    for (let i = 0; i <= bays; i += 2) {
      const t = i / bays
      const up = upperAt(t)
      const lo = lowerAt(t)
      pushBeam(
        timbers,
        up.x,
        up.y - 0.02,
        z,
        lo.x,
        lo.y + 0.02,
        z + outward * 0.05,
        0.12,
        0.12,
        2,
        0.04,
      )
    }
  })

  for (let i = 0; i <= bays; i++) {
    const t = i / bays
    const up = upperAt(t)
    const lo = lowerAt(t)
    const half = 1.64 + 0.42
    const tone: TimberSpec['tone'] = i % 2 === 0 ? 1 : 3
    pushBeam(
      timbers,
      up.x,
      up.y - 0.02,
      -half,
      up.x,
      up.y - 0.02,
      half,
      0.2,
      0.22,
      tone,
      0.02,
    )
    pushBeam(
      timbers,
      lo.x,
      lo.y,
      -half,
      lo.x,
      lo.y,
      half,
      0.18,
      0.2,
      i % 2 === 0 ? 2 : 0,
      0.02,
    )
  }

  // A few soffit X-braces under the crown so the underside isn't only parallel ribs.
  for (const bay of [2, 3]) {
    const t0 = bay / bays
    const t1 = (bay + 1) / bays
    const a = lowerAt(t0)
    const b = lowerAt(t1)
    const pairs: [number, number][] = [
      [ribs[0], ribs[1]],
      [ribs[2], ribs[3]],
    ]
    for (const [z0, z1] of pairs) {
      pushBeam(timbers, a.x, a.y - 0.08, z0, b.x, b.y - 0.08, z1, 0.1, 0.1, 2, 0.06)
      pushBeam(timbers, a.x, a.y - 0.16, z1, b.x, b.y - 0.16, z0, 0.1, 0.1, 0, 0.06)
    }
  }

  // Short crown deck — longitudinal planks that follow the arch, only the middle third.
  const tStart = 0.36
  const tEnd = 0.64
  const deckRows = [-1.2, -0.4, 0.4, 1.2]
  const deckBays = 8
  for (const z of deckRows) {
    for (let i = 0; i < deckBays; i++) {
      const t0 = tStart + (i / deckBays) * (tEnd - tStart)
      const t1 = tStart + ((i + 1) / deckBays) * (tEnd - tStart)
      const a = upperAt(t0)
      const b = upperAt(t1)
      pushBeam(
        timbers,
        a.x,
        a.y + 0.2,
        z,
        b.x,
        b.y + 0.2,
        z,
        0.07,
        i % 2 === 0 ? 0.34 : 0.3,
        ((i + (z > 0 ? 1 : 0)) % 4) as TimberSpec['tone'],
        0.015,
      )
    }
  }

  // Rails only along that short deck, both sides.
  const posts = 7
  for (const z of [-1.7, 1.7]) {
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i < posts; i++) {
      const t = tStart + (i / (posts - 1)) * (tEnd - tStart)
      const p = upperAt(t)
      const footY = p.y + 0.24
      const headY = footY + 0.78
      pts.push({ x: p.x, y: headY })
      pushBeam(timbers, p.x, footY, z, p.x, headY, z, 0.08, 0.08, i % 2 ? 2 : 1, 0.02)
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      pushBeam(timbers, a.x, a.y, z, b.x, b.y, z, 0.07, 0.09, 3, 0.04)
      pushBeam(
        timbers,
        a.x,
        a.y - 0.36,
        z,
        b.x,
        b.y - 0.36,
        z,
        0.05,
        0.06,
        1,
        0.03,
      )
    }
  }

  return timbers
}
