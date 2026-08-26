import { useSettings } from '@/features/settings/settingsStore'
import {
  playCueElement,
  setAudioSessionType,
  speak,
  unlockAudio,
  WORKOUT_AUDIO_SESSION,
} from '@/lib/audio'

/**
 * Muss aus einer Nutzergeste heraus laufen, sonst bleibt die Audioausgabe auf
 * iOS gesperrt. Deshalb startet jedes Training mit einem Tippen.
 */
export async function primeWorkoutAudio(): Promise<void> {
  await unlockAudio()
  setAudioSessionType(WORKOUT_AUDIO_SESSION)
}

export function cue(text: string): void {
  const { voiceCues, voiceVolume } = useSettings.getState().training
  if (!voiceCues) {
    playCueElement()
    return
  }

  const spoken = speak(text, { volume: voiceVolume, lang: 'de-DE' })
  if (!spoken) playCueElement()
}

export function signal(): void {
  playCueElement()
}
