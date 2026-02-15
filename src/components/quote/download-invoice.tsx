"use client";

import { Download } from "lucide-react";

interface InvoicePayment {
  amount: number;
  method: string;
  notes: string | null;
  status: string;
  created_at: string;
}

interface DownloadInvoiceProps {
  businessName: string;
  businessEmail?: string;
  businessPhone?: string;
  logoUrl?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  quoteName?: string;
  items: { description: string; price: number }[];
  totalPrice: number;
  payments: InvoicePayment[];
  createdAt: string;
  signatureData?: string;
  notes?: string;
  depositPercentage?: number;
}

export default function DownloadInvoice(props: DownloadInvoiceProps) {
  const {
    businessName,
    businessEmail,
    businessPhone,
    logoUrl,
    customerName,
    customerEmail,
    customerPhone,
    quoteName,
    items,
    totalPrice,
    payments,
    createdAt,
    signatureData,
    notes,
    depositPercentage,
  } = props;

  const confirmedPayments = payments.filter((p) => p.status === "confirmed");
  const totalPaid = confirmedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const handleDownload = () => {
    const invoiceHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice — ${quoteName || customerName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb; }
    .logo-section { display: flex; align-items: center; gap: 12px; }
    .logo-section img { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; }
    .logo-placeholder { width: 48px; height: 48px; border-radius: 8px; background: #2563eb; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
    .business-name { font-size: 20px; font-weight: 700; }
    .business-contact { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 2px; }
    .invoice-title .date { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; font-weight: 600; }
    .info-box p { font-size: 14px; line-height: 1.5; }
    .info-box .name { font-weight: 600; font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; }
    thead th:last-child { text-align: right; }
    tbody td { padding: 12px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    tbody td:last-child { text-align: right; font-weight: 600; }
    .totals { margin-left: auto; width: 280px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .totals .row.total { border-top: 2px solid #1a1a1a; padding-top: 10px; margin-top: 6px; font-size: 18px; font-weight: 700; }
    .totals .row.paid { color: #059669; }
    .totals .row.balance { color: ${totalPaid >= totalPrice - 0.01 ? "#059669" : "#dc2626"}; }
    .paid-badge { display: inline-block; background: #d1fae5; color: #065f46; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; }
    .section { margin-bottom: 24px; }
    .section h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; font-weight: 600; }
    .payment-row { display: flex; justify-content: space-between; padding: 8px 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 4px; font-size: 13px; }
    .payment-method { text-transform: capitalize; font-weight: 500; }
    .payment-amount { font-weight: 600; color: #059669; }
    .notes { background: #f9fafb; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #4b5563; line-height: 1.6; }
    .signature-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .signature-text { font-family: 'Georgia', serif; font-size: 20px; font-style: italic; color: #1a1a1a; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
    @media print {
      body { padding: 20px; }
      @page { margin: 0.5in; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      ${logoUrl
        ? `<img src="${logoUrl}" alt="Logo" />`
        : `<div class="logo-placeholder">${businessName?.charAt(0) || "Q"}</div>`
      }
      <div>
        <div class="business-name">${businessName}</div>
        <div class="business-contact">
          ${[businessEmail, businessPhone].filter(Boolean).join(" · ")}
        </div>
      </div>
    </div>
    <div class="invoice-title">
      <h1>Invoice</h1>
      <div class="date">${new Date(createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Bill To</h3>
      <p class="name">${customerName}</p>
      ${customerEmail ? `<p>${customerEmail}</p>` : ""}
      ${customerPhone ? `<p>${customerPhone}</p>` : ""}
    </div>
    <div class="info-box" style="text-align: right;">
      <h3>Project</h3>
      <p class="name">${quoteName || "—"}</p>
      ${depositPercentage && depositPercentage > 0 ? `<p style="font-size:12px;color:#6b7280;">Deposit: ${depositPercentage}%</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item) => `
        <tr>
          <td>${item.description}</td>
          <td>$${item.price.toFixed(2)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="row total">
      <span>Total</span>
      <span>$${totalPrice.toFixed(2)}</span>
    </div>
    ${totalPaid > 0 ? `
      <div class="row paid">
        <span>Paid</span>
        <span>-$${totalPaid.toFixed(2)}</span>
      </div>
    ` : ""}
    <div class="row balance">
      <span>Balance Due</span>
      <span>$${Math.max(totalPrice - totalPaid, 0).toFixed(2)}</span>
    </div>
    ${totalPaid >= totalPrice - 0.01 ? `<div style="text-align:right;"><span class="paid-badge">✓ Paid in Full</span></div>` : ""}
  </div>

  ${confirmedPayments.length > 0 ? `
    <div class="section" style="margin-top: 24px;">
      <h3>Payment History</h3>
      ${confirmedPayments.map((p) => `
        <div class="payment-row">
          <div>
            <span class="payment-method">${p.method === "credit_card" ? "Credit Card" : p.method === "other" || p.method === "custom" ? "Direct Payment" : p.method}</span>
            <span style="color:#9ca3af;margin-left:8px;font-size:12px;">${new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            ${p.notes ? `<span style="color:#9ca3af;margin-left:8px;font-size:12px;">— ${p.notes}</span>` : ""}
          </div>
          <span class="payment-amount">+$${Number(p.amount).toFixed(2)}</span>
        </div>
      `).join("")}
    </div>
  ` : ""}

  ${notes ? `
    <div class="section">
      <h3>Notes</h3>
      <div class="notes">${notes}</div>
    </div>
  ` : ""}

  ${signatureData ? `
    <div class="signature-section">
      <h3 style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:8px;font-weight:600;">Customer Signature</h3>
      <div class="signature-text">${signatureData}</div>
    </div>
  ` : ""}

  <div class="footer">
    Generated by QuoteFlow · ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
      // Give the browser time to render, then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all shadow-lg"
    >
      <Download className="w-5 h-5" />
      Download Invoice
    </button>
  );
}
