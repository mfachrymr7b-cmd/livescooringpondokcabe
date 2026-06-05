import { Card, CardContent } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ComponentWrapperProps {
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function ComponentWrapper({
  isLoading = false,
  error = null,
  onRetry,
  children,
}: ComponentWrapperProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="h-8 w-8 text-emerald-300" />
            <p className="text-sm text-emerald-200">Memuat data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex min-h-[200px] items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-red-900/40 p-3">
              <AlertCircle className="h-6 w-6 text-red-300" />
            </div>
            <p className="text-sm font-medium text-white">Terjadi kesalahan</p>
            <p className="text-xs text-emerald-200 max-w-[250px]">{error}</p>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
