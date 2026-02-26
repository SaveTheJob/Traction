import {
  Activity,
  Download,
  Edit2,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
  Search,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useJobs } from "../context/JobContext";

import MetricsGrid from "../components/MetricsGrid";
import StatusBadge from "../components/StatusBadge";
import UrgentActions from "../components/UrgentActions";
import NotificationDropdown from "../components/NotificationDropdown";
export default function Dashboard() {
  const { jobs, openModal, deleteJob } = useJobs();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalApplications = jobs.length;
  const interviewingNumber = jobs.filter((j) => j.status === "Interviewing").length;
  const offerNumber = jobs.filter((j) => j.status === "Offer").length;
  const rejectedNumber = jobs.filter((j) => j.status === "Rejected").length;
  const wishlistNumber = jobs.filter((j) => j.status === "Wishlist").length;
  const interviewCount = interviewingNumber + offerNumber;
  const activeLeads = jobs.filter(
    (j) => j.status === "Applied" || j.status === "Interviewing"
  ).length;

  const metrics = [
    { label: "Total Applications", value: totalApplications.toString(), icon: FileText, change: "All time", trend: "neutral" },
    { label: "Interviews", value: interviewCount.toString(), icon: UserCheck, change: "Lined up", trend: "neutral" },
    { label: "Active Leads", value: activeLeads.toString(), icon: Activity, change: "In progress", trend: "neutral" },
  ];

  const urgentActions = [
    { title: "Follow up with active leads", description: "Review your Applied & Interviewing applications", time: "Ongoing", priority: "high" },
  ];

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "All" || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const displayJobs = [...filteredJobs].reverse();

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this application? This cannot be undone.")) {
      deleteJob(id);
    }
  };

  const firstName = user?.displayName ? user.displayName.split(" ")[0] : "there";

  // ─── PDF Export ────────────────────────────────────────────────────────────────
  const exportToPDF = async () => {
    setShowExportMenu(false);
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    doc.setFillColor(14, 88, 163);
    doc.rect(0, 0, pageWidth, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Traction — Application Report", 14, 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated for ${user?.displayName ?? "User"} · ${today}`, 14, 19);

    const boxY = 28;
    const summaryData = [
      { label: "Total", value: totalApplications },
      { label: "Wishlist", value: wishlistNumber },
      { label: "Applied", value: jobs.filter(j => j.status === "Applied").length },
      { label: "Interviewing", value: interviewingNumber },
      { label: "Offers", value: offerNumber },
      { label: "Rejected", value: rejectedNumber },
    ];
    const boxW = (pageWidth - 28) / summaryData.length;
    summaryData.forEach((item, i) => {
      const x = 14 + i * boxW;
      doc.setFillColor(i === 0 ? 14 : 241, i === 0 ? 88 : 245, i === 0 ? 163 : 251);
      doc.roundedRect(x, boxY, boxW - 2, 16, 2, 2, "F");
      doc.setTextColor(i === 0 ? 255 : 51, i === 0 ? 255 : 65, i === 0 ? 255 : 85);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(String(item.value), x + (boxW - 2) / 2, boxY + 8.5, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, x + (boxW - 2) / 2, boxY + 13.5, { align: "center" });
    });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Applications", 14, boxY + 24);

    autoTable(doc, {
      startY: boxY + 27,
      head: [["#", "Company", "Role", "Status", "Location", "Date Applied", "Link"]],
      body: [...jobs].reverse().map((job, idx) => [
        idx + 1, job.company, job.title, job.status,
        job.location ?? "—", job.dateApplied ?? "—", job.link ?? "—",
      ]),
      headStyles: { fillColor: [14, 88, 163], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: { 0: { cellWidth: 8, halign: "center" }, 6: { cellWidth: 30, fontStyle: "italic", textColor: [71, 132, 196] } },
      margin: { left: 14, right: 14 },
      rowPageBreak: "auto",
    });

    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Traction · Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: "center" });
    }

    doc.save(`Traction_Applications_${today.replace(/ /g, "_")}.pdf`);
  };

  // ─── Excel Export — single sheet mirroring the PDF layout ────────────────────
  const exportToExcel = async () => {
    setShowExportMenu(false);

    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    wb.creator = "Traction";
    wb.created = new Date();

    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const todayFile = new Date().toLocaleDateString("en-US").replace(/\//g, "-");

    // ── Colors ────────────────────────────────────────────────────────────────
    const BLUE = "FF0E58A3";
    const DARK_BLUE = "FF1D4ED8";
    const WHITE = "FFFFFFFF";
    const ALT_ROW = "FFF1F5F9";
    const HEADER_BG = "FFE8F0FB";
    const TEXT_DARK = "FF1E293B";
    const TEXT_LIGHT = "FFE0E7FF";

    const statusColors: Record<string, { bg: string; fg: string }> = {
      Applied: { bg: "FFDBEAFE", fg: "FF1E40AF" },
      Interviewing: { bg: "FFFEF9C3", fg: "FF713F12" },
      Offer: { bg: "FFDCFCE7", fg: "FF14532D" },
      Wishlist: { bg: "FFF3E8FF", fg: "FF581C87" },
      Rejected: { bg: "FFFEE2E2", fg: "FF7F1D1D" },
    };

    const border: any = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } },
    };

    // ── Single sheet ─────────────────────────────────────────────────────────
    const ws = wb.addWorksheet("Application Report", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    ws.columns = [
      { width: 5 },  // A: #
      { width: 24 },  // B: Company
      { width: 34 },  // C: Role
      { width: 16 },  // D: Status
      { width: 20 },  // E: Location
      { width: 16 },  // F: Date Applied
      { width: 42 },  // G: Link
    ];

    // Row 1: Blue banner
    ws.mergeCells("A1:G1");
    const r1 = ws.getCell("A1");
    r1.value = "Traction — Application Report";
    r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    r1.font = { bold: true, size: 18, color: { argb: WHITE }, name: "Calibri" };
    r1.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(1).height = 42;

    // Row 2: Subtitle
    ws.mergeCells("A2:G2");
    const r2 = ws.getCell("A2");
    r2.value = `Generated for ${user?.displayName ?? "User"}  ·  ${today}`;
    r2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DARK_BLUE } };
    r2.font = { size: 10, color: { argb: TEXT_LIGHT }, name: "Calibri" };
    r2.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(2).height = 22;

    // Row 3: Spacer
    ws.getRow(3).height = 8;

    // Rows 4–5: Metric boxes (mirrors PDF stat boxes)
    const statMetrics = [
      { label: "Total", value: totalApplications, highlight: true },
      { label: "Wishlist", value: wishlistNumber, highlight: false },
      { label: "Applied", value: jobs.filter(j => j.status === "Applied").length, highlight: false },
      { label: "Interviewing", value: interviewingNumber, highlight: false },
      { label: "Offers", value: offerNumber, highlight: false },
      { label: "Rejected", value: rejectedNumber, highlight: false },
    ];
    const metricCols = ["A", "B", "C", "D", "E", "F"];

    // Row 4: Big numbers
    ws.getRow(4).height = 30;
    statMetrics.forEach((m, i) => {
      const cell = ws.getCell(`${metricCols[i]}4`);
      cell.value = m.value;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: m.highlight ? BLUE : HEADER_BG } };
      cell.font = { bold: true, size: 18, color: { argb: m.highlight ? WHITE : BLUE }, name: "Calibri" };
      cell.alignment = { horizontal: "center", vertical: "bottom" };
      cell.border = border;
    });

    // Row 5: Labels
    ws.getRow(5).height = 18;
    statMetrics.forEach((m, i) => {
      const cell = ws.getCell(`${metricCols[i]}5`);
      cell.value = m.label;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: m.highlight ? BLUE : HEADER_BG } };
      cell.font = { size: 9, color: { argb: m.highlight ? TEXT_LIGHT : "FF475569" }, name: "Calibri" };
      cell.alignment = { horizontal: "center", vertical: "top" };
      cell.border = border;
    });

    // Row 6: Spacer
    ws.getRow(6).height = 10;

    // Row 7: Section label
    ws.mergeCells("A7:G7");
    const secLabel = ws.getCell("A7");
    secLabel.value = "Applications";
    secLabel.font = { bold: true, size: 13, color: { argb: TEXT_DARK }, name: "Calibri" };
    secLabel.alignment = { vertical: "middle" };
    ws.getRow(7).height = 24;

    // Row 8: Column headers
    const tableHeaders = ["#", "Company", "Role / Title", "Status", "Location", "Date Applied", "Job Link"];
    ws.getRow(8).height = 22;
    tableHeaders.forEach((h, i) => {
      const cell = ws.getRow(8).getCell(i + 1);
      cell.value = h;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
      cell.font = { bold: true, size: 10, color: { argb: WHITE }, name: "Calibri" };
      cell.alignment = { vertical: "middle", horizontal: i === 0 ? "center" : "left", indent: i > 0 ? 1 : 0 };
      cell.border = border;
    });

    // Rows 9+: Data
    [...jobs].reverse().forEach((job, idx) => {
      const row = ws.getRow(9 + idx);
      row.height = 20;
      const isAlt = idx % 2 === 1;
      const bg = isAlt ? ALT_ROW : WHITE;

      const rowData = [
        idx + 1,
        job.company,
        job.title,
        job.status,
        job.location ?? "—",
        job.dateApplied ?? "—",
        job.link ?? "",
      ];

      rowData.forEach((val, colIdx) => {
        const cell = row.getCell(colIdx + 1);

        if (colIdx === 3) {
          // Status: colour-coded
          const sc = statusColors[val as string];
          cell.value = val;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: sc?.bg ?? bg } };
          cell.font = { bold: true, size: 10, color: { argb: sc?.fg ?? TEXT_DARK }, name: "Calibri" };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colIdx === 6 && val) {
          // Link: clickable hyperlink
          cell.value = { text: String(val), hyperlink: String(val) };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          cell.font = { size: 9, color: { argb: "FF2563EB" }, underline: true, name: "Calibri" };
          cell.alignment = { vertical: "middle", wrapText: false };
        } else {
          cell.value = val;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          cell.font = { size: 10, color: { argb: TEXT_DARK }, name: "Calibri" };
          cell.alignment = {
            horizontal: colIdx === 0 ? "center" : "left",
            vertical: "middle",
            indent: colIdx > 0 ? 1 : 0,
          };
        }
        cell.border = border;
      });
    });

    // Freeze header rows
    ws.views = [{ state: "frozen", ySplit: 8 }];

    // Save to download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Traction_Applications_${todayFile}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
            Welcome back, {firstName}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest opacity-80">
            Station Overview: Active Control Hub
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Notification Bell */}
          <NotificationDropdown />

          {/* Export Button */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu((p) => !p)}
              className="border border-white/20 dark:border-white/10 bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/40 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 shrink-0 group active:scale-95"
            >
              <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              <span className="hidden sm:inline">Export Data</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
                <div className="p-1">
                  <button
                    onClick={exportToPDF}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Convert to PDF</p>
                      <p className="text-[11px] text-slate-400 font-normal">Full formatted report</p>
                    </div>
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Export to Excel</p>
                      <p className="text-[11px] text-slate-400 font-normal">Formatted spreadsheet</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => openModal()}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-7 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 flex items-center gap-2 shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Application</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <MetricsGrid metrics={metrics} />

      {/* Recent Activity Table */}
      <div className="lg:col-span-9 space-y-6 flex flex-col h-full">
        <div className="premium-glass rounded-3xl border border-white/30 dark:border-white/5 overflow-hidden shadow-2xl relative flex-1">
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5 border-b border-white/10 dark:border-white/5 relative z-10 bg-white/30 dark:bg-black/20 backdrop-blur-md">
            <h2 className="text-[14px] font-black text-slate-900 dark:text-white tracking-widest uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-600 dark:bg-blue-500 rounded-full" />
              Active Tracklist
            </h2>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="SEARCH APPLICATIONS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 text-[11px] border border-white/20 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white/40 dark:bg-black/20 text-slate-900 dark:text-white placeholder-slate-400 font-black tracking-widest shadow-inner uppercase"
                />
              </div>
              <div className="relative">
                <Filter className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-11 pr-10 py-2.5 text-[11px] border border-white/20 dark:border-white/10 rounded-2xl appearance-none bg-white/40 dark:bg-black/20 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-black tracking-widest uppercase shadow-inner"
                >
                  <option value="All">ALL STATUS</option>
                  <option value="Wishlist">WISHLIST</option>
                  <option value="Applied">APPLIED</option>
                  <option value="Interviewing">INTERVIEWING</option>
                  <option value="Offer">OFFER</option>
                  <option value="Rejected">REJECTED</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/20 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-md">
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-8">
                    Company &amp; Role
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Applied
                  </th>
                  <th className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right pr-8">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {displayJobs.length > 0 ? (
                  displayJobs.map((activity, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-white/40 dark:hover:bg-white/10 transition-colors group relative"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full premium-glass-heavy text-slate-800 dark:text-white flex items-center justify-center flex-shrink-0 font-bold text-lg shadow-inner">
                            {activity.company.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight">
                              {activity.link ? (
                                <a
                                  href={activity.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {activity.company}
                                </a>
                              ) : (
                                activity.company
                              )}
                            </p>
                            <p className="text-[13px] text-slate-500 dark:text-slate-300 mt-0.5 font-medium">
                              {activity.title}
                              {activity.location ? ` • ${activity.location}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <StatusBadge status={activity.status} />
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <p className="text-[14px] text-slate-600 dark:text-slate-300 font-medium">
                          {activity.dateApplied}
                        </p>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap text-right pr-8">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button
                            onClick={() => openModal(activity.id)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(activity.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>
                      <div className="text-center py-20 m-6 border-dashed border-2 border-white/40 dark:border-white/20 rounded-2xl bg-white/10 dark:bg-black/10">
                        <p className="text-[15px] font-bold text-slate-400 dark:text-slate-500">
                          No applications found.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Urgent Actions */}
        <div className="lg:col-span-3 h-full">
          <UrgentActions actions={urgentActions} />
        </div>
      </div>
    </div>
  );
}
