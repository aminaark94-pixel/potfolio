import React, { useState } from 'react';
import { Link2, Plus, Trash2, UploadCloud, CheckCircle2, ExternalLink } from 'lucide-react';
import { PortfolioItem } from '../types/portfolio';
import { getDriveThumb, detectMediaType } from '../data/rawPortfolioData';
import { saveCustomItemsToCloud } from '../utils/storage';

interface DriveLinksTabProps {
  onItemsAdded: (items: PortfolioItem[]) => void;
  existingCategories: string[];
}

interface DraftRow {
  id: string;
  title: string;
  driveUrl: string;
  category: string;
  subcategory: string;
}

const newRow = (): DraftRow => ({
  id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  title: '',
  driveUrl: '',
  category: '',
  subcategory: '',
});

export const DriveLinksTab: React.FC<DriveLinksTabProps> = ({ onItemsAdded, existingCategories }) => {
  const [rows, setRows] = useState<DraftRow[]>([newRow()]);
  const [defaultCategory, setDefaultCategory] = useState('Branding');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bulkPasteText, setBulkPasteText] = useState('');

  const handleBulkParse = () => {
    // Splits on commas, newlines, and whitespace — matches whatever format
    // was copied from Drive (multi-select share links, a pasted list, etc).
    const urlPattern = /https?:\/\/\S+/g;
    const found = bulkPasteText.match(urlPattern);
    if (!found || found.length === 0) {
      setErrorMessage('No links found in the pasted text. Paste one or more Drive links, separated by commas or new lines.');
      return;
    }

    const cleaned = found.map((u) => u.replace(/[),.]+$/, ''));
    const existingCount = rows.filter((r) => r.driveUrl.trim()).length;

    const newRows: DraftRow[] = cleaned.map((url, idx) => ({
      id: `row-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      title: `Untitled Item ${existingCount + idx + 1}`,
      driveUrl: url,
      category: '',
    }));

    setRows((prev) => {
      const nonEmpty = prev.filter((r) => r.driveUrl.trim() || r.title.trim());
      return [...nonEmpty, ...newRows];
    });
    setBulkPasteText('');
    setErrorMessage(null);
    setSuccessMessage(`Parsed ${newRows.length} link${newRows.length > 1 ? 's' : ''} into rows below — rename the titles, then click "Add to Portfolio".`);
  };

  const updateRow = (id: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const removeRow = (id: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const validRows = rows.filter((r) => r.title.trim() && r.driveUrl.trim());

  const handleCreateItems = async () => {
    if (validRows.length === 0) {
      setErrorMessage('Add at least one row with both a title and a Drive link.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const newItems: PortfolioItem[] = validRows.map((row) => {
        const category = row.category.trim() || defaultCategory.trim() || 'Uncategorized';
        const subcategory = row.subcategory.trim() || undefined;
        const thumb = getDriveThumb(row.driveUrl.trim(), 800);
        const thumbSmall = getDriveThumb(row.driveUrl.trim(), 400);
        const thumbLarge = getDriveThumb(row.driveUrl.trim(), 1400);
        const mediaType = detectMediaType(row.title, row.driveUrl.trim());

        return {
          id: `drive-link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: row.title.trim(),
          category,
          subcategory,
          drive_link: row.driveUrl.trim(),
          behance_link: null,
          thumb,
          thumb_small: thumbSmall,
          thumb_large: thumbLarge,
          mediaType,
          keywords: [category.toLowerCase(), ...(subcategory ? [subcategory.toLowerCase()] : [])],
          custom: true,
        };
      });

      await saveCustomItemsToCloud(newItems);
      onItemsAdded(newItems);

      setSuccessMessage(`Added ${newItems.length} item${newItems.length > 1 ? 's' : ''} to your portfolio catalog.`);
      setRows([newRow()]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save items. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 sm:p-8 rounded-[28px] bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-space-grotesk font-bold text-xl">Bulk Add from Drive Links</h2>
            <p className="text-xs text-white/60 font-mono mt-0.5">
              Paste any Google Drive share link ("Anyone with the link — Viewer") + a title. No upload, no OAuth — instant.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 space-y-3">
        <label className="text-xs font-bold uppercase tracking-widest text-indigo-500 font-space-grotesk flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> Bulk Paste (paste many links at once)
        </label>
        <textarea
          value={bulkPasteText}
          onChange={(e) => setBulkPasteText(e.target.value)}
          placeholder={'Paste multiple Drive links here — comma separated, one per line, or however you copied them:\nhttps://drive.google.com/file/d/AAA.../view, https://drive.google.com/file/d/BBB.../view'}
          rows={5}
          className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-2xl text-sm text-slate-900 font-mono focus:outline-none focus:border-indigo-500 resize-y"
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-500">Titles are auto-filled as "Untitled Item 1, 2..." — rename them in the rows below.</p>
          <button
            onClick={handleBulkParse}
            disabled={!bulkPasteText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-space-grotesk font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Parse Links Into Rows
          </button>
        </div>
      </div>

      <div className="p-6 rounded-3xl border border-slate-200 bg-white space-y-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-xs font-bold uppercase tracking-widest text-slate-400 font-space-grotesk">
            Default Category (used when a row's category is left blank)
          </label>
          <input
            type="text"
            list="existing-categories-list"
            value={defaultCategory}
            onChange={(e) => setDefaultCategory(e.target.value)}
            placeholder="e.g. Branding"
            className="w-56 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
          />
          <datalist id="existing-categories-list">
            {existingCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_120px_110px_auto] gap-2 items-center p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <input
                type="text"
                value={row.title}
                onChange={(e) => updateRow(row.id, { title: e.target.value })}
                placeholder={`Title #${idx + 1} (e.g. Lumina Packaging Mockup)`}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={row.driveUrl}
                onChange={(e) => updateRow(row.id, { driveUrl: e.target.value })}
                placeholder="https://drive.google.com/file/d/..."
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <input
                type="text"
                list="existing-categories-list"
                value={row.category}
                onChange={(e) => updateRow(row.id, { category: e.target.value })}
                placeholder="Category"
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={row.subcategory}
                onChange={(e) => updateRow(row.id, { subcategory: e.target.value })}
                placeholder="Subcategory (e.g. Car)"
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer justify-self-end"
                title="Remove row"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-space-grotesk font-bold text-slate-600 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add Another Link
        </button>

        {errorMessage && (
          <p className="text-xs text-rose-600 font-space-grotesk font-semibold">{errorMessage}</p>
        )}
        {successMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-space-grotesk font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-slate-400 font-mono">
            {validRows.length} of {rows.length} row{rows.length > 1 ? 's' : ''} ready ({rows.length - validRows.length} incomplete)
          </p>
          <button
            onClick={handleCreateItems}
            disabled={isSaving || validRows.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-space-grotesk font-bold text-xs shadow-lg shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isSaving ? 'Adding...' : `Add ${validRows.length || ''} to Portfolio`}</span>
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-space-grotesk flex items-start gap-2.5">
        <ExternalLink className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Make sure each Drive file's sharing is set to <strong>"Anyone with the link — Viewer"</strong>, otherwise the thumbnail
          won't load for clients viewing the showcase (even though you can see it fine while logged into your own Google account).
        </span>
      </div>
    </div>
  );
};
