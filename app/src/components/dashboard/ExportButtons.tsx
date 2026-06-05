import { Button } from "@/components/ui/Button";
import { FileSpreadsheet, FileText, Download } from "lucide-react";

interface ExportButtonsProps {
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onDownloadScorecard?: () => void;
  onDownloadLeaderboard?: () => void;
  disabled?: boolean;
}

export function ExportButtons({
  onExportExcel,
  onExportPDF,
  onDownloadScorecard,
  onDownloadLeaderboard,
  disabled = false,
}: ExportButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {onExportExcel && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExportExcel}
          disabled={disabled}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          Export Excel
        </Button>
      )}
      {onExportPDF && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPDF}
          disabled={disabled}
          className="gap-2"
        >
          <FileText className="h-4 w-4 text-red-600" />
          Export PDF
        </Button>
      )}
      {onDownloadScorecard && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadScorecard}
          disabled={disabled}
          className="gap-2"
        >
          <Download className="h-4 w-4 text-blue-600" />
          Download Scorecard
        </Button>
      )}
      {onDownloadLeaderboard && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadLeaderboard}
          disabled={disabled}
          className="gap-2"
        >
          <Download className="h-4 w-4 text-purple-600" />
          Download Leaderboard
        </Button>
      )}
    </div>
  );
}
