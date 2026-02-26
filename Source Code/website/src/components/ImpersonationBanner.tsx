import React from 'react';
import { ShieldAlert, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ImpersonationBanner: React.FC = () => {
    const { isAdmin, impersonatedUser, impersonateUser } = useAuth();
    const navigate = useNavigate();

    if (!isAdmin || !impersonatedUser) return null;

    return (
        <div className="bg-blue-600/95 backdrop-blur-md border-b border-blue-400/30 text-white p-3 z-[60] relative overflow-hidden group shadow-2xl">
            <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-xl border border-white/20 animate-pulse">
                        <ShieldAlert className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">God Mode Active</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <p className="text-sm font-bold flex items-center gap-2">
                            Viewing Dashboard: <span className="text-blue-100 uppercase tracking-wider">{impersonatedUser.firstName} {impersonatedUser.lastName || impersonatedUser.email}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/admin')}
                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                        <User className="w-3.5 h-3.5" />
                        Admin Portal
                    </button>
                    <button
                        onClick={() => { impersonateUser(null); navigate('/admin'); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-white/20 active:scale-95"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Exit God Mode
                    </button>
                </div>
            </div>

            {/* Background patterns */}
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-white/5 to-transparent skew-x-[-20deg] translate-x-32" />
        </div>
    );
};

export default ImpersonationBanner;
