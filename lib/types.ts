// TypeScript types and interfaces for the watch party application

export type SyncAction = 'play' | 'pause' | 'seek' | 'ready' | 'timeupdate';

export interface SyncMessage {
    action: SyncAction;
    timestamp: number;
    senderId: string;
}

export interface PeerConnection {
    peer: any; // SimplePeer.Instance
    connected: boolean;
    role: 'host' | 'guest';
}

export interface VideoState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    isVideoLoaded: boolean;
}

export interface SignalData {
    type: string;
    sdp?: string;
    [key: string]: any;
}
