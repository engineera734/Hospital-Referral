// src/components/mobile/mobile-reports.ts
import { formatMoney, formatDate, formatDepartment } from "../../lib/format";

/**
 * تنزيل ملف HTML مباشرة على الجهاز
 */
export function downloadMobileHtml(fileName: string, htmlContent: string): void {
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * تنزيل التقرير كـ PDF باستخدام html2pdf (يتم تحميل المكتبة ديناميكياً)
 */



export async function downloadMobilePdf(fileName: string, htmlContent: string): Promise<void> {
  const win = window.open("", "_blank");

  if (!win) {
    downloadMobileHtml(fileName.replace(".pdf", ".html"), htmlContent);
    return;
  }

  win.document.open();
  win.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>${fileName}</title>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 800);
}

export interface FinancialReportData {
  title: string;
  rows: any[];
  doctor?: any;
  department?: any;
  year: string;
  monthFrom: string | null;
  monthTo: string | null;
  rateMap: Map<string, number> | Record<string, number>;
  settlements?: any[];
  staffMap?: Record<string, string>;
}

function getRateValue(rateMap: Map<string, number> | Record<string, number>, key: string): number {
  if (rateMap instanceof Map) return rateMap.get(key) || 0;
  return Number((rateMap as Record<string, number>)[key]) || 0;
}

/**
 * الحصول على اسم موظف الاستقبال من معرفه
 */
function getArrivedByName(staffMap: Record<string, string> | undefined, arrivedById: string | null | undefined): string {
  if (!arrivedById) return "-";
  if (staffMap && staffMap[arrivedById]) return staffMap[arrivedById];
  return arrivedById; // إرجاع المعرف إذا لم يوجد الاسم
}

