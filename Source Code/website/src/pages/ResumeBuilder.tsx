import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  year: string;
  gpa: string;
}

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
}

interface AIResult {
  resume: ResumeData;
  atsScore: number;
  atsKeywords: string[];
  missedKeywords: string[];
  suggestions: string[];
}

const CLAUDE_KEY_STORAGE = "claude-key";
const PROFILE_STORAGE = "resume-profile";

function uid() {
  return Math.random().toString(36).slice(2);
}
function emptyExp(): Experience {
  return {
    id: uid(),
    company: "",
    role: "",
    startDate: "",
    endDate: "",
    bullets: [""],
  };
}
function emptyEdu(): Education {
  return {
    id: uid(),
    institution: "",
    degree: "",
    field: "",
    year: "",
    gpa: "",
  };
}

const blank: ResumeData = {
  name: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  portfolio: "",
  summary: "",
  experience: [emptyExp()],
  education: [emptyEdu()],
  skills: [],
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ResumeBuilder() {
  const [mode, setMode] = useState<"generate" | "improve">("generate");
  const [resume, setResume] = useState<ResumeData>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE);
      return saved ? JSON.parse(saved) : blank;
    } catch {
      return blank;
    }
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [rawResume, setRawResume] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem(CLAUDE_KEY_STORAGE) || "",
  );
  const [showApiKey, setShowApiKey] = useState(
    !localStorage.getItem(CLAUDE_KEY_STORAGE) && !apiKey,
  );
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>("personal");

  // Auto-save master profile whenever resume changes
  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE, JSON.stringify(resume));
      setProfileSaved(true);
      const t = setTimeout(() => setProfileSaved(false), 1500);
      return () => clearTimeout(t);
    } catch {
      /* storage full */
    }
  }, [resume]);

  const saveApiKey = (key: string) => {
    const trimmed = key.trim();
    setApiKey(trimmed);
    localStorage.setItem(CLAUDE_KEY_STORAGE, trimmed);
    if (trimmed) setShowApiKey(false);
  };

  const updateField = (field: keyof ResumeData, value: string) =>
    setResume((r) => ({ ...r, [field]: value }));

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !resume.skills.includes(s)) {
      setResume((r) => ({ ...r, skills: [...r.skills, s] }));
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) =>
    setResume((r) => ({ ...r, skills: r.skills.filter((s) => s !== skill) }));

  const updateExp = (id: string, field: keyof Experience, value: string) =>
    setResume((r) => ({
      ...r,
      experience: r.experience.map((e) =>
        e.id === id ? { ...e, [field]: value } : e,
      ),
    }));

  const updateBullet = (expId: string, idx: number, value: string) =>
    setResume((r) => ({
      ...r,
      experience: r.experience.map((e) =>
        e.id === expId
          ? { ...e, bullets: e.bullets.map((b, i) => (i === idx ? value : b)) }
          : e,
      ),
    }));

  const addBullet = (expId: string) =>
    setResume((r) => ({
      ...r,
      experience: r.experience.map((e) =>
        e.id === expId ? { ...e, bullets: [...e.bullets, ""] } : e,
      ),
    }));

  const removeBullet = (expId: string, idx: number) =>
    setResume((r) => ({
      ...r,
      experience: r.experience.map((e) =>
        e.id === expId
          ? { ...e, bullets: e.bullets.filter((_, i) => i !== idx) }
          : e,
      ),
    }));

  const addExp = () =>
    setResume((r) => ({ ...r, experience: [...r.experience, emptyExp()] }));
  const removeExp = (id: string) =>
    setResume((r) => ({
      ...r,
      experience: r.experience.filter((e) => e.id !== id),
    }));

  const updateEdu = (id: string, field: keyof Education, value: string) =>
    setResume((r) => ({
      ...r,
      education: r.education.map((e) =>
        e.id === id ? { ...e, [field]: value } : e,
      ),
    }));

  const addEdu = () =>
    setResume((r) => ({ ...r, education: [...r.education, emptyEdu()] }));
  const removeEdu = (id: string) =>
    setResume((r) => ({
      ...r,
      education: r.education.filter((e) => e.id !== id),
    }));

  const extractText = async (file: File) => {
    setUploading(true);
    setUploadedFile(null);
    setRawResume("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "pdf") {
        const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.624/pdf.worker.min.mjs`;
        const bytes = await file.arrayBuffer();
        const pdf = await getDocument({ data: bytes }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: any) => item.str + (item.hasEOL ? "\n" : ""))
            .join("");
          fullText += pageText + "\n";
        }
        setRawResume(
          fullText.trim() || "[PDF Content - will be processed by Claude]",
        );
      } else if (ext === "docx") {
        const mammoth = await import("mammoth");
        const bytes = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: bytes });
        setRawResume(result.value.trim());
      } else {
        const text = await file.text();
        setRawResume(text.trim());
      }
      setUploadedFile(file.name);
    } catch (e) {
      console.error("Extraction Error:", e);
      // Even if local extraction fails, we keep the file for Claude if it's a PDF
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setUploadedFile(file.name);
        setRawResume("[PDF Content - Claude will process text]");
      } else {
        setError(
          "Could not extract text from the file. Please ensure it's a valid PDF, DOCX, or TXT.",
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) extractText(file);
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) extractText(file);
  };

  const callClaude = async (prompt: string): Promise<string> => {
    try {
      const res = await fetch(`https://api.anthropic.com/v1/messages`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 8192,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err?.error?.message ?? `Claude API error: ${res.status}`,
        );
      }
      const data = await res.json();
      return data.content?.[0]?.text ?? "";
    } catch (e) {
      console.error("Claude callClaude Error:", e);
      throw e;
    }
  };

  const generatePrompt =
    () => `You are an expert ATS resume writer and career strategist. The user has a MASTER PROFILE with all their experience, skills, and education. Your task:
1. Carefully read the job description and identify what this specific role requires.
2. From the master profile, SELECT ONLY the most relevant experiences, skills, and education for THIS job. Omit anything irrelevant.
3. Tailor and rewrite the selected content using the job description's language and keywords.
4. Write strong action-verb bullets with quantifiable achievements where possible.
5. Return ONLY valid JSON (no markdown, no explanation):
{"resume":{"name":"","email":"","phone":"","location":"","linkedin":"","portfolio":"","summary":"3-4 sentence summary tailored to THIS specific role","experience":[{"id":"1","company":"","role":"","startDate":"","endDate":"","bullets":["achievement-focused bullet using JD language"]}],"education":[{"id":"1","institution":"","degree":"","field":"","year":"","gpa":""}],"skills":["only skills relevant to this JD"]},"atsScore":85,"atsKeywords":["matched keyword"],"missedKeywords":["important JD keyword missing"],"suggestions":["specific actionable tip"]}

MASTER PROFILE (select and tailor only what is relevant):
${JSON.stringify(resume, null, 2)}

JOB DESCRIPTION:
${jobDescription}`;

  const improvePrompt = () => `
You are an expert ATS resume writer. Analyse and rewrite the resume to be ATS-optimised. Return ONLY valid JSON (no markdown):
{"resume":{"name":"","email":"","phone":"","location":"","linkedin":"","portfolio":"","summary":"","experience":[{"id":"1","company":"","role":"","startDate":"","endDate":"","bullets":[""]}],"education":[{"id":"1","institution":"","degree":"","field":"","year":"","gpa":""}],"skills":[""]},"atsScore":72,"atsKeywords":["matched"],"missedKeywords":["missed"],"suggestions":["tip"]}

EXISTING RESUME: ${rawResume}
JOB DESCRIPTION: ${jobDescription}`;

  const handleGenerate = async () => {
    if (!apiKey) {
      setError("Please enter your Claude API key first.");
      setShowApiKey(true);
      return;
    }
    if (mode === "generate" && !resume.name) {
      setError("Please enter at least your name.");
      return;
    }
    if (mode === "improve" && !rawResume.trim()) {
      setError("Please upload your resume first.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const prompt = mode === "generate" ? generatePrompt() : improvePrompt();
      const raw = await callClaude(prompt);
      const cleaned = raw
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const parsed: AIResult = JSON.parse(cleaned);
      setResult(parsed);
      if (mode === "improve") setResume(parsed.resume);
    } catch (e) {
      console.error("Resume Generation Error:", e);
      setError(
        e instanceof Error
          ? e.message
          : "Error. Check your API key and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    const data = result?.resume ?? resume;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const ml = 18; // left margin
    const mr = 192; // right margin (210 - 18)
    const cw = mr - ml; // content width
    let y = 18;

    const checkPage = (h: number) => {
      if (y + h > 282) {
        doc.addPage();
        y = 18;
      }
    };

    // ── Header ───────────────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor("#000000");
    const nameText = (data.name || "Your Name").toUpperCase();
    doc.text(nameText, 105, y, { align: "center" });
    y += 7;

    const contact = [
      data.phone,
      data.email,
      data.linkedin,
      data.portfolio,
      data.location,
    ]
      .filter(Boolean)
      .join("  |  ");
    if (contact) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(contact, 105, y, { align: "center" });
      y += 6;
    }

    // ── Section header helper ─────────────────────────────────────────────
    const sectionHeader = (title: string) => {
      checkPage(10);
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor("#000000");
      doc.text(title.toUpperCase(), ml, y);
      y += 1.5;
      doc.setDrawColor("#000000");
      doc.setLineWidth(0.5);
      doc.line(ml, y, mr, y);
      y += 4;
    };

    // ── Bullet line helper ────────────────────────────────────────────────
    const bullet = (text: string) => {
      if (!text.trim()) return;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor("#000000");
      const indent = ml + 4;
      const lines = doc.splitTextToSize(text, cw - 6);
      checkPage(lines.length * 4.5);
      doc.text("•", ml + 1, y);
      doc.text(lines, indent, y);
      y += lines.length * 4.5 + 0.5;
    };

    // ── Row helper: left bold + right text ───────────────────────────────
    const row = (
      left: string,
      right: string,
      boldLeft = true,
      italic = false,
    ) => {
      if (!left && !right) return;
      checkPage(6);
      doc.setFont(
        "helvetica",
        boldLeft ? "bold" : italic ? "italic" : "normal",
      );
      doc.setFontSize(10);
      doc.setTextColor("#000000");
      doc.text(left, ml, y);
      if (right) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(right, mr, y, { align: "right" });
      }
      y += 5;
    };

    const subRow = (text: string, italic = false) => {
      if (!text) return;
      checkPage(5);
      doc.setFont("helvetica", italic ? "italic" : "normal");
      doc.setFontSize(9);
      doc.setTextColor("#111111");
      doc.text(text, ml, y);
      y += 4.5;
    };

    // ── EDUCATION ────────────────────────────────────────────────────────
    if (data.education.some((e) => e.institution)) {
      sectionHeader("Education");
      for (const ed of data.education) {
        if (!ed.institution) continue;
        const degreeLabel = [ed.degree, ed.field].filter(Boolean).join(" in ");
        row(degreeLabel ? `• ${degreeLabel}` : "", ed.year, true);
        subRow(ed.institution, true);
        if (ed.gpa) subRow(`GPA: ${ed.gpa}`);
      }
    }

    // ── EXPERIENCE ───────────────────────────────────────────────────────
    if (data.experience.some((e) => e.company || e.role)) {
      sectionHeader("Experience");
      for (const exp of data.experience) {
        if (!exp.company && !exp.role) continue;
        const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" - ");
        row(
          `${exp.role}${exp.company ? ` – ${exp.company}` : ""}`,
          dates,
          true,
        );
        subRow(exp.startDate && exp.company ? exp.company : "", true);
        for (const b of exp.bullets) bullet(b);
        y += 2;
      }
    }

    // ── SKILLS ───────────────────────────────────────────────────────────
    if (data.skills.length) {
      sectionHeader("Skills");
      // Try to detect category: value pairs ("Category: skill1, skill2")
      for (const skill of data.skills) {
        const colonIdx = skill.indexOf(":");
        if (colonIdx > 0) {
          const cat = skill.slice(0, colonIdx).trim();
          const rest = skill.slice(colonIdx + 1).trim();
          checkPage(6);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor("#000000");
          const catW = doc.getTextWidth(`• ${cat}: `);
          doc.text(`• ${cat}: `, ml, y);
          doc.setFont("helvetica", "normal");
          const restLines = doc.splitTextToSize(rest, cw - catW - 2);
          doc.text(restLines, ml + catW, y);
          y += restLines.length * 4.5 + 0.5;
        } else {
          bullet(skill);
        }
      }
    }

    // ── SUMMARY (if any) ─────────────────────────────────────────────────
    if (data.summary) {
      sectionHeader("Summary");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor("#000000");
      const lines = doc.splitTextToSize(data.summary, cw);
      checkPage(lines.length * 4.5);
      doc.text(lines, ml, y);
      y += lines.length * 4.5 + 3;
    }

    doc.save(`${(data.name || "resume").replace(/\s+/g, "-")}-ats.pdf`);
  };

  const scoreColor = (s: number) =>
    s >= 80 ? "text-emerald-400" : s >= 60 ? "text-yellow-400" : "text-red-400";
  const scoreBg = (s: number) =>
    s >= 80
      ? "bg-emerald-500/10 border-emerald-500/20"
      : s >= 60
        ? "bg-yellow-500/10 border-yellow-500/20"
        : "bg-red-500/10 border-red-500/20";
  const inp = `w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-2.5 text-sm font-medium text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all backdrop-blur-sm shadow-inner`;

  const SectionHeader = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => setActiveSection(activeSection === id ? null : id)}
      className="w-full flex items-center justify-between py-3 text-left"
    >
      <span className="text-sm font-bold text-white/80 uppercase tracking-wider">
        {label}
      </span>
      {activeSection === id ? (
        <ChevronUp className="w-4 h-4 text-slate-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-blue-400" /> AI Resume Builder
          </h1>
          <p className="text-slate-400 mt-1 text-xs sm:text-sm font-medium">
            ATS-optimised resume generation & improvement powered by Claude
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {result && (
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 border border-white/10 bg-black/20 hover:bg-black/40 text-slate-200 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-lg"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading
              ? "Generating…"
              : mode === "generate"
                ? "Generate Resume"
                : "Analyse & Improve"}
          </button>
        </div>
      </div>

      {/* API Key Banner */}
      {showApiKey && (
        <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
          <p className="text-sm text-blue-300 font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Claude API Key Required
          </p>
          <p className="text-xs text-slate-400 mb-3">
            Get an API key at{" "}
            <a
              href="https://console.anthropic.com/"
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 underline"
            >
              console.anthropic.com
            </a>
            . Stored only in your browser.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="sk-ant-…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={inp}
            />
            <button
              onClick={() => saveApiKey(apiKey)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shrink-0 transition-all"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-5 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex bg-black/20 rounded-xl p-1 mb-6 w-fit border border-white/5">
        {(["generate", "improve"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${mode === m ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-white"}`}
          >
            {m === "generate" ? "✨ Generate" : "⚡ Improve"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── LEFT PANEL ── */}
        <div className="space-y-4">
          {/* Job Description */}
          <div className="premium-glass rounded-2xl p-5">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2 block">
              Job Description <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={5}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description for ATS keyword matching…"
              className={inp + " resize-none"}
            />
          </div>

          {mode === "improve" ? (
            <div className="premium-glass rounded-2xl p-5">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 block">
                Upload Resume <span className="text-red-400">*</span>
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="relative border-2 border-dashed border-white/20 hover:border-blue-400/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                onClick={() =>
                  document.getElementById("resume-file-input")?.click()
                }
              >
                <input
                  id="resume-file-input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileInput}
                  className="hidden"
                />
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
                    <p className="text-sm text-white font-semibold">
                      Extracting text…
                    </p>
                  </>
                ) : uploadedFile ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                      <FileText className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-sm text-white font-bold">
                      {uploadedFile}
                    </p>
                    <p className="text-xs text-emerald-400 mt-1">
                      ✓ Text extracted — {rawResume.split(/\s+/).length} words
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Click or drag to replace
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3 group-hover:bg-blue-500/20 transition-colors">
                      <UploadCloud className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="text-sm text-white font-semibold">
                      Drag & drop your resume here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      or click to browse
                    </p>
                    <p className="text-xs text-slate-500 mt-3">
                      Supports PDF, DOCX, TXT
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Personal Info */}
              <div className="premium-glass rounded-2xl px-5">
                <div className="flex items-center justify-between">
                  <SectionHeader id="personal" label="Personal Info" />
                  {profileSaved && (
                    <span className="text-[10px] text-emerald-400 font-bold animate-pulse shrink-0 mb-1">
                      ✓ Saved
                    </span>
                  )}
                </div>
                {activeSection === "personal" && (
                  <div className="grid grid-cols-2 gap-3 pb-5">
                    {[
                      { f: "name", p: "Full Name" },
                      { f: "email", p: "Email" },
                      { f: "phone", p: "Phone" },
                      { f: "location", p: "City, State / Remote" },
                      { f: "linkedin", p: "LinkedIn URL" },
                      { f: "portfolio", p: "Portfolio / Website" },
                    ].map(({ f, p }) => (
                      <input
                        key={f}
                        type="text"
                        placeholder={p}
                        value={resume[f as keyof ResumeData] as string}
                        onChange={(e) =>
                          updateField(f as keyof ResumeData, e.target.value)
                        }
                        className={inp}
                      />
                    ))}
                    <div className="col-span-2">
                      <textarea
                        rows={3}
                        placeholder="Professional summary (optional — AI will generate one)"
                        value={resume.summary}
                        onChange={(e) => updateField("summary", e.target.value)}
                        className={inp + " resize-none"}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Experience */}
              <div className="premium-glass rounded-2xl px-5">
                <SectionHeader id="experience" label="Experience" />
                {activeSection === "experience" && (
                  <div className="pb-5 space-y-5">
                    {resume.experience.map((exp) => (
                      <div
                        key={exp.id}
                        className="border border-white/10 rounded-xl p-4 space-y-3 relative"
                      >
                        {resume.experience.length > 1 && (
                          <button
                            onClick={() => removeExp(exp.id)}
                            className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { f: "company", p: "Company" },
                            { f: "role", p: "Job Title" },
                            { f: "startDate", p: "Start (e.g. Jan 2022)" },
                            { f: "endDate", p: "End (or Present)" },
                          ].map(({ f, p }) => (
                            <input
                              key={f}
                              type="text"
                              placeholder={p}
                              value={exp[f as keyof Experience] as string}
                              onChange={(e) =>
                                updateExp(
                                  exp.id,
                                  f as keyof Experience,
                                  e.target.value,
                                )
                              }
                              className={inp + " text-xs"}
                            />
                          ))}
                        </div>
                        <div className="space-y-2">
                          {exp.bullets.map((b, bi) => (
                            <div key={bi} className="flex gap-2 items-start">
                              <span className="text-slate-500 mt-2 text-xs shrink-0">
                                •
                              </span>
                              <input
                                type="text"
                                placeholder="Achievement / responsibility…"
                                value={b}
                                onChange={(e) =>
                                  updateBullet(exp.id, bi, e.target.value)
                                }
                                className={inp + " text-xs"}
                              />
                              {exp.bullets.length > 1 && (
                                <button
                                  onClick={() => removeBullet(exp.id, bi)}
                                  className="mt-2 text-slate-500 hover:text-red-400 shrink-0 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => addBullet(exp.id)}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors mt-1"
                          >
                            <Plus className="w-3 h-3" /> Add bullet
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addExp}
                      className="w-full border border-dashed border-white/20 hover:border-blue-400/40 rounded-xl py-2.5 text-xs text-slate-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Experience
                    </button>
                  </div>
                )}
              </div>

              {/* Education */}
              <div className="premium-glass rounded-2xl px-5">
                <SectionHeader id="education" label="Education" />
                {activeSection === "education" && (
                  <div className="pb-5 space-y-4">
                    {resume.education.map((ed) => (
                      <div
                        key={ed.id}
                        className="border border-white/10 rounded-xl p-4 relative"
                      >
                        {resume.education.length > 1 && (
                          <button
                            onClick={() => removeEdu(ed.id)}
                            className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { f: "institution", p: "University / School" },
                            { f: "degree", p: "Degree (e.g. B.S.)" },
                            { f: "field", p: "Field of Study" },
                            { f: "year", p: "Graduation Year" },
                            { f: "gpa", p: "GPA (optional)" },
                          ].map(({ f, p }) => (
                            <input
                              key={f}
                              type="text"
                              placeholder={p}
                              value={ed[f as keyof Education]}
                              onChange={(e) =>
                                updateEdu(
                                  ed.id,
                                  f as keyof Education,
                                  e.target.value,
                                )
                              }
                              className={inp + " text-xs"}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addEdu}
                      className="w-full border border-dashed border-white/20 hover:border-blue-400/40 rounded-xl py-2.5 text-xs text-slate-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Education
                    </button>
                  </div>
                )}
              </div>

              {/* Skills */}
              <div className="premium-glass rounded-2xl px-5">
                <SectionHeader id="skills" label="Skills" />
                {activeSection === "skills" && (
                  <div className="pb-5">
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Add a skill…"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addSkill()}
                        className={inp}
                      />
                      <button
                        onClick={addSkill}
                        className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {resume.skills.map((skill) => (
                        <span
                          key={skill}
                          className="flex items-center gap-1 bg-white/10 border border-white/10 px-3 py-1 rounded-full text-xs text-slate-200 font-medium"
                        >
                          {skill}
                          <button
                            onClick={() => removeSkill(skill)}
                            className="text-slate-400 hover:text-red-400 transition-colors ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {resume.skills.length === 0 && (
                        <p className="text-xs text-slate-500">
                          No skills added. AI will extract from experience.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="text-xs text-slate-500 hover:text-blue-400 transition-colors flex items-center gap-1 ml-1"
          >
            <RefreshCw className="w-3 h-3" />{" "}
            {apiKey ? "Change Claude API Key" : "Set Claude API Key"}
          </button>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="space-y-4">
          {!result && !loading && (
            <div className="premium-glass rounded-2xl p-10 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">
                AI-Powered Resume
              </h3>
              <p className="text-slate-400 text-sm max-w-xs">
                Fill in your details and paste a job description, then click{" "}
                <strong className="text-blue-400">Generate Resume</strong> to
                get an ATS-optimised resume with a score.
              </p>
            </div>
          )}

          {loading && (
            <div className="premium-glass rounded-2xl p-10 flex flex-col items-center justify-center min-h-[400px] text-center">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-4" />
              <p className="text-white font-bold">
                AI is building your resume…
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Analysing keywords, optimising bullets for ATS…
              </p>
            </div>
          )}

          {result && !loading && (
            <>
              {/* ATS Score */}
              <div
                className={`premium-glass rounded-2xl p-5 border ${scoreBg(result.atsScore)}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                      ATS Score
                    </p>
                    <p
                      className={`text-5xl font-black ${scoreColor(result.atsScore)}`}
                    >
                      {result.atsScore}
                      <span className="text-2xl text-slate-500">/100</span>
                    </p>
                  </div>
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${result.atsScore >= 80 ? "border-emerald-500/40" : result.atsScore >= 60 ? "border-yellow-500/40" : "border-red-500/40"}`}
                  >
                    <span
                      className={`text-2xl font-black ${scoreColor(result.atsScore)}`}
                    >
                      {result.atsScore >= 80
                        ? "✓"
                        : result.atsScore >= 60
                          ? "~"
                          : "!"}
                    </span>
                  </div>
                </div>
                {result.atsKeywords.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-emerald-400 font-bold mb-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Matched Keywords
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.atsKeywords.map((k) => (
                        <span
                          key={k}
                          className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.missedKeywords.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-red-400 font-bold mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Missed Keywords
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.missedKeywords.map((k) => (
                        <span
                          key={k}
                          className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs text-yellow-400 font-bold mb-2">
                      💡 Suggestions
                    </p>
                    <ul className="space-y-1">
                      {result.suggestions.map((s, i) => (
                        <li
                          key={i}
                          className="text-xs text-slate-300 flex items-start gap-2"
                        >
                          <span className="text-yellow-400 mt-0.5 shrink-0">
                            →
                          </span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Resume Preview — matching sample format */}
              <div className="premium-glass rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                    Resume Preview
                  </h3>
                  <button
                    onClick={downloadPDF}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-bold"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </button>
                </div>
                {/* White paper preview */}
                <div className="bg-white text-gray-900 p-7 font-serif text-[11px] leading-snug">
                  {/* Name */}
                  <div className="text-center mb-1">
                    <p className="text-[15px] font-bold tracking-wide text-black uppercase">
                      {result.resume.name}
                    </p>
                    <p className="text-[10px] text-gray-700 mt-0.5">
                      {[
                        result.resume.phone,
                        result.resume.email,
                        result.resume.linkedin,
                        result.resume.portfolio,
                        result.resume.location,
                      ]
                        .filter(Boolean)
                        .join("  |  ")}
                    </p>
                  </div>

                  {/* Education */}
                  {result.resume.education.some((e) => e.institution) && (
                    <div className="mt-3">
                      <p className="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1.5">
                        Education
                      </p>
                      {result.resume.education.map((ed) =>
                        ed.institution ? (
                          <div key={ed.id} className="mb-1.5">
                            <div className="flex justify-between">
                              <span className="font-bold text-[10.5px]">
                                •{" "}
                                {[ed.degree, ed.field]
                                  .filter(Boolean)
                                  .join(" in ")}
                              </span>
                              <span className="text-[10px] text-gray-600">
                                {ed.year}
                              </span>
                            </div>
                            <p className="italic text-gray-700 text-[10px] ml-3">
                              {ed.institution}
                            </p>
                            {ed.gpa && (
                              <p className="ml-3 text-[10px]">GPA: {ed.gpa}</p>
                            )}
                          </div>
                        ) : null,
                      )}
                    </div>
                  )}

                  {/* Experience */}
                  {result.resume.experience.some(
                    (e) => e.company || e.role,
                  ) && (
                    <div className="mt-3">
                      <p className="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1.5">
                        Experience
                      </p>
                      {result.resume.experience.map((exp) =>
                        exp.company || exp.role ? (
                          <div key={exp.id} className="mb-2.5">
                            <div className="flex justify-between items-baseline">
                              <span className="font-bold text-[10.5px]">
                                {exp.role}
                                {exp.company ? ` – ${exp.company}` : ""}
                              </span>
                              <span className="text-[10px] text-gray-600 shrink-0 ml-2">
                                {[exp.startDate, exp.endDate]
                                  .filter(Boolean)
                                  .join(" - ")}
                              </span>
                            </div>
                            {exp.company && (
                              <p className="italic text-gray-600 text-[10px]">
                                {exp.company}
                              </p>
                            )}
                            <ul className="mt-1 space-y-0.5">
                              {exp.bullets.filter(Boolean).map((b, i) => (
                                <li
                                  key={i}
                                  className="flex gap-1.5 text-[10px]"
                                >
                                  <span className="shrink-0">•</span>
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null,
                      )}
                    </div>
                  )}

                  {/* Skills */}
                  {result.resume.skills.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1.5">
                        Skills
                      </p>
                      <ul className="space-y-0.5">
                        {result.resume.skills.map((s, i) => {
                          const colonIdx = s.indexOf(":");
                          return colonIdx > 0 ? (
                            <li key={i} className="flex gap-1 text-[10px]">
                              <span className="shrink-0">•</span>
                              <span>
                                <strong>{s.slice(0, colonIdx)}:</strong>
                                {s.slice(colonIdx + 1)}
                              </span>
                            </li>
                          ) : (
                            <li key={i} className="text-[10px]">
                              • {s}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Summary if present */}
                  {result.resume.summary && (
                    <div className="mt-3">
                      <p className="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1.5">
                        Professional Summary
                      </p>
                      <p className="text-[10px] leading-relaxed">
                        {result.resume.summary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
