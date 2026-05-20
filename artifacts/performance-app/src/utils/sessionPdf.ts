import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfExercise {
  blockLabel: string;
  name: string;
  sets: number;
  reps?: number;
  durationSec?: number;
  durationText?: string;   // free-text duration: "20s", "30\"", "2'"
  restText: string;
  loadText: string;
  notes: string;
  videoUrl: string;
  regime?: string;
}

export interface SessionPdfData {
  sessionTitle: string;
  sessionType: string;
  playerName: string;
  date: string;
  objective: string;
  notes: string;
  exercises: PdfExercise[];
  isGroup?: boolean;
}

const PRIMARY = [0, 200, 210] as [number, number, number];
const BG_DARK = [15, 17, 22] as [number, number, number];
const CARD = [22, 26, 34] as [number, number, number];
const TEXT = [220, 225, 235] as [number, number, number];
const MUTED = [110, 120, 140] as [number, number, number];
const BORDER = [40, 46, 60] as [number, number, number];
const WARN = [250, 180, 0] as [number, number, number];

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function blockColor(blockLabel: string): [number, number, number] {
  if (blockLabel.toLowerCase().includes("isométr")) return [80, 140, 255];
  if (blockLabel.toLowerCase().includes("activac")) return [255, 140, 60];
  if (blockLabel.toLowerCase().includes("pliom") || blockLabel.toLowerCase().includes("técnica")) return [255, 80, 100];
  if (blockLabel.toLowerCase().includes("principal")) return [0, 200, 210];
  if (blockLabel.toLowerCase().includes("accesorio")) return [100, 200, 130];
  if (blockLabel.toLowerCase().includes("déficit")) return [170, 100, 255];
  if (blockLabel.toLowerCase().includes("anterior")) return [100, 200, 130];
  if (blockLabel.toLowerCase().includes("posterior")) return [60, 160, 255];
  if (blockLabel.toLowerCase().includes("aductor")) return [255, 180, 50];
  if (blockLabel.toLowerCase().includes("pnf")) return [200, 120, 255];
  if (blockLabel.toLowerCase().includes("core")) return [80, 220, 180];
  if (blockLabel.toLowerCase().includes("recuper")) return [160, 130, 255];
  return PRIMARY;
}

export function generateSessionPdf(data: SessionPdfData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const MARGIN = 14;

  // ── Background
  doc.setFillColor(...BG_DARK);
  doc.rect(0, 0, W, H, "F");

  // ── Header bar
  doc.setFillColor(...CARD);
  doc.rect(0, 0, W, 38, "F");
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.6);
  doc.line(0, 38, W, 38);

  // ── Logo / brand
  doc.setFontSize(15);
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("PERFORMANCEIQ", MARGIN, 13);

  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("FOOTBALL ANALYTICS", MARGIN, 18);

  // ── Session type badge
  const typeLabel = data.sessionType.toUpperCase();
  const badgeW = doc.getTextWidth(typeLabel) + 8;
  doc.setFillColor(...PRIMARY);
  doc.roundedRect(W - MARGIN - badgeW, 8, badgeW, 7, 1, 1, "F");
  doc.setFontSize(7);
  doc.setTextColor(10, 12, 18);
  doc.setFont("helvetica", "bold");
  doc.text(typeLabel, W - MARGIN - badgeW / 2, 13.2, { align: "center" });

  // ── Session title
  doc.setFontSize(17);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "bold");
  doc.text(data.sessionTitle, MARGIN, 29);

  // ── Date & player row
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  const dateStr = data.date
    ? new Date(data.date + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
    : data.date;
  doc.text(`${dateStr}  ·  ${data.playerName}`, MARGIN, 35);

  let y = 48;

  // ── Objetivo + Notas row
  if (data.objective || data.notes) {
    doc.setFillColor(...CARD);
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, data.notes ? 18 : 11, 2, 2, "F");
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, data.notes ? 18 : 11, 2, 2, "S");

    if (data.objective) {
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "bold");
      doc.text("OBJETIVO", MARGIN + 3, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      doc.text(data.objective.slice(0, 100), MARGIN + 3, y + 10);
    }
    if (data.notes) {
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.setFont("helvetica", "bold");
      doc.text("NOTAS", MARGIN + 3, y + 15);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT);
      doc.text(data.notes.slice(0, 100), MARGIN + 3, y + 20);
    }
    y += (data.notes ? 18 : 11) + 6;
  }

  // ── Group exercises by block
  const blocks = new Map<string, PdfExercise[]>();
  for (const ex of data.exercises) {
    if (!blocks.has(ex.blockLabel)) blocks.set(ex.blockLabel, []);
    blocks.get(ex.blockLabel)!.push(ex);
  }

  for (const [blockLabel, exs] of blocks) {
    const color = blockColor(blockLabel);

    // Block header
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(MARGIN, y, 3, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(blockLabel.toUpperCase(), MARGIN + 6, y + 4.5);
    y += 9;

    // Table
    const rows = exs.map(ex => {
      const volStr = ex.durationText
        ? `${ex.sets} × ${ex.durationText}`
        : ex.durationSec
          ? `${ex.sets} × ${ex.durationSec}"`
          : `${ex.sets} × ${ex.reps ?? "—"}`;
      return [
        ex.name,
        volStr,
        ex.loadText || "—",
        ex.restText || "—",
        ex.notes ? ex.notes.slice(0, 40) : "—",
        ex.videoUrl ? "Ver vídeo" : "Pendiente",
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Ejercicio", "Volumen", "Carga", "Descanso", "Observaciones", "Vídeo"]],
      body: rows,
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        textColor: [220, 225, 235],
        fillColor: [22, 26, 34],
        lineColor: [40, 46, 60],
        lineWidth: 0.2,
        font: "helvetica",
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [28, 32, 42],
        textColor: [110, 120, 140],
        fontStyle: "bold",
        fontSize: 6.5,
        halign: "left",
      },
      alternateRowStyles: {
        fillColor: [18, 22, 30],
      },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 22, halign: "center" },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 45, overflow: "linebreak" },
        5: { cellWidth: 16, halign: "center", textColor: [0, 180, 200] },
      },
      didDrawCell: (hookData) => {
        if (hookData.column.index === 5 && hookData.section === "body") {
          const cellText = rows[hookData.row.index]?.[5];
          if (cellText === "Ver vídeo") {
            const videoUrl = exs[hookData.row.index]?.videoUrl;
            if (videoUrl) {
              doc.link(
                hookData.cell.x,
                hookData.cell.y,
                hookData.cell.width,
                hookData.cell.height,
                { url: videoUrl }
              );
            }
          }
        }
      },
      didParseCell: (hookData) => {
        if (hookData.column.index === 5 && hookData.section === "body") {
          if (hookData.cell.raw === "Ver vídeo") {
            hookData.cell.styles.textColor = [0, 180, 200];
          } else {
            hookData.cell.styles.textColor = [80, 90, 110];
          }
        }
      },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

    if (y > H - 25) {
      doc.addPage();
      doc.setFillColor(...BG_DARK);
      doc.rect(0, 0, W, H, "F");
      y = 14;
    }
  }

  // ── Footer
  const footerY = H - 10;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY - 4, W - MARGIN, footerY - 4);
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("PerformanceIQ · Football Analytics · Documento generado automáticamente", MARGIN, footerY);
  doc.text(`${dateStr}${data.isGroup ? " · Sesión grupal" : ""}`, W - MARGIN, footerY, { align: "right" });

  // ── Save
  const filename = `${data.sessionTitle.replace(/[^a-z0-9]/gi, "_")}_${data.date}.pdf`;
  doc.save(filename);
}
