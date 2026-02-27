import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type AdminAction =
    | 'GOD_MODE_ENTRY'
    | 'PLAN_UPGRADE'
    | 'USER_UPDATE'
    | 'GLOBAL_BROADCAST'
    | 'DIRECT_BROADCAST'
    | 'LOGIN_ATTEMPT'
    | 'USER_SUSPENSION';

export interface AdminLog {
    action: AdminAction;
    user: string;
    target: string;
    status: 'SUCCESS' | 'BLOCKED' | 'ERROR';
    createdAt: any;
}

export const recordAdminLog = async (
    action: AdminAction,
    user: string,
    target: string,
    status: 'SUCCESS' | 'BLOCKED' | 'ERROR' = 'SUCCESS'
) => {
    try {
        await addDoc(collection(db, 'admin_logs'), {
            action,
            user,
            target,
            status,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to record admin log:', error);
    }
};
