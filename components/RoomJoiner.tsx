'use client';

import React, { useState } from 'react';
import Peer from 'simple-peer';
import { Copy, Check, AlertTriangle, Link, ArrowRight, Download } from 'lucide-react';
import { createPeerConnection, setupPeerListeners, copyToClipboard, validateSignalData } from '@/lib/webrtc';
import { SignalData } from '@/lib/types';

interface RoomJoinerProps {
    onConnectionEstablished: (peer: Peer.Instance) => void;
    localStream: MediaStream | null;
    onRemoteStream: (stream: MediaStream) => void;
}

export default function RoomJoiner({ onConnectionEstablished, localStream, onRemoteStream }: RoomJoinerProps) {
    const [peer, setPeer] = useState<Peer.Instance | null>(null);
    const [offerData, setOfferData] = useState<string>('');
    const [answerData, setAnswerData] = useState<string>('');
    const [status, setStatus] = useState<'idle' | 'generating' | 'connected' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);

    const handleGenerateAnswer = () => {
        if (!offerData.trim()) {
            setErrorMessage('Please paste the host\'s OFFER first');
            return;
        }

        if (!validateSignalData(offerData)) {
            setErrorMessage('Invalid OFFER format');
            return;
        }

        try {
            const offer = JSON.parse(offerData);

            if (offer.type !== 'offer') {
                setErrorMessage('❌ Wrong signal type! You must paste the HOST\'s KEY (type: "offer").');
                return;
            }

            setStatus('generating');
            setErrorMessage('');

            // Pass localStream to createPeerConnection
            const newPeer = createPeerConnection(false, localStream || undefined);

            setupPeerListeners(newPeer, {
                onSignal: (data: SignalData) => {
                    // FILTER: Ignore internal negotiation messages
                    if (data.type !== 'answer') {
                        console.log('[GUEST] Ignoring non-answer signal:', data.type);
                        return;
                    }
                    const answer = JSON.stringify(data, null, 2);

                    // WAN Check
                    const isWANReady = answer.includes('typ srflx');
                    const hasRelay = answer.includes('typ relay');

                    if (!isWANReady && !hasRelay) {
                        console.warn('[GUEST] Warning: No Public (WAN) candidates found!');
                        setErrorMessage('⚠️ Warning: No public IP found. Internet connection will likely fail.');
                    } else if (!hasRelay) {
                        console.warn('[GUEST] Warning: No TURN (Relay) candidates. Mobile connection might fail.');
                    } else {
                        setErrorMessage('');
                    }

                    setAnswerData(answer);
                    copyToClipboard(answer);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                },
                onConnect: () => {
                    console.log('[GUEST] Peer connected!');
                    setStatus('connected');
                    onConnectionEstablished(newPeer);
                },
                onData: () => { },
                onStream: (stream) => { // Handle remote stream
                    console.log('[GUEST] Remote stream received');
                    onRemoteStream(stream);
                },
                onError: (err: Error) => {
                    console.error('[GUEST] Peer error:', err);
                    setStatus('error');
                    setErrorMessage(err.message || 'Connection error occurred');
                },
                onClose: () => {
                    console.log('[GUEST] Peer closed');
                    setStatus('idle');
                }
            });

            newPeer.signal(offer);
            setPeer(newPeer);
        } catch (err) {
            setStatus('error');
            setErrorMessage('Failed to parse OFFER data');
        }
    };

    const handleCopy = async () => {
        const success = await copyToClipboard(answerData);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } else {
            setErrorMessage('Failed to copy. Please select and copy manually.');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-8 glass-card rounded-3xl animate-scaleIn">
            <h2 className="text-3xl font-bold mb-6 text-white text-center">
                Join a Watch Party
            </h2>

            <div className="space-y-8">

                {/* Step 1: Paste Offer */}
                <div className={`transition-opacity duration-300 ${status === 'connected' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/30">
                            <Download size={20} className="text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-200">
                            1. Paste Room Key
                        </h3>
                    </div>

                    <textarea
                        value={offerData}
                        onChange={(e) => setOfferData(e.target.value)}
                        placeholder="Paste the key your friend sent you..."
                        disabled={status === 'connected'}
                        className="w-full h-32 p-4 bg-black/40 border border-white/10 rounded-xl font-mono text-xs text-zinc-300 resize-none focus:outline-none focus:border-blue-500/50 transition-colors mb-4 placeholder:text-zinc-600"
                    />
                </div>

                {/* Step 2: Generate Answer */}
                <div className="border-t border-white/5 pt-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-purple-500/20 p-2 rounded-lg border border-purple-500/30">
                            <Link size={20} className="text-purple-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-200">
                            2. Generate Response
                        </h3>
                    </div>

                    {!answerData ? (
                        <button
                            onClick={handleGenerateAnswer}
                            disabled={status === 'connected' || status === 'generating'}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'generating' ? 'Connecting...' : 'Generate & Connect'}
                        </button>
                    ) : (
                        <div className="animate-fadeIn">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-green-400 font-medium">✓ Response Generated!</p>
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors border border-white/5"
                                >
                                    {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                            <textarea
                                readOnly
                                value={answerData}
                                className="w-full h-32 p-4 bg-black/40 border border-white/10 rounded-xl font-mono text-xs text-zinc-400 resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                            <p className="text-sm text-zinc-500 mt-2">
                                Send this response back to the host to finish connecting.
                            </p>
                        </div>
                    )}
                </div>

                {status === 'connected' && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl animate-fadeIn flex items-center gap-3">
                        <div className="bg-green-500 rounded-full p-1">
                            <Check size={12} className="text-white" />
                        </div>
                        <p className="text-green-200 font-medium">
                            Connected! Waiting for host...
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
