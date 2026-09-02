/**
 * Sobaike Admin Export Utilities
 * Provides CSV formatting (with UTF-8 BOM encoding for Bengali Unicode support)
 * and formatted PDF document generation using jsPDF & jspdf-autotable.
 */

import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { Complaint } from '@/types/Complaint';
import { ResponseItem } from '@/types/Response';
import { MapComplaint } from '@/types/Map';
import { DashboardStats, StatusSummaryItem, RecentComplaintItem } from '@/types/Dashboard';
import { AnalyticsDataResponse } from '@/types/Analytics';
import { AuditLog } from '@/types/AuditLog';


// Helper to sanitize text for standard PDF rendering
function sanitizeText(val: unknown, fallback: string = '-'): string {
  if (val === null || val === undefined || val === '') return fallback;
  const str = String(val).trim();
  // Strip non-printable control characters
  return str.replace(/[\x00-\x1F\x7F]/g, '');
}

/**
 * Escapes CSV field value and wraps in quotes if necessary
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates and triggers browser download of a CSV file with UTF-8 BOM
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]): boolean {
  try {
    const headerLine = headers.map(escapeCsvField).join(',');
    const rowLines = rows.map((row) => row.map(escapeCsvField).join(','));
    const csvContent = [headerLine, ...rowLines].join('\r\n');

    // \uFEFF is UTF-8 Byte Order Mark (BOM) ensuring Excel and text viewers parse Bangla script cleanly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Failed to trigger CSV download:', error);
    return false;
  }
}

/**
 * Common PDF styling setup with header banner, metadata card, and page footer
 */
