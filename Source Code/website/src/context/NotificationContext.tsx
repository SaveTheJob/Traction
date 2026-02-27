import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'update';

export interface NotificationItem {
    id: string;
    message: string;
    type: NotificationType;
    createdAt: any;
    isRead: boolean;
    link?: {
        text: string;
        url: string;
    };
}

interface NotificationContextType {
    notifications: NotificationItem[];
    unreadCount: number;
    showNotification: (message: string, type?: NotificationType, link?: { text: string; url: string }) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    deleteNotifications: (ids: string[]) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Load from localStorage for persistence of "read" status
    useEffect(() => {
        const saved = localStorage.getItem(`notifications_${user?.uid || 'guest'}`);
        if (saved) {
            try {
                setNotifications(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse notifications:", e);
            }
        }
    }, [user?.uid]);

    // Save to localStorage
    useEffect(() => {
        if (notifications.length > 0) {
            localStorage.setItem(`notifications_${user?.uid || 'guest'}`, JSON.stringify(notifications));
        }
    }, [notifications, user?.uid]);

    // Firestore Listener for Admin Broadcasts
    useEffect(() => {
        const q = query(
            collection(db, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                setNotifications(prev => {
                    let updated = [...prev];
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        const id = doc.id;
                        const isRelevant = data.targetUserId === 'GLOBAL' || data.targetUserId === user?.uid;
                        if (!isRelevant) return;
                        if (updated.some(n => n.id === id)) return;
                        const createdAt = data.createdAt?.toDate();
                        const now = new Date();
                        const isRecent = createdAt && (now.getTime() - createdAt.getTime()) < 3600000;
                        if (!isRecent) return;
                        updated = [{
                            id,
                            message: data.message,
                            type: data.type || 'info',
                            createdAt: data.createdAt,
                            isRead: false,
                            link: data.link
                        }, ...updated];
                    });
                    return updated.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 20);
                });
            }
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const showNotification = useCallback((message: string, type: NotificationType = 'info', link?: { text: string; url: string }) => {
        const id = Math.random().toString(36).substring(7);
        setNotifications(prev => [{
            id,
            message,
            type,
            createdAt: { seconds: Math.floor(Date.now() / 1000) },
            isRead: false,
            link
        }, ...prev].slice(0, 20));
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
        localStorage.removeItem(`notifications_${user?.uid || 'guest'}`);
    }, [user?.uid]);

    const deleteNotifications = useCallback((ids: string[]) => {
        setNotifications(prev => {
            const updated = prev.filter(n => !ids.includes(n.id));
            localStorage.setItem(`notifications_${user?.uid || 'guest'}`, JSON.stringify(updated));
            return updated;
        });
    }, [user?.uid]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            showNotification,
            markAsRead,
            markAllAsRead,
            clearNotifications,
            deleteNotifications
        }}>
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
