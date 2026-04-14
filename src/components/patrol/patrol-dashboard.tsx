'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  WifiOff,
  RotateCcw,
  Keyboard,
  History,
  Menu,
  Camera,
  LogOut,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CameraCapture } from './camera-capture';
import { ScanResultCard } from './scan-result-card';
import { QuickViolationDialog } from './quick-violation-dialog';
import { VehicleHistoryDialog } from './vehicle-history-dialog';
import { PatrolAddVehicleDialog } from './patrol-add-vehicle-dialog';
import { usePatrolScanner } from '@/hooks/use-patrol-scanner';
import { cn } from '@/lib/utils';
import { NAV_ICONS, type NavItem } from '@/lib/navigation';
import { LocaleSwitcher } from '@/components/locale-switcher';

interface PatrolDashboardProps {
  user: {
    name: string | null | undefined;
    email: string | null | undefined;
    role: string;
  };
  initials: string;
  navItems: NavItem[];
  signOutAction: () => Promise<void>;
}

export function PatrolDashboard({ user, initials, navItems, signOutAction }: PatrolDashboardProps) {
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

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualPlate, setManualPlate] = useState('');
  const [showViolationDialog, setShowViolationDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
  const [addVehiclePlate, setAddVehiclePlate] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCapture = async (imageData: string) => {
    await scan(imageData);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualPlate.trim()) {
      await manualLookup(manualPlate.trim());
      setShowManualEntry(false);
    }
  };

  const openAddVehicleDialog = (licensePlate?: string) => {
    const fallbackPlate =
      licensePlate || lookupResult?.vehicle?.licensePlate || ocrResult?.licensePlate || manualPlate;

    setAddVehiclePlate(fallbackPlate);
    setShowAddVehicleDialog(true);
  };

  const handleIssueViolation = () => {
    setShowViolationDialog(true);
  };

  const handleViewHistory = () => {
    setShowHistoryDialog(true);
  };

  const handleViolationSuccess = () => {
    if (lookupResult?.vehicle?.licensePlate) {
      manualLookup(lookupResult.vehicle.licensePlate);
    }
  };

  const isProcessing =
    scanState === 'processing' || scanState === 'looking_up' || scanState === 'adding';

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="safe-area-inset-top sticky top-0 z-40 border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Hamburger Menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-touch min-w-touch touch-manipulation"
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-[280px] flex-col p-0">
                <SheetHeader className="border-b px-6 py-4">
                  <SheetTitle className="flex items-center justify-start">
                    <Camera className="mr-2 h-6 w-6 text-primary" />
                    Patrol Mode
                  </SheetTitle>
                </SheetHeader>

                <nav className="flex-1 overflow-y-auto p-4">
                  {/* Patrol Mode - current page */}
                  <div className="flex min-h-touch items-center rounded-lg bg-accent px-4 py-3 text-sm font-medium text-accent-foreground">
                    <Camera className="mr-3 h-5 w-5" />
                    Scan Plates
                  </div>

                  <div className="my-2 border-t" />

                  {/* Dashboard navigation */}
                  {navItems.map((item) => {
                    const Icon = NAV_ICONS[item.iconName];
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          'flex min-h-touch touch-manipulation items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                          'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="safe-area-inset border-t p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{user.name || 'User'}</span>
                      <span className="text-xs text-muted-foreground">{user.role}</span>
                    </div>
                  </div>
                  <form action={signOutAction}>
                    <Button
                      variant="outline"
                      className="min-h-touch w-full touch-manipulation"
                      type="submit"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  </form>
                </div>
              </SheetContent>
            </Sheet>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-lg font-bold text-slate-900">Patrol Mode</h1>
              <p className="text-xs text-slate-600">Scan to verify</p>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-1">
              <LocaleSwitcher />
              {isOffline && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <WifiOff className="h-3 w-3" />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowManualEntry(!showManualEntry)}
                aria-label="Toggle manual entry"
              >
                <Keyboard className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Manual Entry */}
          {showManualEntry && (
            <form onSubmit={handleManualSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Enter license plate..."
                value={manualPlate}
                onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" disabled={!manualPlate.trim() || isProcessing}>
                <Search className="mr-2 h-4 w-4" />
                Lookup
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!manualPlate.trim() || isProcessing}
                onClick={() => openAddVehicleDialog(manualPlate)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </form>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto space-y-4 px-4 py-4">
        {/* Offline Warning */}
        {isOffline && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              You&apos;re offline. Using cached data for lookups. Some features may be limited.
            </AlertDescription>
          </Alert>
        )}

        {/* Camera */}
        <CameraCapture onCapture={handleCapture} isProcessing={isProcessing} />

        {/* Manual Plate Entry - always visible in idle state */}
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

        {/* OCR Result Indicator */}
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

        {/* Processing State */}
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

        {/* Error State */}
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

        {/* Result */}
        {scanState === 'complete' && lookupResult && (
          <ScanResultCard
            result={lookupResult}
            onIssueViolation={handleIssueViolation}
            onViewHistory={handleViewHistory}
            onAddVehicle={() => openAddVehicleDialog()}
          />
        )}

        {/* Scan Again Button */}
        {(scanState === 'complete' || scanState === 'error') && (
          <Button onClick={reset} variant="outline" size="lg" className="w-full">
            <RotateCcw className="mr-2 h-5 w-5" />
            Scan Another Plate
          </Button>
        )}

        {/* Quick Tips */}
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
      </main>

      {/* Quick Violation Dialog */}
      {lookupResult && (
        <QuickViolationDialog
          open={showViolationDialog}
          onOpenChange={setShowViolationDialog}
          licensePlate={lookupResult.vehicle?.licensePlate || ocrResult?.licensePlate || ''}
          scanImage={currentImage}
          onSuccess={handleViolationSuccess}
        />
      )}

      {/* Vehicle History Dialog */}
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
