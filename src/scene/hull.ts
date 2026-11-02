import * as THREE from 'three'

const keel = new THREE.Color('#2c1e14')
const bilge = new THREE.Color('#5a4030')
const gunwale = new THREE.Color('#8a6a4c')
const _c = new THREE.Color()

/**
 * Low Song cargo hull: flat bottom, rising sheer at bow and stern,
 * sides flared enough to read in reflection. Length along local +X, bow at +X.
 */
export function createCargoHull(
  length = 5.35,
  beam = 1.42,
  depth = 0.58,
) {
  const lengthSegs = 20
  const beamSegs = 8
  const row = beamSegs + 1
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const section = (t: number) => {
    const bow = Math.pow(Math.sin(Math.min(t * 1.05, 1) * Math.PI), 0.72)
    const sternCut = 1 - 0.18 * Math.pow(Math.max(t - 0.78, 0) / 0.22, 1.2)
    const half = (beam / 2) * Math.max(0.16, bow * sternCut)
    const endLift = Math.pow(1 - Math.sin(t * Math.PI), 1.2)
    const keelY = -0.06 + endLift * 0.22
    const gunwaleY = 0.16 + depth * 0.78 + endLift * 0.42
    return { half, keelY, gunwaleY }
  }

  for (let i = 0; i <= lengthSegs; i++) {
    const t = i / lengthSegs
    const x = (t - 0.5) * length
    const { half, keelY, gunwaleY } = section(t)
    for (let j = 0; j <= beamSegs; j++) {
      const u = j / beamSegs
      const side = u * 2 - 1
      const k = Math.pow(Math.abs(side), 1.75)
      const y = THREE.MathUtils.lerp(keelY, gunwaleY, k)
      const z = side * half * (0.92 + 0.08 * k)
      positions.push(x, y, z)
      uvs.push(t * 3.2, u)
      _c.copy(keel).lerp(bilge, Math.min(1, k * 1.4))
      _c.lerp(gunwale, Math.pow(k, 2.2))
      colors.push(_c.r, _c.g, _c.b)
    }
  }

  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < beamSegs; j++) {
      const a = i * row + j
      const b = a + 1
      const c = a + row
      const d = c + 1
      // Outward: keel normal points down, side normals point away from centerline.
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}