function setupPdfHeaderAndFooter(
  doc: jsPDF,
  title: string,
  subtitle: string,
  filterItems: { label: string; value: string }[],
  totalCount: number,
  isLandscape: boolean
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Top Decorative Brand Bar
  doc.setFillColor(14, 116, 144); // Sky/Cyan 700
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. Organization & Report Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('SOBAI KE JANAO - CIVIC ADMIN', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text(title, 14, 21);

  // Timestamp & Export Notice on Right
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  const dateStr = `Export Date: ${new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
  doc.text(dateStr, pageWidth - 14, 15, { align: 'right' });
  doc.text(`Total Records: ${totalCount}`, pageWidth - 14, 21, { align: 'right' });

  // 3. Filter Summary Box
  let currentY = 27;
  if (filterItems.length > 0 || subtitle) {
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85); // Slate 700
    doc.text('FILTER CRITERIA:', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const filterText =
      filterItems.map((f) => `${f.label}: ${f.value}`).join('  |  ') || subtitle;
    
    // Truncate if too long
    const maxTextWidth = pageWidth - 65;
    const splitFilter = doc.splitTextToSize(filterText, maxTextWidth);
    doc.text(splitFilter[0] || 'All Records Included', 52, currentY + 5.5);
    
    if (subtitle && filterItems.length > 0) {
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(subtitle, 18, currentY + 10.5);
    }

    currentY += 19;
  } else {
    currentY += 6;
  }

  return currentY;
}

/**
 * Attaches page numbering and official footer disclaimer
 */
function attachPdfPageNumbers(doc: jsPDF) {
  const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : ((doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    // Left disclaimer
    doc.text(
      'Official & Confidential Civic Governance Record • Sobaike Platform Operations',
      14,
      pageHeight - 6
    );

    // Right Page Number
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 6, {
      align: 'right',
    });
  }
}

/* ==========================================================================
   1. COMPLAINTS EXPORT (CSV & PDF)
   ========================================================================== */

export function exportComplaintsToCsv(complaints: Complaint[], customFilename?: string): boolean {
  const filename = customFilename || `sobaike_complaints_${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    'Complaint ID',
    'Title (EN)',
    'Title (BN)',
    'Category (EN)',
    'Category (BN)',
    'Subcategory (EN)',
    'Subcategory (BN)',
    'Status',
    'Urgency',
    'Ward',
    'Zone',
    'Address (EN)',
    'Address (BN)',
    'Citizen Name',
    'Citizen Phone',
    'Is Anonymous',
    'Assigned Department',
    'Upvotes',
    'Comments',
    'Created Date',
    'Updated Date',
  ];

  const rows = complaints.map((c) => [
    c.id,
    c.titleEn,
    c.titleBn,
    c.categoryEn,
    c.categoryBn,
    c.subcategoryEn,
    c.subcategoryBn,
    c.status,
    c.urgency,
    c.location?.ward || '',
    c.location?.zone || '',
    c.location?.addressEn || '',
    c.location?.addressBn || '',
    c.isAnonymous ? 'Anonymous' : c.citizenName || 'Citizen',
    c.isAnonymous ? 'Hidden' : c.citizenPhone || '',
    c.isAnonymous ? 'Yes' : 'No',
    c.assignedDepartment || '',
    c.upvotesCount,
    c.commentsCount,
    c.createdAt,
    c.updatedAt,
  ]);

  return downloadCsv(filename, headers, rows);
}

export interface ComplaintFilterSummary {
  status?: string;
  category?: string;
  ward?: string;
  urgency?: string;
  dateRange?: string;
  search?: string;
}

export function exportComplaintsToPdf(
  complaints: Complaint[],
  filterSummary?: ComplaintFilterSummary,
  customFilename?: string
): boolean {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const filename =
      customFilename ||
      `sobaike_complaints_${filterSummary?.status && filterSummary.status !== 'all' ? filterSummary.status + '_' : ''}${new Date().toISOString().slice(0, 10)}.pdf`;

    const filterItems: { label: string; value: string }[] = [];
    if (filterSummary?.status && filterSummary.status !== 'all') {
      filterItems.push({ label: 'Status', value: filterSummary.status.toUpperCase() });
    }
    if (filterSummary?.category && filterSummary.category !== 'all') {
      filterItems.push({ label: 'Category', value: filterSummary.category });
    }
    if (filterSummary?.ward && filterSummary.ward !== 'all') {
      filterItems.push({ label: 'Ward', value: filterSummary.ward });
    }
    if (filterSummary?.urgency && filterSummary.urgency !== 'all') {
      filterItems.push({ label: 'Urgency', value: filterSummary.urgency.toUpperCase() });
    }
    if (filterSummary?.search) {
      filterItems.push({ label: 'Search', value: `"${filterSummary.search}"` });
    }

    const startY = setupPdfHeaderAndFooter(
      doc,
      'Operational Complaint Triage & Grievance Report',
      'Filtered citizen reports including classification, ward, status, and urgency metrics.',
      filterItems,
      complaints.length,
      true
    );

    const headers = [
      ['ID', 'Title / Issue', 'Category', 'Ward / Area', 'Urgency', 'Status', 'Citizen', 'Submitted Date']
    ];

    const body = complaints.map((c) => [
      c.id,
      sanitizeText(c.titleEn || c.titleBn),
      sanitizeText(c.categoryEn || c.categoryBn),
      sanitizeText(c.location?.ward || c.location?.zone || '-'),
      (c.urgency || 'medium').toUpperCase(),
      (c.status || 'submitted').replace(/_/g, ' ').toUpperCase(),
      c.isAnonymous ? 'Anonymous' : sanitizeText(c.citizenName, 'Citizen'),
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-',
    ]);

    const tableOptions: UserOptions = {
      startY,
      head: headers,
      body: body,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [15, 23, 42], // Dark Slate 900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 70 },
        2: { cellWidth: 38 },
        3: { cellWidth: 32 },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 30, halign: 'center' },
        6: { cellWidth: 28 },
        7: { cellWidth: 26, halign: 'right' },
      },
      margin: { left: 14, right: 14, bottom: 16 },
    };

    autoTable(doc, tableOptions);
    attachPdfPageNumbers(doc);
    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Failed to generate Complaints PDF:', error);
    return false;
  }
}

/* ==========================================================================
   2. RESPONSES EXPORT (CSV & PDF)
   ========================================================================== */

