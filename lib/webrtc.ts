import Peer from 'simple-peer';
import { SyncMessage, SignalData } from './types';

/**
 * Creates a WebRTC peer connection using SimplePeer
 * @param isInitiator - Whether this peer is the initiator (host)
 * @param stream - Optional local media stream to send
 * @returns SimplePeer instance
 */
export function createPeerConnection(isInitiator: boolean, stream?: MediaStream): Peer.Instance {
    const peer = new Peer({
        initiator: isInitiator,
        stream: stream,
        trickle: false, 
        config: {
            iceServers: [
                // 1. Google STUN (High Reliability, multiple ports)
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },

                // 2. OpenRelay TURN (Verified Free Tier)
                // Critical for Mobile/Symmetric NATs where STUN is not enough
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ],
            iceTransportPolicy: 'all',
            iceCandidatePoolSize: 10
        }
    });

    return peer;
}

/**
 * Sets up event listeners for a peer connection
 */
export function setupPeerListeners(
    peer: Peer.Instance,
    callbacks: {
        onSignal: (data: SignalData) => void;
        onConnect: () => void;
        onData: (data: SyncMessage) => void;
        onStream?: (stream: MediaStream) => void;
        onError: (err: Error) => void;
        onClose: () => void;
    }
) {
    peer.on('signal', (data: SignalData) => {
        callbacks.onSignal(data);
    });

    peer.on('connect', () => {
        console.log('[WebRTC] ✅ Peer connected!');
        callbacks.onConnect();
    });

    peer.on('data', (data: ArrayBuffer | string) => {
        try {
            const message: SyncMessage = JSON.parse(data.toString());
            callbacks.onData(message);
        } catch (err) {
            console.error('[WebRTC] Failed to parse peer data:', err);
        }
    });

    // Handle incoming media stream
    peer.on('stream', (stream: MediaStream) => {
        console.log('[WebRTC] 📹 Remote stream received');
        if (callbacks.onStream) {
            callbacks.onStream(stream);
        }
    });

    peer.on('error', (err: Error) => {
        console.error('[WebRTC] ❌ Peer error:', err.message);
        callbacks.onError(err);
    });

    peer.on('close', () => {
        console.log('[WebRTC] Connection closed');
        callbacks.onClose();
    });

    // Enhanced ICE Debugging & Fail-safe Connection
    // @ts-ignore - SimplePeer's _pc is internal but we need it for reliable state monitoring
    const pc = peer._pc as RTCPeerConnection;

    if (pc) {
        pc.onconnectionstatechange = () => {
            console.log('[WebRTC Debug] Connection State Change:', pc.connectionState);

            // FAIL-SAFE: If the PC says connected but SimplePeer hasn't fired 'connect' yet,
            // we should treat it as connected to unblock the UI.
            if (pc.connectionState === 'connected') {
                console.log('[WebRTC] 🛡️ Fallback: Connection state is valid. Forcing connect event.');
                // We wrap in a small timeout to give the standard event a chance to fire first
                setTimeout(() => {
                    if (!peer.destroyed) {
                        callbacks.onConnect();
                    }
                }, 500);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC Debug] ICE State Change:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed') {
                console.error('[WebRTC] ICE Connection Failed. Likely blocked by Firewall or Symmetric NAT.');
                callbacks.onError(new Error('ICE Connection Failed: Firewall blocked or network unrelated.'));
            }
        };
    }
}

export function sendSyncMessage(peer: Peer.Instance | null, message: SyncMessage): void {
    if (!peer || peer.destroyed) {
        console.warn('[WebRTC] Cannot send message: peer not connected');
        return;
    }

    try {
        peer.send(JSON.stringify(message));
    } catch (err) {
        console.error('[WebRTC] Failed to send sync message:', err);
    }
}

export function generateSenderId(): string {
    return `peer-${Math.random().toString(36).substr(2, 9)}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

export function validateSignalData(data: string): boolean {
    try {
        const parsed = JSON.parse(data);
        return parsed && typeof parsed === 'object' && 'type' in parsed;
    } catch {
        return false;
    }
}