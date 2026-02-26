import React, { useState, useEffect } from 'react';
import {
    Search, ShieldCheck, User, Fingerprint, Edit2, Save, X,
    Activity, LayoutDashboard, History, Radio, ShieldAlert,
    Cpu, Database, Globe, Lock, AlertTriangle, Send
} from 'lucide-react';
import {
    collection, query, where, getDocs, doc, updateDoc, getDoc,
    addDoc, serverTimestamp, onSnapshot, orderBy, limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { recordAdminLog } from '../lib/adminLogger';
import type { AdminLog } from '../lib/adminLogger';

interface UserProfile {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    dob: string;
    plan: 'Free' | 'Pro';
    status: 'Active' | 'Suspended' | 'Pending';

    createdAt?: any;
}

const AdminPortal: React.FC = () => {
    const location = useLocation();

    const renderContent = () => {
        if (location.pathname === '/admin/vitals') return <SystemVitals />;
        if (location.pathname === '/admin/logs') return <SecurityPulse />;
        if (location.pathname === '/admin/broadcast') return <BroadcastControl />;
        return <UserCommand />;
    };

    return (
        <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-blue-600 animate-pulse" />
                        Support Mission Control
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 opacity-70">
                        Administrative Authority • Access Level: OVERSIGHT
                    </p>
                </div>
            </div>

            {renderContent()}
        </div>
    );
};

// --- Sub-Components ---

const UserCommand: React.FC = () => {
    const { impersonateUser, isLocalAdmin, user } = useAuth();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDOB, setSearchDOB] = useState('');
    const [searchLastName, setSearchLastName] = useState('');
    const [searchMode, setSearchMode] = useState<'email' | 'name'>('email');
    const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<UserProfile>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSearch = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        setTargetUser(null);
        setIsEditing(false);

        try {
            if (searchMode === 'email') {
                const queryStr = searchQuery.trim();
                // Search by email
                const q = query(
                    collection(db, 'users'),
                    where('email', '==', queryStr),
                    limit(1)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const d = querySnapshot.docs[0];
                    setTargetUser({ uid: d.id, ...d.data() } as UserProfile);
                } else {
                    // Fallback: try as Firebase UID
                    const userDoc = await getDoc(doc(db, 'users', queryStr));
                    if (userDoc.exists()) {
                        setTargetUser({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
                    } else {
                        setError('No user found with this email address.');
                    }
                }
            } else {
                const q = query(
                    collection(db, 'users'),
                    where('firstName', '==', searchQuery.trim()),
                    where('lastName', '==', searchLastName.trim()),
                    where('dob', '==', searchDOB)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const d = querySnapshot.docs[0];
                    setTargetUser({ uid: d.id, ...d.data() } as UserProfile);
                } else {
                    setError('No user found matching these details.');
                }
            }
        } catch (err: any) {
            setError('Search failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!targetUser) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', targetUser.uid), editData);

            // Log the action
            const adminId = isLocalAdmin ? 'Creator-Admin' : (user?.email || 'Unknown');
            if (editData.plan && editData.plan !== targetUser.plan) {
                recordAdminLog('PLAN_UPGRADE', adminId, targetUser.email, 'SUCCESS');
            }
            if (editData.status && editData.status !== targetUser.status) {
                recordAdminLog('USER_SUSPENSION', adminId, targetUser.email, 'SUCCESS');
            }
            recordAdminLog('USER_UPDATE', adminId, targetUser.email, 'SUCCESS');

            setTargetUser({ ...targetUser, ...editData } as UserProfile);
            setIsEditing(false);
            setMessage('Profile updated successfully.');
        } catch (err: any) {
            setError('Update failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <div className="premium-glass rounded-3xl overflow-hidden shadow-2xl border border-white/10 dark:border-white/5">
                    {/* Header */}
                    <div className="p-5 border-b border-white/10 dark:border-white/5 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Fingerprint className="w-4 h-4 text-blue-500" />
                            Search User
                        </h2>
                        <div className="flex bg-white/30 dark:bg-black/20 p-1 rounded-xl border border-white/10 dark:border-white/5">
                            <button onClick={() => setSearchMode('email')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${searchMode === 'email' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-400'}`}>Email</button>
                            <button onClick={() => setSearchMode('name')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${searchMode === 'name' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600' : 'text-slate-400'}`}>Name</button>
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="p-5 space-y-4">
                        {searchMode === 'email' ? (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="user@example.com"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full px-4 py-3 bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-2xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">First Name</label>
                                        <input type="text" placeholder="John" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-2.5 bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Last Name</label>
                                        <input type="text" placeholder="Doe" value={searchLastName} onChange={(e) => setSearchLastName(e.target.value)} className="w-full px-4 py-2.5 bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Date of Birth</label>
                                    <input type="date" value={searchDOB} onChange={(e) => setSearchDOB(e.target.value)} className="w-full px-4 py-2.5 bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all" />
                                </div>
                            </div>
                        )}

                        <button onClick={handleSearch} disabled={loading} className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-40">
                            {loading ? 'Searching...' : <><Search className="w-4 h-4" /> Search</>}
                        </button>

                        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">{error}</div>}
                        {message && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400">{message}</div>}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2">
                {targetUser ? (
                    <div className="premium-glass rounded-3xl shadow-2xl border border-white/20 dark:border-white/5 overflow-hidden bg-white/40 dark:bg-black/20 min-h-[500px]">
                        <div className="p-8 border-b border-white/10 dark:border-white/5 bg-white/30 dark:bg-black/30 flex justify-between items-center">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xl">
                                    <User className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{targetUser.firstName} {targetUser.lastName}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{targetUser.email}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <button onClick={handleUpdate} className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"><Save className="w-5 h-5" /></button>
                                        <button onClick={() => setIsEditing(false)} className="p-3 bg-slate-500 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"><X className="w-5 h-5" /></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { impersonateUser(targetUser); navigate('/'); }} className="p-3 bg-slate-900 dark:bg-white text-slate-100 dark:text-slate-900 rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 px-6 font-black text-xs uppercase tracking-widest">
                                            <LayoutDashboard className="w-4 h-4" /> GOD MODE
                                        </button>
                                        <button onClick={() => { setEditData(targetUser); setIsEditing(true); }} className="p-3 bg-blue-600 text-white rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 px-6 font-black text-xs uppercase tracking-widest">
                                            <Edit2 className="w-4 h-4" /> EDIT
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="p-10 grid grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Authorization</label>
                                    <div className="premium-glass p-5 rounded-2xl border border-white/10 dark:border-white/5 flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{targetUser.plan}</span>
                                        {isEditing && (
                                            <select value={editData.plan} onChange={(e) => setEditData({ ...editData, plan: e.target.value as any })} className="bg-white/50 dark:bg-black/40 border border-white/20 rounded-xl px-2 py-1 text-[10px] font-black uppercase outline-none">
                                                <option value="Free">Free</option>
                                                <option value="Pro">Pro</option>
                                            </select>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Status</label>
                                    <div className="premium-glass p-5 rounded-2xl border border-white/10 dark:border-white/5 flex items-center justify-between">
                                        <span className={`text-xs font-black uppercase tracking-widest ${targetUser.status === 'Suspended' ? 'text-rose-500' : 'text-emerald-500'}`}>{targetUser.status}</span>
                                        {isEditing && (
                                            <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value as any })} className="bg-white/50 dark:bg-black/40 border border-white/20 rounded-xl px-2 py-1 text-[10px] font-black uppercase outline-none">
                                                <option value="Active">Active</option>
                                                <option value="Suspended">Suspended</option>
                                                <option value="Pending">Pending</option>
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Metadata</label>
                                    <div className="premium-glass p-6 rounded-2xl border border-white/10 dark:border-white/5 space-y-4">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">UID: <span className="text-xs font-mono font-bold text-slate-900 dark:text-white ml-2 opacity-80">{targetUser.uid}</span></p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SYNCED: <span className="text-xs font-bold text-slate-900 dark:text-white ml-2 uppercase opacity-80">{targetUser.createdAt ? new Date(targetUser.createdAt.seconds * 1000).toLocaleDateString() : 'LEGACY'}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="premium-glass rounded-3xl shadow-xl border border-slate-200/50 dark:border-white/5 flex flex-col items-center justify-center min-h-[500px] text-center p-10 bg-white/20 dark:bg-black/10">
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-6">
                            <Search className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                        </div>
                        <h3 className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Monitor Standby</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-2 max-w-xs leading-relaxed">Probe for a subject profile to initiate administrative sync.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const SystemVitals: React.FC = () => {
    const [stats, setStats] = useState({ users: 0, apps: 0, suspended: 0, latency: 0, loading: true });

    useEffect(() => {
        // Live Listeners for counts
        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            const users = snapshot.size;
            const suspendedCount = snapshot.docs.filter(d => d.data().status === 'Suspended').length;
            setStats(prev => ({ ...prev, users, suspended: suspendedCount, loading: false }));
        });

        const unsubApps = onSnapshot(collection(db, 'jobs'), (snapshot) => {
            setStats(prev => ({ ...prev, apps: snapshot.size }));
        });

        // Latency Pulse
        const interval = setInterval(async () => {
            const start = performance.now();
            try {
                await getDoc(doc(db, 'vitals', 'health')); // Simple read to check latency
            } catch (e) {
                // Ignore if document doesnt exist, we just want the round-trip time
            }
            const end = performance.now();
            setStats(prev => ({ ...prev, latency: Math.floor(end - start) }));
        }, 5000);

        return () => {
            unsubUsers();
            unsubApps();
            clearInterval(interval);
        };
    }, []);

    const getHealthPercent = () => {
        if (stats.latency === 0) return '99.9%';
        if (stats.latency < 150) return '99.9%';
        if (stats.latency < 400) return '98.5%';
        if (stats.latency < 1000) return '94.2%';
        return '82.1%';
    };

    const getThreatLevel = () => {
        if (stats.suspended === 0) return 'Minimal';
        if (stats.suspended < 5) return 'Elevated';
        return 'Critical';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                { label: 'Total Ingress Users', val: stats.loading ? '...' : stats.users, icon: Globe, color: 'blue' },
                { label: 'Asset Clusters', val: stats.loading ? '...' : stats.apps, icon: Database, color: 'indigo' },
                { label: 'Engine Health', val: getHealthPercent(), icon: Cpu, color: stats.latency > 600 ? 'rose' : 'emerald' },
                { label: 'Threat Level', val: getThreatLevel(), icon: ShieldAlert, color: stats.suspended > 0 ? 'amber' : 'emerald' }
            ].map(v => (
                <div key={v.label} className="premium-glass p-6 rounded-3xl border border-white/10 dark:border-white/5 shadow-xl relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
                        <v.icon className={`w-12 h-12 text-${v.color}-500`} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{v.label}</p>
                    <p className={`text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter`}>{v.val}</p>
                    <div className={`mt-4 w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden`}>
                        <div className={`h-full bg-${v.color}-500 transition-all duration-1000 ${stats.loading ? 'w-0' : 'w-[80%]'} ${v.label === 'Engine Health' ? 'animate-pulse' : ''}`} />
                    </div>
                </div>
            ))}
            <div className="md:col-span-2 lg:col-span-4 premium-glass p-8 rounded-3xl border border-white/10 dark:border-white/5 shadow-2xl">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-500" /> Infrastructure Analytics
                </h3>
                <div className="h-64 flex items-end gap-2 px-1">
                    {[40, 60, 45, 80, 55, 90, 70, 85, 50, 65, 75, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-gradient-to-t from-blue-600/20 to-blue-500/60 rounded-t-lg transition-all hover:to-blue-400" style={{ height: `${h}%` }} />
                    ))}
                </div>
                <div className="mt-4 flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                    <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span>
                </div>
            </div>
        </div>
    );
};

const SecurityPulse: React.FC = () => {
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'admin_logs'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            setLogs(newLogs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getTimeAgo = (timestamp: any) => {
        if (!timestamp) return 'Just now';
        const date = timestamp.toDate();
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="premium-glass rounded-3xl border border-white/10 dark:border-white/5 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 dark:border-white/5 bg-white/30 dark:bg-black/20 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-500" /> Authorization History
                </h3>
                {loading && <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />}
            </div>
            <div className="divide-y divide-white/10 dark:divide-white/5 max-h-[600px] overflow-y-auto">
                {logs.length === 0 && !loading ? (
                    <div className="p-10 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No administrative logs detected in this cluster.</p>
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={log.createdAt?.seconds || i} className="p-5 flex items-center justify-between hover:bg-white/10 dark:hover:bg-black/10 transition-colors group animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {log.status === 'SUCCESS' ? <Lock className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900 dark:text-white tracking-widest uppercase">{log.action.replace(/_/g, ' ')}</p>
                                    <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">EXERCISED BY: {log.user} • ON: {log.target}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{getTimeAgo(log.createdAt)}</p>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${log.status === 'SUCCESS' ? 'border-emerald-500/20 text-emerald-500' : 'border-rose-500/20 text-rose-500'} uppercase tracking-widest mt-1 inline-block`}>
                                    {log.status}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const BroadcastControl: React.FC = () => {
    const { isLocalAdmin, user } = useAuth();
    const [message, setMessage] = useState('');
    const [targetUid, setTargetUid] = useState('');
    const [type, setType] = useState<'info' | 'warning' | 'error' | 'success' | 'update'>('info');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleBroadcast = async () => {
        if (!message.trim()) return;
        setLoading(true);
        try {
            await addDoc(collection(db, 'notifications'), {
                message: message.trim(),
                targetUserId: targetUid.trim() || 'GLOBAL',
                type: type,
                createdAt: serverTimestamp(),
            });

            // Log the action
            recordAdminLog(
                targetUid.trim() ? 'DIRECT_BROADCAST' : 'GLOBAL_BROADCAST',
                isLocalAdmin ? 'Creator-Admin' : (user?.email || 'Unknown'),
                targetUid.trim() || 'ALL_USERS',
                'SUCCESS'
            );

            setStatus('Transmission Successful');
            setMessage('');
            setTargetUid('');
            setTimeout(() => setStatus(''), 3000);
        } catch (err: any) {
            setStatus('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Broadcast Form — takes 2 columns */}
            <div className="lg:col-span-2 premium-glass rounded-3xl border border-white/10 dark:border-white/5 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 pb-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                Broadcast Message
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-[42px] font-medium">
                                Send notifications to all users or a specific account
                            </p>
                        </div>
                        {status && (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 animate-in fade-in zoom-in">
                                ✓ {status}
                            </span>
                        )}
                    </div>
                </div>

                {/* Form Body */}
                <div className="p-6 space-y-5">
                    {/* Message Field */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Message
                        </label>
                        <textarea
                            placeholder="Type your broadcast message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full px-4 py-3.5 bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-2xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all h-32 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                    </div>

                    {/* Target & Priority Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Target
                            </label>
                            <input
                                type="text"
                                placeholder="All users (leave empty for global)"
                                value={targetUid}
                                onChange={(e) => setTargetUid(e.target.value)}
                                className="w-full px-4 py-3 bg-white/40 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-2xl text-sm font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Priority
                            </label>
                            <div className="flex bg-white/30 dark:bg-black/20 p-1 rounded-xl border border-white/10 dark:border-white/5">
                                {([
                                    { key: 'info', label: 'Info', color: 'text-blue-600 dark:text-blue-400', activeBg: 'bg-blue-500/10 border-blue-500/20' },
                                    { key: 'warning', label: 'Warning', color: 'text-amber-600 dark:text-amber-400', activeBg: 'bg-amber-500/10 border-amber-500/20' },
                                    { key: 'error', label: 'Critical', color: 'text-red-600 dark:text-red-400', activeBg: 'bg-red-500/10 border-red-500/20' },
                                ] as const).map(p => (
                                    <button
                                        key={p.key}
                                        onClick={() => setType(p.key as any)}
                                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${type === p.key
                                            ? `${p.activeBg} ${p.color} shadow-sm border`
                                            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 border border-transparent'
                                            }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Send Button */}
                    <button
                        onClick={handleBroadcast}
                        disabled={loading || !message.trim()}
                        className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2.5 group disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        {loading ? 'Sending...' : 'Send Broadcast'}
                    </button>
                </div>
            </div>

            {/* Right Sidebar — Guidelines */}
            <div className="space-y-5">
                <div className="premium-glass p-6 rounded-3xl border border-white/10 dark:border-white/5 shadow-xl space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Guidelines
                    </h4>
                    <div className="space-y-3">
                        <div className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                Global broadcasts are delivered to <strong className="text-slate-700 dark:text-slate-200">all active users</strong> immediately.
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                To target a specific user, enter their <strong className="text-slate-700 dark:text-slate-200">email address or UID</strong> in the Target field.
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                Use <strong className="text-slate-700 dark:text-slate-200">Critical</strong> priority sparingly — it triggers prominent alerts on the user's screen.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Priority Legend */}
                <div className="premium-glass p-6 rounded-3xl border border-white/10 dark:border-white/5 shadow-xl space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Priority Levels</h4>
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-3 text-xs font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <span className="text-slate-600 dark:text-slate-300"><strong>Info</strong> — General updates and announcements</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <span className="text-slate-600 dark:text-slate-300"><strong>Warning</strong> — Important notices requiring attention</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-medium">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <span className="text-slate-600 dark:text-slate-300"><strong>Critical</strong> — Urgent system alerts</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPortal;