export function exportResponsesToCsv(responses: ResponseItem[], customFilename?: string): boolean {
  const filename = customFilename || `sobaike_responses_${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    'Response ID',
    'Linked Type',
    'Linked ID',
    'Linked Title (EN)',
    'Linked Title (BN)',
    'Category (EN)',
    'Category (BN)',
    'Ward',
    'Author Name (EN)',
    'Author Name (BN)',
    'Author Role',
    'Department (EN)',
    'Organization (EN)',
    'Is Official',
    'Status',
    'Internal Content (EN)',
    'Internal Content (BN)',
    'Public Content (EN)',
    'Public Content (BN)',
    'Reviewed By',
    'Created Date',
  ];

  const rows = responses.map((r) => [
    r.id,
    r.relatedType,
    r.relatedId,
    r.relatedTitleEn,
    r.relatedTitleBn,
    r.categoryEn,
    r.categoryBn,
    r.ward || '',
    r.author?.name || '',
    r.author?.nameBn || '',
    r.author?.role || '',
    r.author?.departmentEn || '',
    r.author?.organizationEn || '',
    r.isOfficial ? 'Official' : 'Citizen',
    r.status,
    r.contentEn,
    r.contentBn,
    r.publicContentEn || '',
    r.publicContentBn || '',
    r.reviewedBy || '',
    r.createdAt,
  ]);

  return downloadCsv(filename, headers, rows);
}

export function exportResponsesToPdf(
  responses: ResponseItem[],
  filterSummary?: { status?: string; ward?: string; search?: string },
  customFilename?: string
): boolean {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const filename =
      customFilename ||
      `sobaike_responses_${filterSummary?.status && filterSummary.status !== 'all' ? filterSummary.status + '_' : ''}${new Date().toISOString().slice(0, 10)}.pdf`;

    const filterItems: { label: string; value: string }[] = [];
    if (filterSummary?.status && filterSummary.status !== 'all') {
      filterItems.push({ label: 'Status', value: filterSummary.status.toUpperCase() });
    }
    if (filterSummary?.ward && filterSummary.ward !== 'all') {
      filterItems.push({ label: 'Ward', value: filterSummary.ward });
    }
    if (filterSummary?.search) {
      filterItems.push({ label: 'Search', value: `"${filterSummary.search}"` });
    }

    const startY = setupPdfHeaderAndFooter(
      doc,
      'Departmental & Citizen Responses Moderation Report',
      'Audit log of verified replies, status updates, and public declarations.',
      filterItems,
      responses.length,
      true
    );

    const headers = [
      ['ID', 'Linked Issue', 'Author / Dept', 'Type', 'Status', 'Response Summary', 'Date']
    ];

    const body = responses.map((r) => [
      r.id,
      `${r.relatedId}\n${sanitizeText(r.relatedTitleEn || r.relatedTitleBn)}`,
      `${sanitizeText(r.author?.name, 'Desk Officer')}\n(${sanitizeText(r.author?.departmentEn || r.author?.role || 'Admin')})`,
      r.isOfficial ? 'Official' : 'Citizen',
      (r.status || 'pending').toUpperCase(),
      sanitizeText(r.publicContentEn || r.contentEn, 'Response logged'),
      r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-',
    ]);

    const tableOptions: UserOptions = {
      startY,
      head: headers,
      body: body,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 20, fontStyle: 'bold' },
        1: { cellWidth: 55 },
        2: { cellWidth: 45 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 80 },
        6: { cellWidth: 24, halign: 'right' },
      },
      margin: { left: 14, right: 14, bottom: 16 },
    };

    autoTable(doc, tableOptions);
    attachPdfPageNumbers(doc);
    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Failed to generate Responses PDF:', error);
    return false;
  }
}

/* ==========================================================================
   3. MAP COMPLAINTS EXPORT (CSV & PDF)
   ========================================================================== */

export function exportMapComplaintsToCsv(complaints: MapComplaint[], customFilename?: string): boolean {
  const filename = customFilename || `sobaike_map_data_${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    'Complaint ID',
    'Title (EN)',
    'Title (BN)',
    'Category (EN)',
    'Category (BN)',
    'Subcategory (EN)',
    'Subcategory (BN)',
    'Status',
    'Ward',
    'Zone',
    'Address (EN)',
    'Address (BN)',
    'Latitude',
    'Longitude',
    'Created Date',
  ];

  const rows = complaints.map((c) => [
    c.id,
    c.titleEn,
    c.titleBn,
    c.categoryEn,
    c.categoryBn,
    c.subcategoryEn,
    c.subcategoryBn,
    c.status,
    c.location.ward,
    c.location.zone,
    c.location.addressEn,
    c.location.addressBn,
    c.latitude,
    c.longitude,
    c.createdAt,
  ]);

  return downloadCsv(filename, headers, rows);
}

