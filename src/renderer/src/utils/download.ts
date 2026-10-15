/**
 * Turn a base64 payload from the API into a file the user keeps. The renderer has no `fs` access, so
 * this goes through the browser's own download path, which Electron routes to the save dialog.
 */
export function downloadBase64(input: { base64: string; contentType: string; fileName: string }): void {
  const binary = window.atob(input.base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  const url = URL.createObjectURL(new Blob([bytes], { type: input.contentType }))
  const link = document.createElement('a')
  link.href = url
  link.download = input.fileName
  link.click()
  // Revoking in the same tick can cancel the hand-off, so the object URL outlives the click briefly.
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}
