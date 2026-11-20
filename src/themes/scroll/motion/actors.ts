/* Drawing each kind of moving thing (actor) the painters left out of the still picture, one frame at
 a time. Port of the actor branches of the design mock-up's `draw`,
 without the rejected writing-in (born/delay/lim): every actor draws at full alpha. All numbers are
 the mock-up's. Coordinates are CSS px relative to the band's top-left corner. */

import type { Actor, BandScene, Sprite } from '../paint/types'
import { clamp, hash, wind } from './wind'

/** What one frame of one band knows: the clock, the band's box on screen and the pointer. */
export interface ActorFrame {
  /** Time (s); advances only while the painting moves. */
  t: number
  /** Drift distance: how far the wind has carried the clouds. */
  d: number
  /** Flow: how far the water has travelled. */
  f: number
  paused: boolean
  /** The band's size and its top and bottom on screen (client px). */
  W: number
  H: number
  top: number
  /** The viewport's height. */
  vh: number
  /** The mouse in band coordinates, or null when it is away or over another band. */
  ptr: { x: number; y: number } | null
}

/** The walker's place on the road, kept per band across frames: an index into road.C. */
export interface WalkerState {
  wi: number | null
}

type Of<K extends Actor['k']> = Extract<Actor, { k: K }>

/** Water pushed away from the pointer: an offset (dx, dy) and the strength 0..1. */
function ripple(fr: ActorFrame, px: number, py: number): [number, number, number] {
  const ptr = fr.ptr
  if (!ptr) return [0, 0, 0]
  const dx = px - ptr.x
  const dy = py - ptr.y
  const d = Math.hypot(dx, dy)
  if (d > 90 || d < 1) return [0, 0, 0]
  const k = Math.pow(1 - d / 90, 2)
  return [(dx / d) * k * 16, (dy / d) * k * 16, k]
}

const pick = (sprs: readonly Sprite[], i: number): Sprite | undefined => sprs[i % sprs.length]

/** Clouds: a bank drifts with the wind, wrapping within lo..hi (fading at the ends inside the peaks), with a little parallax, and parts away from the mouse. */
function drift(x: CanvasRenderingContext2D, a: Of<'drift'>, fr: ActorFrame): void {
  const span = a.hi - a.lo
  const px = a.lo + ((((a.x - a.lo + fr.d * a.sp) % span) + span) % span)
  const edge = clamp(Math.min(px - a.lo, a.hi - px) / 90, 0, 1)
  const ptr = fr.ptr
  let tg = 0
  if (ptr && ptr.x > px && ptr.x < px + a.w && ptr.y > a.y - 20 && ptr.y < a.y + a.h + 20) {
    tg = (px + a.w / 2 > ptr.x ? 1 : -1) * 30
  }
  const o = a.o ?? 0
  a.o = o + (tg - o) * 0.25
  x.globalAlpha = a.fade ? edge : 1
  const parallax = clamp((fr.vh / 2 - fr.top - a.y) * 0.07, -40, 40)
  x.drawImage(a.spr, px + a.o, a.y + parallax, a.w, a.h)
}

/** Pines and reeds: leaned by the wind (a gust reaches the ones further right later), with a small tremble. */
function sway(x: CanvasRenderingContext2D, a: Of<'sway'>, fr: ActorFrame): void {
  const t = fr.t
  const sh = ((wind(t, a.x) - 0.3) * 0.11 + Math.sin(t * 1.7 + a.x * 0.05) * 0.012) * (a.amp ?? 1)
  x.save()
  x.translate(a.x, a.y)
  x.transform(1, 0, -sh, 1, 0, 0)
  x.drawImage(a.spr, a.ox, a.oy, a.w, a.h)
  x.restore()
}

/** A stream or river: its characters travel along the course, bobbing, and shy away from the mouse. */
function flow(x: CanvasRenderingContext2D, a: Of<'flow'>, fr: ActorFrame): void {
  const t = fr.t
  const L = a.path.length
  for (let i = 0; i < a.n; i++) {
    const f = (((i / a.n + fr.f * 0.035) % 1) + 1) % 1
    const q = a.path[Math.min(L - 1, Math.floor(f * L))]
    const spr = pick(a.sprs, i)
    if (!q || !spr) continue
    const z = (a.z0 + (a.z1 - a.z0) * f) / a.zs
    const r = ripple(fr, q.x, q.y)
    let ang = q.ang
    if (ang > 1.57) ang -= Math.PI
    else if (ang < -1.57) ang += Math.PI
    x.globalAlpha = clamp(Math.sin(Math.PI * f) * 3.2, 0, 1) * (1 - r[2] * 0.3)
    x.save()
    x.translate(q.x + r[0], q.y + Math.sin(f * 37 + t * 2.2 + i) * 2.4 + r[1])
    x.rotate(ang * 0.8 + Math.sin(t * 1.3 + i * 2) * 0.05)
    x.drawImage(spr, (-a.sw * z) / 2, (-a.sh * z) / 2, a.sw * z, a.sh * z)
    x.restore()
  }
}

/** Japanese waves (波): each bobs in a small circle, the rows out of step, and shy away from the mouse. */
function bob(x: CanvasRenderingContext2D, a: Of<'bob'>, fr: ActorFrame): void {
  const ph = a.x / 70 + fr.t * 1.5 + a.row * 0.9
  const r = ripple(fr, a.x + a.w / 2, a.y + a.h / 2)
  x.drawImage(
    a.spr,
    a.x + Math.cos(ph) * a.amp * 0.8 + r[0],
    a.y + Math.sin(ph) * a.amp + r[1],
    a.w,
    a.h,
  )
}

