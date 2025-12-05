'use client';

import { useState } from 'react';
import Peer from 'simple-peer';
import RoomCreator from '@/components/RoomCreator';
import RoomJoiner from '@/components/RoomJoiner';
import VideoPlayer from '@/components/VideoPlayer';
import ConnectionStatus from '@/components/ConnectionStatus';

type View = 'landing' | 'hosting' | 'joining' | 'watching';
type Role = 'host' | 'guest';
type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [peer, setPeer] = useState<Peer.Instance | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected');

  const handleHostClick = () => {
    setCurrentView('hosting');
    setRole('host');
    setConnectionStatus('connecting');
  };

  const handleJoinClick = () => {
    setCurrentView('joining');
    setRole('guest');
    setConnectionStatus('connecting');
  };

  const handleConnectionEstablished = (peerInstance: Peer.Instance) => {
    setPeer(peerInstance);
    setConnectionStatus('connected');
    setCurrentView('watching');
  };

  const handleBackToLanding = () => {
    if (peer) {
      peer.destroy();
    }
    setCurrentView('landing');
    setPeer(null);
    setRole(null);
    setConnectionStatus('disconnected');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-purple-50 to-pink-50 dark:from-zinc-950 dark:via-purple-950/20 dark:to-pink-950/20">
      {/* Header */}
      <header className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Watch Party
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              P2P synchronized video watching
            </p>
          </div>
          {currentView !== 'landing' && (
            <button
              onClick={handleBackToLanding}
              className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors font-medium"
            >
              ← Back
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 py-12">
        {/* Connection Status Bar */}
        {currentView !== 'landing' && (
          <div className="mb-6">
            <ConnectionStatus status={connectionStatus} role={role || undefined} />
          </div>
        )}

        {/* Landing View */}
        {currentView === 'landing' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12 animate-fadeIn">
              <h2 className="text-5xl font-bold text-zinc-800 dark:text-zinc-200 mb-4">
                Watch Videos Together
              </h2>
              <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                Create a peer-to-peer connection and watch videos in perfect sync with friends.
                No servers, no uploads, completely private.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Host Card */}
              <div className="p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 hover:shadow-purple-200 dark:hover:shadow-purple-900/20 transition-all duration-300 hover-lift animate-slideInLeft">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6">
                  <span className="text-3xl">🎬</span>
                </div>
                <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-3">
                  Host a Room
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                  Create a new watch party and invite friends to join. You'll control the playback.
                </p>
                <button
                  onClick={handleHostClick}
                  className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Host a Room
                </button>
              </div>

              {/* Join Card */}
              <div className="p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 hover:shadow-blue-200 dark:hover:shadow-blue-900/20 transition-all duration-300 hover-lift animate-slideInRight">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6">
                  <span className="text-3xl">🎥</span>
                </div>
                <h3 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-3">
                  Join a Room
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                  Have a room key? Join an existing watch party and sync with your friends.
                </p>
                <button
                  onClick={handleJoinClick}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Join a Room
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6 mt-12 animate-fadeIn" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              <div className="text-center p-6">
                <div className="text-4xl mb-3">🔒</div>
                <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                  Completely Private
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Direct peer-to-peer connection. No data passes through our servers.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="text-4xl mb-3">⚡</div>
                <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                  Perfect Sync
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Advanced WebRTC ensures everyone watches in perfect synchronization.
                </p>
              </div>
              <div className="text-center p-6">
                <div className="text-4xl mb-3">📁</div>
                <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
                  Local Files
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Watch any video file from your computer. No uploads required.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hosting View */}
        {currentView === 'hosting' && connectionStatus !== 'connected' && (
          <RoomCreator onConnectionEstablished={handleConnectionEstablished} />
        )}

        {/* Joining View */}
        {currentView === 'joining' && connectionStatus !== 'connected' && (
          <RoomJoiner onConnectionEstablished={handleConnectionEstablished} />
        )}

        {/* Watching View */}
        {currentView === 'watching' && peer && role && (
          <VideoPlayer peer={peer} role={role} />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        <p>Built with Next.js, WebRTC, and TypeScript</p>
      </footer>
    </div>
  );
}

