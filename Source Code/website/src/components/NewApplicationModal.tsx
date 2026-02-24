import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useJobs } from '../context/JobContext';
import type { Priority, Status } from '../context/JobContext';

export default function NewApplicationModal() {
    const { jobs, isModalOpen, closeModal, addJob, updateJob, editingJobId } = useJobs();

    // Form state
    const [company, setCompany] = useState('');
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [link, setLink] = useState('');
    const [status, setStatus] = useState<Status>('Applied');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isModalOpen && editingJobId) {
            const jobToEdit = jobs.find(j => j.id === editingJobId);
            if (jobToEdit) {
                setCompany(jobToEdit.company);
                setTitle(jobToEdit.title);
                setLocation(jobToEdit.location || '');
                setLink(jobToEdit.link || '');
                setStatus(jobToEdit.status);
                setPriority(jobToEdit.priority);
                setNotes(jobToEdit.notes || '');
            }
        } else if (isModalOpen && !editingJobId) {
            setCompany('');
            setTitle('');
            setLocation('');
            setLink('');
            setStatus('Applied');
            setPriority('Medium');
            setNotes('');
        }
    }, [isModalOpen, editingJobId, jobs]);

    if (!isModalOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!company || !title || !location) return;

        const jobData = { company, title, location, link, status, priority, notes };
        if (editingJobId) {
            updateJob(editingJobId, jobData);
        } else {
            addJob(jobData);
        }
        closeModal();
    };

    const isEditing = !!editingJobId;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm shadow-2xl">
            <div className="bg-white rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">{isEditing ? 'Edit Application' : 'New Application'}</h2>
                    <button
                        onClick={closeModal}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <form id="global-add-job-form" className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                            <input required value={company} onChange={(e) => setCompany(e.target.value)} type="text" placeholder="e.g. Google" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input required value={location} onChange={(e) => setLocation(e.target.value)} type="text" placeholder="e.g. San Francisco, CA or Remote" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                            <input required value={title} onChange={(e) => setTitle(e.target.value)} type="text" placeholder="e.g. Software Engineer" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Link</label>
                            <input value={link} onChange={(e) => setLink(e.target.value)} type="url" placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                                    <option value="Wishlist">Wishlist</option>
                                    <option value="Applied">Applied</option>
                                    <option value="Interviewing">Interviewing</option>
                                    <option value="Offer">Offer</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any details..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"></textarea>
                        </div>
                    </form>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
                    <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="global-add-job-form"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                    >
                        {isEditing ? 'Save Changes' : 'Save Application'}
                    </button>
                </div>
            </div>
        </div>
    );
}
