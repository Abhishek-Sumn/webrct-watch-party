'use client';

import React from 'react';

interface ConnectionStatusProps {
    status: 'disconnected' | 'connecting' | 'connected';
    role?: 'host' | 'guest';
    onReconnect?: () => void;
}

export default function ConnectionStatus({ status, role, onReconnect }: ConnectionStatusProps) {
    const getStatusColor = () => {
        switch (status) {
            case 'connected':
                return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800 text-green-800 dark:text-green-200';
            case 'connecting':
                return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
            case 'disconnected':
                return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'connected':
                return '●';
            case 'connecting':
                return '◐';
            case 'disconnected':
                return '○';
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'connected':
                return `Connected${role ? ` as ${role}` : ''}`;
            case 'connecting':
                return 'Connecting...';
            case 'disconnected':
                return 'Disconnected';
        }
    };

    return (
        <div className={`flex items-center justify-between px-4 py-2 rounded-lg border ${getStatusColor()} transition-all duration-200`}>
            <div className="flex items-center gap-2">
                <span className="text-lg animate-pulse">{getStatusIcon()}</span>
                <span className="font-medium text-sm">{getStatusText()}</span>
            </div>

            {status === 'disconnected' && onReconnect && (
                <button
                    onClick={onReconnect}
                    className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                >
                    Reconnect
                </button>
            )}
        </div>
    );
}
