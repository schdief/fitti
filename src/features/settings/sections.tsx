import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  ActionButton,
  Card,
  ListRow,
  NumberStepper,
  SegmentedControl,
  StatusBadge,
  Toggle,
} from '@/components/ui'
import { clearSessions } from '@/features/logbook/db'
import type { WorkoutSession } from '@/features/logbook/db'
import { useSessions } from '@/features/logbook/useSessions'
import { useSettings } from '@/features/settings/settingsStore'
import {
  playCueElement,
  setAudioSessionType,
  speak,
  unlockAudio,
  WORKOUT_AUDIO_SESSION,
} from '@/lib/audio'
import { readTokens } from '@/lib/spotify/auth'
import { checkForUpdate, resetAppCache } from '@/lib/swUpdate'

export interface SettingsSectionDef {
  id: string
  title: string
  description?: string
  Component: ComponentType
}

function ConnectionsSection() {
  const { spotify, health } = useSettings((state) => state.connections)
  const navigate = useNavigate()
  const spotifyState = readTokens() ? 'connected' : spotify.state

  return (
    <Card>
      <ListRow
        label="Spotify"
        hint="Steuert die Wiedergabe während des Trainings. Benötigt Premium."
        control={<StatusBadge state={spotifyState} />}
        onClick={() => navigate('/lab')}
      />
      <ListRow
        label="Apple Health"
        hint={`Export über den Kurzbefehl „${health.shortcutName}“.`}
        control={<StatusBadge state={health.state} />}
        onClick={() => navigate('/lab')}
      />
    </Card>
  )
}

function SoundCheckRow() {
  const [phase, setPhase] = useState<'idle' | 'asking' | 'ok' | 'fail'>('idle')

  const run = async () => {
    await unlockAudio()
    setAudioSessionType(WORKOUT_AUDIO_SESSION)
    playCueElement()
    speak('Weitermachen')
    setPhase('asking')
  }

  const hint = {
    idle: 'Spielt einen Ton und eine Ansage ab, so wie im Training.',
    asking: 'Hast du beides gehört?',
    ok: 'Passt. Ansagen sind während des Trainings hörbar.',
    fail: 'Prüfe den Ruheschalter an der linken Geräteseite und die Lautstärke.',
  }[phase]

  return (
    <ListRow
      label="Ton-Check"
      hint={hint}
      control={
        phase === 'asking' ? (
          <span className="flex gap-2">
            <ActionButton variant="primary" onClick={() => setPhase('ok')}>
              Ja
            </ActionButton>
            <ActionButton variant="danger" onClick={() => setPhase('fail')}>
              Nein
            </ActionButton>
          </span>
        ) : (
          <ActionButton onClick={() => void run()}>Testen</ActionButton>
        )
      }
    />
  )
}

function TrainingSection() {
  const training = useSettings((state) => state.training)
  const setTraining = useSettings((state) => state.setTraining)

  return (
    <Card>
      <ListRow
        label="Sprachausgabe"
        hint="Kurze Ansagen wie „Pause“ und „Weitermachen“. Die Musik wird dabei nur kurz leiser."
        control={
          <Toggle
            label="Sprachausgabe"
            checked={training.voiceCues}
            onChange={(voiceCues) => setTraining({ voiceCues })}
          />
        }
      />
      <SoundCheckRow />
      <ListRow
        label="Vorwarnung"
        hint="Countdown vor Ende der Pause."
        control={
          <NumberStepper
            label="Vorwarnung in Sekunden"
            value={training.countdownFromSec}
            onChange={(value) => setTraining({ countdownFromSec: value ?? 0 })}
            step={5}
            min={0}
            max={30}
            suffix="s"
          />
        }
      />
      <ListRow
        label="Display wachhalten"
        hint="Pflicht: Bei gesperrtem Display friert iOS die App ein, Ansagen entfallen."
        control={
          <Toggle
            label="Display wachhalten"
            checked={training.keepScreenAwake}
            onChange={(keepScreenAwake) => setTraining({ keepScreenAwake })}
          />
        }
      />
      <ListRow
        label="Hantel-Schrittweite"
        control={
          <NumberStepper
            label="Schrittweite"
            value={training.weightStepKg}
            onChange={(value) => setTraining({ weightStepKg: value ?? 1 })}
            step={0.25}
            min={0.25}
            max={10}
            suffix="kg"
          />
        }
      />
    </Card>
  )
}