export function buildFinancialReportHtml(data: FinancialReportData): string {
  const { title, rows, doctor, department, year, monthFrom, monthTo, rateMap, settlements = [], staffMap = {} } = data;

  const doctorIds = new Set(rows.map((r) => r.doctors?.id).filter(Boolean));
  const uniqueDoctors = doctor
    ? [doctor]
    : doctorIds.size > 0
      ? [...doctorIds].map(id => rows.find(r => r.doctors?.id === id)?.doctors).filter(Boolean)
      : [];

  const dateScope = monthFrom && monthTo
    ? `من شهر ${monthFrom} إلى شهر ${monthTo} / سنة ${year}`
    : `كل أشهر ${year}`;

  const doctorSections = uniqueDoctors.map((doc: any) => {
    const docRows = rows.filter((r) => r.doctors?.id === doc.id);
    const docSettlements = settlements.filter((s: any) => s.doctor_id === doc.id);
    const arrivedRows = docRows.filter((r) => r.status === "arrived");
    const pendingRows = docRows.filter((r) => r.status === "pending");

    const totalAmount = arrivedRows.reduce(
      (sum: number, r: any) => sum + getRateValue(rateMap, `${r.doctors?.id}:${r.departments?.id || ""}`),
      0
    );

    const settledAmount = docSettlements.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);

    const rowsHtml = docRows.length > 0
      ? docRows.map((row: any) => {
          const amount = getRateValue(rateMap, `${row.doctors?.id}:${row.departments?.id || ""}`);
          const receptionist = getArrivedByName(staffMap, row.arrived_by);
          const statusBadge = row.status === "arrived" ? "مستقبلة" : "منتظرة";
          return `
            <tr>
              <td>${row.patient_name || "-"}</td>
              <td>${formatDepartment(row.departments?.name || "-")}</td>
              <td>${formatDate(row.referral_date || row.created_at) || "-"}</td>
              <td>${formatDate(row.arrived_at) || "-"}</td>
              <td>${receptionist}</td>
              <td>${statusBadge}</td>
              <td>${formatMoney(amount)}</td>
            </tr>`;
        }).join("")
      : `<tr><td colspan="7" style="text-align:center;color:#94a3b8;">لا توجد بيانات</td></tr>`;

    return `
      <section class="doctor-section">
        <h2>الطبيب: ${doc.full_name || "غير معروف"}</h2>
       

<div class="table-wrap"><table>

          <thead>
            <tr>
              <th>المريض</th>
              <th>القسم</th>
              <th>تاريخ الإرسال</th>
              <th>تاريخ الاستقبال</th>
              <th>موظف الاستقبال</th>
              <th>الحالة</th>
              <th>الربح</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            <tr><td colspan="6"><strong>الحالات المستقبلة</strong></td><td><strong>${arrivedRows.length}</strong></td></tr>
            <tr><td colspan="6"><strong>الحالات المنتظرة</strong></td><td><strong>${pendingRows.length}</strong></td></tr>
            <tr><td colspan="6"><strong>إجمالي المستحق</strong></td><td><strong>${formatMoney(totalAmount)}</strong></td></tr>
            ${settledAmount > 0 ? `
            <tr><td colspan="6"><strong>المصروف سابقاً</strong></td><td><strong>${formatMoney(settledAmount)}</strong></td></tr>
            <tr><td colspan="6"><strong>الصافي المتبقي</strong></td><td><strong>${formatMoney(Math.max(totalAmount - settledAmount, 0))}</strong></td></tr>
            ` : ""}
          </tfoot>
       
</table></div>

      </section>`;
  }).join("");

  const metaHtml = `
    <div class="meta">
      <p><strong>السنة:</strong> ${year}</p>
      <p><strong>النطاق:</strong> ${dateScope}</p>
      ${doctor ? `<p><strong>الطبيب:</strong> ${doctor.full_name}</p>` : ""}
      ${department ? `<p><strong>القسم:</strong> ${formatDepartment(department.name)}</p>` : ""}
      <p><strong>عدد الحالات:</strong> ${rows.length}</p>
    </div>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
  <style>
  
.table-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:12px}
table{min-width:720px;width:100%;border-collapse:collapse;font-size:10px;margin:8px 0}
th,td{white-space:nowrap}



    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Tahoma,sans-serif;padding:18px;color:#111827;background:white;direction:rtl}
    .container{max-width:800px;margin:0 auto;background:white;border:1px solid #d1d5db;padding:20px}
    h1{font-size:20px;color:#111827;margin-bottom:10px;border-bottom:2px solid #111827;padding-bottom:10px;text-align:center}
    .meta{border:1px solid #d1d5db;padding:12px;margin:12px 0;font-size:13px;color:#374151;line-height:1.8;background:#fff}
    .doctor-section{background:#fff;border:1px solid #d1d5db;padding:14px;margin:14px 0;break-inside:avoid}
    h2{font-size:15px;color:#111827;margin-bottom:10px}
    th,td{border:1px solid #d1d5db;padding:6px;text-align:right}
    th{background:#f3f4f6;color:#111827;font-weight:700}
    td{color:#1f2937}
    tfoot td{background:#f9fafb;font-size:11px}
    .footer{text-align:center;margin-top:16px;padding-top:12px;border-top:1px solid #d1d5db;font-size:11px;color:#6b7280}
    @media print{body{background:white}.container{border:none}}
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    ${metaHtml}
    ${doctorSections || '<p style="text-align:center;color:#94a3b8;padding:24px;">لا توجد بيانات للعرض</p>'}
    <div class="footer">تم إنشاء هذا التقرير تلقائياً - ${new Date().toLocaleDateString('ar-SA')}</div>
  </div>
</body>
</html>`;
}

export interface SettlementReceiptData {
  doctorName: string;
  doctorSpecialty?: string;
  scope: string;
  count: number;
  amount: number;
  settledBy: string;
  date: string;
  rows: any[];
  rateMap: Map<string, number> | Record<string, number>;
  staffMap?: Record<string, string>;
}

