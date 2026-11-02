import {
  CameraControls,
  type CameraControls as CameraControlsType,
} from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, type MutableRefObject } from 'react'
import {
  CAMERA_PRESETS,
  INTRO_END,
  INTRO_START,
  type CameraPresetId,
} from './cameras'
import { ContactLayer } from './ContactLayer'
import { HotspotHits } from './HotspotHits'
import { ReflectiveWater } from './ReflectiveWater'
import type { HotspotId } from './hotspots'

type SceneProps = {
  controlsRef: MutableRefObject<CameraControlsType | null>
  introPlaying: boolean
  holdPreset: boolean
  onIntroComplete: () => void
  onBackdrop: (id: CameraPresetId) => void
  activePreset: CameraPresetId | null
  plateId: CameraPresetId
  onSelectHotspot: (id: HotspotId) => void
}

/**
 * Screen pass clears transparent so the HTML concept plate shows through.
 * Positive priority takes over R3F's auto render.
 */
function PlateFriendlyRenderer() {
  useFrame(({ gl, scene, camera }) => {
    gl.setRenderTarget(null)
    gl.autoClear = true
    gl.setClearColor(0x000000, 0)
    gl.render(scene, camera)
  }, 1)

  return null
}

function IntroFlight({
  controlsRef,
  playing,
  onComplete,
  onBackdrop,
}: {
  controlsRef: MutableRefObject<CameraControlsType | null>
  playing: boolean
  onComplete: () => void
  onBackdrop: (id: CameraPresetId) => void
}) {
  const ran = useRef(false)

  useEffect(() => {
    if (!playing || ran.current) return

    let cancelled = false
    let raf = 0

    const start = (controls: CameraControlsType) => {
      if (ran.current || cancelled) return
      ran.current = true

      ;(async () => {
        controls.enabled = false
        controls.smoothTime = 1.35
        await controls.setLookAt(...INTRO_START, false)
        if (cancelled) return
        onBackdrop('bridgeCenter')
        await controls.setLookAt(...INTRO_END, true)
        if (cancelled) return
        controls.smoothTime = 0.35
        controls.enabled = true
        onComplete()
      })()
    }

    const waitForControls = () => {
      if (cancelled) return
      const controls = controlsRef.current
      if (controls) {
        start(controls)
        return
      }
      raf = requestAnimationFrame(waitForControls)
    }

    waitForControls()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [playing, controlsRef, onComplete, onBackdrop])

  return null
}

function HoldPreset({
  controlsRef,
  enabled,
  preset,
}: {
  controlsRef: MutableRefObject<CameraControlsType | null>
  enabled: boolean
  preset: CameraPresetId | null
}) {
  const ran = useRef(false)

  useEffect(() => {
    if (!enabled || !preset || ran.current) return
    let cancelled = false
    let raf = 0

    const tick = () => {
      if (cancelled) return
      const controls = controlsRef.current
      if (!controls) {
        raf = requestAnimationFrame(tick)
        return
      }
      ran.current = true
      controls.enabled = true
      controls.smoothTime = 0.2
      void controls.setLookAt(...CAMERA_PRESETS[preset].lookAt, false)
    }

    tick()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [enabled, preset, controlsRef])

  return null
}

export function RainbowBridgeScene({
  controlsRef,
  introPlaying,
  holdPreset,
  onIntroComplete,
  onBackdrop,
  activePreset,
  plateId,
  onSelectHotspot,
}: SceneProps) {
  return (
    <>
      <PlateFriendlyRenderer />
      <ReflectiveWater plate={plateId} />
      <ContactLayer plate={plateId} />
      <HotspotHits
        plate={plateId}
        enabled={!introPlaying}
        onSelect={onSelectHotspot}
      />
      <CameraControls
        ref={controlsRef}
        makeDefault
        maxDistance={42}
        minDistance={2.2}
        minPolarAngle={0.28}
        maxPolarAngle={Math.PI * 0.86}
        dollySpeed={0.55}
      />
      <IntroFlight
        controlsRef={controlsRef}
        playing={introPlaying}
        onComplete={onIntroComplete}
        onBackdrop={onBackdrop}
      />
      <HoldPreset
        controlsRef={controlsRef}
        enabled={holdPreset}
        preset={activePreset}
      />
    </>
  )
}
