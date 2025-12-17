/**
 * Analytics CSV Export
 *
 * Generates CSV files for RACI analytics data.
 * Includes workload distribution with all RACI role counts per member.
 */

import type { MemberWorkloadDistribution } from '@/types/analytics';

export function exportAnalyticsToCSV(workloadData: MemberWorkloadDistribution[]) {
  // Define CSV headers
  const headers = [
    'Member Name',
    'Job Title',
    'Responsible (R)',
    'Accountable (A)',
    'Consulted (C)',
    'Informed (I)',
    'Total Assignments',
    'Workload %',
    'Active Tasks',
  ];

  // Create rows from workload data
  const rows = workloadData.map((m) => [
    `"${m.memberName.replace(/"/g, '""')}"`, // Escape quotes
    `"${m.jobTitle?.replace(/"/g, '""') || 'N/A'}"`,
    m.responsible,
    m.accountable,
    m.consulted,
    m.informed,
    m.responsible + m.accountable + m.consulted + m.informed,
    m.totalWorkload.toFixed(1),
    m.activeTaskCount,
  ]);

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = `raci-analytics-${Date.now()}.csv`;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