export function buildSettlementReceiptHtml(data: SettlementReceiptData): string {
  const { doctorName, doctorSpecialty, scope, count, amount, settledBy, date, rows, rateMap, staffMap = {} } = data;

  const rowsHtml = rows.length > 0
    ? rows.map((row: any) => {
        const rowAmount = getRateValue(rateMap, `${row.doctors?.id}:${row.departments?.id || ""}`);
        const receptionist = getArrivedByName(staffMap, row.arrived_by);
        return `
          <tr>
            <td>${row.patient_name || "-"}</td>
            <td>${formatDepartment(row.departments?.name || "-")}</td>
            <td>${formatDate(row.referral_date || row.created_at) || "-"}</td>
            <td>${formatDate(row.arrived_at) || "-"}</td>
            <td>${receptionist}</td>
            <td>${formatMoney(rowAmount)}</td>
          </tr>`;
      }).join("")
    : `<tr><td colspan="6" style="text-align:center;color:#94a3b8;">لا توجد بيانات</td></tr>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>إيصال تصفية مستحقات</title>
  <style>
  

.table-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:12px}
table{min-width:680px;width:100%;border-collapse:collapse;font-size:10px;margin:16px 0}
th,td{white-space:nowrap}

    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Tahoma,sans-serif;padding:18px;color:#111827;background:white;direction:rtl}
    .container{max-width:800px;margin:0 auto;background:white;border:1px solid #d1d5db;padding:20px}
    .header{text-align:center;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid #111827}
    h1{font-size:22px;color:#111827}
    .receipt-badge{display:inline-block;border:1px solid #9ca3af;color:#111827;padding:4px 12px;font-size:12px;margin-top:8px;background:#fff}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;border:1px solid #d1d5db;padding:14px;margin:14px 0;font-size:13px;background:#fff}
    .meta-item{display:flex;flex-direction:column;gap:4px}
    .meta-label{color:#4b5563;font-size:11px;font-weight:700}
    .meta-value{color:#111827;font-weight:700;font-size:14px}
    .amount-highlight{border:2px solid #111827;color:#111827;background:#fff;padding:8px 16px;font-size:18px;font-weight:800;text-align:center;grid-column:1/-1}
    th,td{border:1px solid #d1d5db;padding:6px;text-align:right}
    th{background:#f3f4f6;color:#111827;font-weight:700}
    .footer{text-align:center;margin-top:16px;padding-top:12px;border-top:1px solid #d1d5db;font-size:11px;color:#6b7280}
    .signature-area{display:flex;justify-content:space-between;margin-top:28px;padding-top:16px}
    .signature-box{width:170px;text-align:center;border-top:1px solid #111827;padding-top:8px;font-size:11px;color:#374151}
    @media print{body{background:white}.container{border:none}}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>إيصال تصفية مستحقات</h1>
      <div class="receipt-badge">رقم الإيصال: ${Date.now().toString(36).toUpperCase()}</div>
    </div>
    <div class="meta-grid">
      <div class="meta-item"><span class="meta-label">الطبيب</span><span class="meta-value">${doctorName}</span></div>
      <div class="meta-item"><span class="meta-label">التخصص</span><span class="meta-value">${doctorSpecialty || "عام"}</span></div>
      <div class="meta-item"><span class="meta-label">تاريخ التصفية</span><span class="meta-value">${date}</span></div>
      <div class="meta-item"><span class="meta-label">منفذ التصفية</span><span class="meta-value">${settledBy}</span></div>
      <div class="meta-item"><span class="meta-label">عدد الحالات</span><span class="meta-value">${count} حالة</span></div>
      <div class="meta-item"><span class="meta-label">نطاق التصفية</span><span class="meta-value">${scope}</span></div>
      <div class="amount-highlight">إجمالي المبلغ المصفى: ${formatMoney(amount)}</div>
    </div>
    <h3 style="margin-top:20px;color:#334155;">تفاصيل الحالات المصفاة:</h3>
  

<div class="table-wrap"><table>


      <thead>
        <tr>
          <th>المريض</th>
          <th>القسم</th>
          <th>تاريخ الإرسال</th>
          <th>تاريخ الاستقبال</th>
          <th>موظف الاستقبال</th>
          <th>الربح</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr><td colspan="5"><strong>الإجمالي</strong></td><td><strong>${formatMoney(amount)}</strong></td></tr>
      </tfoot>
   </table></div>
    <div class="signature-area">
      <div class="signature-box">توقيع المحاسب</div>
      <div class="signature-box">توقيع الطبيب</div>
    </div>
    <div class="footer">تم إنشاء هذا الإيصال تلقائياً - ${new Date().toLocaleDateString('ar-SA')}</div>
  </div>
</body>
</html>`;
}

export function printMobileHtml(htmlContent: string): void {
  const win = window.open("", "_blank");

  if (!win) {
    downloadMobileHtml("تقرير-للطباعة.html", htmlContent);
    return;
  }

  win.document.open();
  win.document.write(htmlContent);
  win.document.close();

  win.focus();

  setTimeout(() => {
    win.print();
  }, 700);
}



