'use client';

import React, { useState, useRef } from 'react';
import Peer from 'simple-peer';
import { Copy, Check, AlertTriangle, Link, ArrowRight } from 'lucide-react';
import { createPeerConnection, setupPeerListeners, copyToClipboard, validateSignalData } from '@/lib/webrtc';
import { SignalData } from '@/lib/types';

interface RoomCreatorProps {
    onConnectionEstablished: (peer: Peer.Instance) => void;
    localStream: MediaStream | null;
    onRemoteStream: (stream: MediaStream) => void;
}

export default function RoomCreator({ onConnectionEstablished, localStream, onRemoteStream }: RoomCreatorProps) {
    const [peer, setPeer] = useState<Peer.Instance | null>(null);
    const [offerData, setOfferData] = useState<string>('');
    const [answerData, setAnswerData] = useState<string>('');
    const [status, setStatus] = useState<'idle' | 'generating' | 'waiting' | 'connecting' | 'connected' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);
    const hasSignaledRef = useRef<boolean>(false);

    const handleGenerateOffer = () => {
        setStatus('generating');
        setErrorMessage('');
        hasSignaledRef.current = false;

        // Pass localStream to createPeerConnection
        const newPeer = createPeerConnection(true, localStream || undefined);

        setupPeerListeners(newPeer, {
            onSignal: (data: SignalData) => {
                // FILTER: Ignore internal negotiation messages (transceiverRequest, candidate, etc.)
                if (data.type !== 'offer') {
                    console.log('[HOST] Ignoring non-offer signal:', data.type);
                    return;
                }
                const offer = JSON.stringify(data, null, 2);

                // WAN Check: Do we have public candidates?
                const isWANReady = offer.includes('typ srflx');
                const hasRelay = offer.includes('typ relay');

                if (!isWANReady && !hasRelay) {
                    console.warn('[HOST] Warning: No Public (WAN) candidates found!');
                    setErrorMessage('⚠️ Warning: No public IP found. Internet connection will likely fail.');
                } else if (!hasRelay) {
                    console.warn('[HOST] Warning: No TURN (Relay) candidates. Mobile connection might fail.');
                } else {
                    setErrorMessage('');
                }

                setOfferData(offer);
                setStatus('waiting');
                copyToClipboard(offer);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
            onConnect: () => {
                console.log('[HOST] Peer connected!');
                setStatus('connected');
                onConnectionEstablished(newPeer);
            },
            onData: () => { },
            onStream: (stream) => { // Handle remote stream
                console.log('[HOST] Remote stream received in RoomCreator');
                onRemoteStream(stream);
            },
            onError: (err: Error) => {
                console.error('[HOST] Peer error:', err);
                setStatus('error');
                setErrorMessage(err.message || 'Connection error occurred');
                hasSignaledRef.current = false;
            },
            onClose: () => {
                console.log('[HOST] Peer closed');
                setStatus('idle');
                hasSignaledRef.current = false;
            }
        });

        setPeer(newPeer);
    };

    const handleConnect = () => {
        if (!peer || !answerData.trim()) {
            setErrorMessage('Please paste the guest\'s answer data');
            return;
        }

        // Prevent multiple signal attempts
        if (hasSignaledRef.current) {
            console.log('[HOST] Already signaled, ignoring duplicate attempt');
            setErrorMessage('Already processing connection. Please wait...');
            return;
        }

        // Prevent signaling if already connected
        if (status === 'connected') {
            setErrorMessage('Already connected!');
            return;
        }

        // Check if peer is destroyed
        if (peer.destroyed) {
            setErrorMessage('Connection was closed. Please refresh and try again.');
            return;
        }

        if (!validateSignalData(answerData)) {
            setErrorMessage('Invalid answer data format');
            return;
        }

        try {
            const answer = JSON.parse(answerData);

            // CRITICAL: Host must only accept ANSWER, not OFFER
            if (answer.type !== 'answer') {
                setErrorMessage('❌ Wrong signal type! As HOST, you must paste the GUEST\'s ANSWER (type: "answer"), not an offer.');
                return;
            }

            console.log('[HOST] Signaling peer with answer...');
            setStatus('connecting');
            hasSignaledRef.current = true; // Mark as signaled
            peer.signal(answer);
            setErrorMessage(''); // Clear any previous errors
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to establish connection';
            setErrorMessage(errorMsg);
            console.error('[HOST] Signal error:', err);
            hasSignaledRef.current = false; // Reset on error
            setStatus('waiting');
        }
    };

    const handleCopy = async () => {
        const success = await copyToClipboard(offerData);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } else {
            setErrorMessage('Failed to copy to clipboard. Please copy manually.');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-8 glass-card rounded-3xl animate-scaleIn">
            <h2 className="text-3xl font-bold mb-6 text-white text-center">
                Host a Watch Party
            </h2>

            <div className="space-y-8">
                {/* Step 1: Generate Offer */}
                <div className={`transition-opacity duration-300 ${status !== 'idle' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
                            <Link size={20} className="text-purple-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-200">
                            1. Generate Room Key
                        </h3>
                    </div>
                    {status === 'idle' && (
                        <button
                            onClick={handleGenerateOffer}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all transform hover:scale-[1.02]"
                        >
                            Generate Key
                        </button>
                    )}
                </div>

                {/* Step 2: Display Offer */}
                {offerData && (
                    <div className="animate-fadeIn">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/30">
                                    <Copy size={20} className="text-blue-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-200">
                                    2. Share Key
                                </h3>
                            </div>
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors border border-white/5"
                            >
                                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>

                        <div className="relative group">
                            <textarea
                                readOnly
                                value={offerData}
                                className="w-full h-32 p-4 bg-black/40 border border-white/10 rounded-xl font-mono text-xs text-zinc-400 resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                            <div className="absolute inset-0 bg-transparent" /> {/* Overlay to prevent focus if needed, or keeping it selecting is fine */}
                        </div>
                        <p className="text-sm text-zinc-500 mt-2">
                            Send this key to your friend. They need to paste it to join.
                        </p>
                    </div>
                )}

                {/* Step 3: Receive Answer */}
                {status === 'waiting' && (
                    <div className="animate-fadeIn pt-4 border-t border-white/5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/30">
                                <ArrowRight size={20} className="text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-200">
                                3. Paste Their Response
                            </h3>
                        </div>

                        <textarea
                            value={answerData}
                            onChange={(e) => setAnswerData(e.target.value)}
                            placeholder="Paste the code your friend sends back..."
                            className="w-full h-32 p-4 bg-black/40 border border-white/10 rounded-xl font-mono text-xs text-zinc-300 resize-none focus:outline-none focus:border-emerald-500/50 transition-colors mb-4 placeholder:text-zinc-600"
                        />

                        <button
                            onClick={handleConnect}
                            disabled={hasSignaledRef.current}
                            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Connect to Friend
                        </button>
                    </div>
                )}

                {/* Status Messages */}
                {status === 'connecting' && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-fadeIn flex items-center gap-3">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <p className="text-blue-200 font-medium">
                            Connecting to peer...
                        </p>
                    </div>
                )}

                {errorMessage && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-fadeIn flex items-start gap-3">
                        <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
                        <p className="text-red-200 font-medium text-sm">
                            {errorMessage}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
