import JSZip from 'jszip';
import { Showcase } from '../types/portfolio';
import { generateStandaloneHTML, getAllPortfolioItems, loadStoredShowcases, getInitialShowcases } from './storage';

export async function downloadProjectZip(): Promise<void> {
  const zip = new JSZip();

  // 1. Standalone Ready-To-Open HTML Presentations Folder
  const allItems = getAllPortfolioItems();
  const storedShowcases = loadStoredShowcases();
  const initialShowcases = getInitialShowcases();
  const showcases = Object.keys(storedShowcases).length > 0 ? storedShowcases : initialShowcases;

  const htmlFolder = zip.folder('Ready_To_View_Presentations_HTML');
  
  if (htmlFolder) {
    (Object.values(showcases) as Showcase[]).forEach((showcase) => {
      try {
        const htmlCode = generateStandaloneHTML(showcase, allItems);
        const filename = `${showcase.slug}_presentation.html`;
        htmlFolder.file(filename, htmlCode);
      } catch (e) {
        console.warn('Failed generating sample HTML for ' + showcase.slug, e);
      }
    });

    // Also place the primary showcase in the root of the ZIP for instant 1-click preview
    const primary = (Object.values(showcases) as Showcase[])[0];
    if (primary) {
      const rootHtml = generateStandaloneHTML(primary, allItems);
      zip.file('Open_Client_Showcase_Directly.html', rootHtml);
    }
  }

  // package.json
  const packageJson = {
    name: "studio-portfolio-showcase",
    private: true,
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: "vite --port=3000 --host=0.0.0.0",
      build: "vite build",
      preview: "vite preview"
    },
    dependencies: {
      "lucide-react": "^0.546.0",
      "motion": "^12.23.24",
      "react": "^19.0.1",
      "react-dom": "^19.0.1",
      "jszip": "^3.10.1",
      "canvas-confetti": "^1.9.4"
    },
    devDependencies: {
      "@tailwindcss/vite": "^4.1.14",
      "@types/node": "^22.14.0",
      "@types/react": "^19.0.8",
      "@types/react-dom": "^19.0.3",
      "@types/canvas-confetti": "^1.9.0",
      "tailwindcss": "^4.1.14",
      "typescript": "~5.8.2",
      "vite": "^6.2.3",
      "@vitejs/plugin-react": "^5.0.4"
    }
  };
  zip.file('package.json', JSON.stringify(packageJson, null, 2));

  // Windows 10 Quick Launcher (Start_App.bat)
  const batchScript = `@echo off
REM ============================================================
REM  Studio Portfolio — 1-Click Launcher for Windows 10 / 11
REM ============================================================
cd /d "%~dp0"

echo ===================================================
echo   Studio Portfolio - Launching...
echo ===================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js (LTS version) from https://nodejs.org/
    echo During installation, keep 'Add to PATH' checked.
    echo.
    echo NOTE: You can also directly double-click 'Open_Client_Showcase_Directly.html'
    echo or any file in 'Ready_To_View_Presentations_HTML' folder to view without Node.js!
    echo.
    pause
    exit /b
)

if not exist "node_modules" (
    echo Installing dependencies for the first time... (takes ~30s)
    call npm install
)

echo Starting development server on http://localhost:3000...
start http://localhost:3000
call npm run dev

pause
`;
  zip.file('Start_App.bat', batchScript);

  // README with Windows 10 instructions and Free Hosting guide
  const readmeContent = `# 🚀 Studio Portfolio & Client Showcase Hub

Modern, responsive Studio Portfolio Manager and Client Showcase presentation platform built with React, Tailwind CSS, and Framer Motion.

---

## ⚡ Direct Offline .HTML Presentation (Zero Installation Needed)
If you want to quickly open a showcase without running any servers:
1. Double click **\`Open_Client_Showcase_Directly.html\`** right in this folder.
2. Or check the **\`Ready_To_View_Presentations_HTML\`** folder for pre-built showcases.
3. You can email or WhatsApp these \`.html\` files directly to clients!

---

## 💻 Quick Setup on Windows 10 / 11

### Method 1: 1-Click Batch Launcher
1. Install [Node.js (LTS)](https://nodejs.org/) if you don't already have it.
2. Extract the downloaded ZIP to any folder on your computer.
3. Double-click \`Start_App.bat\`.
4. It will automatically install packages (first run only) and open \`http://localhost:3000\` in your browser!

### Method 2: Command Line (Windows Terminal / PowerShell / CMD)
\`\`\`bash
# 1. Navigate to the project directory
cd path/to/studio-portfolio

# 2. Install dependencies
npm install

# 3. Start local dev server
npm run dev
\`\`\`
Then open **http://localhost:3000** in your browser.

---

## 🌐 Deploy to Free Hosting in Under 2 Minutes

### Option A: Vercel (Recommended - 100% Free)
1. Push this folder to a GitHub repository.
2. Go to [Vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Click **Deploy**. Vercel will automatically detect Vite and give you a free live URL (e.g. \`https://your-studio.vercel.app\`).

### Option B: Netlify (100% Free)
1. Go to [Netlify.com](https://netlify.com).
2. Drag and drop the \`dist\` folder (after running \`npm run build\`) or connect your GitHub repository.
3. Build command: \`npm run build\`, Publish directory: \`dist\`.
4. Click **Deploy Site**.

### Option C: Standalone Zero-Server HTML Delivery
- Inside the app, open any client showcase and click **"Export Standalone .HTML"**.
- You will get a single \`.html\` file containing all styling, animations, and high-res media references.
- You can directly attach this file in an email or send via WhatsApp to any client — they can double-click and view it without installing any software!

---

## ✨ Features Included
- **Browse & Filter 1300+ items** across 25+ creative design categories.
- **Client Showcase Creator**: Custom brand name, heading, tagline, theme palettes (Clay & Rust, Emerald Luxury, Obsidian Gold, Electric Cyber, etc.).
- **Standalone HTML Export**: Generate self-contained client presentations.
- **Direct Google Drive Integration**: Connect Google Drive account & upload portfolio designs directly.
- **Interactive Lightbox**: Fullscreen zoom, keyboard navigation, view original drive link, like/heart items.
- **PIN/Password Protection**: Optional private client presentation lock.
- **Offline LocalStorage Persistence**: Everything saves locally in your browser automatically.
`;
  zip.file('README.md', readmeContent);

  // vite.config.ts
  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
`;
  zip.file('vite.config.ts', viteConfig);

  // tsconfig.json
  const tsConfig = `{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
`;
  zip.file('tsconfig.json', tsConfig);

  // Generate blob and trigger browser download
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'studio-portfolio-source-code.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
