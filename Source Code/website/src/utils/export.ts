import type { Job } from "../context/JobContext";

export interface ExportOptions {
  jobs: Job[];
  userName: string;
  totalApplications: number;
  savedNumber: number;
  interviewingNumber: number;
  offerNumber: number;
  rejectedNumber: number;
}

export async function exportToPDF(opts: ExportOptions) {
  const {
    jobs,
    userName,
    totalApplications,
    savedNumber,
    interviewingNumber,
    offerNumber,
    rejectedNumber,
  } = opts;

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
  doc.text("SaveTheJob — Application Report", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated for ${userName} · ${today}`, 14, 19);

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
      `SaveTheJob · Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: "center" },
    );
  }

  doc.save(`SaveTheJob_Applications_${today.replace(/ /g, "_")}.pdf`);
}

export async function exportToExcel(opts: ExportOptions) {
  const {
    jobs,
    userName,
    totalApplications,
    savedNumber,
    interviewingNumber,
    offerNumber,
    rejectedNumber,
  } = opts;

  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "SaveTheJob";
  wb.created = new Date();

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
    Saved: { bg: "FFF3E8FF", fg: "FF581C87" },
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
  r1.value = "SaveTheJob — Application Report";
  r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
  r1.font = { bold: true, size: 18, color: { argb: WHITE }, name: "Calibri" };
  r1.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 42;

  // Row 2: Subtitle
  ws.mergeCells("A2:G2");
  const r2 = ws.getCell("A2");
  r2.value = `Generated for ${userName}  ·  ${today}`;
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

  // Rows 4–5: Metric boxes
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
  a.download = `SaveTheJob_Applications_${todayFile}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
