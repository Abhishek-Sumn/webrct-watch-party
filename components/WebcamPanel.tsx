'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Move } from 'lucide-react';

interface WebcamPanelProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isMuted: boolean;
    isVideoHidden: boolean;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    isCompact?: boolean; // True for "Watching" mode, False for "Lobby" mode
}

export default function WebcamPanel({
    localStream,
    remoteStream,
    isMuted,
    isVideoHidden,
    onToggleMute,
    onToggleVideo,
    isCompact = false
}: WebcamPanelProps) {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Attach local stream
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Attach remote stream
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Container Classes logic
    // Compact (Dashboard): Horizontal Strip (Flex Row)
    // Lobby: Grid layout
    const containerClasses = isCompact
        ? "flex flex-row gap-4 items-center justify-center w-full overflow-x-auto no-scrollbar py-2" // Added justify-center
        : "grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto my-8";

    return (
        <div className={containerClasses}>
            {/* Local User */}
            <div
                className={`relative group overflow-hidden rounded-xl shrink-0 bg-black shadow-lg transition-all duration-300 ${isCompact
                    ? 'h-32 aspect-video ring-1 ring-white/10 hover:ring-white/30'
                    : 'aspect-video glass-card border border-white/10'}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="absolute inset-0 bg-zinc-900/50" /> {/* Darken background */}

                <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`relative w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${isVideoHidden ? 'opacity-0' : 'opacity-100'}`}
                />

                {/* Fallback for video off */}
                {!localStream || isVideoHidden ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 backdrop-blur-sm text-zinc-500 z-10">
                        <div className={`rounded-full bg-zinc-800/50 flex items-center justify-center ring-1 ring-white/5 ${isCompact ? 'h-10 w-10 mb-1' : 'h-16 w-16 mb-3'}`}>
                            <VideoOff size={isCompact ? 16 : 28} className="text-zinc-600" />
                        </div>
                        {!isCompact && <p className="text-xs font-bold tracking-widest uppercase text-zinc-600">Camera Off</p>}
                    </div>
                ) : null}

                {/* Status Badges - Floating Pill */}
                <div className={`absolute left-2 flex gap-1 z-20 ${isCompact ? 'bottom-2' : 'bottom-4 left-4'}`}>
                    <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                        <span className="text-[10px] font-bold text-white/90">YOU</span>
                    </div>
                    {isMuted && (
                        <div className="bg-red-500/80 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center">
                            <MicOff size={10} className="text-white" />
                        </div>
                    )}
                </div>

                {/* Controls Overlay - Glass Bar */}
                <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-all duration-300 flex items-center justify-center gap-3 z-30 ${isCompact ? (isHovered ? 'opacity-100' : 'opacity-0') : 'opacity-0 group-hover:opacity-100'
                    }`}>
                    <button
                        onClick={onToggleMute}
                        className={`rounded-full ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'} ${isCompact ? 'p-2' : 'p-4'} transition-all hover:scale-110`}
                    >
                        {isMuted ? <MicOff size={isCompact ? 16 : 24} /> : <Mic size={isCompact ? 16 : 24} />}
                    </button>
                    <button
                        onClick={onToggleVideo}
                        className={`rounded-full ${isVideoHidden ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'} ${isCompact ? 'p-2' : 'p-4'} transition-all hover:scale-110`}
                    >
                        {isVideoHidden ? <VideoOff size={isCompact ? 16 : 24} /> : <Video size={isCompact ? 16 : 24} />}
                    </button>
                </div>
            </div>

            {/* Remote User Card */}
            {remoteStream ? (
                <div className={`relative overflow-hidden rounded-xl bg-zinc-900 border border-white/10 shadow-lg ${isCompact ? 'h-32 aspect-video shrink-0' : 'aspect-video w-full'}`}>
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    <div className={`absolute left-2 z-20 ${isCompact ? 'bottom-2' : 'bottom-4 left-4'}`}>
                        <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            <span className="text-[10px] font-bold text-white/90">GUEST</span>
                        </div>
                    </div>
                </div>
            ) : (
                !isCompact && (
                    <div className="glass-card rounded-2xl flex flex-col items-center justify-center aspect-video border-2 border-dashed border-white/5 bg-white/[0.02]">
                        <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-4 animate-pulse">
                            <Move size={32} className="text-white/20" />
                        </div>
                        <p className="text-zinc-500 font-medium tracking-wide">WAITING FOR GUEST...</p>
                    </div>
                )
            )}
        </div>
    );
}
