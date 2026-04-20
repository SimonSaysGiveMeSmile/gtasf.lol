# Founder Simulator — GTA 6

A browser-based open-world prototype built with React, TypeScript, Vite, and React Three Fiber. The project renders a stylized neon city with player movement, vehicles, NPCs, and an overlay HUD.

## Tech stack

- React 18
- TypeScript
- Vite
- Three.js / React Three Fiber
- Zustand
- React Three Cannon

## Local development

### Requirements

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Start the dev server

```bash
npm run dev
```

The app runs on the Vite dev server. In this project, the configured dev port is `4001`.

## Production build

### Build

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Vercel deployment

This app deploys to Vercel as a static Vite site.

### Expected Vercel settings

- Framework preset: `Vite`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

### Environment variables

No environment variables are currently required.

### Deploy with the Vercel CLI

```bash
vercel
```

If login is required in this Claude Code session, run:

```bash
! vercel login
```

For a production deploy:

```bash
vercel --prod
```

## GitHub publishing

After local verification, you can create a new public GitHub repository and push this project with the GitHub CLI.

If login is required in this Claude Code session, run:

```bash
! gh auth login
```

Typical flow:

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create <repo-name> --public --source=. --remote=origin --push
```

## Verification checklist

- `npm run lint`
- `npm run build`
- `npm run preview`
- Verify the app loads, the canvas renders, the HUD appears, and movement/interactions still work in the browser
