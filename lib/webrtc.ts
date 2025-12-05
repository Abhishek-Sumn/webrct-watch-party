import Peer from 'simple-peer';
import { SyncMessage, SignalData } from './types';

/**
 * Creates a WebRTC peer connection using SimplePeer
 * @param isInitiator - Whether this peer is the initiator (host)
 * @returns SimplePeer instance
 */
export function createPeerConnection(isInitiator: boolean): Peer.Instance {
    const peer = new Peer({
        initiator: isInitiator,
        trickle: false, // Disabled for simpler signaling
        config: {
            iceServers: [
                // Google's public STUN servers
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                // Additional public STUN servers
                { urls: 'stun:stun.stunprotocol.org:3478' },
                { urls: 'stun:stun.voip.blackberry.com:3478' },
                // Open relay project (free TURN server)
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
                },
                // Additional free TURN servers
                {
                    urls: 'turn:numb.viagenie.ca',
                    username: 'webrtc@live.com',
                    credential: 'muazkh'
                },
                {
                    urls: 'turn:turn.anyfirewall.com:443?transport=tcp',
                    username: 'webrtc',
                    credential: 'webrtc'
                }
            ],
            iceTransportPolicy: 'all'
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

    peer.on('error', (err: Error) => {
        console.error('[WebRTC] ❌ Peer error:', err.message);
        callbacks.onError(err);
    });

    peer.on('close', () => {
        console.log('[WebRTC] Connection closed');
        callbacks.onClose();
    });

    // ICE state debugging
    peer.on('iceStateChange', (iceConnectionState: string, iceGatheringState: string) => {
        console.log(`[WebRTC] ICE Connection: ${iceConnectionState}, Gathering: ${iceGatheringState}`);

        if (iceConnectionState === 'failed') {
            console.error('[WebRTC] 🔴 ICE FAILED - Check TURN servers or firewall');
        } else if (iceConnectionState === 'connected' || iceConnectionState === 'completed') {
            console.log('[WebRTC] ✅ ICE Connection established!');
        }
    });
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
