import { FigureView } from '@/features/figures/FigureView'
import { useFigure } from '@/features/figures/useFigure'

/**
 * Ausgangs- und Mittelposition nebeneinander. Bei Halteübungen gibt es nur ein
 * Bild, dann füllt es die volle Breite.
 */
export function ExerciseFigures({
  exerciseId,
  size = 'sm',
}: {
  exerciseId: string
  size?: 'sm' | 'lg'
}) {
  const { figure, loading } = useFigure(exerciseId)
  const tile = size === 'lg' ? 'w-full' : 'size-12'

  if (loading) {
    return <div className={`${tile} shrink-0 animate-pulse rounded-lg bg-surface-hi`} />
  }

  if (!figure) {
    return (
      <div
        className={`${tile} flex shrink-0 items-center justify-center rounded-lg bg-surface-hi text-xs text-fg-faint`}
        title={`Keine Grafik für ${exerciseId}`}
      >
        ?
      </div>
    )
  }

  const hasMid = figure.poses.mid !== undefined

  return (
    <div className={`flex shrink-0 gap-1 ${size === 'lg' ? 'w-full' : ''}`}>
      <FigureView
        figure={figure}
        pose="start"
        showArrow
        className={`${tile} rounded-lg bg-surface-hi`}
      />
      {hasMid ? (
        <FigureView figure={figure} pose="mid" className={`${tile} rounded-lg bg-surface-hi`} />
      ) : null}
    </div>
  )
}
