// Copies the latest resume from the sibling AllenZhengResume repo into public/.
// That repo only exists on my machine, so CI and Cloudflare skip this and use the committed copy.
import { copyFileSync, existsSync } from 'node:fs'

const source = new URL('../../AllenZhengResume/portfolio/Allen_Zheng_Resume.pdf', import.meta.url)
const target = new URL('../public/resume.pdf', import.meta.url)

if (existsSync(source)) {
  copyFileSync(source, target)
  console.log('Synced public/resume.pdf from AllenZhengResume.')
} else {
  console.log('AllenZhengResume not found; keeping the committed public/resume.pdf.')
}
