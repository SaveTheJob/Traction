import {
  ChevronDown,
  ChevronUp,
  Download,
  Edit2,
  FileSpreadsheet,
  FileText,
  Filter,
  Folder,
  Plus,
  Search,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useJobs } from "../context/JobContext";

import ConfirmDialog from "../components/ConfirmDialog";
import CustomSelect from "../components/CustomSelect";
import StatusBadge from "../components/StatusBadge";
export default function Dashboard() {
  const { jobs, openModal, deleteJob, openVault } = useJobs();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<
    "company" | "status" | "dateApplied" | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalApplications = jobs.filter((j) => j.status !== "Wishlist").length;
  const interviewingNumber = jobs.filter(
    (j) => j.status === "Interviewing",
  ).length;
  const offerNumber = jobs.filter((j) => j.status === "Offer").length;
  const rejectedNumber = jobs.filter((j) => j.status === "Rejected").length;
  const savedNumber = jobs.filter((j) => j.status === "Wishlist").length;
  const appliedNumber = jobs.filter((j) => j.status === "Applied").length;
  const interviewCount = interviewingNumber + offerNumber;

  const metrics = [
    {
      label: "Total Applications",
      value: totalApplications.toString(),
      icon: FileText,
      change: "All time",
      trend: "neutral",
    },
    {
      label: "Interviews",
      value: interviewCount.toString(),
      icon: UserCheck,
      change: "Lined up",
      trend: "neutral",
    },
  ];

  const activeBreakdown = [
    {
      label: "Applied",
      value: appliedNumber,
      color: "from-blue-500 to-indigo-600",
    },

    {
      label: "Offers",
      value: offerNumber,
      color: "from-emerald-500 to-green-600",
    },
    {
      label: "Saved",
      value: savedNumber,
      color: "from-purple-500 to-violet-600",
    },
  ];

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "All" || job.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusOrder: Record<string, number> = {
    Wishlist: 0,
    Applied: 1,
    Interviewing: 2,
    Offer: 3,
    Rejected: 4,
  };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const displayJobs = (() => {
    const list = [...filteredJobs];
    if (!sortKey) return list.reverse();
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "company") {
        cmp = a.company.localeCompare(b.company);
      } else if (sortKey === "status") {
        cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      } else if (sortKey === "dateApplied") {
        cmp =
          new Date(a.dateApplied).getTime() - new Date(b.dateApplied).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  })();

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) {
      deleteJob(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const firstName = user?.displayName
    ? user.displayName.split(" ")[0]
    : "there";

  // ─── PDF Export ────────────────────────────────────────────────────────────────
  const exportToPDF = async () => {
    setShowExportMenu(false);
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

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
      { label: "Saved", value: savedNumber },
      {
        label: "Applied",
        value: jobs.filter((j) => j.status === "Applied").length,
      },
      { label: "Interviewing", value: interviewingNumber },
      { label: "Offers", value: offerNumber },
      { label: "Rejected", value: rejectedNumber },
    ];
    const boxW = (pageWidth - 28) / summaryData.length;
    summaryData.forEach((item, i) => {
      const x = 14 + i * boxW;
      doc.setFillColor(
        i === 0 ? 14 : 241,
        i === 0 ? 88 : 245,
        i === 0 ? 163 : 251,
      );
      doc.roundedRect(x, boxY, boxW - 2, 16, 2, 2, "F");
      doc.setTextColor(
        i === 0 ? 255 : 51,
        i === 0 ? 255 : 65,
        i === 0 ? 255 : 85,
      );
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(String(item.value), x + (boxW - 2) / 2, boxY + 8.5, {
        align: "center",
      });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, x + (boxW - 2) / 2, boxY + 13.5, {
        align: "center",
      });
    });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text("Applications", 14, boxY + 24);

    autoTable(doc, {
      startY: boxY + 27,
      head: [
        ["#", "Company", "Role", "Status", "Location", "Date Applied", "Link"],
      ],
      body: [...jobs]
        .reverse()
        .map((job, idx) => [
          idx + 1,
          job.company,
          job.title,
          job.status,
          job.location ?? "—",
          job.dateApplied ?? "—",
          job.link ?? "—",
        ]),
      headStyles: {
        fillColor: [14, 88, 163],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        6: { cellWidth: 30, fontStyle: "italic", textColor: [71, 132, 196] },
      },
      margin: { left: 14, right: 14 },
      rowPageBreak: "auto",
    });

    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Traction · Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: "center" },
      );
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

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const todayFile = new Date()
      .toLocaleDateString("en-US")
      .replace(/\//g, "-");

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
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });

    ws.columns = [
      { width: 5 }, // A: #
      { width: 24 }, // B: Company
      { width: 34 }, // C: Role
      { width: 16 }, // D: Status
      { width: 20 }, // E: Location
      { width: 16 }, // F: Date Applied
      { width: 42 }, // G: Link
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
    r2.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: DARK_BLUE },
    };
    r2.font = { size: 10, color: { argb: TEXT_LIGHT }, name: "Calibri" };
    r2.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    ws.getRow(2).height = 22;

    // Row 3: Spacer
    ws.getRow(3).height = 8;

    // Rows 4–5: Metric boxes (mirrors PDF stat boxes)
    const statMetrics = [
      { label: "Total", value: totalApplications, highlight: true },
      { label: "Saved", value: savedNumber, highlight: false },
      {
        label: "Applied",
        value: jobs.filter((j) => j.status === "Applied").length,
        highlight: false,
      },
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
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: m.highlight ? BLUE : HEADER_BG },
      };
      cell.font = {
        bold: true,
        size: 18,
        color: { argb: m.highlight ? WHITE : BLUE },
        name: "Calibri",
      };
      cell.alignment = { horizontal: "center", vertical: "bottom" };
      cell.border = border;
    });

    // Row 5: Labels
    ws.getRow(5).height = 18;
    statMetrics.forEach((m, i) => {
      const cell = ws.getCell(`${metricCols[i]}5`);
      cell.value = m.label;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: m.highlight ? BLUE : HEADER_BG },
      };
      cell.font = {
        size: 9,
        color: { argb: m.highlight ? TEXT_LIGHT : "FF475569" },
        name: "Calibri",
      };
      cell.alignment = { horizontal: "center", vertical: "top" };
      cell.border = border;
    });

    // Row 6: Spacer
    ws.getRow(6).height = 10;

    // Row 7: Section label
    ws.mergeCells("A7:G7");
    const secLabel = ws.getCell("A7");
    secLabel.value = "Applications";
    secLabel.font = {
      bold: true,
      size: 13,
      color: { argb: TEXT_DARK },
      name: "Calibri",
    };
    secLabel.alignment = { vertical: "middle" };
    ws.getRow(7).height = 24;

    // Row 8: Column headers
    const tableHeaders = [
      "#",
      "Company",
      "Role / Title",
      "Status",
      "Location",
      "Date Applied",
      "Job Link",
    ];
    ws.getRow(8).height = 22;
    tableHeaders.forEach((h, i) => {
      const cell = ws.getRow(8).getCell(i + 1);
      cell.value = h;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: BLUE },
      };
      cell.font = {
        bold: true,
        size: 10,
        color: { argb: WHITE },
        name: "Calibri",
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: i === 0 ? "center" : "left",
        indent: i > 0 ? 1 : 0,
      };
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
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: sc?.bg ?? bg },
          };
          cell.font = {
            bold: true,
            size: 10,
            color: { argb: sc?.fg ?? TEXT_DARK },
            name: "Calibri",
          };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        } else if (colIdx === 6 && val) {
          // Link: clickable hyperlink
          cell.value = { text: String(val), hyperlink: String(val) };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: bg },
          };
          cell.font = {
            size: 9,
            color: { argb: "FF2563EB" },
            underline: true,
            name: "Calibri",
          };
          cell.alignment = { vertical: "middle", wrapText: false };
        } else {
          cell.value = val;
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: bg },
          };
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
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Traction_Applications_${todayFile}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3 sm:p-4 md:p-5 lg:p-8 max-w-[1700px] mx-auto space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-none mb-1">
            Welcome back, {firstName}!
          </h1>
          <p className="text-white mt-1 sm:mt-1.5 text-xs sm:text-sm font-medium">
            Applications Overview & Active Control Hub
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Export Button */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu((p) => !p)}
              className="border border-white/10 bg-black/20 hover:bg-black/40 text-slate-200 px-3 sm:px-5 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 shrink-0 group active:scale-95 whitespace-nowrap"
            >
              <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              <span className="hidden sm:inline">Export Data</span>
            </button>

            {showExportMenu && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-52 bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden z-50">
                <div className="p-1">
                  <button
                    onClick={exportToPDF}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 rounded-xl transition-colors font-medium"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Convert to PDF</p>
                      <p className="text-[11px] text-slate-300 font-normal">
                        Full formatted report
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 rounded-xl transition-colors font-medium"
                  >
                    <div className="w-8 h-8 rounded-lg bg-green-900/30 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Export to Excel</p>
                      <p className="text-[11px] text-slate-300 font-normal">
                        Formatted spreadsheet
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => openModal()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 sm:px-6 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 shrink-0 backdrop-blur-sm"
          >
            <Plus className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">New Application</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      {/* Metrics + Active Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 [&>:last-child]:sm:col-span-2 [&>:last-child]:lg:col-span-1">
        {/* Main metrics */}
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className="premium-glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-10 relative group overflow-hidden shadow-xl flex flex-col justify-between h-full"
          >
            <div className="absolute right-0 top-0 h-40 w-40 bg-gradient-to-br from-blue-400/10 to-purple-500/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700 ease-in-out" />
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wide">
                  {metric.label}
                </p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 mt-1 sm:mt-2 tracking-tight drop-shadow-sm">
                  {metric.value}
                </p>
              </div>
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl premium-glass-heavy flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-300">
                <metric.icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-blue-400 drop-shadow-md" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 lg:mt-6 flex items-center gap-2 relative z-10">
              <div className="text-xs font-bold px-3 py-1 rounded-full shadow-inner flex items-center gap-1 premium-glass-heavy text-slate-300">
                {metric.change}
              </div>
            </div>
          </div>
        ))}

        {/* Active Leads split into Applied / Saved / Offers */}
        <div className="premium-glass rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-10 relative group overflow-hidden shadow-xl flex flex-col justify-between h-full">
          <div className="absolute right-0 top-0 h-40 w-40 bg-gradient-to-br from-blue-400/10 to-purple-500/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700 ease-in-out" />

          <p className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4 relative z-10">
            Statistics
          </p>

          <div className="grid grid-cols-3 relative z-10 divide-x divide-white/20">
            {activeBreakdown.map((item) => (
              <div key={item.label} className="text-center px-2">
                <p className="text-xl sm:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 tracking-tight">
                  {item.value}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-300 uppercase tracking-wider mt-1.5">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 sm:mt-4 lg:mt-6 flex items-center gap-2 relative z-10">
            <div className="text-xs font-bold px-3 py-1 rounded-full shadow-inner flex items-center gap-1 premium-glass-heavy text-slate-300">
              Overall
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="lg:col-span-9 space-y-6 flex flex-col h-full">
        <div className="premium-glass rounded-2xl sm:rounded-3xl border border-white/5 shadow-2xl relative flex-1">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none rounded-[inherit]" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 lg:px-6 py-4 sm:py-5 border-b border-white/5 relative z-20 bg-black/20 backdrop-blur-md rounded-t-2xl sm:rounded-t-3xl">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
              Active Tracklist
            </h2>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-44 lg:w-56">
                <Search className="w-4 h-4 text-slate-300 absolute left-3 sm:left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white/10 backdrop-blur-sm text-white placeholder-slate-200 font-medium shadow-inner"
                />
              </div>
              <CustomSelect
                value={filterStatus}
                onChange={setFilterStatus}
                icon={<Filter className="w-4 h-4" />}
                variant="glass"
                options={[
                  { value: "All", label: "ALL STATUS" },
                  { value: "Wishlist", label: "SAVED" },
                  { value: "Applied", label: "APPLIED" },
                  { value: "Interviewing", label: "INTERVIEWING" },
                  { value: "Offer", label: "OFFER" },
                  { value: "Rejected", label: "REJECTED" },
                ]}
                className="w-36 sm:w-40 text-[10px] sm:text-[11px] font-black tracking-widest uppercase"
              />
            </div>
          </div>
          <div className="overflow-x-auto overflow-y-hidden relative z-10 rounded-b-2xl sm:rounded-b-3xl">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 backdrop-blur-md">
                  <th
                    onClick={() => toggleSort("company")}
                    className="px-4 sm:px-8 py-3 sm:py-4 text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-widest cursor-pointer select-none hover:text-slate-200 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      Company &amp; Role
                      {sortKey === "company" ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5 opacity-0 group-hover:opacity-30" />
                      )}
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort("status")}
                    className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-widest cursor-pointer select-none hover:text-slate-200 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      Status
                      {sortKey === "status" ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5 opacity-0 group-hover:opacity-30" />
                      )}
                    </span>
                  </th>
                  <th
                    onClick={() => toggleSort("dateApplied")}
                    className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-widest hidden sm:table-cell cursor-pointer select-none hover:text-slate-200 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      Added
                      {sortKey === "dateApplied" ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5 opacity-0 group-hover:opacity-30" />
                      )}
                    </span>
                  </th>
                  <th className="px-4 sm:px-8 py-3 sm:py-4 text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {displayJobs.length > 0 ? (
                  displayJobs.map((activity, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-white/10 transition-colors group relative"
                    >
                      <td className="px-4 sm:px-8 py-3 sm:py-5">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full premium-glass-heavy text-white flex items-center justify-center flex-shrink-0 font-bold text-base sm:text-lg shadow-inner">
                            {activity.company.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] sm:text-[15px] font-bold text-slate-100 group-hover:text-blue-400 transition-colors tracking-tight truncate">
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
                            <p className="text-[11px] sm:text-[13px] text-slate-300 mt-0.5 font-medium truncate">
                              {activity.title}
                              <span className="hidden sm:inline">
                                {activity.location
                                  ? ` • ${activity.location}`
                                  : ""}
                              </span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap">
                        <StatusBadge status={activity.status} />
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-5 whitespace-nowrap hidden sm:table-cell">
                        <p className="text-[13px] sm:text-[14px] text-slate-300 font-medium">
                          {activity.dateApplied}
                        </p>
                      </td>
                      <td className="px-4 sm:px-8 py-3 sm:py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button
                            onClick={() => openVault(activity.id)}
                            className="p-2 text-slate-300 hover:text-amber-400 hover:bg-amber-400/10 rounded-full transition-colors"
                            title="Documents Vault"
                          >
                            <Folder className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal(activity.id)}
                            className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-900/30 rounded-full transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(activity.id)}
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-900/30 rounded-full transition-colors"
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
                      <div className="text-center py-20 m-6 border-dashed border-2 border-white/20 rounded-2xl bg-black/10">
                        <p className="text-[15px] font-bold text-slate-300">
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
      </div>

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete Application"
        message="Are you sure you want to permanently delete this application? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
