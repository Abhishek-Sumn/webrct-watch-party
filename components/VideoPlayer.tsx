'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Peer from 'simple-peer';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    FileVideo
} from 'lucide-react';
import { sendSyncMessage, generateSenderId } from '@/lib/webrtc';
import { SyncMessage } from '@/lib/types';

interface VideoPlayerProps {
    peer: Peer.Instance | null;
    role: 'host' | 'guest';
    onSyncReceived?: (message: SyncMessage) => void;
    children?: React.ReactNode;
}

export default function VideoPlayer({ peer, role, onSyncReceived, children }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [senderId] = useState<string>(generateSenderId());

    // Video State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [videoFileName, setVideoFileName] = useState<string>('');
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    // UI State
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isProcessingSync, setIsProcessingSync] = useState<boolean>(false);
    const lastSyncTimeRef = useRef<number>(0);

    // Auto-hide controls
    const resetControlsTimeout = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    }, [isPlaying]);

    useEffect(() => {
        resetControlsTimeout();
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [isPlaying, resetControlsTimeout]);

    // Handle File Selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && videoRef.current) {
            setVideoFileName(file.name);
            const url = URL.createObjectURL(file);
            videoRef.current.src = url;
            setIsVideoLoaded(true);

            // Send ready signal
            if (peer) {
                sendSyncMessage(peer, {
                    action: 'ready',
                    timestamp: 0,
                    senderId,
                });
            }
        }
    };

    // SYNC Logic
    const sendSync = (action: SyncMessage['action'], timestamp: number) => {
        if (!peer || isProcessingSync) return;
        const now = Date.now();
        if (now - lastSyncTimeRef.current < 200) return; // Debounce

        lastSyncTimeRef.current = now;
        sendSyncMessage(peer, { action, timestamp, senderId });
    };

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
            sendSync('play', videoRef.current.currentTime);
        } else {
            videoRef.current.pause();
            sendSync('pause', videoRef.current.currentTime);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const time = parseFloat(e.target.value);
        videoRef.current.currentTime = time;
        setCurrentTime(time);
        sendSync('seek', time);
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const vol = parseFloat(e.target.value);
        videoRef.current.volume = vol;
        setVolume(vol);
        setIsMuted(vol === 0);
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        if (isMuted) {
            videoRef.current.volume = 1;
            setVolume(1);
            setIsMuted(false);
        } else {
            videoRef.current.volume = 0;
            setVolume(0);
            setIsMuted(true);
        }
    };

    // Event Listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => setCurrentTime(video.currentTime);
        const onLoadedMetadata = () => setDuration(video.duration);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
        };
    }, []);

    // Handle Incoming Sync
    useEffect(() => {
        if (!peer || !videoRef.current) return;

        const handleData = (data: ArrayBuffer | string) => {
            try {
                // Simple-peer data can be Buffer or string
                const dataString = data.toString();
                const message: SyncMessage = JSON.parse(dataString);

                // Ignore our own messages
                if (message.senderId === senderId) return;

                console.log('[VIDEO] Received sync:', message.action);
                setIsProcessingSync(true);
                const video = videoRef.current!;

                // Sync threshold (allow 0.5s drift)
                const SYNC_THRESHOLD = 0.5;

                switch (message.action) {
                    case 'play':
                        if (Math.abs(video.currentTime - message.timestamp) > SYNC_THRESHOLD) {
                            video.currentTime = message.timestamp;
                        }
                        video.play().catch(console.error);
                        setIsPlaying(true);
                        break;
                    case 'pause':
                        video.pause();
                        video.currentTime = message.timestamp;
                        setIsPlaying(false);
                        break;
                    case 'seek':
                        video.currentTime = message.timestamp;
                        break;
                    case 'ready':
                        console.log('Peer is ready');
                        break;
                }

                // Call prop callback if provided
                if (onSyncReceived) onSyncReceived(message);

                // Release lock after short delay
                setTimeout(() => setIsProcessingSync(false), 500);

            } catch (err) {
                console.error('Failed to handle sync data:', err);
            }
        };

        peer.on('data', handleData);

        return () => {
            peer.off('data', handleData);
        };
    }, [peer, senderId, onSyncReceived]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only if video is loaded and user isn't typing elsewhere
            if (!isVideoLoaded || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    resetControlsTimeout();
                    break;
                case 'ArrowLeft':
                    if (videoRef.current) {
                        videoRef.current.currentTime -= 5;
                        sendSync('seek', videoRef.current.currentTime);
                        resetControlsTimeout();
                    }
                    break;
                case 'ArrowRight':
                    if (videoRef.current) {
                        videoRef.current.currentTime += 5;
                        sendSync('seek', videoRef.current.currentTime);
                        resetControlsTimeout();
                    }
                    break;
                case 'KeyF':
                    toggleFullscreen();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVideoLoaded, togglePlay]); // Dependencies for closure

    // Helper to format time
    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col group/player"
            onMouseMove={resetControlsTimeout}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {/* Main Video Area (Top 88% - Shifted Up) */}
            <div className="absolute top-0 left-0 right-0 h-[88%] bg-black flex flex-col justify-center overflow-hidden z-10">

                {/* File Upload Overlay */}
                {!isVideoLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-900/40 backdrop-blur-sm z-20">
                        <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-8 rounded-3xl border border-white/5 shadow-2xl mb-6 max-w-md animate-fadeIn">
                            <div className="bg-purple-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-1 ring-purple-500/20">
                                <FileVideo size={32} className="text-purple-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Theater Mode</h3>
                            <p className="text-zinc-400 mb-8 leading-relaxed">
                                Select a local video file to begin the watch party.
                            </p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors shadow-lg"
                            >
                                Select Video
                            </button>
                        </div>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileSelect}
                />

                <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    onClick={togglePlay}
                    playsInline
                />
            </div>

            {/* Controls Layer (Floating above Webcams - Auto Hide) */}
            <div
                className={`absolute bottom-[12%] left-0 right-0 px-6 pb-4 pt-12 bg-gradient-to-t from-black/80 to-transparent z-50 transition-all duration-500 ease-in-out ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
            >
                <div className="flex flex-col gap-2 w-full max-w-7xl mx-auto">
                    {/* Progress */}
                    <div className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/progress transition-all hover:h-2.5">
                        <div
                            className="absolute top-0 left-0 bottom-0 bg-purple-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                        <input
                            type="range"
                            min="0"
                            max={duration}
                            value={currentTime}
                            onChange={handleSeek}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-6">
                            <button onClick={togglePlay} className="text-white hover:text-purple-400 transition-colors transform hover:scale-110">
                                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                            </button>

                            <div className="flex items-center gap-2 group/volume">
                                <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
                                    {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="w-24 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                />
                            </div>

                            <span className="text-xs font-medium text-zinc-500 font-mono">
                                {formatTime(currentTime)} / {formatTime(duration || 0)}
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider max-w-[200px] truncate hidden sm:block">
                                {videoFileName}
                            </span>
                            <div className="w-px h-4 bg-white/10 hidden sm:block" />
                            <button onClick={toggleFullscreen} className="text-zinc-400 hover:text-white transition-colors">
                                {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Webcam Strip (Fixed Bottom 12% - Always Visible) */}
            <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-zinc-900/90 border-t border-white/10 z-40 flex items-center justify-center overflow-x-auto custom-scrollbar px-4">
                <div className="min-w-0 flex-shrink-0 w-full flex justify-center">
                    {children}
                </div>
            </div>

        </div>
    );
}
