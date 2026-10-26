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
      {/* Studio Header Bar */}
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
            className="bg-transparent hover:bg-slate-900 focus:bg-slate-900 border border-transparent focus:border-purple-500/50 rounded-lg px-2.5 py-1 font-extrabold text-lg text-white transition-all focus:outline-none"
            placeholder="Studio Project Name..."
          />

          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
            {segments.length} segments
          </span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              title="Undo change"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              title="Redo change"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
            {saveStatus === 'saved' && (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Saved</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span className="text-purple-300">Saving...</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-yellow-400">Unsaved edits</span>
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
            <button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-4 py-1.5 rounded-xl text-xs shadow-md transition-all">
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-[#12141c] border border-slate-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-50">
              <button
                onClick={() => handleExport('srt')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 flex items-center justify-between"
              >
                <span>SubRip Subtitles</span>
                <span className="font-mono text-purple-400 text-[10px]">.SRT</span>
              </button>
              <button
                onClick={() => handleExport('vtt')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 flex items-center justify-between"
              >
                <span>WebVTT Subtitles</span>
                <span className="font-mono text-purple-400 text-[10px]">.VTT</span>
              </button>
              <button
                onClick={() => handleExport('txt')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 flex items-center justify-between"
              >
                <span>Plain Text</span>
                <span className="font-mono text-purple-400 text-[10px]">.TXT</span>
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 flex items-center justify-between"
              >
                <span>Timestamped JSON</span>
                <span className="font-mono text-purple-400 text-[10px]">.JSON</span>
              </button>
              {audioUrl && (
                <div className="pt-1.5 mt-1 border-t border-slate-800">
                  <a
                    href={audioUrl}
                    download={audioAsset?.originalFilename || 'original_audio'}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-slate-800 text-emerald-400 flex items-center justify-between font-semibold"
                  >
                    <span>Original Audio</span>
                    <span className="font-mono text-[10px]">RAW</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio 3-Column Workstation Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT SIDEBAR: Project & Audio Asset Info */}
        <aside className="studio-sidebar w-full lg:w-72 border-r p-4 flex flex-col gap-6 shrink-0 overflow-y-auto">
          {/* Audio Drag & Drop Upload Card */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <FileAudio className="w-4 h-4 text-purple-400" />
              <span>Master Audio Asset</span>
            </h3>

            {audioAsset ? (
              <div className="bg-[#12141c] border border-slate-800 rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-bold text-white truncate">{audioAsset.originalFilename}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Size: {(audioAsset.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                  <span className="font-mono text-purple-400">{project?.duration ? `${project.duration.toFixed(1)}s` : 'Loaded'}</span>
                </div>
                {audioUrl && (
                  <a
                    href={audioUrl}
                    download={audioAsset.originalFilename}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold py-1.5 rounded-lg border border-slate-800 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-400" />
                    <span>Download Original Master</span>
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
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-purple-500/50 bg-[#12141c] rounded-xl p-5 cursor-pointer transition-all text-center"
              >
                <UploadCloud className="w-8 h-8 text-purple-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">Drag & Drop Audio</span>
                <span className="text-[10px] text-slate-500 mt-1">MP3, WAV, M4A, AAC, FLAC, OGG, WebM</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
            )}

            {uploadError && (
              <p className="text-xs text-rose-400 mt-2 bg-rose-950/30 border border-rose-800/40 p-2 rounded-lg">
                {uploadError}
              </p>
            )}
          </div>

          {/* Speech-to-Text Recognition Engine Selection */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-blue-400" />
              <span>STT Recognition Engine</span>
            </h3>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Language</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-[#12141c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
              >
                <option value="auto">Auto-Detect Language</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 block">Recognition Provider</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full bg-[#12141c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
              >
                <option value="fallback">MimicVoicer Engine (Fallback/Demo)</option>
                <option value="whisper">OpenAI Whisper API</option>
                <option value="deepgram">Deepgram Nova-2</option>
              </select>
            </div>

            <button
              onClick={() => handleStartTranscription()}
              disabled={isTranscribing || !audioAsset}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 rounded-xl text-xs shadow-lg shadow-purple-900/30 transition-all disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isTranscribing ? 'Transcribing Audio...' : 'Run Speech Recognition'}</span>
            </button>

            {transcribeError && (
              <p className="text-xs text-rose-400 mt-2 bg-rose-950/30 border border-rose-800/40 p-2 rounded-lg">
                {transcribeError}
              </p>
            )}
          </div>

          {/* Original Audio Integrity Protection Card */}
          <div className="mt-auto bg-[#12141c] border border-slate-800/80 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Master Voice Preserved</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Editing transcript text will never re-encode, distort, or overwrite your original recording.
            </p>
          </div>
        </aside>

        {/* CENTER WORKSPACE: Waveform Player & Segment Editor */}
        <main className="studio-workspace flex-1 flex flex-col p-4 lg:p-6 gap-5 overflow-y-auto">
          <section className="studio-intro" aria-labelledby="studio-intro-title">
            <div className="min-w-0">
              <div className="studio-kicker">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Audio workspace</span>
                <span className="text-violet-400/50">/</span>
                <span className="text-slate-400">Transcript editor</span>
              </div>
              <h1 id="studio-intro-title" className="studio-intro-title">
                Bring every word into focus.
              </h1>
              <p className="studio-intro-copy">
                Refine your transcript and timing while your original recording stays untouched.
              </p>
            </div>
            <div className="studio-intro-badge">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>Original audio preserved</span>
            </div>
          </section>

          {/* Audio Waveform Player */}
          <WaveformPlayer
            audioUrl={audioUrl}
            currentTime={seekToTime}
            onSeek={(t) => setCurrentTime(t)}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={(d) => project && setProject({ ...project, duration: d })}
          />

          {/* Search Bar & Add Segment Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0e1017] border border-slate-800 p-3 rounded-2xl">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search transcript text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#12141c] border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <button
              onClick={() => handleAddSegmentAfter(segments[segments.length - 1]?.id || '')}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-slate-700 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-purple-400" />
              <span>Add Segment</span>
            </button>
          </div>

          {/* Transcript Segment Cards */}
          <div className="space-y-3 flex-1">
            {filteredSegments.length === 0 ? (
              <div className="border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
                No transcript segments found. Upload an audio file and run transcription to begin editing.
              </div>
            ) : (
              filteredSegments.map((seg, idx) => {
                const isSelected = seg.id === selectedSegmentId;
                const isActive = seg.id === activeSegmentId;

                return (
                  <div
                    key={seg.id}
                    onClick={() => handleSegmentClick(seg)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-[#151724] border-purple-500/60 shadow-lg shadow-purple-900/10'
                        : isActive
                        ? 'bg-[#11131f] border-purple-800/40'
                        : 'bg-[#0d0f17] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-purple-400 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-purple-500" />
                      <span>
                        [{formatTimestamp(seg.startTime)} - {formatTimestamp(seg.endTime)}]
                      </span>
                    </div>

                    <div className="flex-1 w-full">
                      <textarea
                        value={seg.text}
                        onChange={(e) => handleSegmentTextChange(seg.id, e.target.value)}
                        rows={2}
                        className="w-full bg-transparent border-0 focus:ring-0 text-slate-100 text-sm focus:outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSplitSegment(seg.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-950/40 transition-all"
                        title="Split segment"
                      >
                        <Split className="w-4 h-4" />
                      </button>

                      {idx < segments.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMergeSegmentWithNext(seg.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-blue-950/40 transition-all"
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all"
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

        {/* RIGHT SIDEBAR: Selected Segment Fine-Tuning & Mimic Mode */}
        <aside className="studio-sidebar w-full lg:w-80 border-l p-4 flex flex-col gap-6 shrink-0 overflow-y-auto">
          {selectedSegment ? (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>Segment Fine-Tuning</span>
              </h3>

              <div className="bg-[#12141c] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Start Time (Seconds)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedSegment.startTime}
                    onChange={(e) => handleSegmentTimeChange(selectedSegment.id, 'startTime', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0d0f17] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">End Time (Seconds)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedSegment.endTime}
                    onChange={(e) => handleSegmentTimeChange(selectedSegment.id, 'endTime', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0d0f17] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div className="flex justify-between items-center pt-2 text-xs border-t border-slate-800">
                  <span className="text-slate-400">Confidence Score:</span>
                  <span className="font-mono text-emerald-400">
                    {selectedSegment.confidence ? `${Math.round(selectedSegment.confidence * 100)}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center py-6">Select a segment to fine-tune timestamps.</div>
          )}

          <div className="border border-purple-500/30 bg-purple-950/20 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-purple-200">Mimic Mode</h3>
              <span className="ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/50">
                Future Feature
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Future releases will allow authorized users to generate synthetic speech matching edited text rhythm while keeping master recordings untouched.
            </p>

            <div className="bg-[#0b0c12] border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Synthetic Voice Gen:</span>
                <span className="text-yellow-400">Setup Required</span>
              </div>
              <div className="flex justify-between">
                <span>Speaker Authorization:</span>
                <span className="text-slate-500 font-mono">Pending</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
