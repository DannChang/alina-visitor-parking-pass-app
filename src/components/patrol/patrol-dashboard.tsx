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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CameraCapture } from './camera-capture';
import { ScanResultCard } from './scan-result-card';
import { QuickViolationDialog } from './quick-violation-dialog';
import { usePatrolScanner } from '@/hooks/use-patrol-scanner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NAV_ICONS, type NavItem } from '@/lib/navigation';

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

export function PatrolDashboard({
  user,
  initials,
  navItems,
  signOutAction,
}: PatrolDashboardProps) {
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

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualPlate, setManualPlate] = useState('');
  const [showViolationDialog, setShowViolationDialog] = useState(false);
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

  const handleIssueViolation = () => {
    setShowViolationDialog(true);
  };

  const handleViewHistory = () => {
    toast.info('History view coming soon');
  };

  const handleViolationSuccess = () => {
    if (lookupResult?.vehicle?.licensePlate) {
      manualLookup(lookupResult.vehicle.licensePlate);
    }
  };

  const isProcessing = scanState === 'processing' || scanState === 'looking_up';

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm safe-area-inset-top">
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
              <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
                <SheetHeader className="border-b px-6 py-4">
                  <SheetTitle className="flex items-center justify-start">
                    <Camera className="mr-2 h-6 w-6 text-primary" />
                    Patrol Mode
                  </SheetTitle>
                </SheetHeader>

                <nav className="flex-1 overflow-y-auto p-4">
                  {/* Patrol Mode - current page */}
                  <div className="flex items-center rounded-lg px-4 py-3 text-sm font-medium bg-accent text-accent-foreground min-h-touch">
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
                          'flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-touch touch-manipulation',
                          'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="border-t p-4 safe-area-inset">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium text-sm truncate">
                        {user.name || 'User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <form action={signOutAction}>
                    <Button
                      variant="outline"
                      className="w-full min-h-touch touch-manipulation"
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
            <form onSubmit={handleManualSubmit} className="mt-3 flex gap-2">
              <Input
                placeholder="Enter license plate..."
                value={manualPlate}
                onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" disabled={!manualPlate.trim() || isProcessing}>
                <Search className="h-4 w-4 mr-2" />
                Lookup
              </Button>
            </form>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 space-y-4">
        {/* Offline Warning */}
        {isOffline && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              You&apos;re offline. Using cached data for lookups. Some features may be limited.
            </AlertDescription>
          </Alert>
        )}

        {/* Camera */}
        <CameraCapture onCapture={handleCapture} isProcessing={isProcessing} />

        {/* OCR Result Indicator */}
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

        {/* Processing State */}
        {scanState === 'processing' && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-6 text-center">
              <div className="animate-pulse">
                <span className="text-blue-700 font-medium">
                  Reading license plate...
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {scanState === 'looking_up' && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-6 text-center">
              <div className="animate-pulse">
                <span className="text-blue-700 font-medium">
                  Looking up vehicle...
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
                <RotateCcw className="h-4 w-4 mr-1" />
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
          />
        )}

        {/* Scan Again Button */}
        {(scanState === 'complete' || scanState === 'error') && (
          <Button onClick={reset} variant="outline" size="lg" className="w-full">
            <RotateCcw className="h-5 w-5 mr-2" />
            Scan Another Plate
          </Button>
        )}

        {/* Quick Tips */}
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
    </div>
  );
}
