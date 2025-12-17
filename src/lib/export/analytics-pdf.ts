/**
 * Analytics PDF Export
 *
 * Generates PDF reports for RACI analytics using jsPDF and jspdf-autotable.
 * Includes:
 * - Report title and generation date
 * - KPI metrics table
 * - Workload distribution table (members × RACI roles)
 * - Bottleneck list (if any)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  OrganizationAnalytics,
  MemberWorkloadDistribution,
  BottleneckMember,
} from '@/types/analytics';

export function exportAnalyticsToPDF(
  analytics: OrganizationAnalytics,
  workloadData: MemberWorkloadDistribution[],
  bottlenecks: BottleneckMember[]
) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.text('RACI Analytics Report', 14, 20);

  // Date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 28);
  doc.setTextColor(0);

  // KPI Summary Section
  doc.setFontSize(14);
  doc.text('Key Metrics', 14, 40);

  const metricsTable = [
    ['Total Tasks', analytics.totalTasks.toString()],
    ['Completion Rate', `${analytics.completionRate}%`],
    ['Active Members', analytics.totalMembers.toString()],
    ['Total Matrices', analytics.totalMatrices.toString()],
    ['Overloaded Members', analytics.overloadedMembers.toString()],
  ];

  autoTable(doc, {
    startY: 45,
    head: [['Metric', 'Value']],
    body: metricsTable,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }, // Blue
    styles: { fontSize: 10 },
  });

  // Assignment Distribution Section
  const yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text('Assignment Distribution', 14, yPos);

  const distributionTable = [
    ['Responsible (R)', analytics.assignmentDistribution.RESPONSIBLE.toString()],
    ['Accountable (A)', analytics.assignmentDistribution.ACCOUNTABLE.toString()],
    ['Consulted (C)', analytics.assignmentDistribution.CONSULTED.toString()],
    ['Informed (I)', analytics.assignmentDistribution.INFORMED.toString()],
  ];

  autoTable(doc, {
    startY: yPos + 5,
    head: [['RACI Role', 'Count']],
    body: distributionTable,
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94] }, // Green
    styles: { fontSize: 10 },
  });

  // Workload Distribution Table (new page)
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Workload Distribution by Member', 14, 20);

  const workloadTable = workloadData.map((m) => [
    m.memberName,
    m.responsible.toString(),
    m.accountable.toString(),
    m.consulted.toString(),
    m.informed.toString(),
    (m.responsible + m.accountable + m.consulted + m.informed).toString(),
    `${m.totalWorkload.toFixed(0)}%`,
  ]);

  autoTable(doc, {
    startY: 25,
    head: [['Member', 'R', 'A', 'C', 'I', 'Total', 'Workload']],
    body: workloadTable,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 25, halign: 'center' },
    },
  });

  // Bottlenecks (if any)
  if (bottlenecks.length > 0) {
    const bottleneckYPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    // Check if we need a new page
    if (bottleneckYPos > 250) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Overloaded Members', 14, 20);

      const bottleneckTable = bottlenecks.map((m) => [
        m.memberName,
        m.jobTitle || 'N/A',
        m.totalAssignments.toString(),
        `${m.workloadPercentage.toFixed(0)}%`,
        m.criticalAssignments.toString(),
      ]);

      autoTable(doc, {
        startY: 25,
        head: [['Member', 'Job Title', 'Assignments', 'Workload', 'Critical']],
        body: bottleneckTable,
        theme: 'grid',
        headStyles: { fillColor: [251, 146, 60] }, // Orange
        styles: { fontSize: 9 },
      });
    } else {
      doc.setFontSize(14);
      doc.text('Overloaded Members', 14, bottleneckYPos);

      const bottleneckTable = bottlenecks.map((m) => [
        m.memberName,
        m.jobTitle || 'N/A',
        m.totalAssignments.toString(),
        `${m.workloadPercentage.toFixed(0)}%`,
        m.criticalAssignments.toString(),
      ]);

      autoTable(doc, {
        startY: bottleneckYPos + 5,
        head: [['Member', 'Job Title', 'Assignments', 'Workload', 'Critical']],
        body: bottleneckTable,
        theme: 'grid',
        headStyles: { fillColor: [251, 146, 60] },
        styles: { fontSize: 9 },
      });
    }
  }

  // Save the PDF
  doc.save(`raci-analytics-${Date.now()}.pdf`);
}
