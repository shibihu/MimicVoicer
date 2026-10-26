'use client';

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

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
      waveColor: '#3b82f6',
      progressColor: '#8b5cf6',
      cursorColor: '#f43f5e',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 2,
      height: 70,
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
    <div className="studio-card rounded-2xl border p-4 flex flex-col gap-4">
      <div className="relative bg-[#08090d] rounded-xl p-3 border border-slate-900 overflow-hidden">
        {!audioUrl && (
          <div className="h-[70px] flex items-center justify-center text-slate-500 text-sm">
            Upload an audio file to view waveform & play audio
          </div>
        )}
        <div ref={containerRef} className={!audioUrl ? 'hidden' : 'block'} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={!audioUrl || !isReady}
            className="w-11 h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-900/40 transition-all active:scale-95 disabled:opacity-40"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <div className="flex items-center gap-1.5 font-mono text-sm bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-200">
            <span className="text-purple-400 font-semibold">{formatTime(localTime)}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
          <span className="text-xs text-slate-400 font-medium px-2 hidden sm:inline">Speed:</span>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => changeSpeed(s)}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                playbackSpeed === s
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
          <button onClick={toggleMute} className="text-slate-400 hover:text-white">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
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
