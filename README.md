# Speech Tool

Speech Tool is een webapplicatie voor hoogwaardige spraakaudio, gesprekken met meerdere stemmen en transcriptie van audio- en videobestanden.

## Functionaliteiten

- Spraak genereren voor één spreker met instelbare persona, emotie en tempo.
- Dialogen samenstellen met meerdere sprekers en afzonderlijke spreekinstellingen.
- Meerdere opdrachten verzamelen in een batch en gezamenlijk uitvoeren.
- Audio- of videobestanden uploaden voor transcriptie.
- Audio opnemen via de microfoon en de opname laten transcriberen.
- Eigen stempersona’s aanmaken, bewerken en lokaal bewaren.
- Dialogen als scènes opslaan en later opnieuw laden.
- Gegenereerde audio afspelen, pauzeren, downloaden en visueel volgen met een waveform en visualizer.
- Een interactieve, geanimeerde achtergrond die terugvalt op CSS-animaties wanneer Paint Worklet niet beschikbaar is.

## Technologie

- React 19
- TypeScript
- Vite
- Google GenAI SDK
- Lucide React
- Web Audio API en MediaRecorder API
- Tailwind CSS via de CDN in `index.html`

## Lokaal uitvoeren

**Vereiste:** Node.js

1. Installeer de dependencies:

   ```bash
   npm install
   ```

2. Configureer de lokale API-instellingen volgens de omgeving waarin je de app draait. Bewaar lokale waarden uitsluitend in een genegeerd `.env.local`-bestand.

3. Start de ontwikkelserver:

   ```bash
   npm run dev
   ```

4. Open de URL die Vite toont, standaard `http://localhost:3000`.

## Scripts

| Script | Omschrijving |
| --- | --- |
| `npm run dev` | Start de Vite-ontwikkelserver. |
| `npm run build` | Bouwt een productieversie in `dist/`. |
| `npm run preview` | Serveert de productie-build lokaal voor controle. |

## Projectstructuur

```text
.
├── components/             # Bedieningspaneel, header, waveform en visualizer
├── public/                 # Statische afbeeldingen en favicon
├── services/               # Integratie voor spraakgeneratie en transcriptie
├── utils/                  # Audio-decodering, analyse en WAV-export
├── App.tsx                 # Hoofdscherm en audio-afspeelstroom
├── index.tsx               # React-entrypoint
├── styles.css              # Aanvullende applicatiestijlen
├── types.ts                # Gedeelde TypeScript-types
├── metadata.json           # Projectmetadata en benodigde browserrechten
├── package.json            # Dependencies en scripts
└── vite.config.ts          # Vite-configuratie
```
