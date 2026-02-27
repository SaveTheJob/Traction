import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, updatePassword as firebaseUpdatePassword } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { recordAdminLog } from '../lib/adminLogger';

interface UserProfile {
    uid: string;
    email: string;
    firstName?: string;
    lastName?: string;
    dob?: string;
    plan: 'Free' | 'Pro';
    status: 'Active' | 'Suspended' | 'Pending';

    onboardingCompleted?: boolean;
}

const LOCAL_ADMIN_KEY = 'traction_is_local_admin';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    impersonatedUser: UserProfile | null;
    isAdmin: boolean;
    isLocalAdmin: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    impersonateUser: (user: UserProfile | null) => void;
    loginAsLocalAdmin: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    impersonatedUser: null,
    isAdmin: false,
    isLocalAdmin: false,
    loading: true,
    signOut: async () => { },
    updatePassword: async () => { },
    impersonateUser: () => { },
    loginAsLocalAdmin: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [impersonatedUser, setImpersonatedUser] = useState<UserProfile | null>(null);
    const [isLocalAdmin, setIsLocalAdmin] = useState(() => {
        return sessionStorage.getItem(LOCAL_ADMIN_KEY) === 'true';
    });
    const [loading, setLoading] = useState(true);

    const isAdmin = isLocalAdmin || user?.email === 'admin@traction.com' || user?.email === 'ayushraj@traction.com' || !!user; // For now, allow current user for testing, or specific emails.

    const impersonateUser = (target: UserProfile | null) => {
        if (!isAdmin) return;
        setImpersonatedUser(target);
        if (target) {
            recordAdminLog('GOD_MODE_ENTRY', isLocalAdmin ? 'Creator-Admin' : (user?.email || 'Unknown'), target.email);
        }
    };

    const loginAsLocalAdmin = () => {
        setIsLocalAdmin(true);
        sessionStorage.setItem(LOCAL_ADMIN_KEY, 'true');
    };

    const logoutLocalAdmin = () => {
        setIsLocalAdmin(false);
        sessionStorage.removeItem(LOCAL_ADMIN_KEY);
    };



    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Fetch or create profile
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (!userDoc.exists()) {
                    // Try to split displayName into first and last name
                    let firstName = '';
                    let lastName = '';
                    if (currentUser.displayName) {
                        const parts = currentUser.displayName.split(' ');
                        firstName = parts[0] || '';
                        lastName = parts.slice(1).join(' ') || '';
                    }

                    const newProfile: UserProfile = {
                        uid: currentUser.uid,
                        email: currentUser.email || '',
                        firstName,
                        lastName,
                        plan: 'Pro',
                        status: 'Active',
                        onboardingCompleted: false // New users ALWAYS go through onboarding
                    };
                    await setDoc(userDocRef, newProfile);
                    setUserProfile(newProfile);
                } else {
                    const data = userDoc.data() as Omit<UserProfile, 'uid'>;
                    const uid = userDoc.id;
                    const updates: Partial<UserProfile> = {};


                    // Backfill names if missing but available in auth
                    if ((!data.firstName || !data.lastName) && currentUser.displayName) {
                        const parts = currentUser.displayName.split(' ');
                        if (!data.firstName) {
                            updates.firstName = parts[0] || '';
                        }
                        if (!data.lastName) {
                            updates.lastName = parts.slice(1).join(' ') || '';
                        }
                    }

                    // Determine onboarding status
                    // For existing users who predate the onboarding feature,
                    // default to true (completed) so they don't get forced into onboarding.
                    // Only users explicitly marked false (new registrations) go through onboarding.
                    if (data.onboardingCompleted === undefined || data.onboardingCompleted === null) {
                        // Legacy user without the field — treat as completed
                        updates.onboardingCompleted = true;
                    }

                    if (Object.keys(updates).length > 0) {
                        await updateDoc(userDocRef, updates);
                        setUserProfile({ ...data, ...updates, uid } as UserProfile);
                    } else {
                        setUserProfile({ ...data, uid } as UserProfile);
                    }
                }
            } else {
                setUserProfile(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signOut = async () => {
        try {
            if (isLocalAdmin) {
                logoutLocalAdmin();
            }
            await firebaseSignOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const updatePassword = async (newPassword: string) => {
        if (!auth.currentUser) throw new Error("No user logged in.");
        await firebaseUpdatePassword(auth.currentUser, newPassword);
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, impersonatedUser, isAdmin, isLocalAdmin, loading, signOut, updatePassword, impersonateUser, loginAsLocalAdmin }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
