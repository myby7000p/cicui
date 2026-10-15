import { onBeforeUnmount, shallowRef } from 'vue'
import { asrAdapter } from '@/services/asr'
import type { Asr } from '@/services/types'

/** i18n keys; the caller translates them. */
export type DictationError = 'composer.micDenied' | 'composer.micMissing' | 'composer.micUnsupported'

/**
 * Microphone capture plus the ASR seam. A missing recogniser leaves the session running with no
 * text arriving; only microphone problems are surfaced to the user.
 */
export function useDictation() {
  const active = shallowRef(false)
  const seconds = shallowRef(0)
  const error = shallowRef<DictationError | ''>('')

  let stream: MediaStream | null = null
  let session: Asr.Session | null = null
  let ticker = 0

  async function start(onSegment: (segment: Asr.Segment) => void): Promise<boolean> {
    error.value = ''
    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = 'composer.micUnsupported'
      return false
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      error.value = 'composer.micDenied'
      return false
    }
    if (stream.getAudioTracks().length === 0) {
      releaseMicrophone()
      error.value = 'composer.micMissing'
      return false
    }

    session = null
    try {
      session = await asrAdapter.start(stream)
      session.onText(onSegment)
    } catch {
      // No recogniser wired in yet: the microphone still runs, nothing is transcribed.
      session = null
    }

    seconds.value = 0
    active.value = true
    ticker = window.setInterval(() => {
      seconds.value += 1
    }, 1000)
    return true
  }

  function releaseMicrophone(): void {
    stream?.getTracks().forEach((track) => track.stop())
    stream = null
  }

  function stop(): void {
    window.clearInterval(ticker)
    active.value = false
    seconds.value = 0
    session?.stop()
    session = null
    releaseMicrophone()
  }

  onBeforeUnmount(stop)

  return { active, seconds, error, start, stop }
}
