import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, KanbanSquare, Users, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function Sidebar() {
    const location = useLocation();
    const { user, signOut } = useAuth();
    const navItems = [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Pipeline', path: '/pipeline', icon: KanbanSquare },
        { label: 'Network', path: '/network', icon: Users },
        { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    ];

    return (
        <div className="w-none md:w-64 bg-white border-r border-gray-200 h-screen flex-col hidden md:flex shrink-0">
            <div className="p-6">
                <Logo className="h-8" />
            </div>
            <nav className="flex-1 px-4 space-y-1 mt-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-gray-200">
                <div className="flex flex-col gap-2">
                    <Link to="/account" className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors block">
                        <div className="flex items-center gap-3 w-full">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0 uppercase">
                                {user?.email ? user.email.charAt(0) : 'U'}
                            </div>
                            <div className="text-sm font-medium text-gray-700 truncate block">{user?.displayName || user?.email || 'User'}</div>
                        </div>
                    </Link>
                    <button onClick={signOut} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left cursor-pointer">
                        <LogOut className="w-4 h-4" />
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}
