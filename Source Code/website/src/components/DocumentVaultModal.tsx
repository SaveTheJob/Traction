import { FileText, Link as LinkIcon, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useJobs, type JobDocument } from "../context/JobContext";
import { useAuth } from "../context/AuthContext";
// import { storage } from "../lib/firebase"; // Firebase Storage removed for now
// import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
// No uuid needed

export default function DocumentVaultModal() {
    const { isVaultOpen, closeVault, vaultJobId, jobs, updateJob } = useJobs();
    const { user } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeJob = jobs.find((j) => j.id === vaultJobId);

    // Close when pressing escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isVaultOpen) closeVault();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isVaultOpen, closeVault]);

    if (!isVaultOpen || !activeJob || !user) return null;

    const documents = activeJob.documents || [];

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);

        // Mock Upload Logic (UI Only)
        const fileId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

        // Simulate upload progress
        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 10;
            });
        }, 200);

        // Simulate completion after 2 seconds
        setTimeout(async () => {
            clearInterval(interval);
            setUploadProgress(100);

            try {
                // UI-only document creation (no real URL)
                const newDoc: JobDocument = {
                    id: fileId,
                    name: file.name,
                    url: "#", // Placeholder URL
                    path: `local/${fileId}_${file.name}`,
                    uploadedAt: new Date().toISOString(),
                };

                const updatedDocs = [...documents, newDoc];
                await updateJob(activeJob.id, {
                    ...activeJob,
                    documents: updatedDocs,
                });
            } catch (error) {
                console.error("Error updating job with document", error);
            } finally {
                setTimeout(() => {
                    setIsUploading(false);
                    setUploadProgress(0);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }, 500);
            }
        }, 2000);
    };

    const handleDelete = async (docToDelete: JobDocument) => {
        if (!confirm(`Are you sure you want to delete ${docToDelete.name}?`)) return;

        try {
            // Mock Delete (UI Only)
            // Delete from storage (removed for now)

            // Delete from firestore job doc
            const updatedDocs = documents.filter((d) => d.id !== docToDelete.id);
            await updateJob(activeJob.id, {
                ...activeJob,
                documents: updatedDocs,
            });
        } catch (error) {
            console.error("Error deleting document", error);
            alert("Failed to delete document.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md shadow-2xl transition-all duration-300">
            <div
                className="premium-glass-heavy rounded-t-3xl sm:rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] shadow-2xl relative"
                style={{
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)"
                }}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-slate-800/80 to-slate-900/80">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-400" />
                            Document Vault
                        </h2>
                        <p className="text-sm text-slate-300 mt-1">
                            Documents for <span className="text-white font-medium">{activeJob.company}</span> - <span className="text-slate-300">{activeJob.title}</span>
                        </p>
                    </div>
                    <button
                        onClick={closeVault}
                        className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-slate-900/40">

                    {/* Upload Area */}
                    <div
                        className="mb-8 border-2 border-dashed border-slate-600 hover:border-blue-500 hover:bg-blue-500/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative"
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                            disabled={isUploading}
                        />
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                <div className="text-slate-300 font-medium">Uploading... {uploadProgress}%</div>
                                <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden mt-2">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-300 ease-out"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/5">
                                    <UploadCloud className="w-7 h-7 text-blue-400" />
                                </div>
                                <h3 className="text-slate-200 font-bold text-lg mb-1">Click to Upload</h3>
                                <p className="text-slate-300 text-sm max-w-xs">
                                    Upload resumes, cover letters, or portfolios (PDF, DOCX, Images).
                                </p>
                            </>
                        )}
                    </div>

                    {/* Document List */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
                            Uploaded Documents ({documents.length})
                        </h3>

                        {documents.length === 0 ? (
                            <div className="text-center py-8 text-slate-300 bg-slate-800/30 rounded-2xl border border-white/5">
                                <p>No documents uploaded yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="flexItems-center justify-between p-4 bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 rounded-2xl transition-all group shadow-sm flex"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-400 border border-blue-500/20">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate-200 font-medium truncate pr-4" title={doc.name}>
                                                    {doc.name}
                                                </p>
                                                <p className="text-xs text-slate-300 mt-0.5">
                                                    {new Date(doc.uploadedAt).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-slate-300 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-colors"
                                                title="View Document"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <LinkIcon className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(doc);
                                                }}
                                                className="p-2 text-slate-300 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                                                title="Delete Document"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
