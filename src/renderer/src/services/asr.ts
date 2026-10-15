/**
 * Speech-to-text seam. The renderer captures the microphone and hands the live stream to an
 * adapter; the shapes are `Asr.*` in `services/types.ts`.
 */

import type { Asr } from './types'

/** Thrown by the placeholder adapter; the session then simply produces no text. */
export class AsrNotConfiguredError extends Error {}

/**
 * Merges recognizer output into the text the input box should show: settled sentences accumulate,
 * the trailing partial is replaced on every update, and anything typed before dictation is kept.
 */
export function createTranscript(prefix = '') {
  let committed = ''
  let interim = ''
  return {
    push(segment: Asr.Segment): string {
      if (segment.final) {
        committed += segment.text
        interim = ''
      } else {
        interim = segment.text
      }
      return `${prefix}${committed}${interim}`
    },
    reset(nextPrefix = ''): void {
      prefix = nextPrefix
      committed = ''
      interim = ''
    }
  }
}

/**
 * Replace with the real transport (WebSocket frames or chunked upload) once the endpoint exists:
 * feed `stream` in, emit partial results with `final: false` and settled sentences with `final: true`.
 */
export const asrAdapter: Asr.Adapter = {
  async start(): Promise<Asr.Session> {
    throw new AsrNotConfiguredError('asr-not-configured')
  }
}