/** Japanese lanterns (灯) at the stops: they flicker and swing a little in the wind. */
function flick(x: CanvasRenderingContext2D, a: Of<'flick'>, fr: ActorFrame): void {
  const t = fr.t
  x.globalAlpha = 0.8 + 0.2 * Math.sin(t * 9 + a.i * 2) * Math.sin(t * 2.3 + a.i)
  x.save()
  x.translate(a.x + a.w / 2, a.y + a.h * 0.2)
  x.rotate(Math.sin(t * 1.3 + a.i) * 0.1 * (0.4 + wind(t, a.x)))
  x.drawImage(a.spr, -a.w / 2, -a.h * 0.2, a.w, a.h)
  x.restore()
}

/** The skein of birds over the Projects band: crossing right to left, over and over. */
function flock(x: CanvasRenderingContext2D, a: Of<'flock'>, fr: ActorFrame, bird: Sprite): void {
  const { t, W } = fr
  const span = W + 620
  const hx = W + 310 - ((t * 42 + W * 0.5 + 310) % span)
  for (let i = 0; i < a.n; i++) {
    const side = i % 2 ? 1 : -1
    const rk = Math.ceil(i / 2)
    const px = hx + rk * 26 + hash(i + 4) * 10
    const py = a.y + side * rk * 9 + Math.sin(t * 1.1 + i * 1.9) * 5 + hash(i) * 6
    if (px < -20 || px > W + 20) continue
    x.globalAlpha = 0.78 * clamp(Math.min(px, W - px) / 70, 0, 1)
    x.save()
    x.translate(px, py)
    x.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(t * 8 + i * 1.7)))
    x.drawImage(bird, -12, -12, 24, 24)
    x.restore()
  }
}

/** Smoke (烟, 煙 in Japanese art) rising from the open house, bent over by the wind as it climbs. */
function smoke(x: CanvasRenderingContext2D, a: Of<'smoke'>, fr: ActorFrame): void {
  const t = fr.t
  for (let i = 0; i < 5; i++) {
    const spr = pick(a.sprs, i)
    if (!spr) continue
    const f = (t * 0.15 + i / 5) % 1
    const z = a.z * 1.5 * (0.6 + f * 1.1)
    x.globalAlpha = 0.55 * Math.sin(Math.PI * f)
    x.drawImage(
      spr,
      a.x + (wind(t - f * 2, a.x) - 0.2) * 80 * f * f + Math.sin(f * 9 + i) * 4 - z / 2,
      a.y - f * 84 - z / 2,
      z,
      z,
    )
  }
}

/**
 * The traveller (人): walks the hackathon path to the stop you have reached (the last one whose top
 * is above two thirds of the screen), or stands at the start of the path. Keeps its place in
 * `state`; while the painting is stilled it does not walk but stands at that stop.
 */
function walker(
  x: CanvasRenderingContext2D,
  a: Of<'walker'>,
  fr: ActorFrame,
  road: NonNullable<BandScene['road']>,
  band: HTMLElement,
  state: WalkerState,
): void {
  const { C, idx } = road
  if (C.length === 0) return
  let reach = -1
  band.querySelectorAll('.stop').forEach((el, i) => {
    if (el.getBoundingClientRect().top < fr.vh * 0.66) reach = i
  })
  const target = reach < 0 ? 0 : (idx[Math.min(reach, idx.length - 1)] ?? 0)
  const wi = state.wi ?? target
  // stilled: it stands at the stop reached, without walking there
  const gap = fr.paused ? 0 : target - wi
  const moving = Math.abs(gap) > 2
  if (!fr.paused) {
    const step = clamp(gap * 0.16, -22, 22)
    state.wi = moving ? wi + (Math.abs(step) < 1 ? Math.sign(gap) : step) : target
  } else {
    state.wi = target
  }
  const i0 = clamp(Math.round(state.wi), 0, C.length - 1)
  const q = C[i0]
  const q2 = C[clamp(i0 + (gap >= 0 ? 4 : -4), 0, C.length - 1)]
  if (!q || !q2) return
  const face = q2.x < q.x ? -1 : 1
  x.save()
  x.translate(q.x, q.y - 24 - (moving ? Math.abs(Math.sin(fr.t * 9)) * 3 : 0))
  x.scale(face, 1)
  x.rotate(moving ? 0.1 : 0)
  x.drawImage(a.spr, -22.5, -22.5, 45, 45)
  x.restore()
}

/**
 * Draw every actor of a band's scene within the visible slice v0..v1 (band y). Actors wholly
 * outside it are skipped, as in the mock-up.
 */
export function drawActors(
  x: CanvasRenderingContext2D,
  scene: BandScene,
  fr: ActorFrame,
  band: HTMLElement,
  walk: WalkerState,
  v0: number,
  v1: number,
): void {
  const out = (y: number, h: number) => y + h < v0 || y > v1
  for (const a of scene.actors) {
    x.globalAlpha = 1
    switch (a.k) {
      case 'drift':
        if (!out(a.y, a.h)) drift(x, a, fr)
        break
      case 'sway':
        if (!out(a.y + a.oy, a.h)) sway(x, a, fr)
        break
      case 'flow':
        flow(x, a, fr)
        break
      case 'bob':
        if (!out(a.y, a.h)) bob(x, a, fr)
        break
      case 'flick':
        if (!out(a.y, a.h)) flick(x, a, fr)
        break
      case 'flock':
        if (scene.kit) flock(x, a, fr, scene.kit.bird)
        break
      case 'smoke':
        smoke(x, a, fr)
        break
      case 'walker':
        if (scene.road) walker(x, a, fr, scene.road, band, walk)
        break
    }
  }
  x.globalAlpha = 1
}
