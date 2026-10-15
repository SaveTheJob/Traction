/* eslint-disable react-refresh/only-export-components -- context file intentionally exports its provider and consumer hook together */
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { query, orderBy, limit, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { refs, toDate, type NoticeType } from '../lib/db';
import { useEffectiveUserId } from '../hooks/useEffectiveUserId';

export interface NotificationItem {
    id: string;
    source: 'broadcast' | 'direct';
    message: string;
    type: NoticeType;
    createdAt: Date;
    read: boolean;
}

interface NotificationContextType {
    notifications: NotificationItem[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Older docs may carry other type values; map them onto the three codes.
const toNoticeType = (t: unknown): NoticeType =>
    t === 'success' ? 'success' : t === 'warning' || t === 'alert' || t === 'error' ? 'warning' : 'info';

const readKey = (uid: string) => `broadcastsRead_${uid}`;

const loadReadIds = (uid: string): string[] => {
    try {
        const parsed = JSON.parse(localStorage.getItem(readKey(uid)) || '[]');
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const uid = useEffectiveUserId();
    const [broadcasts, setBroadcasts] = useState<Omit<NotificationItem, 'read'>[]>([]);
    const [direct, setDirect] = useState<NotificationItem[]>([]);
    const [readIds, setReadIds] = useState<string[]>([]);

    // Read state for broadcasts lives in localStorage (one shared doc, no per-user write).
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- resets state when the subscription or seed key changes; intentional
        setReadIds(uid ? loadReadIds(uid) : []);
    }, [uid]);

    useEffect(() => {
        if (!uid) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- resets state when the subscription or seed key changes; intentional
            setBroadcasts([]);
            return;
        }
        const q = query(refs.broadcasts(), orderBy('createdAt', 'desc'), limit(10));
        return onSnapshot(q, (snap) => {
            setBroadcasts(snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    source: 'broadcast' as const,
                    message: String(data.message ?? ''),
                    type: toNoticeType(data.type),
                    createdAt: toDate(data.createdAt) ?? new Date(),
                };
            }));
        }, (err) => console.error('Broadcast listener failed:', err));
    }, [uid]);

    useEffect(() => {
        if (!uid) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- resets state when the subscription or seed key changes; intentional
            setDirect([]);
            return;
        }
        const q = query(refs.notifications(uid), orderBy('createdAt', 'desc'), limit(20));
        return onSnapshot(q, (snap) => {
            setDirect(snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    source: 'direct' as const,
                    message: String(data.message ?? ''),
                    type: toNoticeType(data.type),
                    createdAt: toDate(data.createdAt) ?? new Date(),
                    read: data.read === true,
                };
            }));
        }, (err) => console.error('Notification listener failed:', err));
    }, [uid]);

    const notifications = useMemo<NotificationItem[]>(() => {
        const merged = [
            ...broadcasts.map((b) => ({ ...b, read: readIds.includes(b.id) })),
            ...direct,
        ];
        return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }, [broadcasts, direct, readIds]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    const markBroadcastsRead = useCallback((ids: string[]) => {
        if (!uid) return;
        setReadIds((prev) => {
            const next = Array.from(new Set([...prev, ...ids]));
            try {
                localStorage.setItem(readKey(uid), JSON.stringify(next));
            } catch { /* storage unavailable: read state lasts for this session only */ }
            return next;
        });
    }, [uid]);

    const markAsRead = useCallback((id: string) => {
        if (!uid) return;
        const item = notifications.find((n) => n.id === id && !n.read);
        if (!item) return;
        if (item.source === 'broadcast') {
            markBroadcastsRead([id]);
        } else {
            updateDoc(refs.notification(uid, id), { read: true })
                .catch((err) => console.error('Failed to mark notification read:', err));
        }
    }, [uid, notifications, markBroadcastsRead]);

    const markAllAsRead = useCallback(() => {
        if (!uid) return;
        markBroadcastsRead(notifications.filter((n) => n.source === 'broadcast').map((n) => n.id));
        const unreadDirect = notifications.filter((n) => n.source === 'direct' && !n.read);
        if (unreadDirect.length === 0) return;
        const batch = writeBatch(db);
        unreadDirect.forEach((n) => batch.update(refs.notification(uid, n.id), { read: true }));
        batch.commit().catch((err) => console.error('Failed to mark notifications read:', err));
    }, [uid, notifications, markBroadcastsRead]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
