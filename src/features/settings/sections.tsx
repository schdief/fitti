import type { ComponentType } from 'react'

import { Card, ListRow, NumberStepper, SegmentedControl, StatusBadge, Toggle } from '@/components/ui'
import { useSettings } from '@/features/settings/settingsStore'

export interface SettingsSectionDef {
  id: string
  title: string
  description?: string
  Component: ComponentType
}

function ConnectionsSection() {
  const { spotify, health } = useSettings((state) => state.connections)

  return (
    <Card>
      <ListRow
        label="Spotify"
        hint="Steuert die Wiedergabe während des Trainings. Benötigt Premium."
        control={<StatusBadge state={spotify.state} />}
      />
      <ListRow
        label="Apple Health"
        hint={`Export über den Kurzbefehl „${health.shortcutName}“.`}
        control={<StatusBadge state={health.state} />}
      />
      <ListRow
        label="Einrichtung"
        hint="Verbinden und Testen folgt in den nächsten Ausbaustufen."
        control={<span className="text-xs text-fg-faint">bald</span>}
      />
    </Card>
  )
}

function TrainingSection() {
  const training = useSettings((state) => state.training)
  const setTraining = useSettings((state) => state.setTraining)

  return (
    <Card>
      <ListRow
        label="Sprachausgabe"
        hint="Kurze Ansagen wie „Pause“ und „Weitermachen“."
        control={
          <Toggle
            label="Sprachausgabe"
            checked={training.voiceCues}
            onChange={(voiceCues) => setTraining({ voiceCues })}
          />
        }
      />
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
        hint="Verhindert das Sperren während des Trainings."
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
  return (
    <Card>
      <ListRow
        label="Logbuch exportieren"
        hint="Noch keine Daten vorhanden."
        control={<span className="text-xs text-fg-faint">bald</span>}
      />
    </Card>
  )
}

function AboutSection() {
  const resetOnboarding = useSettings((state) => state.resetOnboarding)

  const checkForUpdate = () => {
    void navigator.serviceWorker?.getRegistration().then((registration) => registration?.update())
  }

  return (
    <Card>
      <ListRow
        label="Version"
        hint={`${__APP_VERSION__} · ${__BUILD_SHA__}`}
        control={<span className="text-xs text-fg-faint">fitti</span>}
      />
      <ListRow label="Nach Update suchen" onClick={checkForUpdate} />
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
