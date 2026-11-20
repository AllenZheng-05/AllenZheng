/* The scroll as an object: the wooden rod at the top and the roller at the bottom, lit and drawn in
 3D by three.js on one fixed, full-viewport canvas (canvas.gl). The paper stays ordinary HTML; this
 only draws the wood and the rolled-up paper round the roller where they are on screen. Port of
 the design mock-up's unroll3d (written against three r128), the only module that imports
 three, and only ever loaded lazily (see unroll.ts). */

import {
  AmbientLight,
  CanvasTexture,
  ColorManagement,
  CylinderGeometry,
  DirectionalLight,
  Group,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three'
import { drawsOnCanvas, mustResize, rollAt } from './glMath'

export interface ScrollGl {
  /** Draw rod and roller for this moment. `reveal` px of the mount are unrolled out of `full`; rects are client rects of .mount and .rod. */
  draw(state: { mount: DOMRect; rod: DOMRect; full: number; reveal: number }): void
  dispose(): void
}

export interface ScrollGlOptions {
  /** The WebGL context was lost (called once; it is not restored). */
  onLost?: () => void
}

/*
 Colour and light. The mock-up ran on r128: no colour management (canvas colours and hex colours
 went straight to the screen) and "legacy" light units, in which every light's irradiance was
 multiplied by π. To look the same today the pipeline is kept linear end to end (colour management
 off for this module's colours, textures left without a colour space, output not encoded), and the
 light intensities are the mock-up's times π: with these the shader computes nearly what r128 did.
 Current three's physically based shading differs a little in how the lit side is shaded, which
 left the lit paper and wood about 3% darker than the mock-up's; the sun is raised by 5% to make up
 for it (measured in screenshots side by side: the mean colour of the roll and of the rod, and the
 roller's shading from its lit top to its shadowed underside, within about 1%).
*/
const AMBIENT = 0.3 * Math.PI
const SUN = 0.95 * Math.PI * 1.05

/** Throws (or returns null) when WebGL is unavailable. */
export function createScrollGl(
  canvas: HTMLCanvasElement,
  options: ScrollGlOptions = {},
): ScrollGl | null {
  // current three needs WebGL 2; ask for the context ourselves so that a missing one is a quiet
  // null (three logs an error before it throws)
  if (typeof WebGL2RenderingContext === 'undefined') return null
  const context = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  })
  // a canvas whose context was given up before (a remount on the same element) cannot draw again
  if (!context || context.isContextLost()) return null

  // process-wide in three.js, but safe: this module is the site's only three.js user, and it wants
  // the r128 look (linear output, lights ×π) for everything it draws
  ColorManagement.enabled = false
  const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true })
  renderer.outputColorSpace = LinearSRGBColorSpace

  // everything made here is disposed of together
  const geometries: BufferGeometry[] = []
  const materials: Material[] = []
  const textures: Texture[] = []

  const scene = new Scene()
  // orthographic, in client px: x right, y up (so a client y is drawn at -y)
  const cam = new OrthographicCamera(0, 1, 0, -1, -2000, 2000)
  scene.add(new AmbientLight(0xffffff, AMBIENT))
  const sun = new DirectionalLight(0xfff0d8, SUN)
  sun.position.set(-0.2, 1.5, 0.75)
  scene.add(sun)

  /** A canvas-drawn texture, repeating. */
  const tex = (
    w: number,
    h: number,
    paint: (x: CanvasRenderingContext2D, w: number, h: number) => void,
  ): Texture => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const x = c.getContext('2d')
    if (x) paint(x, w, h)
    const t = new CanvasTexture(c)
    t.wrapS = RepeatWrapping
    t.wrapT = RepeatWrapping
    textures.push(t)
    return t
  }
  // the mock-up's seeded random, in the same order, so the textures look the same
  let seed = 9
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const wood = tex(256, 256, (x, w, h) => {
    x.fillStyle = '#4b2f1b'
    x.fillRect(0, 0, w, h)
    for (let i = 0; i < 260; i++) {
      x.fillStyle = `rgba(${15 + rnd() * 50},${8 + rnd() * 22},4,${0.08 + rnd() * 0.14})`
      x.fillRect(rnd() * w, 0, 1 + rnd() * 2, h)
    }
  })
  // the outside of the roll is the plain backing paper
  const backing = tex(512, 256, (x, w, h) => {
    x.fillStyle = '#c9b990'
    x.fillRect(0, 0, w, h)
    for (let i = 0; i < 500; i++) {
      x.fillStyle = `rgba(90,65,30,${rnd() * 0.07})`
      x.fillRect(rnd() * w, rnd() * h, 20 + rnd() * 90, 1)
    }
    x.fillStyle = 'rgba(70,45,15,.28)'
    x.fillRect(0, 0, w, 2)
  })
  // a soft shadow, clear at the top and darker at the bottom
  const shade = tex(8, 64, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, 'rgba(40,24,8,0)')
    g.addColorStop(1, 'rgba(40,24,8,.42)')
    x.fillStyle = g
    x.fillRect(0, 0, w, h)
  })

  /** A unit cylinder lying along x, in a group (the group turns about the axis, the mesh is scaled). */
  const cyl = (mat: Material, seg = 48): { group: Group; mesh: Mesh } => {
    const geometry = new CylinderGeometry(1, 1, 1, seg)
    geometries.push(geometry)
    const mesh = new Mesh(geometry, mat)
    mesh.rotation.z = Math.PI / 2
    const group = new Group()
    group.add(mesh)
    scene.add(group)
    return { group, mesh }
  }
  const woodMat = new MeshStandardMaterial({ map: wood, roughness: 0.42, metalness: 0.05 })
  const paperMat = new MeshStandardMaterial({ map: backing, roughness: 0.9 })
  materials.push(woodMat, paperMat)
  const roll = cyl(paperMat, 64)
  const knobL = cyl(woodMat)
  const knobR = cyl(woodMat)
  const capL = cyl(woodMat)
  const capR = cyl(woodMat)
  const rod = cyl(woodMat, 24)

  /** A flat shadow plane (the shade texture), drawn behind the wood. */
  const plane = (t: Texture, opacity: number): Mesh => {
    const geometry = new PlaneGeometry(1, 1)
    const material = new MeshBasicMaterial({
      map: t,
      transparent: true,
      opacity,
      depthWrite: false,
    })
    geometries.push(geometry)
    materials.push(material)
    const m = new Mesh(geometry, material)
    scene.add(m)
    return m
  }
  // where the paper meets the roll, and the roll's shadow on the wall below it
  const contact = plane(shade, 1)
  const drop = plane(shade, 0.8)

  const size = (c: { mesh: Mesh }, r: number, len: number) => c.mesh.scale.set(r, len, r)

  /** The size the renderer was last given (none yet). */
  let drawn = { width: 0, height: 0, ratio: 0 }
  let disposed = false
  /** The last frame drawn had nothing on the canvas (so it is clear and need not be drawn again). */
  let wasEmpty = false

  // a lost context is not restored: the CSS rod and roller take over (told once)
  let lostTold = false
  const onContextLost = () => {
    if (lostTold) return
    lostTold = true
    options.onLost?.()
  }
  canvas.addEventListener('webglcontextlost', onContextLost)

  return {
    draw({ mount: r, rod: rr, full, reveal }) {
      if (disposed) return
      // the canvas's own CSS box (on phones 100vh is the large viewport, the box is not)
      const vw = canvas.clientWidth
      const vh = canvas.clientHeight
      if (vw === 0 || vh === 0) return
      // resizing the drawing buffer clears it: only when the canvas box or the pixel ratio changed
      const pr = Math.min(2, window.devicePixelRatio || 1)
      const next = { width: vw, height: vh, ratio: pr }
      if (mustResize(drawn, next)) {
        if (pr !== drawn.ratio) renderer.setPixelRatio(pr)
        drawn = next
        renderer.setSize(vw, vh, false)
        cam.right = vw
        cam.bottom = -vh
        cam.updateProjectionMatrix()
      }

      // the roll: thick while much paper is still on it, turning as the paper comes off
      const { y, R } = rollAt(r.top, full, reveal)
      const cx = r.left + r.width / 2
      size(roll, R, r.width + 8)
      roll.group.position.set(cx, -y, 0)
      roll.group.rotation.x = reveal / 14
      // knobs at both ends of the roller, each with a cap
      const kr = Math.min(R - 1.5, 13)
      const kl = 34
      for (const [k, s] of [
        [knobL, -1],
        [knobR, 1],
      ] as const) {
        size(k, kr, kl)
        k.group.position.set(cx + s * (r.width / 2 + 4 + kl / 2), -y, 0)
      }
      for (const [k, s] of [
        [capL, -1],
        [capR, 1],
      ] as const) {
        size(k, kr + 3.5, 7)
        k.group.position.set(cx + s * (r.width / 2 + 4 + kl), -y, 0)
      }
      // the rod over the CSS rod's place
      size(rod, 6.5, rr.width + 22)
      rod.group.position.set(rr.left + rr.width / 2, -(rr.top + rr.height / 2), 0)
      // the shadows
      contact.scale.set(r.width, 26, 1)
      contact.position.set(cx, -(r.top + reveal - 13), -50)
      contact.visible = reveal > 30
      drop.scale.set(r.width + 70, -30, 1)
      drop.position.set(cx, -(y + R + 13), -60)

      // Skip drawing when nothing is near the canvas (most of the page, once it is open).
      const empty = !drawsOnCanvas({ mount: r, rod: rr, full, reveal }, vw, vh)
      // still empty: the canvas was cleared by the last frame, nothing to do
      if (empty && wasEmpty) return
      // just became empty: draw once more, which clears it
      wasEmpty = empty
      renderer.render(scene, cam)
    },
    dispose() {
      if (disposed) return
      disposed = true
      canvas.removeEventListener('webglcontextlost', onContextLost)
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      for (const t of textures) t.dispose()
      renderer.dispose()
      // give the context back at once (StrictMode and theme switches would otherwise pile them up)
      if (!context.isContextLost()) renderer.forceContextLoss()
    },
  }
}
