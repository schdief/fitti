// iOS 16.4+ / Safari: navigator.audioSession ist noch nicht in der TS-DOM-Lib.
type AudioSessionType =
  | 'auto'
  | 'playback'
  | 'transient'
  | 'transient-solo'
  | 'ambient'
  | 'play-and-record'

interface AudioSession {
  type: AudioSessionType
}

interface Navigator {
  readonly audioSession?: AudioSession
}
