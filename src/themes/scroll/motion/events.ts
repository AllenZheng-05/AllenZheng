/* What happens now and then, one at a time (a few birds cross a sky, a boat crosses water, a fish
 jumps in the foreground stream), and the leaves that always drift down across the page. Port of
 tickEvents, drawEvent and leaves (from the design mock-up). */

import type { BandScene } from '../paint/types'
import { along, clamp, hash } from './wind'

type EventKind = 'birds' | 'boat' | 'fish'

interface MotionEvent {
  type: EventKind
  /** The band it happens in. */
  band: HTMLElement
  /** When it began, on the motion clock (s), and how long it lasts (s). */
  t0: number
  dur: number
  /** Its own random number: direction, size of the flock, where the fish jumps. */
  s: number
}

/** A band on screen and what its last paint left for the motion layer. */
export interface EventBand {
  el: HTMLElement
  scene: BandScene
}

export interface Events {
  /** Called on every frame that advances the clock: ends the current event, or starts the next one when it is due. */
  tick(now: number, t: number, bands: Iterable<EventBand>): void
  /** Draw the current event if it happens in this band. */
  draw(x: CanvasRenderingContext2D, band: HTMLElement, scene: BandScene, t: number): void
}

const DURATION: Readonly<Record<EventKind, number>> = { birds: 9, boat: 15, fish: 1.4 }

/** The first event comes 3.5 s after `start` (ms), then one every 5-11 s. */
export function createEvents(start: number, random: () => number = Math.random): Events {
  let ev: MotionEvent | null = null
  let next = start + 3500

  return {
    tick(now, t, bands) {
      if (ev) {
        if (t - ev.t0 > ev.dur) {
          ev = null
          next = now + 5000 + random() * 6000
        }
        return
      }
      if (now < next) return
      // choose among what is on screen: a sky for birds, water for a boat, the stream for a fish
      const opts: [EventKind, HTMLElement][] = []
      const vh = window.innerHeight
      const on = (top: number, y: number) => top + y > 30 && top + y < vh - 30
      for (const { el, scene } of bands) {
        if (!scene.kit) continue
        const top = el.getBoundingClientRect().top
        const { sky, water, pond } = scene
        if (sky && on(top, (sky.y0 + sky.y1) / 2)) opts.push(['birds', el])
        const w = water?.[water.length >> 1]
        if (w && on(top, w.y)) opts.push(['boat', el])
        const p = pond?.[pond.length >> 1]
        if (p && on(top, p.y)) opts.push(['fish', el])
      }
      if (!opts.length) {
        next = now + 1500
        return
      }
      const choice = opts[Math.floor(random() * opts.length)] ?? opts[0]
      if (!choice) return
      const [type, band] = choice
      ev = { type, band, t0: t, dur: DURATION[type], s: random() }
    },

    draw(x, band, scene, t) {
      const kit = scene.kit
      if (!ev || ev.band !== band || !kit) return
      const p = (t - ev.t0) / ev.dur
      const fade = clamp(Math.sin(Math.PI * clamp(p, 0, 1)) * 4, 0, 1)
      if (ev.type === 'birds') {
        // a few birds (鸟, 鳥 in Japanese art) cross the sky, beating their wings
        const k = scene.sky
        if (!k) return
        const dir = ev.s < 0.5 ? 1 : -1
        const n = 3 + Math.floor(ev.s * 3)
        const span = k.x1 - k.x0 + 60
        for (let i = 0; i < n; i++) {
          const px =
            (dir > 0 ? k.x0 - 30 + span * p : k.x1 + 30 - span * p) -
            dir * (i * 24 + hash(i + 9) * 12)
          const py =
            k.y0 + (k.y1 - k.y0) * (0.2 + 0.6 * hash(i * 3 + ev.s * 10)) + Math.sin(p * 7 + i) * 8
          if (px < k.x0 - 10 || px > k.x1 + 10) continue
          x.globalAlpha = 0.8 * fade
          x.save()
          x.translate(px, py)
          x.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(t * 9 + i * 1.7)))
          x.drawImage(kit.bird, -13, -13, 26, 26)
          x.restore()
        }
      } else if (ev.type === 'boat') {
        // a boat (舟) crosses the water, rocking
        const path = scene.water
        if (!path) return
        const q = along(path, ev.s < 0.5 ? p : 1 - p)
        x.globalAlpha = 0.9 * fade
        x.save()
        x.translate(q.x, q.y - 15 + Math.sin(t * 2) * 1.6)
        x.rotate(Math.sin(t * 1.6) * 0.05)
        x.drawImage(kit.boat, -21, -21, 42, 42)
        x.restore()
      } else {
        // a fish (鱼, 魚 in Japanese art) jumps out of the foreground stream and back in
        const pond = scene.pond
        if (!pond) return
        const q = along(pond, 0.2 + ev.s * 0.6)
        const dir = ev.s < 0.5 ? 1 : -1
        x.globalAlpha = 0.88 * clamp(Math.sin(Math.PI * p) * 5, 0, 1)
        x.save()
        x.translate(q.x + dir * (p - 0.5) * 54, q.y - Math.sin(Math.PI * p) * 38)
        x.rotate(dir * (p - 0.5) * 2.2)
        x.drawImage(kit.fish, -16.5, -16.5, 33, 33)
        x.restore()
      }
      x.globalAlpha = 1
    },
  }
}

/**
 * A few leaves (叶, 葉 in Japanese art) always drift down across the band, carried sideways by the
 * wind (d, the drift distance); the same in every season. Only those within v0..v1 are drawn.
 */
export function drawLeaves(
  x: CanvasRenderingContext2D,
  scene: BandScene,
  W: number,
  H: number,
  t: number,
  d: number,
  v0: number,
  v1: number,
): void {
  const fall = scene.kit?.fall
  if (!fall || fall.length === 0) return
  const n = clamp(Math.round((W * H) / (W > 700 ? 80000 : 110000)), 4, 16)
  for (let i = 0; i < n; i++) {
    const h1 = hash(i + 1)
    const h2 = hash(i * 7 + 3)
    const y = ((h1 * (H + 60) + t * 27 * (0.7 + h2 * 0.7)) % (H + 60)) - 30
    if (y < v0 - 20 || y > v1 + 20) continue
    const span = W + 40
    const px =
      ((((h2 * W + d * 9 * (0.6 + h1) + Math.sin(t * (0.6 + h1) + i) * 22) % span) + span) % span) -
      20
    const z = 20 + h1 * 8
    const spr = fall[i % fall.length]
    if (!spr) continue
    x.globalAlpha = 0.6 * (0.6 + h2 * 0.4)
    x.save()
    x.translate(px, y)
    x.rotate(t * (0.5 + h2) * (i % 2 ? 1 : -1) + i)
    x.drawImage(spr, -z / 2, -z / 2, z, z)
    x.restore()
  }
  x.globalAlpha = 1
}
