import React from 'react';
import { 
  Sparkles, 
  Eye, 
  Sliders, 
  LayoutGrid, 
  Download, 
  Plus, 
  Share2, 
  FileCode,
  ExternalLink,
  ChevronDown,
  LogOut
} from 'lucide-react';
import { Showcase } from '../types/portfolio';
import { THEMES } from '../data/themes';

interface NavbarProps {
  viewMode: 'admin' | 'client' | 'catalog';
  onSelectViewMode: (mode: 'admin' | 'client' | 'catalog') => void;
  showcases: Record<string, Showcase>;
  activeSlug: string;
  onSelectShowcase: (slug: string) => void;
  onOpenCreateShowcase: () => void;
  onOpenDownloadModal: () => void;
  onOpenCustomItemModal: () => void;
  isAdminAuthed?: boolean;
  onAdminLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  onSelectViewMode,
  showcases,
  activeSlug,
  onSelectShowcase,
  onOpenCreateShowcase,
  onOpenDownloadModal,
  onOpenCustomItemModal,
  isAdminAuthed,
  onAdminLogout,
}) => {
  const currentShowcase = showcases[activeSlug] || Object.values(showcases)[0];
  const theme = currentShowcase ? THEMES[currentShowcase.theme] || THEMES.indigo : THEMES.indigo;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-xl transition-all shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & Studio Title */}
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-200 transition-transform hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
                boxShadow: `0 8px 20px -2px ${theme.accentGlow}`,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-space-grotesk font-bold text-base text-slate-900 tracking-tight">
                  Studio Portfolio
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Sleek Pro
                </span>
              </div>
              <p className="hidden md:block text-[11px] font-mono text-slate-400 -mt-0.5">
                Curated Showcase & Asset Engine
              </p>
            </div>
          </div>

          {/* Center Navigation Mode Switcher */}
          <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              onClick={() => onSelectViewMode('admin')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-space-grotesk font-semibold transition-all cursor-pointer ${
                viewMode === 'admin'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Studio Hub</span>
            </button>

            <button
              onClick={() => onSelectViewMode('client')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-space-grotesk font-semibold transition-all relative cursor-pointer ${
                viewMode === 'client'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 font-bold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Client View</span>
              {currentShowcase && currentShowcase.item_ids.length > 0 && (
                <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
                  viewMode === 'client' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {currentShowcase.item_ids.length}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectViewMode('catalog')}
              className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-space-grotesk font-semibold transition-all cursor-pointer ${
                viewMode === 'catalog'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All 1,300+ Works</span>
            </button>
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2.5">
            {/* Active Showcase Switcher */}
            <div className="relative hidden lg:block">
              <select
                value={activeSlug}
                onChange={(e) => onSelectShowcase(e.target.value)}
                className="appearance-none bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-space-grotesk font-medium text-xs rounded-xl pl-3.5 pr-8 py-2 border border-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all truncate max-w-[200px]"
              >
                {(Object.entries(showcases) as [string, Showcase][]).map(([slug, sc]) => (
                  <option key={slug} value={slug} className="bg-white text-slate-900">
                    {sc.heading || 'Showcase'} ({sc.item_ids.length})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Quick Add Custom Item */}
            <button
              onClick={onOpenCustomItemModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-space-grotesk font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
              title="Directly upload to Google Drive or add custom portfolio item"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Upload to Drive</span>
            </button>

            {/* Download Codes & Instructions Button */}
            <button
              onClick={onOpenDownloadModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-space-grotesk font-bold transition-all hover:scale-105 active:scale-95 shadow-md shadow-indigo-200 cursor-pointer"
              title="Download codes & Windows 10 setup guide"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Get Codes & Setup</span>
            </button>

            {viewMode === 'admin' && isAdminAuthed && onAdminLogout && (
              <button
                onClick={onAdminLogout}
                title="Lock Studio Hub"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-xs font-space-grotesk font-semibold text-slate-500 hover:text-red-600 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
