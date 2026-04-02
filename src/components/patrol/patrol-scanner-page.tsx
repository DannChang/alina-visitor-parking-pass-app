'use client';

import { useState } from 'react';
import {
  Search,
  WifiOff,
  RotateCcw,
  Keyboard,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CameraCapture } from './camera-capture';
import { ScanResultCard } from './scan-result-card';
import { QuickViolationDialog } from './quick-violation-dialog';
import { VehicleHistoryDialog } from './vehicle-history-dialog';
import { usePatrolScanner } from '@/hooks/use-patrol-scanner';

export function PatrolScannerPage() {
  const {
    scanState,
    ocrResult,
    lookupResult,
    currentImage,
    error,
    isOffline,
    scan,
    reset,
    manualLookup,
  } = usePatrolScanner();

  const [manualPlate, setManualPlate] = useState('');
  const [showViolationDialog, setShowViolationDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);

  const handleCapture = async (imageData: string) => {
    await scan(imageData);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualPlate.trim()) {
      await manualLookup(manualPlate.trim());
    }
  };

  const handleViolationSuccess = () => {
    if (lookupResult?.vehicle?.licensePlate) {
      manualLookup(lookupResult.vehicle.licensePlate);
    }
  };

  const isProcessing = scanState === 'processing' || scanState === 'looking_up';

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Patrol Mode</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Scan plates, verify passes, and issue violations.
          </p>
        </div>
        {isOffline && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <WifiOff className="h-3 w-3" />
            Offline
          </Badge>
        )}
      </div>

      {isOffline && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You&apos;re offline. Using cached data for lookups. Some features may be limited.
          </AlertDescription>
        </Alert>
      )}

      <CameraCapture onCapture={handleCapture} isProcessing={isProcessing} />

      {scanState === 'idle' && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Keyboard className="h-4 w-4" />
                Manual Plate Lookup
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. ABC 1234"
                  value={manualPlate}
                  onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                  className="flex-1 font-mono text-lg tracking-wider h-12"
                />
                <Button
                  type="submit"
                  disabled={!manualPlate.trim() || isProcessing}
                  className="h-12 px-5"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Lookup
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {ocrResult && (
        <Card className="bg-white">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-slate-600">Detected Plate:</span>
                <span className="ml-2 font-mono font-bold text-lg">
                  {ocrResult.licensePlate || 'None'}
                </span>
              </div>
              <div className="text-sm text-slate-500">
                {Math.round(ocrResult.confidence * 100)}% confidence
                {ocrResult.source === 'client' && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Offline OCR
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {scanState === 'processing' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-6 text-center">
            <div className="animate-pulse">
              <span className="text-blue-700 font-medium">Reading license plate...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {scanState === 'looking_up' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-6 text-center">
            <div className="animate-pulse">
              <span className="text-blue-700 font-medium">Looking up vehicle...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {scanState === 'error' && error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {scanState === 'complete' && lookupResult && (
        <ScanResultCard
          result={lookupResult}
          onIssueViolation={() => setShowViolationDialog(true)}
          onViewHistory={() => setShowHistoryDialog(true)}
        />
      )}

      {(scanState === 'complete' || scanState === 'error') && (
        <Button onClick={reset} variant="outline" size="lg" className="w-full">
          <RotateCcw className="h-5 w-5 mr-2" />
          Scan Another Plate
        </Button>
      )}

      {scanState === 'idle' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Quick Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>• Hold camera steady and align plate within the guide</p>
            <p>• Works best in good lighting conditions</p>
            <p>• Use manual entry if OCR fails to read</p>
            <p>• Green = Valid, Red = Violation, Yellow = Expiring</p>
          </CardContent>
        </Card>
      )}

      {lookupResult && (
        <QuickViolationDialog
          open={showViolationDialog}
          onOpenChange={setShowViolationDialog}
          licensePlate={lookupResult.vehicle?.licensePlate || ocrResult?.licensePlate || ''}
          scanImage={currentImage}
          onSuccess={handleViolationSuccess}
        />
      )}

      <VehicleHistoryDialog
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        vehicleId={lookupResult?.vehicle?.id || null}
        licensePlate={lookupResult?.vehicle?.licensePlate || ocrResult?.licensePlate || ''}
      />
    </div>
  );
}
