/** Named camera presets aligned to approved concept stills (eye + lookAt target). */
export type CameraPresetId = 'wide' | 'bridgeCenter' | 'waterUp'

export type CameraPreset = {
  id: CameraPresetId
  label: string
  /** [eyeX, eyeY, eyeZ, targetX, targetY, targetZ] */
  lookAt: [number, number, number, number, number, number]
  concept: string
}

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPreset> = {
  wide: {
    id: 'wide',
    label: '①宽景',
    // Slightly above the deck line so the arch sits on the painted bridge.
    lookAt: [0.9, 4.35, 12.8, 0.4, 3.25, -0.7],
    concept: '/concepts/concept-01-wide.jpg',
  },
  bridgeCenter: {
    id: 'bridgeCenter',
    label: '②桥心',
    // Beside the crown, looking through the truss at the boat in the opening.
    lookAt: [-0.35, 3.4, 7.05, 0.4, 2.05, 0.05],
    concept: '/concepts/concept-02-bridge-center.jpg',
  },
  waterUp: {
    id: 'waterUp',
    label: '③仰桥',
    // Low, far enough to hold soffit, whole hull, and the reflection together.
    lookAt: [1.05, 1.38, 8.35, 0.05, 2.15, 0.12],
    concept: '/concepts/concept-03-water.jpg',
  },
}

/** Intro starts high (wide plate) and lands on bridge-center (concept ②). */
export const INTRO_START: [number, number, number, number, number, number] = [
  14, 12.5, 22, 0, 2.2, -0.4,
]
export const INTRO_END = CAMERA_PRESETS.bridgeCenter.lookAt