export function exportMapComplaintsToPdf(
  complaints: MapComplaint[],
  filterSummary?: { ward?: string; status?: string },
  customFilename?: string
): boolean {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const filename = customFilename || `sobaike_geospatial_report_${new Date().toISOString().slice(0, 10)}.pdf`;

    const filterItems: { label: string; value: string }[] = [];
    if (filterSummary?.ward && filterSummary.ward !== 'all') {
      filterItems.push({ label: 'Ward', value: filterSummary.ward });
    }
    if (filterSummary?.status && filterSummary.status !== 'all') {
      filterItems.push({ label: 'Status', value: filterSummary.status.toUpperCase() });
    }

    const startY = setupPdfHeaderAndFooter(
      doc,
      'Geospatial Civic Hotspots & Ward Mapping Report',
      'Geocoded complaint registry with coordinates, ward clustering, and lifecycle progress.',
      filterItems,
      complaints.length,
      true
    );

    const headers = [
      ['ID', 'Issue Title', 'Category', 'Ward / Area', 'Coordinates (Lat, Lng)', 'Status', 'Date']
    ];

    const body = complaints.map((c) => [
      c.id,
      sanitizeText(c.titleEn || c.titleBn),
      sanitizeText(c.categoryEn || c.categoryBn),
      `${c.location.ward || '-'}${c.location.addressEn ? '\n' + sanitizeText(c.location.addressEn) : ''}`,
      `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`,
      (c.status || 'submitted').replace(/_/g, ' ').toUpperCase(),
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-',
    ]);

    const tableOptions: UserOptions = {
      startY,
      head: headers,
      body: body,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        1: { cellWidth: 80 },
        2: { cellWidth: 45 },
        3: { cellWidth: 50 },
        4: { cellWidth: 35, halign: 'center' },
        5: { cellWidth: 26, halign: 'center' },
        6: { cellWidth: 22, halign: 'right' },
      },
      margin: { left: 14, right: 14, bottom: 16 },
    };

    autoTable(doc, tableOptions);
    attachPdfPageNumbers(doc);
    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Failed to generate Map PDF:', error);
    return false;
  }
}

/* ==========================================================================
   4. DASHBOARD OVERVIEW EXPORT (CSV & PDF)
   ========================================================================== */

