import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type LogEntry = {
    id: string;
    timestamp: Date;
    type: 'request' | 'response' | 'error';
    source: string; // e.g., 'LLMChat'
    payload: any;
};

interface AiDebugContextType {
    logs: LogEntry[];
    addLog: (type: LogEntry['type'], source: string, payload: any) => void;
    clearLogs: () => void;
    enabled: boolean;
    setEnabled: (val: boolean) => void;
}

const AiDebugContext = createContext<AiDebugContextType | undefined>(undefined);

export const AiDebugProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [enabled, setEnabledState] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('ai_debug_enabled') !== 'false';
        }
        return true;
    });

    const setEnabled = (val: boolean) => {
        setEnabledState(val);
        localStorage.setItem('ai_debug_enabled', val ? 'true' : 'false');
    };

    const [logs, setLogs] = useState<LogEntry[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ai_debug_logs');
            if (saved) {
                try {
                    return JSON.parse(saved).map((l: any) => ({
                        ...l,
                        timestamp: new Date(l.timestamp)
                    }));
                } catch (e) {
                    console.error('Failed to parse logs', e);
                }
            }
        }
        return [];
    });

    const addLog = (type: LogEntry['type'], source: string, payload: any) => {
        if (!enabled) return; // Skip if disabled
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            type,
            source,
            payload,
        };
        setLogs((prev) => {
            const next = [newLog, ...prev].slice(0, 50); // Keep last 50
            localStorage.setItem('ai_debug_logs', JSON.stringify(next));
            return next;
        });
    };

    const clearLogs = () => {
        localStorage.removeItem('ai_debug_logs');
        setLogs([]);
    };

    return (
        <AiDebugContext.Provider value={{ logs, addLog, clearLogs, enabled, setEnabled }}>
            {children}
        </AiDebugContext.Provider>
    );
};

export const useAiDebug = () => {
    const context = useContext(AiDebugContext);
    if (context === undefined) {
        throw new Error('useAiDebug must be used within an AiDebugProvider');
    }
    return context;
};