function ProfileSection() {
  const profile = useSettings((state) => state.profile)
  const setProfile = useSettings((state) => state.setProfile)

  return (
    <Card>
      <ListRow
        label="Körpergewicht"
        hint="Nur für die Kalorienschätzung beim Health-Export."
        control={
          <NumberStepper
            label="Körpergewicht"
            value={profile.bodyWeightKg}
            onChange={(bodyWeightKg) => setProfile({ bodyWeightKg })}
            step={0.5}
            min={30}
            max={250}
            suffix="kg"
            placeholder="nicht gesetzt"
          />
        }
      />
      <ListRow
        label="Einheit"
        control={
          <SegmentedControl
            label="Einheit"
            value={profile.unit}
            onChange={(unit) => setProfile({ unit })}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
          />
        }
      />
    </Card>
  )
}

function DataSection() {
  const { sessions, loaded, load, importSessions } = useSessions()
  const [status, setStatus] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ app: 'fitti', version: 1, sessions }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `fitti-logbuch-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setStatus(`${sessions.length} Trainings exportiert`)
  }

  const onFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as { sessions?: WorkoutSession[] }
      if (!Array.isArray(parsed.sessions)) throw new Error('Feld "sessions" fehlt')

      const added = await importSessions(parsed.sessions)
      setStatus(added === 0 ? 'Nichts Neues dabei' : `${added} Trainings importiert`)
    } catch (cause) {
      setStatus(`Import fehlgeschlagen: ${cause instanceof Error ? cause.message : 'Fehler'}`)
    }
  }

  const removeAll = async () => {
    if (!window.confirm(`${sessions.length} Trainings unwiderruflich löschen?`)) return
    await clearSessions()
    await load()
    setStatus('Logbuch geleert')
  }

  return (
    <Card>
      <ListRow
        label="Logbuch exportieren"
        hint={status ?? `${sessions.length} Trainings gespeichert`}
        control={<ActionButton onClick={exportJson}>Sichern</ActionButton>}
      />
      <ListRow
        label="Logbuch importieren"
        hint="Vorhandene Einträge bleiben erhalten."
        control={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void onFile(file)
                event.target.value = ''
              }}
            />
            <ActionButton onClick={() => fileRef.current?.click()}>Wählen</ActionButton>
          </>
        }
      />
      <ListRow
        label="Logbuch löschen"
        hint="Kann nicht rückgängig gemacht werden."
        control={
          <ActionButton variant="danger" onClick={() => void removeAll()} disabled={sessions.length === 0}>
            Löschen
          </ActionButton>
        }
      />
    </Card>
  )
}

function AboutSection() {
  const resetOnboarding = useSettings((state) => state.resetOnboarding)
  const navigate = useNavigate()
  const [updateHint, setUpdateHint] = useState('Version prüfen und laden')

  const runUpdateCheck = async () => {
    setUpdateHint('Suche läuft …')
    const result = await checkForUpdate()
    setUpdateHint(
      {
        pending: 'Neue Version gefunden, Banner erscheint unten.',
        current: 'Bereits aktuell.',
        failed: 'Prüfung fehlgeschlagen, offline?',
        unsupported: 'Kein Service Worker aktiv.',
      }[result],
    )
  }

  return (
    <Card>
      <ListRow
        label="Version"
        hint={`${__APP_VERSION__} · ${__BUILD_SHA__}`}
        control={<span className="text-xs text-fg-faint">fitti</span>}
      />
      <ListRow
        label="Diagnose"
        hint="Spikes für Audio, Timer, Health und Spotify"
        onClick={() => navigate('/lab')}
      />
      <ListRow
        label="Figuren-Labor"
        hint="Übungsposen prüfen und nachjustieren"
        onClick={() => navigate('/figure-lab')}
      />
      <ListRow label="Nach Update suchen" hint={updateHint} onClick={() => void runUpdateCheck()} />
      <ListRow
        label="App-Cache zurücksetzen"
        hint="Erzwingt die neueste Version. Logbuch und Einstellungen bleiben erhalten."
        onClick={() => void resetAppCache()}
      />
      <ListRow label="Einrichtung erneut starten" onClick={resetOnboarding} />
    </Card>
  )
}

export const settingsSections: SettingsSectionDef[] = [
  { id: 'connections', title: 'Verbindungen', Component: ConnectionsSection },
  { id: 'training', title: 'Training', Component: TrainingSection },
  { id: 'profile', title: 'Profil', Component: ProfileSection },
  { id: 'data', title: 'Daten', Component: DataSection },
  { id: 'about', title: 'Über', Component: AboutSection },
]
