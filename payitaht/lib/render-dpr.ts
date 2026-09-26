/**
 * Şehir tuvalinin piksel oranı. Normalde cihaz pikseli (en çok 2); GPU'suz,
 * yazılımla çizen ortamlarda (SwiftShader, llvmpipe) 1'e iner: dört kat az
 * piksel, yazılımla çizimde saniyede birkaç kareyle sıkışmayı önler.
 */
let cached: number | null = null

export function canvasDpr(): number {
  if (cached !== null) return cached
  if (typeof window === 'undefined') return 1
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  cached = dpr > 1 && softwareGl() ? 1 : dpr
  return cached
}

function softwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    if (!gl) return true
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name)
  } catch {
    return false
  }
}
