import type { Filters } from "../types.ts";

interface ExportPayload {
  generatedAt: string;
  dateRange: string;
  activeFilters: Filters;
  headline: {
    recoverableHoursMonth: number;
    recoverableInrMonth: number;
    avgRepSharePct: number;
  };
  topTasks: Array<{
    rank: number;
    task: string;
    aps: number;
    inrMonth: number;
    confidence: "high" | "medium" | "low";
  }>;
  summaryLine: string;
}

function buildQuery(filters: Filters) {
  const params = new URLSearchParams();

  if (filters.department) {
    params.set("department", filters.department);
  }

  if (filters.taskCategory) {
    params.set("taskCategory", filters.taskCategory);
  }

  if (filters.week) {
    params.set("week", filters.week);
  }

  return params.toString();
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function hours(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

export async function generatePDF(filters: Filters) {
  const response = await fetch(`/api/export?${buildQuery(filters)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Export request failed with ${response.status}`);
  }

  const payload = (await response.json()) as ExportPayload;
  const { default: html2canvas } = await import("html2canvas");
  const { jsPDF } = await import("jspdf");

  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "1200px";
  container.style.padding = "32px";
  container.style.background = "#141416";
  container.style.color = "#F4F4F5";
  container.style.fontFamily = "Inter, system-ui, sans-serif";
  container.style.border = "1px solid rgba(255,255,255,0.08)";
  container.style.borderRadius = "20px";
  container.style.boxSizing = "border-box";
  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:24px;">
      <div>
        <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#F59E0B;font-weight:700;">Workforce Pulse</div>
        <div style="font-size:30px;font-weight:700;margin-top:8px;">Executive Export</div>
        <div style="font-size:14px;color:#A1A1AA;margin-top:6px;">${payload.summaryLine}</div>
      </div>
      <div style="text-align:right;font-size:13px;color:#A1A1AA;line-height:1.6;">
        <div>Generated ${payload.generatedAt}</div>
        <div>Filters ${JSON.stringify(payload.activeFilters)}</div>
        <div>Date range ${payload.dateRange}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:24px;">
      <div style="background:#1C1C1F;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#A1A1AA;">Recoverable Hours / Month</div>
        <div style="font-size:28px;font-weight:700;margin-top:10px;">~${hours(payload.headline.recoverableHoursMonth)} hrs</div>
      </div>
      <div style="background:#1C1C1F;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#A1A1AA;">Recoverable INR / Month</div>
        <div style="font-size:28px;font-weight:700;margin-top:10px;">~${money(payload.headline.recoverableInrMonth)}</div>
      </div>
      <div style="background:#1C1C1F;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#A1A1AA;">Avg Repetitive Share</div>
        <div style="font-size:28px;font-weight:700;margin-top:10px;">${payload.headline.avgRepSharePct}%</div>
      </div>
    </div>
    <div style="background:#1C1C1F;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;">
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#A1A1AA;margin-bottom:16px;">Top 5 Automation Opportunities</div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="text-align:left;color:#A1A1AA;">
            <th style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);">Rank</th>
            <th style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);">Task</th>
            <th style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);">APS</th>
            <th style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);">INR / Month</th>
            <th style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);">Confidence</th>
          </tr>
        </thead>
        <tbody>
          ${payload.topTasks
            .map(
              (task) => `
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${task.rank}</td>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-weight:600;">${task.task}</td>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${task.aps.toFixed(1)}</td>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${money(task.inrMonth)}</td>
                <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);text-transform:uppercase;">${task.confidence}</td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  document.body.appendChild(container);

  try {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const canvas = await html2canvas(container, {
      backgroundColor: "#141416",
      scale: 2,
      useCORS: true,
    });

    const image = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = (canvas.height * pageWidth) / canvas.width;

    pdf.addImage(image, "PNG", 0, 0, pageWidth, pageHeight);
    pdf.save("workforce-pulse-export.pdf");
  } finally {
    container.remove();
  }
}

export default generatePDF;