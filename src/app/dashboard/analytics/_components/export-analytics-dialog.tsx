'use client';

/**
 * Export Analytics Dialog Component
 *
 * Provides a modal dialog for exporting analytics data in different formats:
 * - PDF: Complete report with all sections
 * - CSV: Workload data for spreadsheet analysis
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { exportAnalyticsToPDF } from '@/lib/export/analytics-pdf';
import { exportAnalyticsToCSV } from '@/lib/export/analytics-csv';
import type {
  OrganizationAnalytics,
  MemberWorkloadDistribution,
  BottleneckMember,
} from '@/types/analytics';

interface ExportAnalyticsDialogProps {
  analytics: OrganizationAnalytics;
  workloadData: MemberWorkloadDistribution[];
  bottlenecks: BottleneckMember[];
}

export function ExportAnalyticsDialog({
  analytics,
  workloadData,
  bottlenecks,
}: ExportAnalyticsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExportPDF = () => {
    try {
      exportAnalyticsToPDF(analytics, workloadData, bottlenecks);
      toast.success('PDF report downloaded successfully');
      setIsOpen(false);
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF report');
    }
  };

  const handleExportCSV = () => {
    try {
      exportAnalyticsToCSV(workloadData);
      toast.success('CSV file downloaded successfully');
      setIsOpen(false);
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV file');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Analytics</DialogTitle>
          <DialogDescription>
            Choose a format to download your analytics report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* PDF Export */}
          <Button
            onClick={handleExportPDF}
            className="w-full justify-start h-auto py-4"
            variant="outline"
          >
            <FileText className="mr-3 h-5 w-5 text-blue-600" />
            <div className="text-left">
              <div className="font-semibold">Download PDF Report</div>
              <div className="text-xs text-muted-foreground">
                Complete analytics report with charts and tables
              </div>
            </div>
          </Button>

          {/* CSV Export */}
          <Button
            onClick={handleExportCSV}
            className="w-full justify-start h-auto py-4"
            variant="outline"
          >
            <FileSpreadsheet className="mr-3 h-5 w-5 text-green-600" />
            <div className="text-left">
              <div className="font-semibold">Download CSV Data</div>
              <div className="text-xs text-muted-foreground">
                Workload distribution data for spreadsheet analysis
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
