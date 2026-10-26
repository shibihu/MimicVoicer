'use client';

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2, VolumeX, Activity, Radio, Sparkles } from 'lucide-react';

interface WaveformPlayerProps {
  audioUrl: string | null;
  currentTime: number;
  onSeek: (time: number) => void;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
}

export function WaveformPlayer({
  audioUrl,
  currentTime,
  onSeek,
  onTimeUpdate,
  onDurationChange,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [duration, setDuration] = useState<number>(0);
  const [localTime, setLocalTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4c1d95',
      progressColor: '#a78bfa',
      cursorColor: '#38bdf8',
      cursorWidth: 3,
      barWidth: 2,
      barGap: 2,
      height: 72,
      normalize: true,
      backend: 'WebAudio',
    });

    wavesurferRef.current = ws;
    ws.load(audioUrl);

    ws.on('ready', () => {
      const dur = ws.getDuration();
      setDuration(dur);
      setIsReady(true);
      if (onDurationChange) onDurationChange(dur);
    });

    ws.on('audioprocess', (time) => {
      setLocalTime(time);
      if (onTimeUpdate) onTimeUpdate(time);
    });

    ws.on('interaction', (newTime) => {
      setLocalTime(newTime);
      if (onSeek) onSeek(newTime);
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
  }, [audioUrl]);

  useEffect(() => {
    if (wavesurferRef.current && isReady) {
      const currentWsTime = wavesurferRef.current.getCurrentTime();
      if (Math.abs(currentWsTime - currentTime) > 0.3) {
        wavesurferRef.current.setTime(currentTime);
        setLocalTime(currentTime);
      }
    }
  }, [currentTime, isReady]);

  const togglePlay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(speed);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(newVol);
    }
  };

  const toggleMute = () => {
    if (wavesurferRef.current) {
      if (isMuted) {
        wavesurferRef.current.setVolume(volume || 1);
        setIsMuted(false);
      } else {
        wavesurferRef.current.setVolume(0);
        setIsMuted(true);
      }
    }
  };

  const formatTime = (secs: number) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${pad(m)}:${pad(s)}.${ms}`;
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="studio-card p-5 space-y-4 border-purple-900/30">
      <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Interactive Waveform Visualizer</span>
        </div>

        <div className="flex items-center gap-2">
          {audioUrl ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Audio Loaded</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
              <span>Waiting for Audio</span>
            </span>
          )}
        </div>
      </div>

      <div className="relative bg-[#07080d] rounded-2xl p-4 border border-purple-950/60 shadow-inner overflow-hidden">
        {!audioUrl && (
          <div className="h-[72px] flex items-center justify-center text-slate-500 text-xs font-medium space-x-2">
            <Sparkles className="w-4 h-4 text-purple-400/60" />
            <span>Upload or select an audio asset above to render interactive waveform</span>
          </div>
        )}
        <div ref={containerRef} className={!audioUrl ? 'hidden' : 'block'} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={!audioUrl || !isReady}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white flex items-center justify-center shadow-lg shadow-purple-950/60 transition-all active:scale-95 disabled:opacity-40"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <div className="flex items-center gap-1.5 font-mono text-xs bg-[#0b0c14] border border-slate-800 px-3.5 py-2 rounded-xl text-slate-200 shadow-inner">
            <span className="text-purple-300 font-bold">{formatTime(localTime)}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#0b0c14] border border-slate-800 p-1 rounded-xl">
          <span className="text-[11px] text-slate-400 font-semibold px-2.5 hidden sm:inline">Speed:</span>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => changeSpeed(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                playbackSpeed === s
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-[#0b0c14] border border-slate-800 px-3.5 py-2 rounded-xl">
          <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-purple-400" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 accent-purple-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
