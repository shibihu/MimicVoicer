'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  UploadCloud,
  Play,
  Pause,
  Clock,
  Plus,
  Trash2,
  Split,
  GitMerge,
  Undo2,
  Redo2,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  FileAudio,
  Sliders,
  Mic,
  Zap,
  Activity,
  Layers,
  BarChart3,
  FileText,
  Volume2
} from 'lucide-react';

import { WaveformPlayer } from '@/components/WaveformPlayer';

interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence?: number | null;
  orderIndex: number;
}

interface AudioAsset {
  id: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  duration: number;
  assetType: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  language: string;
  duration: number;
  originalAudioAssetId: string | null;
  assets: AudioAsset[];
  segments: Segment[];
}

async function readJsonResponse<T>(response: Response, action: string): Promise<T> {
  const body = await response.text();

  if (!body.trim()) {
    throw new Error(`${action} returned an empty response (HTTP ${response.status}).`);
  }

  let data: T;
  try {
    data = JSON.parse(body) as T;
  } catch {
    throw new Error(`${action} returned invalid JSON (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const error =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `${action} failed (HTTP ${response.status}).`;
    throw new Error(error);
  }

  return data;
}

export default function HomePage() {
  const [project, setProject] = useState<Project | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [history, setHistory] = useState<Segment[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [seekToTime, setSeekToTime] = useState<number>(0);

  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [selectedProvider, setSelectedProvider] = useState('fallback');

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [projectInitError, setProjectInitError] = useState<string | null>(null);

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const initDefaultProject = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const projects = await readJsonResponse<Project[]>(res, 'Loading projects');
      if (!Array.isArray(projects)) {
        throw new Error('The projects API returned an invalid response.');
      }
      setProjectInitError(null);

      if (Array.isArray(projects) && projects.length > 0) {
        const defaultProj = projects[0];
        setProject(defaultProj);
        setSegments(defaultProj.segments || []);
        setHistory([defaultProj.segments || []]);
        setHistoryIndex(0);
        if (defaultProj.segments && defaultProj.segments.length > 0) {
          setSelectedSegmentId(defaultProj.segments[0].id);
        }
      } else {
        const createRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'MimicVoicer Main Studio Session' }),
        });
        const newProj = await readJsonResponse<Project>(createRes, 'Creating a project');
        setProject(newProj);
        setSegments(newProj.segments || []);
        setHistory([newProj.segments || []]);
        setHistoryIndex(0);
      }
    } catch (err) {
      console.error('Project initialization error:', err);
      setProjectInitError(
        err instanceof Error ? err.message : 'Unable to initialize a project. Please try again.'
      );
    }
  }, []);

  useEffect(() => {
    void initDefaultProject();
  }, [initDefaultProject]);

  const updateSegmentsWithHistory = (newSegments: Segment[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newSegments);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setSegments(newSegments);
    if (project) {
      triggerAutosave(project.id, newSegments);
    }
  };

  const triggerAutosave = (projectId: string, segsToSave: Segment[]) => {
    setSaveStatus('unsaved');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        const res = await fetch(`/api/projects/${projectId}/segments`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segments: segsToSave }),
        });
        if (res.ok) {
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch (err) {
        console.error(err);
        setSaveStatus('error');
      }
    }, 1000);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setSegments(prev);
      if (project) triggerAutosave(project.id, prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setSegments(next);
      if (project) triggerAutosave(project.id, next);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!project) return;
    setUploadError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/projects/${project.id}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Upload failed');
      } else {
        setProject(data.project);
        handleStartTranscription(data.project.id);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error uploading audio file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartTranscription = async (targetProjectId?: string) => {
    const pId = targetProjectId || project?.id;
    if (!pId) return;

    setTranscribeError(null);
    setIsTranscribing(true);

    try {
      const res = await fetch(`/api/projects/${pId}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, language: selectedLanguage }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTranscribeError(data.error || 'Transcription failed');
      } else {
        setProject(data.project);
        setSegments(data.project.segments || []);
        setHistory([data.project.segments || []]);
        setHistoryIndex(0);
        if (data.project.segments && data.project.segments.length > 0) {
          setSelectedSegmentId(data.project.segments[0].id);
        }
      }
    } catch (err: any) {
      setTranscribeError(err.message || 'Transcription error occurred');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSegmentTextChange = (id: string, text: string) => {
    const newSegs = segments.map((s) => (s.id === id ? { ...s, text } : s));
    updateSegmentsWithHistory(newSegs);
  };

  const handleSegmentTimeChange = (id: string, field: 'startTime' | 'endTime', value: number) => {
    const val = Math.max(0, value);
    const newSegs = segments.map((s) => {
      if (s.id === id) {
        if (field === 'startTime') {
          return { ...s, startTime: Math.min(val, s.endTime) };
        } else {
          return { ...s, endTime: Math.max(val, s.startTime) };
        }
      }
      return s;
    });
    updateSegmentsWithHistory(newSegs);
  };

  const handleSplitSegment = (id: string) => {
    const segIndex = segments.findIndex((s) => s.id === id);
    if (segIndex === -1) return;

    const target = segments[segIndex];
    const midTime = target.startTime + (target.endTime - target.startTime) / 2;
    const words = target.text.split(' ');
    const half = Math.ceil(words.length / 2);
    const text1 = words.slice(0, half).join(' ');
    const text2 = words.slice(half).join(' ');

    const seg1: Segment = {
      ...target,
      endTime: Number(midTime.toFixed(3)),
      text: text1 || target.text,
    };

    const seg2: Segment = {
      id: `seg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      startTime: Number(midTime.toFixed(3)),
      endTime: target.endTime,
      text: text2 || '',
      confidence: target.confidence,
      orderIndex: target.orderIndex + 1,
    };

    const newSegs = [...segments];
    newSegs.splice(segIndex, 1, seg1, seg2);
    const reordered = newSegs.map((s, idx) => ({ ...s, orderIndex: idx }));
    updateSegmentsWithHistory(reordered);
    setSelectedSegmentId(seg2.id);
  };

  const handleMergeSegmentWithNext = (id: string) => {
    const segIndex = segments.findIndex((s) => s.id === id);
    if (segIndex === -1 || segIndex >= segments.length - 1) return;

    const curr = segments[segIndex];
    const next = segments[segIndex + 1];

    const merged: Segment = {
      ...curr,
      endTime: next.endTime,
      text: `${curr.text} ${next.text}`.trim(),
    };

    const newSegs = [...segments];
    newSegs.splice(segIndex, 2, merged);
    const reordered = newSegs.map((s, idx) => ({ ...s, orderIndex: idx }));
    updateSegmentsWithHistory(reordered);
    setSelectedSegmentId(merged.id);
  };

  const handleDeleteSegment = (id: string) => {
    if (segments.length <= 1) return;
    const newSegs = segments.filter((s) => s.id !== id);
    const reordered = newSegs.map((s, idx) => ({ ...s, orderIndex: idx }));
    updateSegmentsWithHistory(reordered);
    if (selectedSegmentId === id) {
      setSelectedSegmentId(reordered[0]?.id || null);
    }
  };

  const handleAddSegmentAfter = (id: string) => {
    const segIndex = segments.findIndex((s) => s.id === id);
    const curr = segments[segIndex] || { endTime: 0, orderIndex: 0 };
    const startTime = curr.endTime;
    const endTime = startTime + 3.0;

    const newSeg: Segment = {
      id: `seg_${Date.now()}`,
      startTime: Number(startTime.toFixed(3)),
      endTime: Number(endTime.toFixed(3)),
      text: 'New transcript segment text...',
      confidence: 1.0,
      orderIndex: (curr.orderIndex || 0) + 1,
    };

    const newSegs = [...segments];
    newSegs.splice(segIndex + 1, 0, newSeg);
    const reordered = newSegs.map((s, idx) => ({ ...s, orderIndex: idx }));
    updateSegmentsWithHistory(reordered);
    setSelectedSegmentId(newSeg.id);
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    const matchingSeg = segments.find((s) => time >= s.startTime && time <= s.endTime);
    if (matchingSeg) {
      setActiveSegmentId(matchingSeg.id);
    }
  };

  const handleSegmentClick = (seg: Segment) => {
    setSelectedSegmentId(seg.id);
    setSeekToTime(seg.startTime);
  };

  const handleExport = (format: string) => {
    if (project) {
      window.open(`/api/projects/${project.id}/export?format=${format}`, '_blank');
    }
  };

  const audioAsset = project?.assets?.find((a) => a.id === project.originalAudioAssetId) || project?.assets?.[0];
  const audioUrl = audioAsset ? `/api/audio/${audioAsset.id}` : null;
  const selectedSegment = segments.find((s) => s.id === selectedSegmentId);

  const filteredSegments = segments.filter((s) =>
    s.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const avgConfidence = segments.length > 0
    ? Math.round(
        (segments.reduce((acc, curr) => acc + (curr.confidence ?? 0.95), 0) / segments.length) * 100
      )
    : 98;

  const totalWords = segments.reduce((acc, curr) => acc + curr.text.split(/\s+/).filter(Boolean).length, 0);

  const formatTimestamp = (secs: number) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 1000);
    return `${pad(m)}:${pad(s)}.${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className="studio-shell flex-1 flex flex-col text-slate-100 min-h-screen">
      {projectInitError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 border-b border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200 lg:px-6"
        >
          <span>Unable to load the studio project: {projectInitError}</span>
          <button
            type="button"
            onClick={initDefaultProject}
            className="shrink-0 rounded-lg border border-rose-700/60 px-3 py-1.5 font-semibold hover:bg-rose-900/40"
          >
            Retry
          </button>
        </div>
      )}

      {/* Studio Topbar */}
      <div className="studio-topbar border-b px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={project?.name || ''}
            onChange={(e) => project && setProject({ ...project, name: e.target.value })}
            onBlur={async () => {
              if (project) {
                await fetch(`/api/projects/${project.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: project.name }),
                });
              }
            }}
            className="bg-transparent hover:bg-slate-900/80 focus:bg-slate-900 border border-transparent focus:border-purple-500/50 rounded-lg px-2.5 py-1 font-extrabold text-lg text-white transition-all focus:outline-none"
            placeholder="Studio Session Name..."
          />

          <span className="text-xs px-3 py-1 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40 font-mono font-semibold flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-purple-400" />
            <span>{segments.length} segments</span>
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#10121b] border border-slate-800 p-1 rounded-xl">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all"
              title="Undo change"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all"
              title="Redo change"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#10121b] border border-slate-800 shadow-inner">
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">All Changes Saved</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span className="text-purple-300">Saving edits...</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-400">Unsaved edits</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span className="text-rose-400">Save failed</span>
              </>
            )}
          </div>

          <div className="relative group">
            <button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold px-4 py-1.5 rounded-xl text-xs shadow-lg shadow-purple-950/50 transition-all">
              <Download className="w-3.5 h-3.5" />
              <span>Export Subtitles</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-52 bg-[#10121b] border border-purple-900/40 rounded-2xl shadow-2xl p-2 hidden group-hover:block z-50 backdrop-blur-xl">
              <button
                onClick={() => handleExport('srt')}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-purple-950/50 text-slate-200 flex items-center justify-between transition-colors"
              >
                <span className="font-medium">SubRip Subtitles</span>
                <span className="font-mono text-purple-400 text-[10px] font-bold bg-purple-900/40 px-1.5 py-0.5 rounded">.SRT</span>
              </button>
              <button
                onClick={() => handleExport('vtt')}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-purple-950/50 text-slate-200 flex items-center justify-between transition-colors"
              >
                <span className="font-medium">WebVTT Subtitles</span>
                <span className="font-mono text-purple-400 text-[10px] font-bold bg-purple-900/40 px-1.5 py-0.5 rounded">.VTT</span>
              </button>
              <button
                onClick={() => handleExport('txt')}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-purple-950/50 text-slate-200 flex items-center justify-between transition-colors"
              >
                <span className="font-medium">Plain Text</span>
                <span className="font-mono text-purple-400 text-[10px] font-bold bg-purple-900/40 px-1.5 py-0.5 rounded">.TXT</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-purple-950/50 text-slate-200 flex items-center justify-between transition-colors"
              >
                <span className="font-medium">Timestamped JSON</span>
                <span className="font-mono text-purple-400 text-[10px] font-bold bg-purple-900/40 px-1.5 py-0.5 rounded">.JSON</span>
              </button>
              {audioUrl && (
                <div className="pt-2 mt-1 border-t border-slate-800">
                  <a
                    href={audioUrl}
                    download={audioAsset?.originalFilename || 'original_audio'}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-emerald-950/40 text-emerald-400 flex items-center justify-between font-bold transition-colors"
                  >
                    <span>Original Lossless Audio</span>
                    <span className="font-mono text-[10px] bg-emerald-900/40 px-1.5 py-0.5 rounded">RAW</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Workstation Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT SIDEBAR: Audio Asset & Speech Engine Config */}
        <aside className="studio-sidebar w-full lg:w-80 border-r p-4 flex flex-col gap-6 shrink-0 overflow-y-auto">
          {/* Master Audio Asset Card */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileAudio className="w-4 h-4 text-purple-400" />
              <span>Master Audio Asset</span>
            </h3>

            {audioAsset ? (
              <div className="studio-card p-4 space-y-3 border-purple-900/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate" title={audioAsset.originalFilename}>
                      {audioAsset.originalFilename}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {(audioAsset.fileSize / (1024 * 1024)).toFixed(2)} MB • {audioAsset.mimeType.split('/')[1]?.toUpperCase() || 'AUDIO'}
                    </p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    READY
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80 font-mono">
                  <span className="text-slate-400">Duration:</span>
                  <span className="text-purple-300 font-bold">{project?.duration ? `${project.duration.toFixed(1)}s` : 'Loaded'}</span>
                </div>

                {audioUrl && (
                  <a
                    href={audioUrl}
                    download={audioAsset.originalFilename}
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold py-2 rounded-xl border border-slate-800 transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-400" />
                    <span>Download Master Recording</span>
                  </a>
                )}
              </div>
            ) : (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                }}
                className="flex flex-col items-center justify-center border-2 border-dashed border-purple-900/40 hover:border-purple-500/60 bg-[#10121b] rounded-2xl p-6 cursor-pointer transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-xs font-bold text-slate-200">Drag & Drop Audio Master</span>
                <span className="text-[10px] text-slate-400 mt-1">Supports MP3, WAV, M4A, FLAC, OGG, WebM</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
            )}

            {uploadError && (
              <p className="text-xs text-rose-400 mt-2 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-xl font-medium">
                {uploadError}
              </p>
            )}
          </div>

          {/* STT Engine Selector */}
          <div id="stt-engine" className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-blue-400" />
              <span>STT Speech Recognition Engine</span>
            </h3>

            <div className="space-y-2.5 studio-card p-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 block">Primary Language</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-[#0b0c14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500/60"
                >
                  <option value="auto">Auto-Detect Language</option>
                  <option value="en">English (US/UK)</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="fr">French (Français)</option>
                  <option value="de">German (Deutsch)</option>
                  <option value="zh">Chinese (Mandarin)</option>
                  <option value="ja">Japanese (日本語)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 block">Recognition Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full bg-[#0b0c14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500/60"
                >
                  <option value="fallback">MimicVoicer Engine (Fallback / Offline Studio)</option>
                  <option value="whisper">OpenAI Whisper API</option>
                  <option value="deepgram">Deepgram Nova-2</option>
                </select>
              </div>

              <button
                onClick={() => handleStartTranscription()}
                disabled={isTranscribing || !audioAsset}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-purple-950/50 transition-all disabled:opacity-40 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isTranscribing ? 'Processing Speech-to-Text...' : 'Run Speech Recognition'}</span>
              </button>

              {transcribeError && (
                <p className="text-xs text-rose-400 mt-2 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-xl font-medium">
                  {transcribeError}
                </p>
              )}
            </div>
          </div>

          {/* Master Voice Integrity Guarantee */}
          <div className="mt-auto studio-card p-4 space-y-2 border-emerald-900/30">
            <div className="flex items-center gap-2 font-bold text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Master Voice Preserved</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Editing transcript text or timing will never overwrite, distort, or re-encode your original audio file.
            </p>
          </div>
        </aside>

        {/* CENTER WORKSPACE */}
        <main className="studio-workspace flex-1 flex flex-col p-4 lg:p-6 gap-5 overflow-y-auto">
          {/* Header Banner */}
          <section className="studio-intro">
            <div className="min-w-0">
              <div className="studio-kicker">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <span>Audio Workspace</span>
                <span className="text-purple-400/50">/</span>
                <span className="text-slate-300">Overview Dashboard</span>
              </div>
              <h1 className="studio-intro-title">
                Precision Transcript & Timing Studio
              </h1>
              <p className="studio-intro-copy">
                Review, split, merge, and fine-tune word boundaries with live audio playback.
              </p>
            </div>
            <div className="studio-intro-badge">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Master Lossless Audio</span>
            </div>
          </section>

          {/* Studio Metrics Overview Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="studio-card p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Segments</p>
                <p className="text-lg font-extrabold text-white font-mono">{segments.length}</p>
              </div>
            </div>

            <div className="studio-card p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Duration</p>
                <p className="text-lg font-extrabold text-white font-mono">
                  {project?.duration ? `${project.duration.toFixed(1)}s` : '0.0s'}
                </p>
              </div>
            </div>

            <div className="studio-card p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Confidence</p>
                <p className="text-lg font-extrabold text-emerald-400 font-mono">{avgConfidence}%</p>
              </div>
            </div>

            <div className="studio-card p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Word Count</p>
                <p className="text-lg font-extrabold text-white font-mono">{totalWords}</p>
              </div>
            </div>
          </div>

          {/* Audio Waveform Player Component */}
          <WaveformPlayer
            audioUrl={audioUrl}
            currentTime={seekToTime}
            onSeek={(t) => setCurrentTime(t)}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={(d) => project && setProject({ ...project, duration: d })}
          />

          {/* Search Bar & Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 studio-card p-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search transcript text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0b0c14] border border-slate-800 rounded-xl pl-10 pr-24 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                {filteredSegments.length} of {segments.length}
              </span>
            </div>

            <button
              onClick={() => handleAddSegmentAfter(segments[segments.length - 1]?.id || '')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Segment</span>
            </button>
          </div>

          {/* Transcript Segment List Cards */}
          <div className="space-y-3 flex-1">
            {filteredSegments.length === 0 ? (
              <div className="studio-card p-12 text-center text-slate-400 text-xs border-dashed space-y-2">
                <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="font-semibold text-slate-300">No transcript segments match your search query.</p>
                <p className="text-[11px] text-slate-500">Try clearing your search query or uploading an audio file.</p>
              </div>
            ) : (
              filteredSegments.map((seg, idx) => {
                const isSelected = seg.id === selectedSegmentId;
                const isActive = seg.id === activeSegmentId;

                return (
                  <div
                    key={seg.id}
                    onClick={() => handleSegmentClick(seg)}
                    className={`studio-card p-4 transition-all duration-200 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      isSelected
                        ? 'segment-card-selected'
                        : isActive
                        ? 'segment-card-active'
                        : 'hover:border-purple-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono bg-[#0b0c14] border border-purple-900/40 px-3 py-1.5 rounded-xl text-purple-300 shrink-0 font-semibold shadow-inner">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>
                          [{formatTimestamp(seg.startTime)} - {formatTimestamp(seg.endTime)}]
                        </span>
                      </div>

                      {seg.confidence !== undefined && seg.confidence !== null && (
                        <span className="hidden sm:inline-block px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {Math.round(seg.confidence * 100)}% Match
                        </span>
                      )}
                    </div>

                    <div className="flex-1 w-full">
                      <textarea
                        value={seg.text}
                        onChange={(e) => handleSegmentTextChange(seg.id, e.target.value)}
                        rows={2}
                        className="w-full bg-transparent border-0 focus:ring-0 text-slate-100 text-sm font-medium focus:outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSplitSegment(seg.id);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-purple-200 hover:bg-purple-950/60 transition-all border border-transparent hover:border-purple-800/40"
                        title="Split segment into two"
                      >
                        <Split className="w-4 h-4" />
                      </button>

                      {idx < segments.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMergeSegmentWithNext(seg.id);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-200 hover:bg-blue-950/60 transition-all border border-transparent hover:border-blue-800/40"
                          title="Merge with next segment"
                        >
                          <GitMerge className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSegment(seg.id);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 transition-all border border-transparent hover:border-rose-800/40"
                        title="Delete segment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>

        {/* RIGHT SIDEBAR: Fine-Tuning & Mimic Mode */}
        <aside id="fine-tuning" className="studio-sidebar w-full lg:w-80 border-l p-4 flex flex-col gap-6 shrink-0 overflow-y-auto">
          {selectedSegment ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Segment Fine-Tuning</span>
              </h3>

              <div className="studio-card p-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Start Boundary (Sec)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedSegment.startTime}
                    onChange={(e) => handleSegmentTimeChange(selectedSegment.id, 'startTime', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0b0c14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-500/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">End Boundary (Sec)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedSegment.endTime}
                    onChange={(e) => handleSegmentTimeChange(selectedSegment.id, 'endTime', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0b0c14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-purple-300 font-mono font-bold focus:outline-none focus:border-purple-500/60"
                  />
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Segment Duration:</span>
                    <span className="font-mono text-purple-300 font-bold">
                      {(selectedSegment.endTime - selectedSegment.startTime).toFixed(2)}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-slate-400 font-medium">Confidence Score:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {selectedSegment.confidence ? `${Math.round(selectedSegment.confidence * 100)}%` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="studio-card p-6 text-center text-xs text-slate-500">
              Select a segment from the transcript list to fine-tune timestamps.
            </div>
          )}

          {/* Mimic Mode Synthetic Audio Card */}
          <div className="studio-card p-4 space-y-3 border-purple-800/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-purple-200">Mimic Voice Generator</h3>
              <span className="ml-auto text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                PRO ENGINE
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Synthesize voice recordings matching updated text rhythm while preserving original master audio.
            </p>

            <div className="bg-[#0b0c14] border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Synthetic Voice Gen:</span>
                <span className="text-amber-400 font-semibold">Engine Ready</span>
              </div>
              <div className="flex justify-between">
                <span>Speaker Profile:</span>
                <span className="text-emerald-400 font-mono font-semibold">Lossless Preserved</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
