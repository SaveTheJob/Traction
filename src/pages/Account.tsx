import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useJobs } from '../context/JobContext';
import { KeyRound, ShieldCheck, CreditCard, Copy, AlertTriangle } from 'lucide-react';

export default function Account() {
    const { user, updatePassword } = useAuth();
    const { jobs } = useJobs();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password should be at least 6 characters.' });
            return;
        }

        setIsUpdating(true);
        try {
            await updatePassword(newPassword);
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            // Provide a user friendly error for recent-login requirement
            if (error?.code === 'auth/requires-recent-login') {
                setMessage({ type: 'error', text: 'Please sign out and sign back in to update your password for security purposes.' });
            } else {
                setMessage({ type: 'error', text: error.message || 'Failed to update password.' });
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const copyUid = () => {
        if (user?.uid) {
            navigator.clipboard.writeText(user.uid);
            alert("Account UID copied to clipboard!");
        }
    };

    const isOverLimit = jobs.length >= 50;

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
                <p className="text-gray-500 mt-1 text-sm">Manage your profile, security, and subscription.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Information */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-blue-600" />
                            <h2 className="font-semibold text-gray-900">Profile Information</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="text"
                                    disabled
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-500 cursor-not-allowed text-sm"
                                    value={user?.email || 'No email attached'}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account UID (For Extension)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        disabled
                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-500 font-mono text-sm"
                                        value={user?.uid || ''}
                                    />
                                    <button
                                        onClick={copyUid}
                                        className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-gray-500 hover:text-blue-600"
                                        title="Copy UID"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Billing & Usage */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            <h2 className="font-semibold text-gray-900">Billing & Usage</h2>
                        </div>
                        <div className="p-5">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-medium text-gray-700">Free Tier Usage</span>
                                <span className={`text-xs font-bold ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
                                    {jobs.length} / 50
                                </span>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 overflow-hidden">
                                <div
                                    className={`h-2.5 rounded-full ${isOverLimit ? 'bg-red-600' : 'bg-blue-600'}`}
                                    style={{ width: `${Math.min((jobs.length / 50) * 100, 100)}%` }}
                                ></div>
                            </div>

                            {isOverLimit ? (
                                <div className="bg-red-50 border border-red-100 p-3 rounded-md flex items-start gap-2 mb-4">
                                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-800">
                                        You have reached the free limit. Upgrade to Pro to continue tracking jobs.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 mb-4">
                                    You can track up to 50 applications for free. After that, it's just $5/month for unlimited active tracking!
                                </p>
                            )}

                            <button className="w-full bg-blue-50 border border-blue-100 text-blue-700 font-medium py-2 rounded-md hover:bg-blue-100 transition-colors text-sm flex items-center justify-center gap-2">
                                Upgrade to Pro for $5/mo
                            </button>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-fit">
                    <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-blue-600" />
                        <h2 className="font-semibold text-gray-900">Change Password</h2>
                    </div>
                    <form onSubmit={handleUpdatePassword} className="p-5 space-y-4">
                        {message.text && (
                            <div className={`p-3 rounded-md text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                {message.text}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                minLength={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="Enter new password"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="Confirm new password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isUpdating || !newPassword || !confirmPassword}
                            className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-4"
                        >
                            {isUpdating ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
