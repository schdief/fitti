# Posen zeichnen

Die App rendert Strichfiguren aus Gelenkkoordinaten. Du lieferst nur Zahlen, nie SVG.

## Koordinatensystem

- Zeichenfläche 0–100 in beiden Achsen.
- **y wächst nach unten.** y = 0 ist oben, y = 90 ist der Boden.
- x = 50 ist die Mitte. Bei `facing: "right"` schaut die Figur nach rechts, das Gesicht liegt
  also bei größeren x-Werten als der Rumpf.

## Gelenke

`head`, `neck`, `shoulderL`, `shoulderR`, `elbowL`, `elbowR`, `handL`, `handR`, `hip`,
`kneeL`, `kneeR`, `footL`, `footR`

Der Renderer verbindet: Kopf–Nacken, Nacken–Schultern, Schulter–Ellbogen–Hand,
Nacken–Hüfte, Hüfte–Knie–Fuß. Der Kopf wird als Kreis gezeichnet.

In der Seitenansicht liegen linke und rechte Gliedmaßen fast übereinander. Versetze die
linke Seite um 2 Einheiten, damit die Figur räumlich wirkt und die Linien nicht verschmelzen.

## Vorlagen

Übernimm eine Vorlage und verschiebe nur, was die Übung ausmacht.

### Stehend, Seitenansicht

```json
{
  "head": [50, 10], "neck": [50, 19],
  "shoulderR": [51, 23], "shoulderL": [49, 23],
  "elbowR": [52, 35], "elbowL": [50, 35],
  "handR": [53, 47], "handL": [51, 47],
  "hip": [50, 52],
  "kneeR": [51, 71], "kneeL": [49, 71],
  "footR": [51, 90], "footL": [49, 90]
}
```

### Stehend, Frontalansicht

```json
{
  "head": [50, 10], "neck": [50, 19],
  "shoulderR": [60, 24], "shoulderL": [40, 24],
  "elbowR": [64, 37], "elbowL": [36, 37],
  "handR": [66, 50], "handL": [34, 50],
  "hip": [50, 52],
  "kneeR": [56, 70], "kneeL": [44, 70],
  "footR": [56, 90], "footL": [44, 90]
}
```

### Liegestützposition, Seitenansicht

```json
{
  "head": [72, 55], "neck": [68, 58],
  "shoulderR": [63, 61], "shoulderL": [63, 63],
  "elbowR": [63, 75], "elbowL": [63, 77],
  "handR": [63, 89], "handL": [63, 90],
  "hip": [45, 68],
  "kneeR": [30, 77], "kneeL": [30, 79],
  "footR": [16, 89], "footL": [16, 90]
}
```

### Rückenlage, Seitenansicht

```json
{
  "head": [22, 83], "neck": [27, 84],
  "shoulderR": [33, 84], "shoulderL": [33, 86],
  "elbowR": [40, 86], "elbowL": [40, 88],
  "handR": [47, 88], "handL": [47, 90],
  "hip": [55, 84],
  "kneeR": [70, 72], "kneeL": [70, 74],
  "footR": [78, 89], "footL": [78, 90]
}
```

### Vorgebeugt, Seitenansicht

```json
{
  "head": [70, 34], "neck": [66, 37],
  "shoulderR": [61, 40], "shoulderL": [61, 42],
  "elbowR": [61, 55], "elbowL": [59, 52],
  "handR": [61, 70], "handL": [57, 62],
  "hip": [40, 46],
  "kneeR": [38, 68], "kneeL": [36, 68],
  "footR": [37, 90], "footL": [35, 90]
}
```

## Bewegung wählen

`start` ist die Ausgangsposition, `mid` der Umkehrpunkt. Die Endposition entspricht wieder
`start`, sie wird nicht angegeben.

| Übungstyp | start | mid |
| --- | --- | --- |
| Drücken | Gewicht nah am Körper | Arme gestreckt |
| Ziehen | Arm gestreckt | Hand am Rumpf |
| Kniebeuge | aufrecht | Hüfte tief und hinten |
| Hüftstreckung | Hüfte am Boden | Hüfte gestreckt oben |
| Halteübung | die Haltung | weglassen |

Zwischen `start` und `mid` sollen sich mindestens zwei Gelenke deutlich unterscheiden,
sonst ist der Unterschied auf dem Telefon nicht erkennbar. Als deutlich gilt eine
Verschiebung von mindestens 6 Einheiten.

## Requisiten

`props` enthält Gegenstände. Zwei Varianten:

- **Fest platziert**, mit `x`, `y`, `w`, `h` und optional `rot` – etwa
  `{ "type": "mat", "x": 10, "y": 89, "w": 78, "h": 3 }`.
- **An ein Gelenk gebunden**, mit `attachTo` – etwa `{ "type": "dumbbell", "attachTo": "handR" }`.
  Die Requisite folgt dem Gelenk automatisch in beiden Posen.

Eine Bodenlinie zeichnet der Renderer immer selbst, dafür braucht es keine Requisite.

## Prüfliste

- [ ] Alle 13 Gelenke in `start`
- [ ] `mid` enthält nur bewegte Gelenke
- [ ] Kein y-Wert größer als 90, außer die Übung findet bewusst tiefer statt
- [ ] Gliedmaßenlängen zwischen `start` und `mid` etwa gleich, Arme und Beine dehnen sich nicht
- [ ] `arrowJoint` zeigt auf ein Gelenk, das sich bewegt
- [ ] `id` gleich dem Dateinamen ohne `.json`
