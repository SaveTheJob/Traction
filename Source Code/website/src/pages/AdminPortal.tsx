import { ShieldCheck } from 'lucide-react';
import React from 'react';
import { useLocation } from 'react-router-dom';
import BroadcastControl from '../components/admin/BroadcastControl';
import SecurityPulse from '../components/admin/SecurityPulse';
import SystemVitals from '../components/admin/SystemVitals';
import UserCommand from '../components/admin/UserCommand';

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-blue-600 animate-pulse" />
                        Support Mission Control
                    </h1>
                    <p className="text-slate-300 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 opacity-70">
                        Administrative Authority • Access Level: OVERSIGHT
                    </p>
                </div>
            </div>

            {renderContent()}
        </div>
    );
};

export default AdminPortal;
