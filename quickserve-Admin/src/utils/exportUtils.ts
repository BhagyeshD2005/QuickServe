import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ServiceRequest, AuditLogItem, DashboardStats } from '../types';

/**
 * Downloads a Blob as a file in the browser
 */
export const downloadFile = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 300);
};

/**
 * Exports data to CSV with UTF-8 BOM
 */
export const exportToCSV = (headers: string[], rows: (string | number | boolean | null | undefined)[][], filename: string) => {
  const escapeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
};

/**
 * Exports data to Excel (.xlsx) file
 */
export const exportToExcel = (
  sheets: { sheetName: string; headers: string[]; rows: (string | number | boolean | null | undefined)[][] }[],
  filename: string
) => {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, headers, rows }) => {
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Calculate column widths
    const colWidths = headers.map((header, colIndex) => {
      let maxLen = header.length;
      rows.forEach((row) => {
        const val = row[colIndex];
        if (val !== undefined && val !== null) {
          maxLen = Math.max(maxLen, String(val).length);
        }
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  });

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

/**
 * Exports Audit Logs to PDF
 */
export const exportAuditLogsToPDF = (logs: AuditLogItem[], adminName: string = 'Admin') => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const timestamp = new Date().toLocaleString();

  // Document header
  doc.setFontSize(18);
  doc.setTextColor(23, 23, 23); // neutral-900
  doc.text('QuickServe — System Audit & Activity Logs', 40, 45);

  doc.setFontSize(10);
  doc.setTextColor(115, 115, 115); // neutral-500
  doc.text(`Generated on: ${timestamp} | Exported by: ${adminName} | Total Records: ${logs.length}`, 40, 65);

  const tableHeaders = ['Timestamp', 'Action / Event', 'Entity & Ref', 'Actor', 'Status Transition', 'Operational Note'];
  const tableRows = logs.map((log) => [
    log.created_at ? new Date(log.created_at).toLocaleString() : '—',
    log.action || 'ACTIVITY',
    `${log.entity_type || 'REQUEST'} ${log.request_number ? `(#${log.request_number})` : ''}`,
    log.actor_name || log.user_name || 'System',
    log.new_status ? `${log.previous_status || 'NONE'} → ${log.new_status}` : '—',
    log.note || log.description || '—',
  ]);

  autoTable(doc, {
    startY: 80,
    head: [tableHeaders],
    body: tableRows,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 6,
      textColor: [38, 38, 38],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [37, 99, 235], // Blue-600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: (data) => {
      // Footer page number
      const pageStr = `Page ${data.pageNumber}`;
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(pageStr, doc.internal.pageSize.width - 70, doc.internal.pageSize.height - 20);
    },
  });

  doc.save(`quickserve-audit-logs-${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Exports Audit Logs to Excel
 */
export const exportAuditLogsToExcel = (logs: AuditLogItem[]) => {
  const headers = [
    'Log ID',
    'Timestamp',
    'Action',
    'Entity Type',
    'Entity ID',
    'Request Number',
    'Actor Name',
    'Previous Status',
    'New Status',
    'Notes / Details',
    'IP Address',
  ];

  const rows = logs.map((l) => [
    l.id,
    l.created_at ? new Date(l.created_at).toISOString() : '',
    l.action || '',
    l.entity_type || '',
    l.entity_id || '',
    l.request_number || '',
    l.actor_name || l.user_name || 'System',
    l.previous_status || '',
    l.new_status || '',
    l.note || l.description || '',
    l.ip_address || '',
  ]);

  exportToExcel(
    [{ sheetName: 'Audit Logs', headers, rows }],
    `quickserve-audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`
  );
};

/**
 * Exports Audit Logs to CSV
 */
export const exportAuditLogsToCSV = (logs: AuditLogItem[]) => {
  const headers = [
    'Log ID',
    'Timestamp',
    'Action',
    'Entity Type',
    'Entity ID',
    'Request Number',
    'Actor Name',
    'Previous Status',
    'New Status',
    'Notes / Details',
  ];

  const rows = logs.map((l) => [
    l.id,
    l.created_at ? new Date(l.created_at).toISOString() : '',
    l.action || '',
    l.entity_type || '',
    l.entity_id || '',
    l.request_number || '',
    l.actor_name || l.user_name || 'System',
    l.previous_status || '',
    l.new_status || '',
    l.note || l.description || '',
  ]);

  exportToCSV(headers, rows, `quickserve-audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Exports Dashboard Executive Report to PDF
 */
export const exportDashboardReportToPDF = (
  stats: DashboardStats,
  requests: ServiceRequest[],
  adminName: string = 'Admin'
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const timestamp = new Date().toLocaleString();
  const total = stats.total_requests || requests.length || 1;

  // Calculate rich operational KPIs
  const fulfillmentRate = ((stats.completed / total) * 100).toFixed(1);
  const backlogRatio = (((stats.pending_requests + stats.in_progress) / total) * 100).toFixed(1);
  const highPriorityCount = stats.high_priority_count ?? requests.filter((r) => r.priority === 'HIGH' || r.priority === 'CRITICAL').length;
  const mediumPriorityCount = stats.medium_priority_count ?? requests.filter((r) => r.priority === 'MEDIUM').length;
  const lowPriorityCount = stats.low_priority_count ?? requests.filter((r) => r.priority === 'LOW').length;

  const agentWorkload = stats.total_agents > 0 ? (total / stats.total_agents).toFixed(1) : '—';
  const customerRatio = stats.total_customers > 0 ? (total / stats.total_customers).toFixed(1) : '—';

  // Header Banner
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, doc.internal.pageSize.width, 75, 'F');

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('QuickServe', 40, 44);

  doc.setFontSize(11);
  doc.setTextColor(224, 231, 255);
  doc.text('Comprehensive Executive Operations & SLA Performance Report', 160, 44);

  // Subheader
  doc.setFontSize(9);
  doc.setTextColor(115, 115, 115);
  doc.text(`Generated: ${timestamp} | Authorized Administrator: ${adminName} | Total Records: ${requests.length}`, 40, 95);

  // Executive KPI Summary Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, 105, doc.internal.pageSize.width - 80, 105, 6, 6, 'FD');

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Key Operational Performance Indicators (KPIs)', 55, 125);

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const col1 = 55;
  const col2 = 215;
  const col3 = 380;

  doc.text(`Total Requests Logged: ${stats.total_requests}`, col1, 145);
  doc.text(`Pending Dispatch Queue: ${stats.pending_requests}`, col1, 163);
  doc.text(`Active In-Progress: ${stats.in_progress}`, col1, 181);
  doc.text(`High / Critical Priority: ${highPriorityCount}`, col1, 199);

  doc.text(`Fulfillments Completed: ${stats.completed}`, col2, 145);
  doc.text(`Terminated / Cancelled: ${stats.cancelled}`, col2, 163);
  doc.text(`Overall Fulfillment Rate: ${fulfillmentRate}%`, col2, 181);
  doc.text(`Active Backlog Ratio: ${backlogRatio}%`, col2, 199);

  doc.text(`Registered Customers: ${stats.total_customers}`, col3, 145);
  doc.text(`Active Certified Agents: ${stats.total_agents}`, col3, 163);
  doc.text(`Technician Workload Index: ${agentWorkload} req/agent`, col3, 181);
  doc.text(`Customer Request Intensity: ${customerRatio} req/cust`, col3, 199);

  // Table 1: Status & Lifecycle Breakdown
  const statusHeaders = ['Lifecycle Stage', 'Count', 'Volume Share (%)', 'Operational Status'];
  const statusRows = [
    ['Pending / In Dispatch Queue', stats.pending_requests, `${((stats.pending_requests / total) * 100).toFixed(1)}%`, 'Awaiting Agent Assignment / Acceptance'],
    ['Active Maintenance (In Progress)', stats.in_progress, `${((stats.in_progress / total) * 100).toFixed(1)}%`, 'Technician On-Site / Working'],
    ['Successfully Completed', stats.completed, `${((stats.completed / total) * 100).toFixed(1)}%`, 'Service Delivered & Verified'],
    ['Cancelled / Terminated', stats.cancelled, `${((stats.cancelled / total) * 100).toFixed(1)}%`, 'Cancelled by Customer or Dispatcher'],
  ];

  autoTable(doc, {
    startY: 225,
    head: [statusHeaders],
    body: statusRows,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
    margin: { left: 40, right: 40 },
  });

  // Table 2: Priority & SLA Risk Profile
  const prioHeaders = ['Priority Classification', 'Volume', 'Distribution (%)', 'SLA Target Window'];
  const prioRows = [
    ['High / Critical', highPriorityCount, `${((highPriorityCount / total) * 100).toFixed(1)}%`, '< 4 Hours (Urgent Resolution)'],
    ['Medium Priority', mediumPriorityCount, `${((mediumPriorityCount / total) * 100).toFixed(1)}%`, '< 24 Hours (Standard Maintenance)'],
    ['Low Priority', lowPriorityCount, `${((lowPriorityCount / total) * 100).toFixed(1)}%`, '< 72 Hours (Routine Servicing)'],
  ];

  const table1Y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 330;

  autoTable(doc, {
    startY: table1Y + 15,
    head: [prioHeaders],
    body: prioRows,
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    margin: { left: 40, right: 40 },
  });

  // Table 3: Recent Operational Request Log
  const table2Y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 440;

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Operational Service Request Catalog (Recent Records)', 40, table2Y + 25);

  const reqHeaders = ['Request #', 'Service', 'Customer', 'Assigned Agent', 'Priority', 'Status', 'Preferred Date'];
  const reqRows = requests.slice(0, 20).map((r) => [
    r.request_number || r.id.substring(0, 8),
    r.service_name || 'Service',
    r.customer_name || 'Customer',
    r.agent_name || 'Unassigned',
    r.priority,
    r.status,
    r.preferred_at ? new Date(r.preferred_at).toLocaleDateString() : '—',
  ]);

  autoTable(doc, {
    startY: table2Y + 35,
    head: [reqHeaders],
    body: reqRows,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 4.5 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(
        `QuickServe Operations • Page ${data.pageNumber}`,
        doc.internal.pageSize.width - 120,
        doc.internal.pageSize.height - 20
      );
    },
  });

  doc.save(`quickserve-comprehensive-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Exports Dashboard Executive Report to Multi-Sheet Excel (.xlsx)
 */
export const exportDashboardReportToExcel = (stats: DashboardStats, requests: ServiceRequest[]) => {
  const total = stats.total_requests || requests.length || 1;
  const fulfillmentRate = `${((stats.completed / total) * 100).toFixed(1)}%`;
  const backlogRatio = `${(((stats.pending_requests + stats.in_progress) / total) * 100).toFixed(1)}%`;
  const highPriorityCount = stats.high_priority_count ?? requests.filter((r) => r.priority === 'HIGH' || r.priority === 'CRITICAL').length;
  const mediumPriorityCount = stats.medium_priority_count ?? requests.filter((r) => r.priority === 'MEDIUM').length;
  const lowPriorityCount = stats.low_priority_count ?? requests.filter((r) => r.priority === 'LOW').length;

  const agentWorkload = stats.total_agents > 0 ? (total / stats.total_agents).toFixed(1) : 'N/A';
  const customerRatio = stats.total_customers > 0 ? (total / stats.total_customers).toFixed(1) : 'N/A';

  // Sheet 1: Executive KPIs & Metrics
  const kpiHeaders = ['Key Performance Indicator', 'Current Value', 'Target SLA / Benchmark', 'Operational Status'];
  const kpiRows = [
    ['Total Service Requests Logged', stats.total_requests, '—', 'Recorded Volume'],
    ['Overall Fulfillment Rate', fulfillmentRate, '>= 85.0%', stats.completed >= total * 0.85 ? 'On Target' : 'Needs Attention'],
    ['Active Backlog Ratio', backlogRatio, '<= 25.0%', (stats.pending_requests + stats.in_progress) <= total * 0.25 ? 'Normal' : 'Elevated Backlog'],
    ['Pending Dispatch Queue', stats.pending_requests, '< 5 in queue', stats.pending_requests < 5 ? 'Healthy' : 'Dispatch Action Needed'],
    ['Active In-Progress Services', stats.in_progress, '—', 'Currently Servicing'],
    ['Successfully Completed Services', stats.completed, '—', 'Delivered'],
    ['Terminated / Cancelled Requests', stats.cancelled, '< 5.0%', 'Resolved'],
    ['Total Registered Customers', stats.total_customers, '—', 'Active Accounts'],
    ['Active Certified Technicians', stats.total_agents, '—', 'Field Force'],
    ['High / Critical Priority Tickets', highPriorityCount, '< 10% of total', 'High SLA Attention'],
    ['Medium Priority Tickets', mediumPriorityCount, '—', 'Standard SLA'],
    ['Low Priority Tickets', lowPriorityCount, '—', 'Routine SLA'],
    ['Technician Workload Index', `${agentWorkload} req/agent`, '<= 8.0 req/agent', 'Workload Balancing'],
    ['Customer Request Intensity', `${customerRatio} req/cust`, '—', 'Engagement Frequency'],
  ];

  // Sheet 2: Status Breakdown
  const statusHeaders = ['Status Name', 'Total Count', 'Volume Share (%)', 'Description'];
  const statusRows = [
    ['CREATED', requests.filter((r) => r.status === 'CREATED').length, `${((requests.filter((r) => r.status === 'CREATED').length / total) * 100).toFixed(1)}%`, 'New request submitted by customer'],
    ['ASSIGNED', requests.filter((r) => r.status === 'ASSIGNED').length, `${((requests.filter((r) => r.status === 'ASSIGNED').length / total) * 100).toFixed(1)}%`, 'Technician dispatched, awaiting acceptance'],
    ['ACCEPTED', requests.filter((r) => r.status === 'ACCEPTED').length, `${((requests.filter((r) => r.status === 'ACCEPTED').length / total) * 100).toFixed(1)}%`, 'Technician accepted dispatch'],
    ['IN_PROGRESS', requests.filter((r) => r.status === 'IN_PROGRESS').length, `${((requests.filter((r) => r.status === 'IN_PROGRESS').length / total) * 100).toFixed(1)}%`, 'Technician actively performing service'],
    ['COMPLETED', requests.filter((r) => r.status === 'COMPLETED').length, `${((requests.filter((r) => r.status === 'COMPLETED').length / total) * 100).toFixed(1)}%`, 'Service completed and verified'],
    ['CANCELLED', requests.filter((r) => r.status === 'CANCELLED').length, `${((requests.filter((r) => r.status === 'CANCELLED').length / total) * 100).toFixed(1)}%`, 'Request cancelled or rejected'],
  ];

  // Sheet 3: Full Request Dataset
  const reqHeaders = [
    'Request #',
    'Service Category',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Assigned Agent',
    'Agent Email',
    'Status',
    'Priority',
    'Service Address',
    'Preferred Date',
    'Created At',
    'Completed At',
  ];

  const reqRows = requests.map((r) => [
    r.request_number || r.id,
    r.service_name || 'General Service',
    r.customer_name || 'Customer',
    r.customer_email || '',
    r.customer_phone || '',
    r.agent_name || 'Unassigned',
    r.agent_email || '',
    r.status,
    r.priority,
    r.address || '',
    r.preferred_at ? new Date(r.preferred_at).toLocaleString() : '',
    r.created_at ? new Date(r.created_at).toLocaleString() : '',
    r.completed_at ? new Date(r.completed_at).toLocaleString() : '',
  ]);

  exportToExcel(
    [
      { sheetName: 'Executive KPI Dashboard', headers: kpiHeaders, rows: kpiRows },
      { sheetName: 'Status & Lifecycle Analysis', headers: statusHeaders, rows: statusRows },
      { sheetName: 'Master Requests Dataset', headers: reqHeaders, rows: reqRows },
    ],
    `quickserve-executive-report-${new Date().toISOString().split('T')[0]}.xlsx`
  );
};

/**
 * Exports Dashboard Executive Report to CSV
 */
export const exportDashboardReportToCSV = (stats: DashboardStats, requests: ServiceRequest[]) => {
  const headers = [
    'Request #',
    'Service Category',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Assigned Agent',
    'Status',
    'Priority',
    'Service Address',
    'Preferred Date',
    'Created At',
    'Completed At',
  ];

  const rows = requests.map((r) => [
    r.request_number || r.id,
    r.service_name || 'General Service',
    r.customer_name || 'Customer',
    r.customer_email || '',
    r.customer_phone || '',
    r.agent_name || 'Unassigned',
    r.status,
    r.priority,
    r.address || '',
    r.preferred_at ? new Date(r.preferred_at).toISOString() : '',
    r.created_at ? new Date(r.created_at).toISOString() : '',
    r.completed_at ? new Date(r.completed_at).toISOString() : '',
  ]);

  exportToCSV(headers, rows, `quickserve-service-requests-${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Exports Service Requests catalog to PDF
 */
export const exportRequestsToPDF = (requests: ServiceRequest[], adminName: string = 'Admin') => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const timestamp = new Date().toLocaleString();

  doc.setFontSize(18);
  doc.setTextColor(23, 23, 23);
  doc.text('QuickServe — Service Requests Catalog', 40, 45);

  doc.setFontSize(10);
  doc.setTextColor(115, 115, 115);
  doc.text(`Generated on: ${timestamp} | Exported by: ${adminName} | Total Records: ${requests.length}`, 40, 65);

  const headers = ['Request #', 'Service', 'Customer', 'Phone', 'Assigned Agent', 'Status', 'Priority', 'Preferred Time'];
  const rows = requests.map((r) => [
    r.request_number || r.id.substring(0, 8),
    r.service_name || 'General',
    r.customer_name || 'Customer',
    r.customer_phone || '—',
    r.agent_name || 'Unassigned',
    r.status,
    r.priority,
    r.preferred_at ? new Date(r.preferred_at).toLocaleDateString() : '—',
  ]);

  autoTable(doc, {
    startY: 80,
    head: [headers],
    body: rows,
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 60, doc.internal.pageSize.height - 20);
    },
  });

  doc.save(`quickserve-requests-catalog-${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Exports Service Requests catalog to Excel (.xlsx)
 */
export const exportRequestsToExcel = (requests: ServiceRequest[]) => {
  const headers = [
    'Request Number',
    'Service',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Assigned Agent',
    'Status',
    'Priority',
    'Service Address',
    'Preferred Date',
    'Created At',
  ];

  const rows = requests.map((r) => [
    r.request_number || r.id,
    r.service_name || '',
    r.customer_name || '',
    r.customer_email || '',
    r.customer_phone || '',
    r.agent_name || 'Unassigned',
    r.status,
    r.priority,
    r.address || '',
    r.preferred_at ? new Date(r.preferred_at).toISOString() : '',
    r.created_at ? new Date(r.created_at).toISOString() : '',
  ]);

  exportToExcel([{ sheetName: 'Service Requests', headers, rows }], `quickserve-requests-${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Exports Service Requests catalog to CSV
 */
export const exportRequestsToCSV = (requests: ServiceRequest[]) => {
  const headers = [
    'Request Number',
    'Service',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'Assigned Agent',
    'Status',
    'Priority',
    'Service Address',
    'Preferred Date',
    'Created At',
  ];

  const rows = requests.map((r) => [
    r.request_number || r.id,
    r.service_name || '',
    r.customer_name || '',
    r.customer_email || '',
    r.customer_phone || '',
    r.agent_name || 'Unassigned',
    r.status,
    r.priority,
    r.address || '',
    r.preferred_at ? new Date(r.preferred_at).toISOString() : '',
    r.created_at ? new Date(r.created_at).toISOString() : '',
  ]);

  exportToCSV(headers, rows, `quickserve-requests-${new Date().toISOString().split('T')[0]}.csv`);
};