export function exportDashboardToCsv(
  stats: DashboardStats,
  statuses: StatusSummaryItem[],
  recentComplaints: RecentComplaintItem[],
  customFilename?: string
): boolean {
  const filename = customFilename || `sobaike_dashboard_overview_${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = ['Category / Section', 'Item Name / ID', 'Details / Status', 'Value / Count', 'Change / Date'];
  const rows: (string | number | boolean | null | undefined)[][] = [];

  rows.push(['Core Metrics', 'Total Complaints', 'All time submissions', stats.totalComplaints, `${stats.trends?.totalComplaintsChange > 0 ? '+' : ''}${stats.trends?.totalComplaintsChange}%`]);
  rows.push(['Core Metrics', 'Submitted', 'Awaiting administrative triage', stats.submitted, `${stats.trends?.submittedChange > 0 ? '+' : ''}${stats.trends?.submittedChange}%`]);
  rows.push(['Core Metrics', 'Published', 'Visible on public feed', stats.published, `${stats.trends?.publishedChange > 0 ? '+' : ''}${stats.trends?.publishedChange}%`]);
  rows.push(['Core Metrics', 'Rejected', 'Declined complaints', stats.rejected, `${stats.trends?.rejectedChange > 0 ? '+' : ''}${stats.trends?.rejectedChange}%`]);
  rows.push(['Core Metrics', 'Edited', 'Administratively modified complaints', stats.edited, `${stats.trends?.editedChange > 0 ? '+' : ''}${stats.trends?.editedChange}%`]);

  statuses.forEach((s) => {
    rows.push(['Status Distribution', s.labelEn, s.descriptionEn, s.count, `${s.percentage}%`]);
  });

  recentComplaints.forEach((rc) => {
    rows.push(['Recent Complaint', rc.id, rc.titleEn, rc.status, rc.date]);
  });

  return downloadCsv(filename, headers, rows);
}

export function exportDashboardToPdf(
  stats: DashboardStats,
  statuses: StatusSummaryItem[],
  recentComplaints: RecentComplaintItem[],
  dateRange?: string,
  customFilename?: string
): boolean {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const filename = customFilename || `sobaike_dashboard_overview_${new Date().toISOString().slice(0, 10)}.pdf`;

    const filterItems: { label: string; value: string }[] = [];
    if (dateRange) {
      filterItems.push({ label: 'Time Horizon', value: dateRange.toUpperCase() });
    }

    const startY = setupPdfHeaderAndFooter(
      doc,
      'Civic Platform Operational Dashboard Snapshot',
      'High-level metrics summary, triage workload distribution, and latest complaint activity.',
      filterItems,
      stats.totalComplaints,
      false
    );

    // Section 1: Dashboard KPIs
    const kpiHeaders = [['Metric', 'Volume', 'Trend vs Prior Period']];
    const kpiBody = [
      ['Total Complaints Submitted', String(stats.totalComplaints), `${stats.trends?.totalComplaintsChange > 0 ? '+' : ''}${stats.trends?.totalComplaintsChange || 0}%`],
      ['Submitted (Pending Triage)', String(stats.submitted), `${stats.trends?.submittedChange > 0 ? '+' : ''}${stats.trends?.submittedChange || 0}%`],
      ['Published to Public Feed', String(stats.published), `${stats.trends?.publishedChange > 0 ? '+' : ''}${stats.trends?.publishedChange || 0}%`],
      ['Rejected Complaints', String(stats.rejected), `${stats.trends?.rejectedChange > 0 ? '+' : ''}${stats.trends?.rejectedChange || 0}%`],
      ['Edited Complaints', String(stats.edited), `${stats.trends?.editedChange > 0 ? '+' : ''}${stats.trends?.editedChange || 0}%`],
    ];

    autoTable(doc, {
      startY,
      head: kpiHeaders,
      body: kpiBody,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [51, 65, 85] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    // Section 2: Recent Activity
    if (recentComplaints && recentComplaints.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('RECENT COMPLAINT SUBMISSIONS', 14, finalY);

      const recentHeaders = [['ID', 'Title / Issue', 'Status', 'Date']];
      const recentBody = recentComplaints.map((rc) => [
        rc.id,
        sanitizeText(rc.titleEn || rc.titleBn),
        (rc.status || 'submitted').replace(/_/g, ' ').toUpperCase(),
        rc.date || '-',
      ]);

      autoTable(doc, {
        startY: finalY + 3,
        head: recentHeaders,
        body: recentBody,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.2, textColor: [51, 65, 85] },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 25, fontStyle: 'bold' },
          1: { cellWidth: 100 },
          2: { cellWidth: 32, halign: 'center' },
          3: { cellWidth: 25, halign: 'right' },
        },
        margin: { left: 14, right: 14, bottom: 16 },
      });
    }

    attachPdfPageNumbers(doc);
    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Failed to generate Dashboard PDF:', error);
    return false;
  }
}

/* ==========================================================================
   5. ANALYTICS EXPORT (CSV & PDF)
   ========================================================================== */

export function exportAnalyticsToCsv(
  data: AnalyticsDataResponse,
  customFilename?: string
): boolean {
  const filename = customFilename || `sobaike_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = ['Metric Category', 'Identifier / Label (EN)', 'Label (BN)', 'Count / Value', 'Percentage / Details'];
  const rows: (string | number | boolean | null | undefined)[][] = [];

  // Summary Metrics
  rows.push(['Summary KPIs', 'Total Complaints', 'মোট অভিযোগ', data.summary.totalComplaints, '100%']);
  rows.push(['Summary KPIs', 'Published Reports', 'পাবলিক প্রকাশিত', data.summary.published, `${data.summary.totalComplaints ? Math.round((data.summary.published / data.summary.totalComplaints) * 100) : 0}%`]);
  rows.push(['Summary KPIs', 'Resolved Cases', 'সমাধানকৃত', data.summary.resolved, `${data.summary.totalComplaints ? Math.round((data.summary.resolved / data.summary.totalComplaints) * 100) : 0}%`]);
  rows.push(['Summary KPIs', 'Total Responses', 'অফিসিয়াল অগ্রগতি', data.summary.responses, '-']);
  rows.push(['Summary KPIs', 'Active Categories', 'সক্রিয় ক্যাটাগরি', data.summary.activeCategories, '-']);

  // Status Distribution
  data.statusDistribution.forEach((s) => {
    rows.push(['Status Breakdown', s.labelEn, s.labelBn, s.count, `${s.percentage}%`]);
  });

  // Category Breakdown
  data.categoryDistribution.forEach((c) => {
    rows.push(['Category Breakdown', c.nameEn, c.nameBn, c.count, `${c.percentage}% (Resolved: ${c.resolvedCount}, Pending: ${c.pendingCount})`]);
    c.subcategories.forEach((sub) => {
      rows.push(['Subcategory Breakdown', `  - ${sub.nameEn}`, sub.nameBn, sub.count, `${sub.percentage}% of category`]);
    });
  });

  // Location Breakdown
  data.locationDistribution.forEach((l) => {
    rows.push(['Location Insight', l.location, l.area || '-', l.count, `${l.percentage}% (Resolved: ${l.resolvedCount}, Mapped: ${l.mappedCount})`]);
  });

  // Trend Data Points
  data.trends.forEach((t) => {
    rows.push(['Daily Trend', t.date, t.dateFormattedEn, t.complaintsCount, `Published: ${t.publishedCount}, Resolved: ${t.resolvedCount}`]);
  });

  return downloadCsv(filename, headers, rows);
}

