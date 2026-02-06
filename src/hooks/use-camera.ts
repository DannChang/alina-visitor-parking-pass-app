'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureImage: () => string | null;
  switchCamera: () => Promise<void>;
}

/**
 * Custom hook for camera access and image capture
 * Handles permissions, streaming, and capture operations
 */
export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { facingMode = 'environment', width = 1280, height = 720 } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(facingMode);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      // Stop existing stream if any
      stopCamera();

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: currentFacingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';

      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        setHasPermission(false);
        setError('Camera permission denied. Please allow camera access to scan license plates.');
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('DevicesNotFoundError')) {
        setError('No camera found on this device.');
      } else {
        setError(errorMessage);
      }

      setIsStreaming(false);
    } finally {
      setIsLoading(false);
    }
  }, [currentFacingMode, width, height, stopCamera]);

  const switchCamera = useCallback(async () => {
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    setCurrentFacingMode(newFacingMode);

    if (isStreaming) {
      stopCamera();
      // Small delay to ensure the stream is fully stopped
      await new Promise((resolve) => setTimeout(resolve, 100));
      await startCamera();
    }
  }, [currentFacingMode, isStreaming, stopCamera, startCamera]);

  const captureImage = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      return null;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Return as base64 data URL (JPEG for smaller size)
    return canvas.toDataURL('image/jpeg', 0.9);
  }, [isStreaming]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
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
  };
}
