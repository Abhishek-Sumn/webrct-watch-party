'use client';

import React, { useState } from 'react';
import Peer from 'simple-peer';
import { createPeerConnection, setupPeerListeners, copyToClipboard, validateSignalData } from '@/lib/webrtc';
import { SignalData } from '@/lib/types';

interface RoomCreatorProps {
    onConnectionEstablished: (peer: Peer.Instance) => void;
}

export default function RoomCreator({ onConnectionEstablished }: RoomCreatorProps) {
    const [peer, setPeer] = useState<Peer.Instance | null>(null);
    const [offerData, setOfferData] = useState<string>('');
    const [answerData, setAnswerData] = useState<string>('');
    const [status, setStatus] = useState<'idle' | 'generating' | 'waiting' | 'connected' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);

    const handleGenerateOffer = () => {
        setStatus('generating');
        setErrorMessage('');

        const newPeer = createPeerConnection(true);

        setupPeerListeners(newPeer, {
            onSignal: (data: SignalData) => {
                const offer = JSON.stringify(data, null, 2);
                setOfferData(offer);
                setStatus('waiting');
                copyToClipboard(offer);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
            onConnect: () => {
                setStatus('connected');
                onConnectionEstablished(newPeer);
            },
            onData: () => { },
            onError: (err: Error) => {
                setStatus('error');
                setErrorMessage(err.message || 'Connection error occurred');
            },
            onClose: () => {
                setStatus('idle');
            }
        });

        setPeer(newPeer);
    };

    const handleConnect = () => {
        if (!peer || !answerData.trim()) {
            setErrorMessage('Please paste the guest\'s answer data');
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
            peer.signal(answer);
            setErrorMessage(''); // Clear any previous errors
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to establish connection';
            setErrorMessage(errorMsg);
            console.error('Signal error:', err);
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
        <div className="w-full max-w-2xl mx-auto p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-scaleIn">
            <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Host a Watch Party
            </h2>

            <div className="space-y-6">
                {/* Step 1: Generate Offer */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                        Step 1: Generate Room Key
                    </h3>
                    <button
                        onClick={handleGenerateOffer}
                        disabled={status !== 'idle'}
                        className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        {status === 'generating' ? 'Generating...' : 'Generate Room Key'}
                    </button>
                </div>

                {/* Display Offer Data */}
                {offerData && (
                    <div className="space-y-3 animate-fadeIn">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                                Step 2: Share This Key With Guest
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
                            value={offerData}
                            className="w-full h-32 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Share this key with your guest via any messaging app
                        </p>
                    </div>
                )}

                {/* Receive Answer */}
                {status === 'waiting' && (
                    <div className="space-y-3 animate-fadeIn">
                        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                            Step 3: Paste Guest's Response
                        </h3>
                        <textarea
                            value={answerData}
                            onChange={(e) => setAnswerData(e.target.value)}
                            placeholder="Paste the guest's answer key here..."
                            className="w-full h-32 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                            onClick={handleConnect}
                            className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                            Connect
                        </button>
                    </div>
                )}

                {/* Status Messages */}
                {status === 'connected' && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-fadeIn">
                        <p className="text-green-800 dark:text-green-200 font-medium">
                            ✓ Connected! You can now start watching together.
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