export function exportAnalyticsToPdf(
  data: AnalyticsDataResponse,
  filterSummary?: { dateRange?: string; categoryId?: string; status?: string },
  customFilename?: string
): boolean {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const filename = customFilename || `sobaike_analytics_report_${new Date().toISOString().slice(0, 10)}.pdf`;

    const filterItems: { label: string; value: string }[] = [];
    if (filterSummary?.dateRange) {
      filterItems.push({ label: 'Period', value: filterSummary.dateRange.toUpperCase() });
    }
    if (filterSummary?.categoryId) {
      filterItems.push({ label: 'Category', value: filterSummary.categoryId });
    }
    if (filterSummary?.status) {
      filterItems.push({ label: 'Status', value: filterSummary.status.toUpperCase() });
    }

    const startY = setupPdfHeaderAndFooter(
      doc,
      'Executive Civic Analytics & Resolution Performance Report',
      'High-level summary KPIs, status lifecycle distribution, and category breakdowns.',
      filterItems,
      data.summary.totalComplaints,
      false
    );

    // Section 1: Executive KPIs
    const kpiHeaders = [['Core KPI Metric', 'Volume / Count', 'Operational Status']];
    const kpiBody = [
      ['Total Citizen Complaints', String(data.summary.totalComplaints), 'All submitted reports in period'],
      ['Published to Citizen Feed', String(data.summary.published), 'Publicly broadcast on feed'],
      ['Resolved & Remediated Cases', String(data.summary.resolved), 'Verified and closed'],
      ['Official Responses Issued', String(data.summary.responses), 'Verified department statements'],
      ['Active Civic Categories', String(data.summary.activeCategories), 'Monitored taxonomy nodes'],
    ];

    autoTable(doc, {
      startY,
      head: kpiHeaders,
      body: kpiBody,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [51, 65, 85] },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    // Section 2: Category Breakdown
    if (data.categoryDistribution && data.categoryDistribution.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('CATEGORY & CIVIC DOMAIN DISTRIBUTION', 14, finalY);

      const catHeaders = [['Category Name', 'Volume', 'Share (%)', 'Resolved', 'Pending']];
      const catBody = data.categoryDistribution.map((c) => [
        sanitizeText(c.nameEn),
        String(c.count),
        `${c.percentage}%`,
        String(c.resolvedCount),
        String(c.pendingCount),
      ]);

      autoTable(doc, {
        startY: finalY + 3,
        head: catHeaders,
        body: catBody,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.2, textColor: [51, 65, 85] },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
        },
        margin: { left: 14, right: 14, bottom: 16 },
      });
    }

    attachPdfPageNumbers(doc);
    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Failed to generate Analytics PDF:', error);
    return false;
  }
}

