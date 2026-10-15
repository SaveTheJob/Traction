import { addDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from './firebase';
import { refs } from './db';

export type AdminAction =
    | 'GOD_MODE_ENTRY'
    | 'STATUS_CHANGE'
    | 'GLOBAL_BROADCAST'
    | 'DIRECT_BROADCAST'
    | 'FEED_REMOVED';

export type AdminOutcome = 'success' | 'blocked' | 'error';

/** Append-only audit entry; the actor comes from the signed-in admin. Never throws. */
export const recordAdminLog = async (
    action: AdminAction,
    target: string,
    outcome: AdminOutcome = 'success'
): Promise<void> => {
    const actor = auth.currentUser;
    if (!actor) return;
    try {
        await addDoc(refs.adminLogs(), {
            action,
            actorUid: actor.uid,
            actorEmail: actor.email ?? '',
            target,
            outcome,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to record admin log:', error);
    }
};
