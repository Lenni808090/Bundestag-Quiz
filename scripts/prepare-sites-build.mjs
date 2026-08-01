import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')

await mkdir(path.join(distDir, 'server'), { recursive: true })
await mkdir(path.join(distDir, '.openai'), { recursive: true })

await copyFile(
  path.join(rootDir, '.openai', 'hosting.json'),
  path.join(distDir, '.openai', 'hosting.json'),
)

await writeFile(
  path.join(distDir, 'server', 'index.js'),
  `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404) return response

    const url = new URL(request.url)
    url.pathname = '/index.html'
    return env.ASSETS.fetch(new Request(url, request))
  },
}
`,
)
