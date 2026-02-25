import { useState } from 'react';
import { Plus, Building2, Calendar, GripVertical, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useJobs } from '../context/JobContext';
import type { Priority, Status } from '../context/JobContext';

const COLUMNS: { id: Status; label: string; color: string }[] = [
    { id: 'Wishlist', label: 'Wishlist', color: 'bg-gray-100 text-gray-700' },
    { id: 'Applied', label: 'Applied', color: 'bg-blue-100 text-blue-700' },
    { id: 'Interviewing', label: 'Interviewing', color: 'bg-blue-100 text-blue-700' },
    { id: 'Offer', label: 'Offer', color: 'bg-green-100 text-green-700' },
    { id: 'Rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
];

export default function Pipeline() {
    const { jobs, updateJobStatus, openModal, deleteJob } = useJobs();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterPriority, setFilterPriority] = useState<Priority | 'All'>('All');

    const getPriorityColor = (p: Priority) => {
        switch (p) {
            case 'High': return 'bg-red-50 text-red-700 border-red-200';
            case 'Medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'Low': return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const handleDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        updateJobStatus(draggableId, destination.droppableId as Status);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to permanently delete this application? This cannot be undone.")) {
            deleteJob(id);
        }
    };

    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = filterPriority === 'All' || job.priority === filterPriority;
        return matchesSearch && matchesPriority;
    });

    return (
        <div className="p-4 md:p-8 h-full flex flex-col max-w-[1600px] mx-auto overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 flex-shrink-0 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">Track your job applications across different stages.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search company or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value as Priority | 'All')}
                            className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-md appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="All">All</option>
                            <option value="High">High Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="Low">Low Priority</option>
                        </select>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm cursor-pointer border border-transparent flex items-center gap-2 shrink-0"
                    >
                        <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Application</span>
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex-1 flex gap-6 overflow-x-auto pb-4 items-start h-full">
                    {COLUMNS.map((col) => (
                        <div key={col.id} className="flex-shrink-0 w-80 bg-gray-50/50 rounded-xl border border-gray-200 flex flex-col h-full max-h-[calc(100vh-12rem)]">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
                                <h3 className="font-semibold text-gray-900">{col.label}</h3>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.color}`}>
                                    {filteredJobs.filter(j => j.status === col.id).length}
                                </span>
                            </div>

                            <Droppable droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`p-3 flex-1 overflow-y-auto space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50' : ''}`}
                                    >
                                        {filteredJobs.filter(j => j.status === col.id).map((job, index) => (
                                            <Draggable key={job.id} draggableId={job.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500 ring-opacity-50 rotate-2' : ''}`}
                                                        style={provided.draggableProps.style}
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div {...provided.dragHandleProps} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing transition-colors hidden group-hover:block -ml-2">
                                                                    <GripVertical className="w-4 h-4" />
                                                                </div>
                                                                <div className="w-10 h-10 rounded bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:border-blue-100 transition-colors">
                                                                    <Building2 className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => openModal(job.id)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors hidden group-hover:block" title="Edit">
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={() => handleDelete(job.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors hidden group-hover:block" title="Force Delete">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(job.priority)}`}>
                                                                    {job.priority}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <h4 className="font-bold text-gray-900 text-sm">{job.title}</h4>
                                                        {job.link ? (
                                                            <a href={job.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-sm mt-0.5 max-w-[220px] truncate block" title={`${job.company}${job.location ? ` • ${job.location}` : ''}`}>
                                                                {job.company}{job.location ? ` • ${job.location}` : ''}
                                                            </a>
                                                        ) : (
                                                            <p className="text-gray-500 text-sm mt-0.5 max-w-[220px] truncate" title={`${job.company}${job.location ? ` • ${job.location}` : ''}`}>
                                                                {job.company}{job.location ? ` • ${job.location}` : ''}
                                                            </p>
                                                        )}

                                                        {job.notes && (
                                                            <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 italic line-clamp-2">
                                                                "{job.notes}"
                                                            </div>
                                                        )}

                                                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                <span>Applied {job.dateApplied}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}
