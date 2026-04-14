'use client';

import { useState } from 'react';
import { Search, WifiOff, RotateCcw, Keyboard, History, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CameraCapture } from './camera-capture';
import { ScanResultCard } from './scan-result-card';
import { QuickViolationDialog } from './quick-violation-dialog';
import { VehicleHistoryDialog } from './vehicle-history-dialog';
import { PatrolAddVehicleDialog } from './patrol-add-vehicle-dialog';
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
    manualAddVehicle,
  } = usePatrolScanner();

  const [manualPlate, setManualPlate] = useState('');
  const [showViolationDialog, setShowViolationDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
  const [addVehiclePlate, setAddVehiclePlate] = useState('');

  const handleCapture = async (imageData: string) => {
    await scan(imageData);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualPlate.trim()) {
      await manualLookup(manualPlate.trim());
    }
  };

  const openAddVehicleDialog = (licensePlate?: string) => {
    const fallbackPlate =
      licensePlate || lookupResult?.vehicle?.licensePlate || ocrResult?.licensePlate || manualPlate;

    setAddVehiclePlate(fallbackPlate);
    setShowAddVehicleDialog(true);
  };

  const handleViolationSuccess = () => {
    if (lookupResult?.vehicle?.licensePlate) {
      manualLookup(lookupResult.vehicle.licensePlate);
    }
  };

  const isProcessing =
    scanState === 'processing' || scanState === 'looking_up' || scanState === 'adding';

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Patrol Mode</h1>
          <p className="text-sm text-muted-foreground md:text-base">
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
        <Alert className="border-yellow-200 bg-yellow-50">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You&apos;re offline. Using cached data for lookups. Some features may be limited.
          </AlertDescription>
        </Alert>
      )}

      <CameraCapture onCapture={handleCapture} isProcessing={isProcessing} />

      {scanState === 'idle' && (
        <Card>
          <CardContent className="pb-4 pt-5">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Keyboard className="h-4 w-4" />
                Manual Plate Lookup
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="e.g. ABC 1234"
                  value={manualPlate}
                  onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                  className="h-12 flex-1 font-mono text-lg tracking-wider"
                />
                <Button
                  type="submit"
                  disabled={!manualPlate.trim() || isProcessing}
                  className="h-12 px-5"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Lookup
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!manualPlate.trim() || isProcessing}
                  className="h-12 px-5"
                  onClick={() => openAddVehicleDialog(manualPlate)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
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
                <span className="ml-2 font-mono text-lg font-bold">
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
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6 text-center">
            <div className="animate-pulse">
              <span className="font-medium text-blue-700">Reading license plate...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {scanState === 'looking_up' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6 text-center">
            <div className="animate-pulse">
              <span className="font-medium text-blue-700">Looking up vehicle...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {scanState === 'adding' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6 text-center">
            <div className="animate-pulse">
              <span className="font-medium text-blue-700">
                Adding vehicle and refreshing patrol lookup...
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {scanState === 'error' && error && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="mr-1 h-4 w-4" />
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
          onAddVehicle={() => openAddVehicleDialog()}
        />
      )}

      {(scanState === 'complete' || scanState === 'error') && (
        <Button onClick={reset} variant="outline" size="lg" className="w-full">
          <RotateCcw className="mr-2 h-5 w-5" />
          Scan Another Plate
        </Button>
      )}

      {scanState === 'idle' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" />
              Quick Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
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

      <PatrolAddVehicleDialog
        open={showAddVehicleDialog}
        onOpenChange={setShowAddVehicleDialog}
        initialLicensePlate={addVehiclePlate}
        onSubmit={manualAddVehicle}
      />
    </div>
  );
}
