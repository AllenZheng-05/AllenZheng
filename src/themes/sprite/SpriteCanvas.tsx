/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from 'react'

/**
 * Sprite Studio Drift hero scene: five chunky interest sprites — a Poké Ball,
 * piano keys, a chess knight, a climbing hold and a running shoe — drifting,
 * rotating and bumping off each other and the hero edges. Aria-hidden and
 * purely decorative; all content lives in the DOM.
 */
export default function SpriteCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let disposed = false
    let cleanup = () => {}

    ;(async () => {
      try {
        const THREE: any = await import('../../fitts/three/three.module.min.js')
        if (disposed || !canvas.isConnected) return

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
        if (!renderer) throw new Error('no webgl')
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
        camera.position.set(0, 0, 11)

        scene.add(new THREE.AmbientLight(0xffffff, 1.5))
        const key = new THREE.DirectionalLight(0xffffff, 2.4)
        key.position.set(4, 6, 6)
        scene.add(key)
        const fill = new THREE.DirectionalLight(0xbfe3ff, 1.1)
        fill.position.set(-5, -2, 4)
        scene.add(fill)

        const mat = (color: number, roughness = 0.38) =>
          new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.08 })
        const BLUE = 0x2563eb
        const ORANGE = 0xfe895c
        const DARK = 0x011921
        const WHITE = 0xf8fdfe

        // --- Pokémon-inspired ball: orange cap, white lower half, dark button
        function makeBall() {
          const g = new THREE.Group()
          const top = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), mat(ORANGE, 0.3))
          const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(WHITE, 0.3))
          const band = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.055, 12, 40), mat(DARK))
          band.rotation.x = Math.PI / 2
          const button = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 24), mat(WHITE))
          button.rotation.x = Math.PI / 2
          button.position.z = 0.68
          g.add(top, bottom, band, button)
          return g
        }
        // --- Piano: white keys, raised black keys
        function makePiano() {
          const g = new THREE.Group()
          const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.05, 0.22), mat(WHITE, 0.32))
          g.add(base)
          for (let i = 0; i < 7; i++) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.0, 0.03), mat(0xc3d4da))
            line.position.set(-0.72 + i * 0.24, 0, 0.13)
            g.add(line)
          }
          ;[-0.6, -0.36, 0.12, 0.36, 0.6].forEach((x) => {
            const k = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.58, 0.14), mat(DARK, 0.25))
            k.position.set(x, 0.22, 0.18)
            g.add(k)
          })
          g.rotation.z = -0.18
          return g
        }
        // --- Chess knight: dark-blue profile built from chunky primitives
        function makeKnight() {
          const g = new THREE.Group()
          const m = mat(BLUE, 0.28)
          const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.28, 28), m)
          base.position.y = -0.72
          const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.22, 28), m)
          collar.position.y = -0.48
          const neck = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.95, 0.5), m)
          neck.position.set(0.04, 0.05, 0)
          neck.rotation.z = 0.22
          const head = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.42, 0.46), m)
          head.position.set(-0.18, 0.58, 0)
          head.rotation.z = -0.28
          const snout = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.4), m)
          snout.position.set(-0.58, 0.38, 0)
          snout.rotation.z = -0.5
          const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 4), m)
          ear.position.set(0.28, 0.82, 0)
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), mat(ORANGE))
          eye.position.set(-0.34, 0.62, 0.25)
          g.add(base, collar, neck, head, snout, ear, eye)
          return g
        }
        // --- Climbing hold: chunky orange blob with a bolt dimple
        function makeHold() {
          const g = new THREE.Group()
          const hold = new THREE.Mesh(new THREE.IcosahedronGeometry(0.78, 1), mat(ORANGE, 0.55))
          hold.scale.set(1.15, 0.92, 0.62)
          const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 20), mat(DARK))
          bolt.rotation.x = Math.PI / 2
          bolt.position.z = 0.48
          g.add(hold, bolt)
          return g
        }
        // --- Running shoe: orange upper on a white sole, blue laces
        function makeShoe() {
          const g = new THREE.Group()
          const sole = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.26, 0.62), mat(WHITE, 0.35))
          sole.position.y = -0.38
          const upper = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.55, 0.55), mat(ORANGE, 0.45))
          upper.position.set(-0.05, -0.02, 0)
          const toe = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), mat(ORANGE, 0.45))
          toe.scale.set(1.3, 0.75, 0.85)
          toe.position.set(0.82, -0.14, 0)
          const heel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.72, 0.56), mat(ORANGE, 0.45))
          heel.position.set(-0.72, 0.06, 0)
          g.add(sole, upper, toe, heel)
          for (let i = 0; i < 3; i++) {
            const lace = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.5), mat(BLUE))
            lace.position.set(0.18 + i * 0.24, 0.28, 0)
            lace.rotation.z = 0.25
            g.add(lace)
          }
          g.rotation.z = 0.12
          return g
        }

        const makers = [makeBall, makePiano, makeKnight, makeHold, makeShoe]
        const starts = [
          [-4.2, 1.35],
          [-2.1, -1.5],
          [0.1, 1.55],
          [2.3, -1.45],
          [4.3, 1.3],
        ]
        const sprites = makers.map((make, i) => {
          const group = make()
          group.position.set(starts[i][0], starts[i][1], (i % 2) * 0.4 - 0.2)
          scene.add(group)
          return {
            group,
            vx: (i % 2 === 0 ? 1 : -1) * (0.35 + i * 0.05),
            vy: (i % 3 === 0 ? -1 : 1) * (0.26 + i * 0.03),
            radius: 0.95,
            spin: 0.15 + i * 0.05,
            wobble: i * 1.7,
          }
        })

        let width = 1
        let height = 1
        let boundX = 5
        let boundY = 2.6
        const resize = () => {
          const rect = canvas.getBoundingClientRect()
          width = Math.max(1, rect.width)
          height = Math.max(1, rect.height)
          renderer.setSize(width, height, false)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          const visibleH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z
          boundY = Math.max(1.5, visibleH / 2 - 0.9)
          boundX = Math.max(2.2, (visibleH * camera.aspect) / 2 - 1)
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)

        const pointer = { x: 999, y: 999, active: false }
        const onPointer = (e: PointerEvent) => {
          const rect = canvas.getBoundingClientRect()
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
          pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
          pointer.active = true
        }
        window.addEventListener('pointermove', onPointer, { passive: true })

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        let running = true
        let raf = 0
        const clock = new THREE.Clock()

        const frame = () => {
          const dt = Math.min(clock.getDelta(), 0.033)
          const t = clock.elapsedTime
          for (const s of sprites) {
            const p = s.group.position
            if (pointer.active) {
              const px = pointer.x * boundX
              const py = pointer.y * boundY
              const dx = p.x - px
              const dy = p.y - py
              const d2 = dx * dx + dy * dy
              if (d2 < 5.5 && d2 > 0.001) {
                const f = (0.55 * dt) / Math.sqrt(d2)
                s.vx += dx * f
                s.vy += dy * f
              }
            }
            // gentle speed cap so bumps stay friendly
            const speed = Math.hypot(s.vx, s.vy)
            const max = 0.85
            if (speed > max) {
              s.vx = (s.vx / speed) * max
              s.vy = (s.vy / speed) * max
            }
            p.x += s.vx * dt
            p.y += s.vy * dt
            if (p.x > boundX) { p.x = boundX; s.vx = -Math.abs(s.vx) }
            if (p.x < -boundX) { p.x = -boundX; s.vx = Math.abs(s.vx) }
            if (p.y > boundY) { p.y = boundY; s.vy = -Math.abs(s.vy) }
            if (p.y < -boundY) { p.y = -boundY; s.vy = Math.abs(s.vy) }
            s.group.rotation.y += s.spin * dt
            s.group.rotation.z = Math.sin(t * 0.9 + s.wobble) * 0.12
          }
          // bump: simple elastic separation between sprites
          for (let i = 0; i < sprites.length; i++) {
            for (let j = i + 1; j < sprites.length; j++) {
              const a = sprites[i]
              const b = sprites[j]
              const dx = b.group.position.x - a.group.position.x
              const dy = b.group.position.y - a.group.position.y
              const dist = Math.hypot(dx, dy)
              const min = a.radius + b.radius
              if (dist > 0.001 && dist < min) {
                const nx = dx / dist
                const ny = dy / dist
                const push = (min - dist) / 2
                a.group.position.x -= nx * push
                a.group.position.y -= ny * push
                b.group.position.x += nx * push
                b.group.position.y += ny * push
                const rvx = b.vx - a.vx
                const rvy = b.vy - a.vy
                const rel = rvx * nx + rvy * ny
                if (rel < 0) {
                  a.vx += rel * nx; a.vy += rel * ny
                  b.vx -= rel * nx; b.vy -= rel * ny
                }
              }
            }
          }
          renderer.render(scene, camera)
        }

        const loop = () => {
          if (!running || disposed) return
          frame()
          raf = requestAnimationFrame(loop)
        }
        const io = new IntersectionObserver(
          ([entry]) => {
            const was = running
            running = entry.isIntersecting && !document.hidden
            if (running && !was && !reduced) loop()
            else if (!running) cancelAnimationFrame(raf)
          },
          { threshold: 0.02 },
        )
        io.observe(canvas)
        const onVis = () => {
          if (document.hidden) { running = false; cancelAnimationFrame(raf) }
        }
        document.addEventListener('visibilitychange', onVis)

        if (reduced) frame()
        else loop()

        cleanup = () => {
          cancelAnimationFrame(raf)
          io.disconnect()
          ro.disconnect()
          document.removeEventListener('visibilitychange', onVis)
          window.removeEventListener('pointermove', onPointer)
          renderer.dispose()
        }
        if (disposed) cleanup()
      } catch {
        canvas.style.display = 'none'
        canvas.parentElement?.classList.add('sd-no-webgl')
      }
    })()

    return () => {
      disposed = true
      cleanup()
    }
  }, [])

  return <canvas ref={ref} className="sd-canvas" aria-hidden="true" data-testid="sprite-canvas" />
}
