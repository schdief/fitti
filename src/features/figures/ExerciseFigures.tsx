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

  // In der großen Darstellung begrenzt die Breite die Höhe. Bei nur einer Figur
  // würde eine volle Breite das Quadrat so hoch machen, dass der Trainingsbildschirm
  // scrollen müsste – deshalb die engere Obergrenze.
  const frame =
    size === 'lg'
      ? `mx-auto flex w-full gap-2 ${hasMid ? 'max-w-[min(100%,52dvh)]' : 'max-w-[min(50%,24dvh)]'}`
      : 'flex shrink-0 gap-1'

  return (
    <div className={frame}>
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
