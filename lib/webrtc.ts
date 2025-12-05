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
        trickle: false,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        }
    });

    return peer;
}

/**
 * Sets up event listeners for a peer connection
 * @param peer - SimplePeer instance
 * @param callbacks - Event handler callbacks
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
        callbacks.onConnect();
    });

    peer.on('data', (data: ArrayBuffer | string) => {
        try {
            const message: SyncMessage = JSON.parse(data.toString());
            callbacks.onData(message);
        } catch (err) {
            console.error('Failed to parse peer data:', err);
        }
    });

    peer.on('error', (err: Error) => {
        callbacks.onError(err);
    });

    peer.on('close', () => {
        callbacks.onClose();
    });
}

/**
 * Sends a sync message to the peer
 * @param peer - SimplePeer instance
 * @param message - Sync message to send
 */
export function sendSyncMessage(peer: Peer.Instance | null, message: SyncMessage): void {
    if (!peer || peer.destroyed) {
        console.warn('Cannot send message: peer is not connected or destroyed');
        return;
    }

    try {
        const data = JSON.stringify(message);
        peer.send(data);
    } catch (err) {
        console.error('Failed to send sync message:', err);
    }
}

/**
 * Generates a unique sender ID
 */
export function generateSenderId(): string {
    return `peer-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Copies text to clipboard with fallback for older browsers
 * @param text - Text to copy
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        // Modern clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers or non-secure contexts
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            } catch (err) {
                document.body.removeChild(textArea);
                console.error('Fallback: Failed to copy:', err);
                return false;
            }
        }
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        return false;
    }
}

/**
 * Validates signaling data format
 * @param data - Data to validate
 */
export function validateSignalData(data: string): boolean {
    try {
        const parsed = JSON.parse(data);
        return parsed && typeof parsed === 'object' && 'type' in parsed;
    } catch {
        return false;
    }
}
