import { createPortal, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { CameraPresetId } from './cameras'
import type { HotspotId } from './hotspots'

/** Screen rects (x right, y down) over each plate's subject. Not drawn. */
const HITS: Record<
  CameraPresetId,
  { id: HotspotId; rect: [number, number, number, number]; order: number }[]
> = {
  wide: [
    { id: 'wineshop', rect: [0.02, 0.0, 0.98, 0.18], order: 1 },
    { id: 'bridge', rect: [0.32, 0.16, 0.74, 0.62], order: 2 },
    { id: 'teahouse', rect: [0.08, 0.5, 0.55, 0.82], order: 3 },
    { id: 'boatman', rect: [0.7, 0.26, 0.97, 0.54], order: 4 },
    { id: 'passerby', rect: [0.4, 0.16, 0.66, 0.38], order: 5 },
  ],
  bridgeCenter: [
    { id: 'wineshop', rect: [0.0, 0.0, 1, 0.12], order: 1 },
    { id: 'bridge', rect: [0.06, 0.14, 0.7, 0.8], order: 2 },
    { id: 'teahouse', rect: [0.0, 0.42, 0.24, 0.98], order: 3 },
    { id: 'boatman', rect: [0.52, 0.36, 0.98, 0.9], order: 4 },
    { id: 'passerby', rect: [0.14, 0.16, 0.5, 0.42], order: 5 },
  ],
  waterUp: [
    { id: 'wineshop', rect: [0.68, 0.18, 0.99, 0.46], order: 1 },
    { id: 'teahouse', rect: [0.12, 0.32, 0.42, 0.5], order: 2 },
    { id: 'bridge', rect: [0.0, 0.0, 0.72, 0.34], order: 3 },
    { id: 'boatman', rect: [0.26, 0.42, 0.82, 0.74], order: 4 },
    { id: 'passerby', rect: [0.38, 0.4, 0.72, 0.58], order: 5 },
  ],
}

function HitPlane({
  rect,
  id,
  order,
  enabled,
  onSelect,
  width,
  height,
}: {
  rect: [number, number, number, number]
  id: HotspotId
  order: number
  enabled: boolean
  onSelect: (id: HotspotId) => void
  width: number
  height: number
}) {
  const [x0, y0, x1, y1] = rect
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const z = -(1 - order * 0.02)
  const scale = -z
  return (
    <mesh
      position={[(cx - 0.5) * width * scale, (0.5 - cy) * height * scale, z]}
      rotation={[0, Math.PI, 0]}
      onClick={(e) => {
        if (!enabled) return
        e.stopPropagation()
        onSelect(id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      <planeGeometry
        args={[(x1 - x0) * width * scale, (y1 - y0) * height * scale]}
      />
      <meshBasicMaterial
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export function HotspotHits({
  plate,
  enabled,
  onSelect,
}: {
  plate: CameraPresetId
  enabled: boolean
  onSelect: (id: HotspotId) => void
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)
  const dist = 1
  const vFov = ((camera.fov || 38) * Math.PI) / 180
  const height = 2 * Math.tan(vFov / 2) * dist
  const width = height * (size.width / Math.max(1, size.height))
  const hits = HITS[plate]

  return createPortal(
    <group name="hotspot-hits">
      {hits.map((hit) => (
        <HitPlane
          key={hit.id}
          rect={hit.rect}
          id={hit.id}
          order={hit.order}
          enabled={enabled}
          onSelect={onSelect}
          width={width}
          height={height}
        />
      ))}
    </group>,
    camera,
  )
}
