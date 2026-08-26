# fitti

Progressive Web App für das Training auf dem iPhone: Trainingspläne aus einem JSON-Katalog wählen,
Sätze mit Timer und Sprachansagen abarbeiten, Ergebnisse im lokalen Logbuch behalten.

Live: https://schdief.github.io/fitti/

## Funktionsumfang (Ausbau)

- **Katalog** – Pläne als JSON, filterbar nach Dauer und Muskelgruppen
- **Training** – Start-/Mittelpositions-Grafiken, Satzerfassung, Pausentimer, Sprach-Cues,
  Spotify-Steuerung
- **Logbuch** – Liste und Kalender, lokale Speicherung, Vorschlagswerte aus der Historie,
  optionaler Export nach Apple Health über einen Kurzbefehl

## Entwicklung

```bash
npm install
npm run icons   # PNG-Icons aus assets/icon.svg erzeugen
npm run dev
```

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Dev-Server auf http://localhost:5173/fitti/ |
| `npm run build` | Typecheck und Produktionsbuild nach `dist/` |
| `npm run preview` | Produktionsbuild lokal testen (inkl. Service Worker) |
| `npm run typecheck` | nur Typprüfung |
| `npm run icons` | App-Icons neu rendern |

Der Service Worker ist im Dev-Modus deaktiviert. Zum Testen des Offline-Verhaltens `npm run build`
und `npm run preview` verwenden.

## Deployment

Push auf `main` startet den Workflow `.github/workflows/deploy.yml`, der baut und nach GitHub Pages
veröffentlicht. Einmalig nötig: in den Repo-Einstellungen unter **Pages** als Quelle
**GitHub Actions** wählen.

Der Basispfad `/fitti/` ist in `vite.config.ts` gesetzt und muss zum Repository-Namen passen.

## Struktur

```
assets/          Quell-SVG für die Icons
scripts/         Build-Hilfsskripte
src/app/         Routing und Layout
src/components/  gemeinsame UI-Bausteine
src/features/    catalog, logbook, settings
src/lib/         geteilte Typen und Helfer
```
