/**
 * Kanonische Wertelisten. Einzige Quelle für App, Validierung und den
 * Copilot-Skill. Neue Werte immer hier ergänzen, nie frei in JSON-Dateien.
 */

export const MUSCLES = [
  'chest',
  'upper-back',
  'lats',
  'lower-back',
  'traps',
  'shoulders',
  'rear-delts',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'glutes',
  'quads',
  'hamstrings',
  'adductors',
  'calves',
  'full-body',
  'cardio',
  'mobility',
] as const

export type Muscle = (typeof MUSCLES)[number]

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Brust',
  'upper-back': 'Oberer Rücken',
  lats: 'Latissimus',
  'lower-back': 'Unterer Rücken',
  traps: 'Nacken',
  shoulders: 'Schultern',
  'rear-delts': 'Hintere Schulter',
  biceps: 'Bizeps',
  triceps: 'Trizeps',
  forearms: 'Unterarme',
  abs: 'Bauch',
  obliques: 'Bauch seitlich',
  glutes: 'Gesäß',
  quads: 'Quadrizeps',
  hamstrings: 'Beinbeuger',
  adductors: 'Adduktoren',
  calves: 'Waden',
  'full-body': 'Ganzkörper',
  cardio: 'Ausdauer',
  mobility: 'Beweglichkeit',
}

/** Gröbere Bündel für die Filterleiste im Katalog. */
export const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Brust', muscles: ['chest'] },
  { id: 'back', label: 'Rücken', muscles: ['upper-back', 'lats', 'lower-back', 'traps'] },
  { id: 'shoulders', label: 'Schultern', muscles: ['shoulders', 'rear-delts'] },
  { id: 'arms', label: 'Arme', muscles: ['biceps', 'triceps', 'forearms'] },
  { id: 'core', label: 'Rumpf', muscles: ['abs', 'obliques'] },
  {
    id: 'legs',
    label: 'Beine',
    muscles: ['glutes', 'quads', 'hamstrings', 'adductors', 'calves'],
  },
  { id: 'general', label: 'Ganzkörper', muscles: ['full-body', 'cardio', 'mobility'] },
] as const satisfies readonly { id: string; label: string; muscles: readonly Muscle[] }[]

export type MuscleGroupId = (typeof MUSCLE_GROUPS)[number]['id']

/**
 * Umgangssprachliche Begriffe für die Volltextsuche. Der Katalog soll auch
 * „Po“ oder „Sixpack“ finden, nicht nur die offizielle Bezeichnung.
 */
export const MUSCLE_SEARCH_TERMS: Record<Muscle, string[]> = {
  chest: ['Brust', 'Brustmuskel', 'Push', 'Drücken'],
  'upper-back': ['Rücken', 'Oberer Rücken', 'Rudern', 'Pull', 'Ziehen'],
  lats: ['Rücken', 'Latissimus', 'Lat', 'Klimmzug', 'Pull'],
  'lower-back': ['Rücken', 'Unterer Rücken', 'Kreuz', 'Rückenstrecker'],
  traps: ['Nacken', 'Trapez', 'Schultern'],
  shoulders: ['Schulter', 'Schultern', 'Delta', 'Deltamuskel'],
  'rear-delts': ['Schulter', 'Hintere Schulter', 'Rücken'],
  biceps: ['Bizeps', 'Arme', 'Oberarm'],
  triceps: ['Trizeps', 'Arme', 'Oberarm'],
  forearms: ['Unterarm', 'Unterarme', 'Griffkraft', 'Arme'],
  abs: ['Bauch', 'Bauchmuskeln', 'Core', 'Rumpf', 'Sixpack'],
  obliques: ['Bauch', 'Seitlich', 'Core', 'Rumpf', 'Taille'],
  glutes: ['Gesäß', 'Po', 'Popo', 'Hintern', 'Butt', 'Hüfte'],
  quads: ['Quadrizeps', 'Oberschenkel', 'Beine', 'Vorderseite'],
  hamstrings: ['Beinbeuger', 'Oberschenkel', 'Beine', 'Rückseite'],
  adductors: ['Adduktoren', 'Innenschenkel', 'Beine'],
  calves: ['Waden', 'Wade', 'Beine'],
  'full-body': ['Ganzkörper', 'Komplett', 'Allround'],
  cardio: ['Ausdauer', 'Kondition', 'Cardio', 'Puls'],
  mobility: ['Beweglichkeit', 'Mobility', 'Dehnen', 'Stretching', 'Mobilisation'],
}

export const EQUIPMENT = [
  'none',
  'dumbbells',
  'barbell',
  'plates',
  'kettlebell',
  'bench',
  'pullup-bar',
  'resistance-band',
  'cable-machine',
  'machine',
  'mat',
  'box',
  'medicine-ball',
  'jump-rope',
  'foam-roller',
  'trx',
  'wall',
  'chair',
] as const

export type Equipment = (typeof EQUIPMENT)[number]

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  none: 'Ohne Geräte',
  dumbbells: 'Kurzhanteln',
  barbell: 'Langhantel',
  plates: 'Hantelscheiben',
  kettlebell: 'Kettlebell',
  bench: 'Bank',
  'pullup-bar': 'Klimmzugstange',
  'resistance-band': 'Widerstandsband',
  'cable-machine': 'Kabelzug',
  machine: 'Maschine',
  mat: 'Matte',
  box: 'Box/Stufe',
  'medicine-ball': 'Medizinball',
  'jump-rope': 'Springseil',
  'foam-roller': 'Faszienrolle',
  trx: 'Schlingentrainer',
  wall: 'Wand',
  chair: 'Stuhl',
}

export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export type PlanLevel = (typeof LEVELS)[number]

export const LEVEL_LABELS: Record<PlanLevel, string> = {
  beginner: 'Einsteiger',
  intermediate: 'Fortgeschritten',
  advanced: 'Erfahren',
}

export const BLOCK_TYPES = ['warmup', 'main', 'cooldown'] as const
export type BlockType = (typeof BLOCK_TYPES)[number]

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  warmup: 'Aufwärmen',
  main: 'Hauptteil',
  cooldown: 'Abwärmen',
}

/** `reps` zählt Wiederholungen, `time` gibt eine Haltedauer vor. */
export const EXERCISE_MODES = ['reps', 'time'] as const
export type ExerciseMode = (typeof EXERCISE_MODES)[number]

export const JOINTS = [
  'head',
  'neck',
  'shoulderL',
  'shoulderR',
  'elbowL',
  'elbowR',
  'handL',
  'handR',
  'hip',
  'kneeL',
  'kneeR',
  'footL',
  'footR',
] as const

export type Joint = (typeof JOINTS)[number]

export const FIGURE_VIEWS = ['side', 'front', 'back', 'three-quarter'] as const
export type FigureView = (typeof FIGURE_VIEWS)[number]

export const PROP_TYPES = [
  'bench',
  'mat',
  'box',
  'chair',
  'wall',
  'ground',
  'dumbbell',
  'barbell',
  'kettlebell',
  'band',
  'pullup-bar',
  'cable',
  'plate',
  'ball',
] as const

export type PropType = (typeof PROP_TYPES)[number]

/** Zeichenfläche der Figuren: 0–100 in beiden Achsen, y zeigt nach unten. */
export const FIGURE_CANVAS = 100
export const FIGURE_GROUND_Y = 90
