import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  UploadCloud,
  Folder,
  Tag,
  Link as LinkIcon,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HardDrive,
  ExternalLink,
  Sparkles,
  FileCheck,
  Check,
  UserCheck,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { PortfolioItem } from '../types/portfolio';
import { detectMediaType, getDriveThumb } from '../data/rawPortfolioData';
import {
  requestDriveAccessToken,
  uploadFileToGoogleDrive,
  getStoredDriveAuth,
  clearDriveToken,
  connectGoogleDriveAccount,
  DriveAuthUser,
} from '../utils/googleDrive';

interface AddCustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: PortfolioItem) => void;
  availableCategories: string[];
}

export const AddCustomItemModal: React.FC<AddCustomItemModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  availableCategories,
}) => {
  // Mode: 'drive_upload' | 'drive_link'
  const [activeTab, setActiveTab] = useState<'drive_upload' | 'drive_link'>('drive_upload');

  // Google Drive Auth State
  const [driveAuth, setDriveAuth] = useState<DriveAuthUser | null>(null);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState(availableCategories[0] || 'Brand Identity');
  const [customCategory, setCustomCategory] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [behanceLink, setBehanceLink] = useState('');
  const [keywordsStr, setKeywordsStr] = useState('');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [uploadedDriveUrl, setUploadedDriveUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredDriveAuth();
      setDriveAuth(stored);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectDrive = async () => {
    try {
      setIsConnectingDrive(true);
      setErrorMessage(null);
      const auth = await connectGoogleDriveAccount(true);
      setDriveAuth(auth);
    } catch (err: any) {
      console.error('Google Drive connection error', err);
      setErrorMessage(
        err.message || 'Could not connect Google Drive. Please verify popups are allowed in your browser.'
      );
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = () => {
    clearDriveToken();
    setDriveAuth(null);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setUploadStatus('idle');
    setUploadedDriveUrl(null);

    // Auto-populate Title if empty
    if (!name.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      setName(cleanName);
    }

    // Create local object URL for instant preview
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Upload file directly to user's Google Drive via OAuth token
  const handleDriveUploadAndSave = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload to Google Drive.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter a title for this portfolio project.');
      return;
    }

    setUploadStatus('uploading');
    setErrorMessage(null);
    setUploadProgress(5);
    setStatusMessage('Connecting to Google Drive...');

    try {
      // 1. Get access token
      let token = driveAuth?.token;
      if (!token) {
        token = await requestDriveAccessToken();
        setDriveAuth(getStoredDriveAuth());
      }

      // 2. Upload file (into a Drive folder matching the chosen category)
      const folderNameForUpload = customCategory.trim() ? customCategory.trim() : category;
      const result = await uploadFileToGoogleDrive(
        selectedFile,
        token,
        (progress, msg) => {
          setUploadProgress(progress);
          setStatusMessage(msg);
        },
        folderNameForUpload
      );

      setUploadedDriveUrl(result.webViewLink);
      setUploadStatus('success');

      // 3. Assemble Portfolio Item
      const finalCategory = customCategory.trim() ? customCategory.trim() : category;
      const mediaType = detectMediaType(selectedFile.name, result.webViewLink);
      const keywords = keywordsStr
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);

      const newItem: PortfolioItem = {
        id: 'drive-' + Date.now(),
        name: name.trim(),
        category: finalCategory,
        drive_link: result.webViewLink,
        behance_link: behanceLink.trim() || null,
        thumb: getDriveThumb(result.webViewLink, 800) || previewUrl,
        thumb_small: getDriveThumb(result.webViewLink, 400) || previewUrl,
        thumb_large: getDriveThumb(result.webViewLink, 1400) || previewUrl,
        mediaType,
        keywords: keywords.length > 0 ? keywords : [finalCategory.toLowerCase(), 'google drive'],
        custom: true,
      };

      // Add to catalog & showcase
      setTimeout(() => {
        onAddItem(newItem);
        onClose();
        resetForm();
      }, 1000);
    } catch (err: any) {
      console.error('Google Drive upload error', err);
      setUploadStatus('error');
      setErrorMessage(
        err.message || 'Google Drive authorization failed. Please click "Connect Google Drive" first or paste the Drive link manually.'
      );
    }
  };

  // Submit via manual Drive link
  const handleManualLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !driveLink.trim()) {
      setErrorMessage('Please provide both a title and Google Drive link.');
      return;
    }

    const finalCategory = customCategory.trim() ? customCategory.trim() : category;
    const mediaType = detectMediaType(name, driveLink);
    const keywords = keywordsStr
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    const newItem: PortfolioItem = {
      id: 'custom-' + Date.now(),
      name: name.trim(),
      category: finalCategory,
      drive_link: driveLink.trim(),
      behance_link: behanceLink.trim() || null,
      thumb: getDriveThumb(driveLink.trim(), 800),
      thumb_small: getDriveThumb(driveLink.trim(), 400),
      thumb_large: getDriveThumb(driveLink.trim(), 1400),
      mediaType,
      keywords: keywords.length > 0 ? keywords : [finalCategory.toLowerCase()],
      custom: true,
    };

    onAddItem(newItem);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setDriveLink('');
    setBehanceLink('');
    setKeywordsStr('');
    setCustomCategory('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setStatusMessage('');
    setUploadedDriveUrl(null);
    setErrorMessage(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2100] flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 max-w-xl w-full bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-space-grotesk font-bold text-base sm:text-lg text-slate-900">
                  Add New Portfolio Design
                </h2>
                <p className="text-xs font-mono text-slate-500">
                  Directly upload to your Google Drive or link existing items
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

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('drive_upload')}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-space-grotesk font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'drive_upload'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <HardDrive className="w-4 h-4 text-indigo-600" />
              <span>Direct Upload to My Drive</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded-full">New</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('drive_link')}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-space-grotesk font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'drive_link'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <LinkIcon className="w-4 h-4 text-slate-500" />
              <span>Paste Google Drive URL</span>
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">{errorMessage}</div>
              </div>
            )}

            {/* TAB 1: DIRECT DRIVE UPLOAD */}
            {activeTab === 'drive_upload' && (
              <div className="space-y-4">
                {/* Google Drive Account Connection Banner */}
                <div className="p-4 rounded-2xl border transition-all bg-gradient-to-r from-slate-50 to-indigo-50/40 border-indigo-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                        {driveAuth?.profile?.picture ? (
                          <img
                            src={driveAuth.profile.picture}
                            alt="Google user"
                            className="w-full h-full rounded-xl object-cover"
                          />
                        ) : (
                          <HardDrive className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-space-grotesk font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>Google Drive Account</span>
                          {driveAuth ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <Check className="w-3 h-3" /> Connected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700 text-[10px] font-medium">
                              Not Connected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-500">
                          {driveAuth?.profile?.email
                            ? driveAuth.profile.email
                            : driveAuth
                            ? 'Authorized & Ready to Upload'
                            : 'Connect your Google account to enable direct file uploads'}
                        </p>
                      </div>
                    </div>

                    <div>
                      {driveAuth ? (
                        <button
                          type="button"
                          onClick={handleDisconnectDrive}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 font-space-grotesk font-semibold text-[11px] transition-all cursor-pointer shadow-sm"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>Disconnect</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConnectDrive}
                          disabled={isConnectingDrive}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-space-grotesk font-bold text-[11px] transition-all cursor-pointer shadow-md shadow-indigo-100 disabled:opacity-50"
                        >
                          {isConnectingDrive ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Connecting...</span>
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Connect Google Drive</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* File Dropzone */}
                <div>
                  <label className="block text-slate-900 font-space-grotesk font-bold mb-1.5">
                    Select Image or Design Asset *
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    accept="image/*,video/mp4,application/pdf"
                    className="hidden"
                  />

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                        : selectedFile
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    {previewUrl ? (
                      <div className="relative mb-3 group">
                        <img
                          src={previewUrl}
                          alt="Upload preview"
                          className="h-28 max-w-full object-contain rounded-2xl border border-slate-200 shadow-md bg-white p-1"
                        />
                        <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center text-white text-[11px] font-space-grotesk font-bold transition-opacity">
                          Change file
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                    )}

                    {selectedFile ? (
                      <div className="space-y-1">
                        <div className="font-space-grotesk font-bold text-slate-900 text-sm flex items-center justify-center gap-1.5">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <span className="truncate max-w-[280px]">{selectedFile.name}</span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload to Drive
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="font-space-grotesk font-bold text-slate-800 text-sm">
                          Drag & drop design file here, or click to browse
                        </div>
                        <p className="text-xs text-slate-500">
                          Supports high-res PNG, JPG, WebP, MP4, GIF (Will be saved in your Google Drive)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Progress Status */}
                {uploadStatus === 'uploading' && (
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-space-grotesk font-bold text-indigo-900">
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        {statusMessage || 'Uploading to Google Drive...'}
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-indigo-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {uploadStatus === 'success' && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-xs font-space-grotesk font-semibold">
                      Successfully uploaded to your Google Drive and added to catalog!
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MANUAL DRIVE LINK */}
            {activeTab === 'drive_link' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-900 font-space-grotesk font-bold mb-1.5">
                    Google Drive or Direct Image URL *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={driveLink}
                      onChange={(e) => setDriveLink(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono text-xs shadow-inner"
                    />
                    <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mt-1">
                    Paste any public Google Drive view link; it will automatically render in HD.
                  </p>
                </div>
              </div>
            )}

            {/* Common Details: Title, Category, Keywords, Behance */}
            <div className="space-y-4 pt-1">
              {/* Title */}
              <div>
                <label className="block text-slate-900 font-space-grotesk font-bold mb-1.5">
                  Portfolio Item Title / Description *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lumina Luxury Fragrance Packaging"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-space-grotesk text-sm shadow-inner"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-slate-900 font-space-grotesk font-bold mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-space-grotesk text-xs"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Or type new category..."
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-space-grotesk text-xs shadow-inner"
                  />
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-slate-900 font-space-grotesk font-bold mb-1.5">
                  Keywords & Tags (comma separated)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={keywordsStr}
                    onChange={(e) => setKeywordsStr(e.target.value)}
                    placeholder="luxury, branding, packaging, 3d, foil"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono text-xs shadow-inner"
                  />
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Behance Link (Optional) */}
              <div>
                <label className="block text-slate-900 font-space-grotesk font-bold mb-1.5">
                  Behance or External Case Study (Optional)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={behanceLink}
                    onChange={(e) => setBehanceLink(e.target.value)}
                    placeholder="https://behance.net/gallery/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono text-xs shadow-inner"
                  />
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-space-grotesk font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>

            {activeTab === 'drive_upload' ? (
              <button
                type="button"
                onClick={handleDriveUploadAndSave}
                disabled={uploadStatus === 'uploading' || !selectedFile}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-space-grotesk font-bold text-xs shadow-lg shadow-indigo-200 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {uploadStatus === 'uploading' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading to Drive...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload & Add to Portfolio</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleManualLinkSubmit}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-space-grotesk font-bold text-xs shadow-lg shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item via Link</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
