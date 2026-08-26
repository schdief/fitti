import { Navigate, Route, Routes } from 'react-router-dom'

import { TabLayout } from '@/app/TabLayout'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import { CatalogPage } from '@/features/catalog/CatalogPage'
import { PlanDetailPage } from '@/features/catalog/PlanDetailPage'
import { FigureLabPage } from '@/features/figures/FigureLabPage'
import { LabPage } from '@/features/lab/LabPage'
import { LogbookPage } from '@/features/logbook/LogbookPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { WorkoutPage } from '@/features/workout/WorkoutPage'

export function App() {
  return (
    <>
      <Routes>
        <Route element={<TabLayout />}>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/logbook" element={<LogbookPage />} />
        </Route>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/plan/:planId" element={<PlanDetailPage />} />
        <Route path="/workout/:planId" element={<WorkoutPage />} />
        <Route path="/lab" element={<LabPage />} />
        <Route path="/figure-lab" element={<FigureLabPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UpdatePrompt />
    </>
  )
}