/* ==========================================================================
   6. AUDIT LOGS EXPORT (CSV & PDF)
   ========================================================================== */

export function exportAuditLogsToCsv(logs: AuditLog[], customFilename?: string): boolean {
  const filename = customFilename || `sobaike_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
  const headers = [
    'Audit ID',
    'Timestamp',
    'Module',
    'Action',
    'Entity ID',
    'Entity Type',
    'Description',
    'Description (BN)',
    'Actor Name',
    'Actor Email',
    'Actor Role',
  ];

  const rows = logs.map((l) => [
    l.id,
    l.timestamp,
    l.module,
    l.action,
    l.entityId,
    l.entityType || '',
    l.description,
    l.descriptionBn || '',
    l.actor?.name || '',
    l.actor?.email || '',
    l.actor?.role || '',
  ]);

  return downloadCsv(filename, headers, rows);
}

export function exportAuditLogsToPdf(
  logs: AuditLog[],
  filterSummary?: { module?: string; action?: string; search?: string },
  customFilename?: string
): boolean {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const filename = customFilename || `sobaike_audit_trail_${new Date().toISOString().slice(0, 10)}.pdf`;

    const filterItems: { label: string; value: string }[] = [];
    if (filterSummary?.module && filterSummary.module !== 'all') {
      filterItems.push({ label: 'Module', value: filterSummary.module.toUpperCase() });
    }
    if (filterSummary?.action && filterSummary.action !== 'all') {
      filterItems.push({ label: 'Action', value: filterSummary.action.toUpperCase() });
    }
    if (filterSummary?.search) {
      filterItems.push({ label: 'Search', value: `"${filterSummary.search}"` });
    }

    const startY = setupPdfHeaderAndFooter(
      doc,
      'Administrative Audit Trail & Security Event Log',
      'Official tamper-evident log of administrative triage, publication decisions, and system updates.',
      filterItems,
      logs.length,
      true
    );

    const headers = [
      ['ID', 'Timestamp', 'Module', 'Action', 'Entity ID', 'Event Description', 'Actor / Operator']
    ];

    const body = logs.map((l) => [
      l.id,
      l.timestamp ? new Date(l.timestamp).toLocaleString() : '-',
      l.module.toUpperCase(),
      l.action.toUpperCase(),
      l.entityId,
      sanitizeText(l.description),
      `${sanitizeText(l.actor?.name, 'Operator')}\n(${sanitizeText(l.actor?.role || l.actor?.email || 'Admin')})`,
    ]);

    const tableOptions: UserOptions = {
      startY,
      head: headers,
      body: body,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 35 },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 30 },
        5: { cellWidth: 85 },
        6: { cellWidth: 45 },
      },
      margin: { left: 14, right: 14, bottom: 16 },
    };

    autoTable(doc, tableOptions);
    attachPdfPageNumbers(doc);
    doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Failed to generate Audit Log PDF:', error);
    return false;
  }
}

