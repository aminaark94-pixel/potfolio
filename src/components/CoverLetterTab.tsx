import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  RefreshCw, 
  Layers, 
  FileText, 
  User, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle,
  FolderPlus,
  Share2,
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  PortfolioItem, 
  Showcase, 
  UserProfile, 
  CoverLetterStyle, 
  CoverLetterGenerationResult,
  PortfolioTemplate
} from '../types/portfolio';
import { 
  saveProfileToCloud, 
  loadProfileFromCloud, 
  loadCoverLetterStylesFromCloud, 
  saveCoverLetterStyleToCloud, 
  deleteCoverLetterStyleFromCloud,
  loadPortfolioTemplatesFromCloud,
  loadShowcasesFromCloud,
  saveShowcaseToCloud,
  getAllPortfolioItems
} from '../utils/storage';

interface CoverLetterTabProps {
  onShowcaseCreated?: (showcase: Showcase) => void;
  onNavigateToShowcase?: (slug: string) => void;
}

export const CoverLetterTab: React.FC<CoverLetterTabProps> = ({ 
  onShowcaseCreated,
  onNavigateToShowcase 
}) => {
  // 1. Profile State
  const [profile, setProfile] = useState<UserProfile>({
    fullName: '',
    roleTitle: '',
    bio: '',
    email: '',
    phone: '',
    location: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // 2. Styles State
  const [styles, setStyles] = useState<CoverLetterStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  const [isEditingStyle, setIsEditingStyle] = useState(false);
  const [styleFormData, setStyleFormData] = useState<{ id?: string; name: string; description: string; sampleText: string }>({
    name: '',
    description: '',
    sampleText: ''
  });
  const [previewStyle, setPreviewStyle] = useState<CoverLetterStyle | null>(null);

  // 2b. Portfolio Templates (curated item sets per client vertical, e.g. "Therapy Clinic")
  const [portfolioTemplates, setPortfolioTemplates] = useState<PortfolioTemplate[]>([]);

  // 2c. Existing Showcases — pick one or more previously-created showcase
  // links to reuse instead of always auto-creating a brand new one.
  const [existingShowcases, setExistingShowcases] = useState<Showcase[]>([]);
  const [showExistingPicker, setShowExistingPicker] = useState(false);
  const [selectedExistingSlugs, setSelectedExistingSlugs] = useState<Set<string>>(new Set());
  const [existingSearchQuery, setExistingSearchQuery] = useState('');

  // 2d. Skip cover-letter mode — just generate/select a showcase link, no letter text
  const [skipCoverLetter, setSkipCoverLetter] = useState(false);

  // 3. Generator State
  const [jobPostText, setJobPostText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<CoverLetterGenerationResult | null>(null);
  const [copiedLetter, setCopiedLetter] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editableLetter, setEditableLetter] = useState('');

  // 4. Recent Results History — persisted to localStorage
  const [recentResults, setRecentResults] = useState<CoverLetterGenerationResult[]>([]);

  // Load history from localStorage on mount AND restore the latest result
  useEffect(() => {
    try {
      const stored = localStorage.getItem('coverLetterHistory');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentResults(parsed);
          // IMPORTANT: Also restore the latest result so it displays immediately
          setResult(parsed[0]);
          setEditableLetter(parsed[0].coverLetter);
        }
      }
    } catch (err) {
      console.error('Failed to load cover letter history:', err);
    }
  }, []);

  // Save result to history whenever it changes
  useEffect(() => {
    if (result) {
      const updated = [result, ...recentResults].slice(0, 5); // Keep last 5
      setRecentResults(updated);
      try {
        localStorage.setItem('coverLetterHistory', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save cover letter history:', err);
      }
    }
  }, [result]);

  // Clear all history
  const handleClearAllHistory = () => {
    if (confirm('Are you sure you want to clear all saved cover letter history? This cannot be undone.')) {
      setRecentResults([]);
      try {
        localStorage.removeItem('coverLetterHistory');
      } catch (err) {
        console.error('Failed to clear history:', err);
      }
    }
  };

  // Restore a result from history
  const handleRestoreFromHistory = (historyResult: CoverLetterGenerationResult) => {
    setResult(historyResult);
    setEditableLetter(historyResult.coverLetter);
  };

  // Initial Load
  useEffect(() => {
    async function init() {
      try {
        const loadedProfile = await loadProfileFromCloud();
        setProfile(loadedProfile);

        const loadedStyles = await loadCoverLetterStylesFromCloud();
        setStyles(loadedStyles);
        if (loadedStyles.length > 0) {
          const defaultStyle = loadedStyles.find(s => s.isDefault) || loadedStyles[0];
          setSelectedStyleId(defaultStyle.id);
        }

        const loadedTemplates = await loadPortfolioTemplatesFromCloud();
        setPortfolioTemplates(loadedTemplates);

        const loadedShowcases = await loadShowcasesFromCloud();
        setExistingShowcases(Object.values(loadedShowcases).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')));
      } catch (err) {
        console.error('Failed to load initial cover letter data', err);
      }
    }
    init();
  }, []);

  // Update editable text when result changes
  useEffect(() => {
    if (result?.coverLetter) {
      setEditableLetter(result.coverLetter);
    }
  }, [result]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await saveProfileToCloud(profile);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to save profile. Please check console.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Save/Create Style
  const handleSaveStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!styleFormData.name.trim() || !styleFormData.sampleText.trim()) {
      alert('Please provide both a style name and sample text.');
      return;
    }

    const styleId = styleFormData.id || `style-${Date.now()}`;
    const newStyle: CoverLetterStyle = {
      id: styleId,
      name: styleFormData.name.trim(),
      description: styleFormData.description.trim(),
      sampleText: styleFormData.sampleText.trim(),
      createdAt: new Date().toISOString()
    };

    await saveCoverLetterStyleToCloud(newStyle);
    const updated = await loadCoverLetterStylesFromCloud();
    setStyles(updated);
    setSelectedStyleId(styleId);
    setIsEditingStyle(false);
    setStyleFormData({ name: '', description: '', sampleText: '' });
  };

  const handleDeleteStyle = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete style "${name}"?`)) return;
    await deleteCoverLetterStyleFromCloud(id);
    const updated = await loadCoverLetterStylesFromCloud();
    setStyles(updated);
    if (selectedStyleId === id && updated.length > 0) {
      setSelectedStyleId(updated[0].id);
    }
  };

  // Handle Generate Cover Letter
  const handleGenerate = async () => {
    if (!jobPostText.trim()) {
      setErrorMsg('Please paste a job post or project brief first.');
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setGenerationStep(skipCoverLetter ? 'Preparing showcase link...' : 'Matching relevant portfolio items...');

    try {
      const selectedStyle = styles.find(s => s.id === selectedStyleId) || styles[0];
      const allItems = getAllPortfolioItems();

      const chosenExistingShowcases = existingShowcases.filter(sc => selectedExistingSlugs.has(sc.slug));

      // Update step progress
      if (!skipCoverLetter) {
        setTimeout(() => {
          setGenerationStep('Analyzing skills & auto-creating customized showcase...');
        }, 1200);

        setTimeout(() => {
          setGenerationStep('Synthesizing tone & writing tailored cover letter...');
        }, 2400);
      }

      const response = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobPostText,
          styleId: selectedStyle?.id,
          styleName: selectedStyle?.name,
          styleSampleText: selectedStyle?.sampleText,
          profile,
          portfolioItems: allItems,
          portfolioTemplates,
          existingShowcases: chosenExistingShowcases,
          skipCoverLetter
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      // Persist the auto-created showcase to cloud storage (skipped when
      // reusing existing showcases — nothing new was created)
      if (data.showcase) {
        await saveShowcaseToCloud(data.showcase);
        if (onShowcaseCreated) {
          onShowcaseCreated(data.showcase);
        }
      }

      setResult(data);
      setEditableLetter(data.coverLetter);

      // Trigger light confetti celebration on success
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch {
        // Safe if confetti fails
      }
    } catch (err: any) {
      console.error('Generation failed:', err);
      setErrorMsg(err.message || 'Generation failed. Please check network and API credentials.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Copy helpers
  const handleCopyLetter = () => {
    navigator.clipboard.writeText(editableLetter);
    setCopiedLetter(true);
    setTimeout(() => setCopiedLetter(false), 2500);
  };

  const handleCopyLink = () => {
    if (result?.showcaseLinks && result.showcaseLinks.length > 0) {
      navigator.clipboard.writeText(result.showcaseLinks.join('\n'));
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } else if (result?.showcaseLink) {
      navigator.clipboard.writeText(result.showcaseLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Sample job post injector for instant testing
  const insertSampleJobPost = () => {
    setJobPostText(`Senior Product Designer (Design Systems & Fintech)
Company: NexaPay Technologies
Location: Remote (US / Europe)

About the Role:
We are looking for a Senior Product Designer to lead the evolution of our next-generation web and mobile banking dashboards. You will partner with product and engineering leads to overhaul our complex transaction workflows, establish a unified multi-platform design system in Figma, and craft high-fidelity micro-interactions and motion prototypes.

Key Requirements:
- 5+ years designing enterprise SaaS or consumer fintech applications
- Deep mastery of design systems, accessibility, typography, and responsive layouts
- Proven experience conducting user research, prototyping complex data visualizers, and collaborating closely with frontend engineers
- Strong portfolio demonstrating end-to-end UX architecture and visual craft`);
  };

  return (
    <div className="space-y-10">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* HEADER SUMMARY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 text-white p-6 sm:p-8 rounded-3xl border border-indigo-950/60 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-3 border border-indigo-500/30 font-space-grotesk">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Portfolio Matcher & Showcase Generator
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-space-grotesk tracking-tight text-white mb-2">
            Instant Cover Letter & Custom Showcase
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
            Paste any job description to automatically match your best portfolio work, generate a personalized live client showcase link, and compose a tailored cover letter in your signature voice.
          </p>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: MAIN GENERATOR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-1">
              <Sparkles className="w-4 h-4" />
              Generation Engine
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold font-space-grotesk text-slate-900 tracking-tight">
              Generate From Job Post
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={insertSampleJobPost}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            >
              Insert Sample Job Post
            </button>
            {jobPostText && (
              <button
                type="button"
                onClick={() => setJobPostText('')}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {/* Job Post Textarea */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 font-space-grotesk">
              Job Requirements / Client Brief <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="job-post-input"
              rows={7}
              value={jobPostText}
              onChange={(e) => setJobPostText(e.target.value)}
              placeholder="Paste the full job post, role description, client RFP, or project brief here..."
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all resize-y font-normal"
            />
            <div className="flex items-center justify-between text-xs text-slate-400 mt-2 font-mono">
              <span>Auto-detects client requirements, skill keywords, and deliverables</span>
              <span>{jobPostText.length} characters</span>
            </div>
          </div>

          {/* Existing Showcase Picker */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExistingPicker((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500 font-space-grotesk flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                Use existing showcase link(s) instead of auto-creating
                {selectedExistingSlugs.size > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px]">
                    {selectedExistingSlugs.size} selected
                  </span>
                )}
              </span>
              <span className="text-xs text-slate-400">{showExistingPicker ? 'Hide' : `${existingShowcases.length} available`}</span>
            </button>

            {showExistingPicker && (
              <div className="p-3 space-y-2 bg-white">
                <input
                  type="text"
                  value={existingSearchQuery}
                  onChange={(e) => setExistingSearchQuery(e.target.value)}
                  placeholder="Search your saved showcases..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {existingShowcases
                    .filter((sc) =>
                      !existingSearchQuery.trim() ||
                      sc.heading.toLowerCase().includes(existingSearchQuery.toLowerCase()) ||
                      sc.brand_name.toLowerCase().includes(existingSearchQuery.toLowerCase())
                    )
                    .map((sc) => {
                      const isSelected = selectedExistingSlugs.has(sc.slug);
                      return (
                        <button
                          key={sc.slug}
                          type="button"
                          onClick={() => {
                            setSelectedExistingSlugs((prev) => {
                              const next = new Set(prev);
                              if (next.has(sc.slug)) next.delete(sc.slug);
                              else next.add(sc.slug);
                              return next;
                            });
                          }}
                          className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-semibold'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">
                            {sc.heading || sc.brand_name} <span className="text-slate-400 font-mono">({sc.item_ids.length} items)</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                        </button>
                      );
                    })}
                  {existingShowcases.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3">No saved showcases yet.</p>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono pt-1">
                  {selectedExistingSlugs.size > 0
                    ? `All ${selectedExistingSlugs.size} selected link(s) will be included — AI matching/auto-creation is skipped.`
                    : 'Nothing selected — the system will auto-create a new showcase as usual.'}
                </p>
              </div>
            )}
          </div>

          {/* Skip Cover Letter toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={skipCoverLetter}
              onChange={(e) => setSkipCoverLetter(e.target.checked)}
              className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
            />
            <span className="text-xs font-space-grotesk font-semibold text-slate-600">
              Just get the showcase link — skip writing a cover letter
            </span>
          </label>

          {/* Style Selector & Action */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
            <div className={`md:col-span-2 ${skipCoverLetter ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 font-space-grotesk">
                  Writing Style Reference
                </label>
                <span className="text-xs text-slate-400 font-mono">
                  {styles.length} style{styles.length === 1 ? '' : 's'} configured
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {styles.map(st => {
                  const isSelected = st.id === selectedStyleId;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStyleId(st.id)}
                      className={`text-left p-3.5 rounded-2xl border text-xs transition-all relative cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="truncate mb-0.5 font-space-grotesk font-bold">{st.name}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">
                        {st.description || 'Custom tone'}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-600"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-1">
              <button
                type="button"
                id="generate-cover-letter-btn"
                onClick={handleGenerate}
                disabled={isGenerating || !jobPostText.trim()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-3.5 px-5 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all text-sm cursor-pointer font-space-grotesk"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{skipCoverLetter ? 'Preparing link...' : 'Generating...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{skipCoverLetter ? 'Get Showcase Link' : 'Generate Cover Letter'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Loading Animation / Status */}
          {isGenerating && (
            <div className="p-5 bg-indigo-50/80 border border-indigo-100 rounded-2xl text-center space-y-3 animate-pulse">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-900">
                  {generationStep || 'Processing job post...'}
                </p>
                <p className="text-xs text-indigo-700/80 mt-1">
                  Using AI model (Groq/Mistral) with fast sub-second matching
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Generation Error</p>
                <p className="text-xs mt-0.5 text-rose-700">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* GENERATION RESULTS SECTION */}
        {/* ───────────────────────────────────────────────────────────── */}
        {result && !isGenerating && (
          <div className="mt-10 pt-8 border-t border-slate-200 space-y-8 animate-fadeIn">
            {/* Success Banner & Showcase Link(s) */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white border border-indigo-900/50 shadow-md">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {result.usedExistingShowcases ? 'Existing Showcase(s) Selected' : 'Auto-Created Showcase Ready'}
                  </div>
                  <h4 className="text-lg font-bold font-space-grotesk text-white">
                    Personalized Showcase for {result.showcaseHeading || 'Client Opportunity'}
                  </h4>
                  <div className="space-y-1 mt-1.5">
                    {(result.showcaseLinks && result.showcaseLinks.length > 0 ? result.showcaseLinks : [result.showcaseLink]).map((link, i) => (
                      <p key={i} className="text-slate-300 text-xs max-w-xl truncate font-mono">
                        {link}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium py-2 px-3.5 rounded-xl border border-slate-700 transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied Link</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{result.showcaseLinks && result.showcaseLinks.length > 1 ? 'Copy All Links' : 'Copy Link'}</span>
                      </>
                    )}
                  </button>

                  <a
                    href={result.showcaseLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium py-2 px-3.5 rounded-xl transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Generated Cover Letter — hidden when "just get the link" mode was used */}
            {!result.skippedCoverLetter && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold font-space-grotesk text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Generated Cover Letter
                  </h4>
                  <p className="text-xs text-slate-500">
                    Ready to copy or fine-tune before sending.
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    Generated via {result.provider}
                    {result.specialistTitle && (
                      <span> • Signed as: {result.specialistTitle}</span>
                    )}
                    {result.clientNameDetected && (
                      <span className="text-emerald-600"> • Client name detected: {result.clientNameDetected}</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="copy-cover-letter-btn"
                    onClick={handleCopyLetter}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-xl transition-all shadow-xs ${
                      copiedLetter
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {copiedLetter ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy to Clipboard</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  id="generated-letter-output"
                  rows={14}
                  value={editableLetter}
                  onChange={(e) => setEditableLetter(e.target.value)}
                  className="w-full p-4 bg-slate-50/70 border border-slate-200 rounded-2xl text-slate-900 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-sans font-normal"
                />
                <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
                  <span>
                    Words: {editableLetter.trim().split(/\s+/).filter(Boolean).length} | Characters: {editableLetter.length}
                  </span>
                  <span className="text-indigo-600 font-medium">
                    Showcase link embedded
                  </span>
                </div>
              </div>
            </div>
            )}

            {/* Matched Portfolio Items List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold font-space-grotesk text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Matched Portfolio Work ({result.matchedItems.length} items)
                  </h4>
                  <p className="text-xs text-slate-500">
                    {result.templateUsed ? (
                      <span className="text-emerald-600 font-semibold">
                        ✓ Used your curated "{result.templateUsed}" template — no AI guessing.
                      </span>
                    ) : (
                      <>
                        Selected by AI matching against the job post ({result.matchingProvider || 'AI matching'}).
                        {typeof result.catalogSize === 'number' && (
                          <span> Matched from {result.catalogSize} total catalog items.</span>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.matchedItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 flex gap-3 hover:border-indigo-300 hover:shadow-xs transition-all"
                  >
                    <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                      {item.thumb ? (
                        <img
                          src={item.thumb_small || item.thumb}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-xs">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mb-1">
                        {item.category}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900 truncate" title={item.name}>
                        {item.name}
                      </h5>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(item.keywords || []).slice(0, 3).map((kw, i) => (
                          <span key={i} className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* RECENT RESULTS HISTORY */}
        {/* ───────────────────────────────────────────────────────────── */}
        {recentResults.length > 0 && (
          <div className="mt-10 pt-8 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-1">
                <RefreshCw className="w-4 h-4" />
                Recent Results
              </div>
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Last {recentResults.length} generated cover letters. Click any to restore.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {recentResults.map((histResult, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleRestoreFromHistory(histResult)}
                  className={`text-left p-3.5 rounded-xl border-2 transition-all hover:shadow-xs ${
                    result?.showcaseLink === histResult.showcaseLink
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-slate-900 truncate">
                        {histResult.showcaseHeading || 'Unnamed Opportunity'}
                      </h5>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {histResult.matchedItems.length} items
                        {histResult.templateUsed && (
                          <span className="text-emerald-600 font-semibold ml-1">
                            • {histResult.templateUsed}
                          </span>
                        )}
                      </p>
                    </div>
                    {result?.showcaseLink === histResult.showcaseLink && (
                      <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded shrink-0">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    {histResult.showcaseLink}
                  </p>

                  {histResult.clientNameDetected && (
                    <p className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded mt-1.5 inline-block">
                      Client: {histResult.clientNameDetected}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: ONE-TIME MY PROFILE SETTINGS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-1">
              <User className="w-4 h-4" />
              Settings & Profile
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold font-space-grotesk text-slate-900 tracking-tight">
              My Profile & Signature
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Persisted to Firestore (settings/profile) — used as the core applicant context for AI generation.
            </p>
          </div>
          {profileSaveSuccess && (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <Check className="w-4 h-4 text-emerald-600" />
              Saved to Firestore!
            </div>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 font-space-grotesk">
                Full Name / Studio Name
              </label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                placeholder="e.g. Aala Studio / Sarah Chen"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 font-space-grotesk">
                Role / Title
              </label>
              <input
                type="text"
                value={profile.roleTitle}
                onChange={(e) => setProfile({ ...profile, roleTitle: e.target.value })}
                placeholder="e.g. Senior Product Designer & Creative Technologist"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 font-space-grotesk">
                Contact Email
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="e.g. hello@aalastudio.design"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 font-space-grotesk">
                Website / Portfolio Domain
              </label>
              <input
                type="text"
                value={profile.website || ''}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="e.g. https://aalastudio.design"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 font-space-grotesk">
              Short Bio & Skills Summary (Core Value Proposition)
            </label>
            <textarea
              rows={4}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Highlight your key achievements, years of experience, core design toolkit (Figma, React, Motion), and specializations..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all font-normal"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer font-space-grotesk"
            >
              {isSavingProfile ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 3: COVER LETTER STYLES MANAGER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-1">
              <Sliders className="w-4 h-4" />
              Style Library
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold font-space-grotesk text-slate-900 tracking-tight">
              Cover Letter Styles Manager
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Add, edit, and curate reference style samples (stored in Firestore &quot;coverLetterStyles&quot;) for few-shot AI guidance.
            </p>
          </div>

          {!isEditingStyle && (
            <button
              type="button"
              onClick={() => {
                setStyleFormData({ name: '', description: '', sampleText: '' });
                setIsEditingStyle(true);
              }}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-2xl transition-all cursor-pointer shadow-xs self-start sm:self-auto font-space-grotesk"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Style</span>
            </button>
          )}
        </div>

        {/* Style Edit / Create Form */}
        {isEditingStyle && (
          <form onSubmit={handleSaveStyle} className="mt-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 font-space-grotesk">
                {styleFormData.id ? 'Edit Style Reference' : 'Add New Style Reference'}
              </h4>
              <button
                type="button"
                onClick={() => setIsEditingStyle(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Style Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={styleFormData.name}
                  onChange={(e) => setStyleFormData({ ...styleFormData, name: e.target.value })}
                  placeholder="e.g. Bold & Confident, Executive Formal"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Description / Tone
                </label>
                <input
                  type="text"
                  value={styleFormData.description}
                  onChange={(e) => setStyleFormData({ ...styleFormData, description: e.target.value })}
                  placeholder="e.g. Direct, numbers-driven, high conviction"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sample Cover Letter Text (AI Reference Template) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={6}
                value={styleFormData.sampleText}
                onChange={(e) => setStyleFormData({ ...styleFormData, sampleText: e.target.value })}
                placeholder="Paste an exemplary cover letter written in your preferred tone, structure, and pacing..."
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingStyle(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs"
              >
                Save Style
              </button>
            </div>
          </form>
        )}

        {/* Existing Styles Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {styles.map((st) => (
            <div
              key={st.id}
              className={`p-4 rounded-2xl border transition-all ${
                st.id === selectedStyleId
                  ? 'border-indigo-500/80 bg-indigo-50/30 ring-1 ring-indigo-500/30'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-bold text-slate-900 font-space-grotesk">
                      {st.name}
                    </h5>
                    {st.isDefault && (
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {st.description || 'Custom tone reference'}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewStyle(st)}
                    title="Preview Sample"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStyleFormData({
                        id: st.id,
                        name: st.name,
                        description: st.description || '',
                        sampleText: st.sampleText
                      });
                      setIsEditingStyle(true);
                    }}
                    title="Edit Style"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteStyle(st.id, st.name)}
                    title="Delete Style"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-xs text-slate-600 font-mono line-clamp-3 leading-relaxed">
                {st.sampleText}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedStyleId(st.id)}
                  className={`text-xs font-semibold ${
                    st.id === selectedStyleId
                      ? 'text-indigo-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {st.id === selectedStyleId ? '✓ Active Selection' : 'Select for Generation'}
                </button>
                <span className="text-[10px] text-slate-400">
                  {st.sampleText.length} chars
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Style Preview Modal */}
      {previewStyle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-lg font-bold font-space-grotesk text-slate-900">
                  {previewStyle.name}
                </h4>
                <p className="text-xs text-slate-500">{previewStyle.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewStyle(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 p-2"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap font-sans max-h-96 overflow-y-auto leading-relaxed">
              {previewStyle.sampleText}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedStyleId(previewStyle.id);
                  setPreviewStyle(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Use This Style
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
