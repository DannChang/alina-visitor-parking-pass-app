'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, SwitchCamera, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCamera } from '@/hooks/use-camera';
import { cn } from '@/lib/utils';

export interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  isProcessing?: boolean;
  className?: string;
}

/**
 * Camera capture component for license plate scanning
 * Provides inline camera viewfinder with capture controls
 */
export function CameraCapture({ onCapture, isProcessing = false, className }: CameraCaptureProps) {
  const {
    videoRef,
    canvasRef,
    isStreaming,
    isLoading,
    error,
    hasPermission,
    startCamera,
    stopCamera,
    captureImage,
    switchCamera,
  } = useCamera({ facingMode: 'environment' });

  const [captureFlash, setCaptureFlash] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const handleCapture = () => {
    if (isProcessing) return;

    const imageData = captureImage();
    if (imageData) {
      // Visual feedback
      setCaptureFlash(true);
      setTimeout(() => setCaptureFlash(false), 150);

      onCapture(imageData);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Space or Enter to capture
    if ((e.key === ' ' || e.key === 'Enter') && !isProcessing) {
      e.preventDefault();
      handleCapture();
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">
        {/* Camera viewfinder */}
        <div
          ref={containerRef}
          className="relative aspect-[4/3] w-full bg-slate-900"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="application"
          aria-label="Camera viewfinder. Press space or enter to capture."
        >
          {/* Video element */}
          <video
            ref={videoRef as React.RefObject<HTMLVideoElement>}
            className={cn(
              'absolute inset-0 h-full w-full object-cover',
              !isStreaming && 'hidden'
            )}
            playsInline
            muted
            autoPlay
          />

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} className="hidden" />

          {/* Capture flash overlay */}
          {captureFlash && (
            <div className="absolute inset-0 bg-white/80 animate-out fade-out duration-150" />
          )}

          {/* License plate guide overlay */}
          {isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[80%] max-w-[320px] aspect-[2/1]">
                {/* Corner guides */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white/80 rounded-tl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white/80 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white/80 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white/80 rounded-br" />

                {/* Guide text */}
                <div className="absolute -bottom-8 left-0 right-0 text-center">
                  <span className="text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
                    Align license plate within frame
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <span className="text-sm">Processing...</span>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && !isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <span className="text-sm">Starting camera...</span>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Alert variant="destructive" className="max-w-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Permission denied state */}
          {hasPermission === false && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center text-white max-w-sm">
                <CameraOff className="h-12 w-12 mx-auto mb-4 text-red-400" />
                <p className="text-sm mb-4">
                  Camera access is required to scan license plates. Please enable camera permissions in your browser settings.
                </p>
                <Button onClick={startCamera} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Camera off state */}
          {!isStreaming && !isLoading && !error && hasPermission !== false && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Camera className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <Button onClick={startCamera} size="lg">
                  <Camera className="mr-2 h-5 w-5" />
                  Start Camera
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 p-4 bg-slate-100">
          {isStreaming ? (
            <>
              <Button
                variant="outline"
                size="icon-touch"
                onClick={switchCamera}
                disabled={isProcessing}
                aria-label="Switch camera"
              >
                <SwitchCamera className="h-5 w-5" />
              </Button>

              <Button
                size="touch"
                onClick={handleCapture}
                disabled={isProcessing}
                className="px-8 bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-5 w-5" />
                    Scan Plate
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="icon-touch"
                onClick={stopCamera}
                disabled={isProcessing}
                aria-label="Stop camera"
              >
                <CameraOff className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button
              size="touch"
              onClick={startCamera}
              disabled={isLoading}
              className="px-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  Start Camera
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
