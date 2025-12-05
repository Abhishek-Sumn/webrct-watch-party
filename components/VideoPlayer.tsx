'use client';

import React, { useState, useRef, useEffect } from 'react';
import Peer from 'simple-peer';
import { sendSyncMessage, generateSenderId } from '@/lib/webrtc';
import { SyncMessage, VideoState } from '@/lib/types';

interface VideoPlayerProps {
    peer: Peer.Instance | null;
    role: 'host' | 'guest';
    onSyncReceived?: (message: SyncMessage) => void;
}

export default function VideoPlayer({ peer, role, onSyncReceived }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [senderId] = useState<string>(generateSenderId());
    const [videoState, setVideoState] = useState<VideoState>({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        isVideoLoaded: false,
    });
    const [isProcessingSync, setIsProcessingSync] = useState<boolean>(false);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [showControls, setShowControls] = useState<boolean>(true);
    const lastSyncTimeRef = useRef<number>(0);

    // Handle file selection
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && videoRef.current) {
            setVideoFile(file);
            const url = URL.createObjectURL(file);
            videoRef.current.src = url;

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

    // Send sync message with debouncing
    const sendSync = (action: SyncMessage['action'], timestamp: number) => {
        if (!peer || isProcessingSync) return;

        const now = Date.now();
        if (now - lastSyncTimeRef.current < 200) return; // Debounce

        lastSyncTimeRef.current = now;
        sendSyncMessage(peer, { action, timestamp, senderId });
    };

    // Video event handlers
    const handlePlay = () => {
        if (!videoRef.current || isProcessingSync) return;
        sendSync('play', videoRef.current.currentTime);
    };

    const handlePause = () => {
        if (!videoRef.current || isProcessingSync) return;
        sendSync('pause', videoRef.current.currentTime);
    };

    const handleSeeked = () => {
        if (!videoRef.current || isProcessingSync) return;
        sendSync('seek', videoRef.current.currentTime);
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        setVideoState(prev => ({
            ...prev,
            currentTime: videoRef.current!.currentTime,
        }));
    };

    const handleLoadedMetadata = () => {
        if (!videoRef.current) return;
        setVideoState(prev => ({
            ...prev,
            duration: videoRef.current!.duration,
            isVideoLoaded: true,
        }));
    };

    // Receive sync messages
    useEffect(() => {
        if (!peer || !videoRef.current) return;

        const handleData = (data: ArrayBuffer | string) => {
            try {
                const message: SyncMessage = JSON.parse(data.toString());

                // Ignore own messages
                if (message.senderId === senderId) return;

                setIsProcessingSync(true);

                const video = videoRef.current!;
                const timeDiff = Math.abs(video.currentTime - message.timestamp);

                switch (message.action) {
                    case 'play':
                        if (timeDiff > 0.5) {
                            video.currentTime = message.timestamp;
                        }
                        video.play().catch(console.error);
                        break;

                    case 'pause':
                        if (timeDiff > 0.5) {
                            video.currentTime = message.timestamp;
                        }
                        video.pause();
                        break;

                    case 'seek':
                        video.currentTime = message.timestamp;
                        break;

                    case 'ready':
                        // Peer has loaded their video
                        break;
                }

                setTimeout(() => setIsProcessingSync(false), 300);

                if (onSyncReceived) {
                    onSyncReceived(message);
                }
            } catch (err) {
                console.error('Failed to process sync message:', err);
                setIsProcessingSync(false);
            }
        };

        peer.on('data', handleData);

        return () => {
            peer.off('data', handleData);
        };
    }, [peer, senderId, onSyncReceived]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (!videoRef.current || !videoState.isVideoLoaded) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (videoRef.current.paused) {
                        videoRef.current.play();
                    } else {
                        videoRef.current.pause();
                    }
                    break;

                case 'ArrowLeft':
                    e.preventDefault();
                    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
                    handleSeeked();
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    videoRef.current.currentTime = Math.min(
                        videoRef.current.duration,
                        videoRef.current.currentTime + 5
                    );
                    handleSeeked();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [videoState.isVideoLoaded]);

    // Custom controls
    const togglePlayPause = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            videoRef.current.play();
        } else {
            videoRef.current.pause();
        }
    };

    const handleSeekBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const time = parseFloat(e.target.value);
        videoRef.current.currentTime = time;
        handleSeeked();
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) return;
        const vol = parseFloat(e.target.value);
        videoRef.current.volume = vol;
        setVideoState(prev => ({ ...prev, volume: vol }));
    };

    const toggleFullscreen = () => {
        if (!videoRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            videoRef.current.requestFullscreen();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-scaleIn">
            <h2 className="text-2xl font-bold mb-4 text-zinc-800 dark:text-zinc-200">
                Video Player {role === 'host' ? '(Host)' : '(Guest)'}
            </h2>

            {/* File Input */}
            {!videoState.isVideoLoaded && (
                <div className="mb-6">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Select Video File
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900/20 dark:file:text-purple-300"
                    />
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        Both users should load the same video file locally
                    </p>
                </div>
            )}

            {/* Video Player Container */}
            <div
                className="relative bg-black rounded-lg overflow-hidden mb-4 group"
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => setShowControls(false)}
            >
                <video
                    ref={videoRef}
                    className="w-full aspect-video"
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onSeeked={handleSeeked}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                />

                {!videoState.isVideoLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                        <p className="text-zinc-400">No video loaded</p>
                    </div>
                )}

                {/* Sync Indicator */}
                {isProcessingSync && (
                    <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium animate-pulse">
                        Syncing...
                    </div>
                )}
            </div>

            {/* Custom Controls */}
            {videoState.isVideoLoaded && (
                <div className="space-y-3">
                    {/* Progress Bar */}
                    <div className="space-y-1">
                        <input
                            type="range"
                            min="0"
                            max={videoState.duration || 0}
                            value={videoState.currentTime}
                            onChange={handleSeekBarChange}
                            className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                        <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                            <span>{formatTime(videoState.currentTime)}</span>
                            <span>{formatTime(videoState.duration)}</span>
                        </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={togglePlayPause}
                            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 hover:scale-105 text-white rounded-lg font-medium transition-all"
                        >
                            {videoRef.current?.paused ? '▶ Play' : '⏸ Pause'}
                        </button>

                        <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">🔊</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={videoState.volume}
                                onChange={handleVolumeChange}
                                className="w-24 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                            />
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 w-8">
                                {Math.round(videoState.volume * 100)}%
                            </span>
                        </div>

                        <button
                            onClick={toggleFullscreen}
                            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 hover:scale-105 text-zinc-800 dark:text-zinc-200 rounded-lg font-medium transition-all"
                        >
                            ⛶ Fullscreen
                        </button>
                    </div>

                    {/* Keyboard Shortcuts Info */}
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <span className="font-medium">Shortcuts:</span> Space = Play/Pause | Arrow Left/Right = Seek ±5s
                    </div>
                </div>
            )}
        </div>
    );
}
