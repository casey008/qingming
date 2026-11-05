import { Canvas } from '@react-three/fiber'
import { PCFSoftShadowMap } from 'three'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CameraControls as CameraControlsType } from '@react-three/drei'
import {
  CAMERA_PRESETS,
  INTRO_END,
  type CameraPresetId,
} from './scene/cameras'
import { RainbowBridgeScene } from './scene/RainbowBridgeScene'
import { HotspotHits } from './scene/HotspotHits'
import { HOTSPOTS, type HotspotId } from './scene/hotspots'

const PRESET_ORDER: CameraPresetId[] = ['wide', 'bridgeCenter', 'waterUp']

function readBoot() {
  const q = new URLSearchParams(window.location.search)
  const shot = q.get('shot')
  const clean = q.get('clean') === '1'
  if (shot === 'wide' || shot === 'bridgeCenter' || shot === 'waterUp') {
    return {
      intro: false,
      preset: shot as CameraPresetId,
      plate: shot as CameraPresetId,
      clean,
      hold: true,
    }
  }
  return {
    intro: true,
    preset: null as CameraPresetId | null,
    plate: 'wide' as CameraPresetId,
    clean,
    hold: false,
  }
}

export default function App() {
  const boot = useMemo(() => readBoot(), [])
  const controlsRef = useRef<CameraControlsType | null>(null)
  const [introPlaying, setIntroPlaying] = useState(boot.intro)
  const [activePreset, setActivePreset] = useState<CameraPresetId | null>(
    boot.preset,
  )
  const [plateId, setPlateId] = useState<CameraPresetId>(boot.plate)
  const [showRef, setShowRef] = useState(false)
  const [selectedId, setSelectedId] = useState<HotspotId | null>(null)

  const finishIntro = useCallback(() => {
    setIntroPlaying(false)
    setActivePreset('bridgeCenter')
    setPlateId('bridgeCenter')
  }, [])

  const skipIntro = useCallback(() => {
    const controls = controlsRef.current
    if (controls) {
      controls.smoothTime = 0.25
      void controls.setLookAt(...INTRO_END, false)
      controls.enabled = true
    }
    setIntroPlaying(false)
    setActivePreset('bridgeCenter')
    setPlateId('bridgeCenter')
  }, [])

  const goPreset = useCallback(
    (id: CameraPresetId) => {
      if (introPlaying) return
      const controls = controlsRef.current
      const preset = CAMERA_PRESETS[id]
      if (!controls || !preset) return
      controls.smoothTime = 0.55
      void controls.setLookAt(...preset.lookAt, true)
      setActivePreset(id)
      setPlateId(id)
      setSelectedId(null)
    },
    [introPlaying],
  )

  const selectHotspot = useCallback(
    (id: HotspotId) => {
      if (introPlaying) return
      setSelectedId(id)
    },
    [introPlaying],
  )

  const dismiss = useCallback(() => setSelectedId(null), [])

  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, dismiss])

  useEffect(() => {
    document.body.classList.toggle('shot-clean', boot.clean)
    document.body.dataset.plate = plateId
    document.body.dataset.preset = activePreset ?? (introPlaying ? 'intro' : '')
    document.body.dataset.ready = introPlaying ? '0' : '1'
  }, [boot.clean, plateId, activePreset, introPlaying])

  const refSrc = activePreset != null ? CAMERA_PRESETS[activePreset].concept : null
  const selected = selectedId ? HOTSPOTS[selectedId] : null

  return (
    <>
      <div className="concept-stage" aria-hidden>
        {PRESET_ORDER.map((id) => (
          <div
            key={id}
            className={id === plateId ? 'concept-plate on' : 'concept-plate'}
            style={{ backgroundImage: `url(${CAMERA_PRESETS[id].concept})` }}
          />
        ))}
      </div>
      <div className="vignette" aria-hidden />

      <div className="hud">
        <h1>清明上河图 · 虹桥一角</h1>
        <p>
          {introPlaying
            ? '开场飞入中 · 落点桥心近景 · 点击跳过'
            : '拖拽视差 · 滚轮缩放 · 点击桥、船、人、铺面看说明'}
        </p>
      </div>

      {introPlaying && (
        <button type="button" className="skip-btn" onClick={skipIntro}>
          跳过开场
        </button>
      )}

      {!introPlaying && (
        <div className="preset-bar" role="toolbar" aria-label="概念机位">
          {PRESET_ORDER.map((id) => {
            const p = CAMERA_PRESETS[id]
            return (
              <button
                key={id}
                type="button"
                className={
                  activePreset === id ? 'preset-btn active' : 'preset-btn'
                }
                onClick={() => goPreset(id)}
              >
                {p.label}
              </button>
            )
          })}
          <button
            type="button"
            className={showRef ? 'preset-btn active' : 'preset-btn'}
            onClick={() => setShowRef((v) => !v)}
            disabled={!refSrc}
            title="对照当前机位概念图"
          >
            对照图
          </button>
        </div>
      )}

      {showRef && refSrc && (
        <div className="concept-ref">
          <img src={refSrc} alt="概念对照" />
        </div>
      )}

      {selected && (
        <aside className="info-panel" role="dialog" aria-label={selected.title}>
          <button
            type="button"
            className="info-close"
            onClick={dismiss}
            aria-label="关闭"
          >
            ×
          </button>
          <h2>{selected.title}</h2>
          <p>{selected.blurb}</p>
        </aside>
      )}

      <HotspotHits
        plate={plateId}
        enabled={!introPlaying}
        onSelect={selectHotspot}
        onMiss={dismiss}
      />

      <Canvas
        className="webgl"
        shadows
        dpr={[1, 1.75]}
        camera={{ position: [14, 12.5, 22], fov: 38, near: 0.08, far: 160 }}
        gl={{
          antialias: true,
          alpha: true,
          premultipliedAlpha: true,
          toneMappingExposure: 0.96,
          powerPreference: 'high-performance',
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = PCFSoftShadowMap
          gl.setClearColor(0x000000, 0)
        }}
      >
        <Suspense fallback={null}>
          <RainbowBridgeScene
            controlsRef={controlsRef}
            introPlaying={introPlaying}
            holdPreset={boot.hold}
            onIntroComplete={finishIntro}
            onBackdrop={setPlateId}
            activePreset={activePreset}
            plateId={plateId}
          />
        </Suspense>
      </Canvas>
    </>
  )
}
