import { Navigate, Route, Routes } from 'react-router-dom'

import { TabLayout } from '@/app/TabLayout'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { PlanDetailPage } from '@/features/catalog/PlanDetailPage'
import { HealthCallbackHandler } from '@/features/health/HealthCallbackHandler'
import { HealthSetupPage } from '@/features/health/HealthSetupPage'
import { FigureLabPage } from '@/features/figures/FigureLabPage'
import { LabPage } from '@/features/lab/LabPage'
import { LogbookPage } from '@/features/logbook/LogbookPage'
import { SessionDetailPage } from '@/features/logbook/SessionDetailPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { WorkoutPage } from '@/features/workout/WorkoutPage'

export function App() {
  return (
    <>
      <HealthCallbackHandler />
      <Routes>
        <Route element={<TabLayout />}>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/logbook" element={<LogbookPage />} />
        </Route>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/health-setup" element={<HealthSetupPage />} />
        <Route path="/plan/:planId" element={<PlanDetailPage />} />
        <Route path="/logbook/:sessionId" element={<SessionDetailPage />} />
        <Route path="/workout/:planId" element={<WorkoutPage />} />
        <Route path="/lab" element={<LabPage />} />
        <Route path="/figure-lab" element={<FigureLabPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UpdatePrompt />
    </>
  )
}
