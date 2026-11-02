import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CameraPresetId } from './cameras'

/**
 * Translucent ripple + specular glaze on the plate's own water.
 * A screen-space mask keeps the glaze off roofs and decks. Alpha stays low
 * so the concept river remains the picture; there is no opaque water color.
 */
const PRESET_INDEX: Record<CameraPresetId, number> = {
  wide: 0,
  bridgeCenter: 1,
  waterUp: 2,
}

function paintEllipse(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  alpha: number,
) {
  g.save()
  g.filter = 'blur(16px)'
  g.fillStyle = `rgba(255,255,255,${alpha})`
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

function makeMasks() {
  const w = 480
  const h = 270
  const canvases = [0, 1, 2].map(() => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return c
  })

  const wide = canvases[0].getContext('2d')
  const bridge = canvases[1].getContext('2d')
  const water = canvases[2].getContext('2d')
  if (!wide || !bridge || !water) throw new Error('2d context unavailable')

  // concept-01: river left, under the arch, and beside the right-hand boat.
  // Bottom band is near roofs — leave it empty.
  paintEllipse(wide, 78, 128, 120, 62, 0.95)
  paintEllipse(wide, 230, 148, 78, 36, 0.55)
  paintEllipse(wide, 390, 132, 100, 48, 0.8)

  // concept-02: water in the arch opening and along the right-hand boat.
  // Near deck and the foreground umbrella stay clear.
  paintEllipse(bridge, 28, 118, 36, 70, 0.45)
  paintEllipse(bridge, 300, 168, 96, 52, 0.9)
  paintEllipse(bridge, 400, 214, 78, 36, 0.55)

  // concept-03: the lower half is river. A long vertical feather, no hard line.
  const grd = water.createLinearGradient(0, 108, 0, 196)
  grd.addColorStop(0, 'rgba(255,255,255,0)')
  grd.addColorStop(1, 'rgba(255,255,255,1)')
  water.fillStyle = grd
  water.fillRect(0, 108, w, h - 108)

  return canvases.map((canvas) => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.NoColorSpace
    tex.needsUpdate = true
    return tex
  })
}

export function ReflectiveWater({ plate }: { plate: CameraPresetId }) {
  const material = useMemo(() => {
    const masks = makeMasks()
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      premultipliedAlpha: true,
      uniforms: {
        tMask0: { value: masks[0] },
        tMask1: { value: masks[1] },
        tMask2: { value: masks[2] },
        preset: { value: 0 },
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        varying vec3 vNormalW;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tMask0;
        uniform sampler2D tMask1;
        uniform sampler2D tMask2;
        uniform float preset;
        uniform float time;
        uniform vec2 resolution;
        varying vec3 vWorld;
        varying vec3 vNormalW;

        void main() {
          vec2 suv = gl_FragCoord.xy / resolution;
          vec2 maskUv = vec2(suv.x, 1.0 - suv.y);
          float m0 = texture2D(tMask0, maskUv).r;
          float m1 = texture2D(tMask1, maskUv).r;
          float m2 = texture2D(tMask2, maskUv).r;
          float mask = preset < 0.5 ? m0 : (preset < 1.5 ? m1 : m2);
          if (mask < 0.004) discard;

          vec3 n = normalize(vNormalW);
          vec3 viewDir = normalize(cameraPosition - vWorld);
          float ndv = clamp(dot(n, viewDir), 0.0, 1.0);
          float fresnel = pow(1.0 - ndv, 2.4);

          float rip = sin(vWorld.x * 1.55 + time * 0.42) * sin(vWorld.z * 1.2 - time * 0.28);
          float rip2 = sin(vWorld.x * 0.42 - vWorld.z * 0.55 + time * 0.16);
          vec3 nRip = normalize(n + vec3(rip, 0.0, rip2) * 0.07);
          vec3 lightDir = normalize(vec3(0.45, 0.82, 0.28));
          vec3 halfDir = normalize(lightDir + viewDir);
          float spec = pow(max(dot(nRip, halfDir), 0.0), 36.0);

          // Plate river is gray-olive / mist silver, not the ochre fog.
          vec3 tint = preset < 1.5
            ? vec3(0.56, 0.62, 0.58)
            : vec3(0.70, 0.66, 0.58);
          vec3 glint = vec3(0.82, 0.84, 0.78);
          vec3 col = mix(tint, glint, clamp(spec * 1.4, 0.0, 1.0));

          float alpha = mask * (0.045 + fresnel * 0.10 + spec * 0.20);
          alpha = min(alpha, 0.16);
          gl_FragColor = vec4(col * alpha, alpha);
        }
      `,
    })
    return mat
  }, [])

  const presetRef = useRef(plate)
  useEffect(() => {
    presetRef.current = plate
  }, [plate])

  useFrame(({ gl, clock }) => {
    material.uniforms.preset.value = PRESET_INDEX[presetRef.current]
    material.uniforms.time.value = clock.elapsedTime
    material.uniforms.resolution.value.set(
      Math.max(1, gl.domElement.width),
      Math.max(1, gl.domElement.height),
    )
  })

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.02, 0]}
      material={material}
      frustumCulled={false}
      raycast={() => null}
    >
      <planeGeometry args={[90, 90]} />
    </mesh>
  )
}
