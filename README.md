# Gamura Studio

Mobile-first vector design studio and UI wireframing workspace built with React, TypeScript, Tailwind CSS, and Vite.

## Key Features

- **Infinite Vector Canvas**: Pinch-to-zoom, two-finger pan, space+drag panning, interactive multi-select lasso marquee, and 60fps pointer dragging.
- **Smart Snapping & Alignment**: Dynamic edge/center alignment guides, equal-spacing detection, Smart Align HUD, and automatic Snap to Nearest Artboard for grouped elements.
- **Rich Element Styling**: Rectangles, ovals (with solid, linear, and radial gradients), smoothed vector pen paths, typography controls (font weight, letter spacing, alignment), continuous opacity, visual 360° rotation dial, and drop shadow intensity controls.
- **Smart Color Palette & Tools**: Dominant color extraction from uploaded images, Complementary Palette generator, QR code generator, 50+ ready-to-edit design templates, interactive drag-to-reorder Layers outline, and hourly Version History snapshots persisted locally.
- **High-Resolution Export**: Export artboards directly to **HTML**, **PNG (2x Retina)**, or vector-preserving **PDF**.

## Local Development

```bash
npm install
npm run dev
```

Runs at `http://localhost:3000`.

### Scripts

- `npm run dev` — Start development server on port 3000
- `npm run lint` — Run TypeScript type checking (`tsc --noEmit`)
- `npm run build` — Build optimized production static bundle into `dist/`
- `npm run preview` — Preview production build locally

## Publishing to GitHub & Vercel

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Prepare Gamura Studio for production"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. **Deploy on Vercel**:
   - Import the GitHub repository in the Vercel dashboard.
   - Vercel automatically uses `vercel.json` (`framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist`).
   - Click **Deploy**. No environment variables are required for client-side design & export features.
