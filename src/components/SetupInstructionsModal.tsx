import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Terminal, 
  Globe, 
  FileText, 
  Check, 
  Copy, 
  FolderArchive, 
  ExternalLink, 
  Sparkles,
  ShieldCheck,
  Zap,
  HelpCircle,
  Eye,
  FileCode
} from 'lucide-react';
import { downloadProjectZip } from '../utils/zipExport';
import { generateStandaloneHTML, getAllPortfolioItems, loadStoredShowcases, getInitialShowcases } from '../utils/storage';
import confetti from 'canvas-confetti';

interface SetupInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupInstructionsModal: React.FC<SetupInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'windows' | 'hosting' | 'html'>('download');
  const [downloading, setDownloading] = useState(false);
  const [downloadingHtml, setDownloadingHtml] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadProjectZip();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadDirectHtml = (slug?: string) => {
    try {
      setDownloadingHtml(true);
      const showcases = loadStoredShowcases();
      const initialShowcases = getInitialShowcases();
      const allItems = getAllPortfolioItems();
      const targetSlug = slug || Object.keys(showcases)[0] || Object.keys(initialShowcases)[0] || 'new-client-f0c7';
      const showcase = showcases[targetSlug] || initialShowcases[targetSlug] || Object.values(initialShowcases)[0];

      if (!showcase) return;

      const htmlContent = generateStandaloneHTML(showcase, allItems);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${showcase.slug}_client_showcase.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.error('Failed generating direct HTML file', err);
    } finally {
      setTimeout(() => setDownloadingHtml(false), 800);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2100] flex items-center justify-center p-3 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 max-w-4xl w-full max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-md shadow-indigo-200">
                <FolderArchive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-space-grotesk font-bold text-lg text-slate-900">
                  Source Codes, Windows 10 & Free Hosting Guide
                </h2>
                <p className="text-xs font-mono text-slate-500">
                  Easy step-by-step setup with zero complicated dependencies
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('download')}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-space-grotesk font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'download'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>1-Click Download ZIP</span>
            </button>

            <button
              onClick={() => setActiveTab('windows')}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-space-grotesk font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'windows'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4 text-emerald-600" />
              <span>Windows 10 Setup Instructions</span>
            </button>

            <button
              onClick={() => setActiveTab('hosting')}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-space-grotesk font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'hosting'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Globe className="w-4 h-4 text-cyan-600" />
              <span>Free Hosting Deployment</span>
            </button>

            <button
              onClick={() => setActiveTab('html')}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-space-grotesk font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
                activeTab === 'html'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCode className="w-4 h-4 text-violet-600" />
              <span>Direct .HTML File & Codes</span>
              <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-1.5 py-0.2 rounded-full">Offline</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-6 text-sm text-slate-700 space-y-6">
            {/* TAB 1: DOWNLOAD ZIP */}
            {activeTab === 'download' && (
              <div className="space-y-6">
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-xl shadow-indigo-200/60 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white border border-white/25 text-xs font-mono font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>Ready-To-Run Package</span>
                      </div>
                      <h3 className="font-space-grotesk font-bold text-xl sm:text-2xl text-white">
                        Complete Studio Portfolio Source Package
                      </h3>
                      <p className="text-xs sm:text-sm text-indigo-100 max-w-xl leading-relaxed">
                        Includes everything: React 19, Tailwind CSS v4, Framer Motion animations, complete 1,300+ item design catalog, Windows 1-Click <code className="text-white bg-white/20 px-1.5 py-0.5 rounded font-mono">Start_App.bat</code> launcher, and deployment configuration.
                      </p>
                    </div>

                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white text-indigo-700 font-space-grotesk font-bold text-sm shadow-xl hover:bg-indigo-50 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
                      <span>{downloading ? 'Building ZIP Package...' : 'Download Full Code ZIP'}</span>
                    </button>
                  </div>
                </div>

                {/* What's Inside */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 shadow-sm">
                    <div className="font-space-grotesk font-bold text-slate-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>1-Click Run on Windows</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Double-click <code className="text-indigo-600 font-bold">Start_App.bat</code> on Windows 10 and it launches instantly.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 shadow-sm">
                    <div className="font-space-grotesk font-bold text-slate-900 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-cyan-600" />
                      <span>Free Hosting Ready</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Vercel, Netlify, Cloudflare Pages or GitHub Pages ready out of the box with zero server fees.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 shadow-sm">
                    <div className="font-space-grotesk font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>No Database Setup</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Uses fast browser storage + JSON backups. No PostgreSQL, MongoDB or heavy server required.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: WINDOWS 10 SETUP */}
            {activeTab === 'windows' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-space-grotesk font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-emerald-600" />
                    <span>Windows 10 / 11 Pe Kaise Chalayein (Asaan Tareeqa)</span>
                  </h3>

                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-space-grotesk font-bold text-emerald-700 text-xs uppercase tracking-wider">
                        Step 1: Install Node.js (Only Once)
                      </span>
                      <a
                        href="https://nodejs.org"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-mono font-bold"
                      >
                        <span>nodejs.org</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Agar aapke computer par pehle se Node.js nahi hai, toh <strong className="text-slate-900">nodejs.org</strong> se <strong>LTS Version</strong> download aur install karein (Setup mein &ldquo;Add to PATH&rdquo; checked rehne dein).
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
                    <span className="font-space-grotesk font-bold text-emerald-700 text-xs uppercase tracking-wider">
                      Step 2: Double-Click Start_App.bat (Sabse Aasan!)
                    </span>
                    <p className="text-xs text-slate-600">
                      Downloaded ZIP ko kisi bhi folder mein extract karein aur <code className="text-indigo-600 bg-indigo-50 font-bold px-1.5 py-0.5 rounded border border-indigo-100">Start_App.bat</code> file par <strong>double-click</strong> karein.
                    </p>
                    <div className="text-xs text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200 font-mono shadow-inner space-y-1">
                      <div>✓ Yeh khud packages install karega (pehle run par ~30s)</div>
                      <div>✓ Automatically browser mein http://localhost:3000 khol dega</div>
                      <div>✓ App band karne ke liye bas black window band kar dein.</div>
                    </div>
                  </div>

                  {/* Step 3: Manual Command Line alternative */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-space-grotesk font-bold text-amber-700 text-xs uppercase tracking-wider">
                        Alternative: Command Line (CMD / PowerShell)
                      </span>
                      <button
                        onClick={() => handleCopy('npm install\nnpm run dev', 'npm-cmd')}
                        className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer"
                      >
                        {copiedKey === 'npm-cmd' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'npm-cmd' ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="bg-slate-900 p-3.5 rounded-xl font-mono text-xs text-emerald-400 border border-slate-800 space-y-1">
                      <p><span className="text-slate-500"># 1. Dependencies install karein</span></p>
                      <p>npm install</p>
                      <p className="pt-2"><span className="text-slate-500"># 2. Local app start karein</span></p>
                      <p>npm run dev</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FREE HOSTING DEPLOYMENT */}
            {activeTab === 'hosting' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-space-grotesk font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    <span>Free Hosting Par Live Kaise Upload Karein (100% Free)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Aap is project ko kisi bhi free service par bina kisi cost ke hamesha ke liye host kar sakte hain:
                  </p>
                </div>

                {/* Vercel Guide */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-space-grotesk font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                      Option 1: Vercel (Sabse Best & Fast)
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Free Tier</span>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1">
                    <li>Is project ko apne <strong>GitHub</strong> par upload karein.</li>
                    <li><strong className="text-slate-900">Vercel.com</strong> par account banayein aur &ldquo;Add New Project&rdquo; click karein.</li>
                    <li>Apna GitHub repository select karein aur <strong>Deploy</strong> dabayein.</li>
                    <li>1 minute ke andar aapko live link mil jayega jaise: <code className="text-indigo-600 font-bold font-mono">https://yourstudio.vercel.app</code></li>
                  </ol>
                </div>

                {/* Netlify Guide */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-space-grotesk font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                      Option 2: Netlify (Drag & Drop)
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Free Tier</span>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1">
                    <li>Apne computer par <code className="text-indigo-600 font-bold">npm run build</code> chalayein (isse <code className="text-slate-900 font-mono">dist</code> folder ban jayega).</li>
                    <li><strong className="text-slate-900">Netlify.com</strong> par login karein aur <code className="text-slate-900 font-mono">dist</code> folder ko seedha drag and drop kar dein.</li>
                    <li>Website turant live ho jayegi!</li>
                  </ol>
                </div>

                {/* Cloudflare Pages */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-space-grotesk font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Option 3: Cloudflare Pages
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Unlimited Bandwidth Free</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Cloudflare Dashboard mein &ldquo;Workers & Pages&rdquo; par ja kar GitHub connect karein. Build command: <code className="text-indigo-600 font-bold font-mono">npm run build</code>, Output directory: <code className="text-slate-900 font-mono">dist</code>.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: DIRECT HTML DELIVERY */}
            {activeTab === 'html' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-indigo-50 border border-indigo-200">
                  <div>
                    <h3 className="font-space-grotesk font-bold text-base sm:text-lg text-indigo-950 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <span>Direct Standalone .HTML Presentation File</span>
                    </h3>
                    <p className="text-xs text-indigo-800 mt-1">
                      Download a single, self-contained <code>.html</code> file that opens instantly in any browser without Node.js or any server.
                    </p>
                  </div>

                  <button
                    onClick={() => handleDownloadDirectHtml()}
                    disabled={downloadingHtml}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-space-grotesk font-bold text-xs shadow-md shadow-indigo-200 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Download className={`w-4 h-4 ${downloadingHtml ? 'animate-bounce' : ''}`} />
                    <span>{downloadingHtml ? 'Generating HTML...' : 'Download Sample .HTML File'}</span>
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-sm">
                  <div className="font-space-grotesk font-bold text-slate-900 text-sm">
                    Where is the .HTML file located in the ZIP package?
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    When you click <strong>&ldquo;1-Click Download ZIP&rdquo;</strong>, your ZIP file includes:
                  </p>
                  <div className="space-y-2 pt-1 font-mono text-xs text-slate-800">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <strong className="text-indigo-900">Open_Client_Showcase_Directly.html</strong>
                        <span className="text-slate-500 block text-[11px]">Located right in the root folder of the extracted ZIP. Double-click to open.</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                      <FolderArchive className="w-4 h-4 text-violet-600 shrink-0" />
                      <div>
                        <strong className="text-violet-900">Ready_To_View_Presentations_HTML/</strong>
                        <span className="text-slate-500 block text-[11px]">Folder containing all curated client showcases pre-compiled as HTML files.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 shadow-sm">
                  <div className="font-space-grotesk font-bold text-slate-900 text-sm">
                    How to export custom .HTML for any new showcase?
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-[11px]">1</span>
                      <span>Open the <strong>Studio Hub (Showcase Creator)</strong> in this app.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-[11px]">2</span>
                      <span>Select or curate your client showcase and click the <strong>&ldquo;Export HTML File&rdquo;</strong> button in the top bar.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-[11px]">3</span>
                      <span>Send the downloaded <code>.html</code> file to your client via WhatsApp or Email. They can double-click it on Windows/Mac/Phone and view it seamlessly!</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Zero external database needed • Works 100% locally on Win 10</span>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-space-grotesk font-bold transition-all cursor-pointer"
            >
              Close Guide
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
