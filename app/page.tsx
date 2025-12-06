'use client';

import { useState, useEffect, useCallback } from 'react';
import Peer from 'simple-peer';
import { Camera, Mic, Video, ArrowRight, X } from 'lucide-react';

import RoomCreator from '@/components/RoomCreator';
import RoomJoiner from '@/components/RoomJoiner';
import VideoPlayer from '@/components/VideoPlayer';
import ConnectionStatus from '@/components/ConnectionStatus';
import WebcamPanel from '@/components/WebcamPanel';

type View = 'landing' | 'lobby' | 'hosting' | 'joining' | 'watching';
type Role = 'host' | 'guest';
type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [peer, setPeer] = useState<Peer.Instance | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [pendingRole, setPendingRole] = useState<Role | null>(null); // Role selected before Lobby
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected');

  // Media State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoHidden, setIsVideoHidden] = useState(false);
  const [mediaError, setMediaError] = useState<string>('');

  // Function to Request Media
  // Function to Request Media
  // Cleanup helper
  const stopLocalStream = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
  }, [localStream]);

  // Function to Request Media
  const requestMedia = async () => {
    try {
      setMediaError('');
      stopLocalStream(); // Stop any existing first

      // 1. Check if browser supports mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser API not supported. Please use Chrome, Firefox, or Safari.');
      }

      // 2. Check for Secure Context (HTTPS or localhost)
      if (!window.isSecureContext) {
        throw new Error('Webcam requires a Secure Context (HTTPS or localhost).');
      }

      console.log("Requesting user media...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: true
      });

      console.log("Media stream acquired:", stream.id);
      setLocalStream(stream);

      // Ensure tracks are enabled
      stream.getTracks().forEach(track => track.enabled = true);

      setIsMuted(false);
      setIsVideoHidden(false);
    } catch (err: any) {
      console.error('Failed to get media:', err);

      // Detailed Error Messages
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMediaError('Permission denied. Please click the Lock icon in your address bar and "Reset Permissions" or "Allow" Camera/Microphone.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMediaError('No camera or microphone found. Please check your device connections.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setMediaError('Camera/Mic is already in use by another application (Zoom, Teams, etc.). Please close it and try again.');
      } else {
        setMediaError(err.message || 'Unknown error occurred. Check console for details.');
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Local stream cleanup handled by state update mostly, 
      // but strictly stopping tracks is good practice.
      // We can't easily call stopLocalStream here if it depends on state that might be stale in cleanup,
      // but ref usage is better. For now simple track stop:
    };
  }, []);

  const handleStartHost = () => {
    setPendingRole('host');
    setCurrentView('lobby');
    // requestMedia(); // Removed auto-request
  };

  const handleStartJoin = () => {
    setPendingRole('guest');
    setCurrentView('lobby');
    // requestMedia(); // Removed auto-request
  };

  const handleLobbyContinue = () => {
    if (pendingRole === 'host') {
      setCurrentView('hosting');
      setRole('host');
      setConnectionStatus('connecting');
    } else {
      setCurrentView('joining');
      setRole('guest');
      setConnectionStatus('connecting');
    }
  };

  const handleSkipMedia = () => {
    // Proceed without media
    stopLocalStream(); // Explicitly stop any partial stream
    setIsMuted(true);
    setIsVideoHidden(true);
    handleLobbyContinue();
  };

  const handleConnectionEstablished = (peerInstance: Peer.Instance) => {
    setPeer(peerInstance);
    setConnectionStatus('connected');
    setCurrentView('watching');
  };

  const handleBackToLanding = () => {
    peer?.destroy();
    setRemoteStream(null);
    // Note: We keep localStream to avoid re-requesting if they just want to restart
    setCurrentView('landing');
    setPeer(null);
    setRole(null);
    setPendingRole(null);
    setConnectionStatus('disconnected');
  };

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [localStream, isMuted]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoHidden(!isVideoHidden);
    }
  }, [localStream, isVideoHidden]);

  // Handler for incoming remote stream
  const handleRemoteStream = (stream: MediaStream) => {
    console.log("Setting remote stream in page.tsx", stream);
    setRemoteStream(stream);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-zinc-950 text-white selection:bg-purple-500/30">

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '7s' }}></div>
      </div>

      {/* Header - Auto-hide in Watching Mode */}
      {currentView !== 'watching' && (
        <header className="p-6 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50 animate-slideDown">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/20`}>
                <Video size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                  Watch Party
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ConnectionStatus
                status={connectionStatus}
                role={role || undefined}
              />
              {currentView !== 'landing' && (
                <button
                  onClick={handleBackToLanding}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <X size={16} /> Disconnect
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      <main className={`container mx-auto relative z-10 ${currentView === 'watching' ? 'p-0 flex items-center justify-center min-h-screen' : 'px-4 py-8'}`}>

        {/* LANDING VIEW */}
        {currentView === 'landing' && (
          <div className="max-w-4xl mx-auto mt-20 animate-fadeIn">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                Watch Together, Anywhere.
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                Synchronized video playback with crystal clear P2P video chat. No servers, no sign-ups, just share a link.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Host Card */}
              <button
                onClick={handleStartHost}
                className="group relative p-8 rounded-3xl bg-zinc-900/50 border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 text-left overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5">
                    <Video className="text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Host a Party</h3>
                  <p className="text-zinc-400 mb-6">Create a room, invite friends, and control the playback.</p>
                  <div className="flex items-center text-purple-400 font-medium group-hover:translate-x-2 transition-transform">
                    Get Started <ArrowRight size={16} className="ml-2" />
                  </div>
                </div>
              </button>

              {/* Join Card */}
              <button
                onClick={handleStartJoin}
                className="group relative p-8 rounded-3xl bg-zinc-900/50 border border-white/10 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 text-left overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5">
                    <Camera className="text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Join a Room</h3>
                  <p className="text-zinc-400 mb-6">Have a code? Enter it to sync up and start watching.</p>
                  <div className="flex items-center text-blue-400 font-medium group-hover:translate-x-2 transition-transform">
                    Join Now <ArrowRight size={16} className="ml-2" />
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* LOBBY VIEW */}
        {currentView === 'lobby' && (
          <div className="max-w-2xl mx-auto mt-12 animate-scaleIn">
            <div className="glass-card rounded-3xl p-8 border border-white/10">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Setup your Device</h2>
                <p className="text-zinc-400">Check your camera and microphone before joining.</p>
              </div>

              {/* Media Preview Area */}
              <div className="mb-8 bg-black/40 rounded-2xl overflow-hidden border border-white/10 relative min-h-[300px] flex items-center justify-center">
                {localStream ? (
                  <WebcamPanel
                    localStream={localStream}
                    remoteStream={null}
                    isMuted={isMuted}
                    isVideoHidden={isVideoHidden}
                    onToggleMute={toggleMute}
                    onToggleVideo={toggleVideo}
                    isCompact={false}
                  />
                ) : (
                  <div className="text-center p-6 w-full">
                    <div className="h-16 w-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                      <Camera size={28} className="text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Camera Access Needed</h3>
                    <p className="text-sm text-zinc-400 mb-6 max-w-sm mx-auto">
                      We need permission to use your camera and microphone so your friends can see and hear you.
                    </p>
                    <div className="flex flex-col gap-3 max-w-xs mx-auto">
                      <button
                        onClick={requestMedia}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-purple-900/20"
                      >
                        Enable Camera & Microphone
                      </button>
                      <button
                        onClick={handleSkipMedia}
                        className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2"
                      >
                        Continue without Camera
                      </button>
                    </div>
                    {mediaError && (
                      <p className="text-red-400 text-sm mt-4 font-medium px-4 py-2 bg-red-500/10 rounded-lg border border-red-500/20">
                        {mediaError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleBackToLanding}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleLobbyContinue}
                  className={`flex-1 py-3 font-semibold rounded-xl text-white transition-all shadow-lg hover:shadow-xl ${pendingRole === 'host'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'
                    } ${!localStream ? 'hidden' : ''}`}
                  disabled={!localStream}
                >
                  Looks Good, Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE VIEWS (Hosting/Joining/Watching) */}
        {(currentView === 'hosting' || currentView === 'joining' || currentView === 'watching') && (
          <div className={`relative animate-fadeIn ${currentView === 'watching' ? 'w-full max-w-7xl' : ''}`}>

            {/* Floating Webcam ONLY for Hosting/Joining phases where VideoPlayer isn't visible */}
            {(currentView === 'hosting' || currentView === 'joining') && (
              <div className="fixed top-24 right-6 z-40">
                <WebcamPanel
                  localStream={localStream}
                  remoteStream={remoteStream}
                  isMuted={isMuted}
                  isVideoHidden={isVideoHidden}
                  onToggleMute={toggleMute}
                  onToggleVideo={toggleVideo}
                  isCompact={true}
                />
              </div>
            )}

            {currentView === 'hosting' && (
              <RoomCreator
                onConnectionEstablished={handleConnectionEstablished}
                localStream={localStream}
                onRemoteStream={handleRemoteStream}
              />
            )}

            {currentView === 'joining' && (
              <RoomJoiner
                onConnectionEstablished={handleConnectionEstablished}
                localStream={localStream}
                onRemoteStream={handleRemoteStream}
              />
            )}

            {currentView === 'watching' && peer && (
              <VideoPlayer
                peer={peer}
                role={role!}
              >
                {/* Webcam Nested in VideoPlayer for Theater Mode */}
                <WebcamPanel
                  localStream={localStream}
                  remoteStream={remoteStream}
                  isMuted={isMuted}
                  isVideoHidden={isVideoHidden}
                  onToggleMute={toggleMute}
                  onToggleVideo={toggleVideo}
                  isCompact={true}
                />
              </VideoPlayer>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
