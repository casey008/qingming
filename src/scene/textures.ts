import * as THREE from 'three'

function canvasTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace,
) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = colorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

/** Weathered timber: grain runs along U, which beams map to their length. */
export function makeWoodTextures() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const g = c.getContext('2d')
  if (!g) throw new Error('2d context unavailable')

  g.fillStyle = '#4a382c'
  g.fillRect(0, 0, 512, 128)

  for (let y = 0; y < 128; y++) {
    const band =
      Math.sin(y * 0.41) * 0.55 +
      Math.sin(y * 0.13 + 1.2) * 0.45
    const shade = 58 + band * 22
    g.fillStyle = `rgba(${Math.round(shade + 18)}, ${Math.round(shade * 0.72)}, ${Math.round(shade * 0.48)}, 0.7)`
    g.fillRect(0, y, 512, 1)
  }

  for (let i = 0; i < 110; i++) {
    const y = Math.random() * 128
    const dark = Math.random() > 0.45
    g.strokeStyle = dark
      ? `rgba(36, 18, 8, ${0.18 + Math.random() * 0.38})`
      : `rgba(150, 104, 62, ${0.12 + Math.random() * 0.22})`
    g.lineWidth = 0.5 + Math.random() * 1.25
    g.beginPath()
    let yy = y
    g.moveTo(0, yy)
    for (let x = 16; x <= 512; x += 24) {
      yy += (Math.random() - 0.5) * 2.4
      g.lineTo(x, yy)
    }
    g.stroke()
  }

  for (let k = 0; k < 3; k++) {
    const x = 48 + Math.random() * 420
    const y = 18 + Math.random() * 92
    const rad = 4 + Math.random() * 8
    const grd = g.createRadialGradient(x, y, 0.5, x, y, rad)
    grd.addColorStop(0, 'rgba(28, 14, 6, 0.9)')
    grd.addColorStop(0.55, 'rgba(62, 34, 16, 0.45)')
    grd.addColorStop(1, 'rgba(62, 34, 16, 0)')
    g.fillStyle = grd
    g.beginPath()
    g.ellipse(x, y, rad * 1.5, rad * 0.85, 0.2, 0, Math.PI * 2)
    g.fill()
  }

  const map = canvasTexture(c, THREE.SRGBColorSpace)

  const r = document.createElement('canvas')
  r.width = 512
  r.height = 128
  const rg = r.getContext('2d')
  if (!rg) throw new Error('2d context unavailable')
  rg.fillStyle = '#b9b9b9'
  rg.fillRect(0, 0, 512, 128)
  for (let i = 0; i < 160; i++) {
    const y = Math.random() * 128
    const v = 120 + Math.random() * 110
    rg.strokeStyle = `rgba(${v}, ${v}, ${v}, 0.85)`
    rg.lineWidth = 0.7 + Math.random()
    rg.beginPath()
    rg.moveTo(0, y)
    rg.lineTo(512, y + (Math.random() - 0.5) * 2)
    rg.stroke()
  }
  const rough = canvasTexture(r, THREE.NoColorSpace)

  return { map, rough }
}

export function makeThatchTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')
  if (!g) throw new Error('2d context unavailable')
  g.fillStyle = '#8a7044'
  g.fillRect(0, 0, 256, 128)
  for (let x = 0; x < 256; x += 3) {
    const shade = 90 + ((x / 3) % 2) * 28
    g.strokeStyle = `rgba(${shade + 40}, ${shade * 0.7}, ${shade * 0.35}, 0.55)`
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x + 6, 128)
    g.stroke()
  }
  const tex = canvasTexture(c, THREE.SRGBColorSpace)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2.2, 1.2)
  return tex
}

export function makePaperTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')
  if (!g) throw new Error('2d context unavailable')
  g.fillStyle = '#c4aa84'
  g.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI
    g.strokeStyle = 'rgba(90, 60, 36, 0.28)'
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(128, 128)
    g.lineTo(128 + Math.cos(a) * 140, 128 + Math.sin(a) * 140)
    g.stroke()
  }
  g.strokeStyle = 'rgba(120, 90, 60, 0.2)'
  for (let y = 8; y < 256; y += 7) {
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(256, y + 2)
    g.stroke()
  }
  return canvasTexture(c, THREE.SRGBColorSpace)
}
