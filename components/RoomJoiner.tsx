'use client';

import React, { useState } from 'react';
import Peer from 'simple-peer';
import { createPeerConnection, setupPeerListeners, copyToClipboard, validateSignalData } from '@/lib/webrtc';
import { SignalData } from '@/lib/types';

interface RoomJoinerProps {
    onConnectionEstablished: (peer: Peer.Instance) => void;
}

export default function RoomJoiner({ onConnectionEstablished }: RoomJoinerProps) {
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
                setErrorMessage('❌ Wrong signal type! As GUEST, you must paste the HOST\'s OFFER (type: "offer"), not an answer.');
                return;
            }

            setStatus('generating');
            setErrorMessage('');

            const newPeer = createPeerConnection(false);

            setupPeerListeners(newPeer, {
                onSignal: (data: SignalData) => {
                    const answer = JSON.stringify(data, null, 2);
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
            setErrorMessage('Failed to copy to clipboard. Please copy manually.');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-scaleIn">
            <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Join a Watch Party
            </h2>

            <div className="space-y-6">
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                        Step 1: Paste Host&apos;s OFFER Key
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        ⚠️ Important: Paste the OFFER from your host (JSON with type: &quot;offer&quot;)
                    </p>
                    <textarea
                        value={offerData}
                        onChange={(e) => setOfferData(e.target.value)}
                        placeholder="Paste the host's OFFER here..."
                        disabled={status === 'connected'}
                        className="w-full h-32 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                </div>

                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                        Step 2: Generate Your ANSWER Response
                    </h3>
                    <button
                        onClick={handleGenerateAnswer}
                        disabled={status === 'connected' || status === 'generating'}
                        className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-cyan-600 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        {status === 'generating' ? 'Connecting...' : 'Generate Answer & Connect'}
                    </button>
                </div>

                {answerData && (
                    <div className="space-y-3 animate-fadeIn">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                                Step 3: Share This ANSWER With Host
                            </h3>
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:scale-105 transition-all text-sm font-medium"
                            >
                                {copied ? '✓ Copied!' : 'Copy'}
                            </button>
                        </div>
                        <textarea
                            readOnly
                            value={answerData}
                            className="w-full h-32 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            📤 Send this ANSWER back to the host (it has type: &quot;answer&quot;)
                        </p>
                    </div>
                )}

                {status === 'connected' && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-fadeIn">
                        <p className="text-green-800 dark:text-green-200 font-medium">
                            ✓ Connected! Waiting for video to start...
                        </p>
                    </div>
                )}

                {errorMessage && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fadeIn">
                        <p className="text-red-800 dark:text-red-200 font-medium">
                            {errorMessage}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
