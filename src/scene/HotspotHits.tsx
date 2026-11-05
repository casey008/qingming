import { useEffect, useRef } from 'react'
import type { CameraPresetId } from './cameras'
import type { HotspotId } from './hotspots'

/** Screen rects (x right, y down, normalized) over each plate's subject. */
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

const PRESS_SLOP = 6

/**
 * Screen-space hotspot picker (HTML listeners, not WebGL).
 * Camera-portal meshes never got reliable R3F clicks under CameraControls.
 */
export function HotspotHits({
  plate,
  enabled,
  onSelect,
  onMiss,
}: {
  plate: CameraPresetId
  enabled: boolean
  onSelect: (id: HotspotId) => void
  onMiss?: () => void
}) {
  const plateRef = useRef(plate)
  const enabledRef = useRef(enabled)
  const onSelectRef = useRef(onSelect)
  const onMissRef = useRef(onMiss)
  plateRef.current = plate
  enabledRef.current = enabled
  onSelectRef.current = onSelect
  onMissRef.current = onMiss

  useEffect(() => {
    let sx = 0
    let sy = 0
    let moved = false
    let tracking = false

    const uiSelector =
      'button, .info-panel, .preset-bar, .skip-btn, .concept-ref, a, input'

    const onDown = (e: PointerEvent) => {
      if (!enabledRef.current || e.button !== 0) return
      const t = e.target as HTMLElement | null
      if (t?.closest?.(uiSelector)) return
      tracking = true
      moved = false
      sx = e.clientX
      sy = e.clientY
    }

    const onMove = (e: PointerEvent) => {
      if (!tracking) return
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > PRESS_SLOP) moved = true
    }

    const onUp = (e: PointerEvent) => {
      if (!tracking) return
      tracking = false
      if (!enabledRef.current || moved) return
      const t = e.target as HTMLElement | null
      if (t?.closest?.(uiSelector)) return

      const root = document.getElementById('root')
      if (!root) return
      const bounds = root.getBoundingClientRect()
      if (bounds.width <= 0 || bounds.height <= 0) return
      const nx = (e.clientX - bounds.left) / bounds.width
      const ny = (e.clientY - bounds.top) / bounds.height
      if (nx < 0 || ny < 0 || nx > 1 || ny > 1) return

      const hits = [...HITS[plateRef.current]].sort((a, b) => b.order - a.order)
      for (const hit of hits) {
        const [x0, y0, x1, y1] = hit.rect
        if (nx >= x0 && nx <= x1 && ny >= y0 && ny <= y1) {
          onSelectRef.current(hit.id)
          return
        }
      }
      onMissRef.current?.()
    }

    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointermove', onMove, true)
    window.addEventListener('pointerup', onUp, true)
    window.addEventListener('pointercancel', onUp, true)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerup', onUp, true)
      window.removeEventListener('pointercancel', onUp, true)
    }
  }, [])

  return null
}
