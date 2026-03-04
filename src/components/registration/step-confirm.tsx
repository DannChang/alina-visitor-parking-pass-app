'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronLeft, Loader2, Car, Building, Home, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { WizardData, PassResult } from './registration-wizard';

interface StepConfirmProps {
  data: WizardData;
  onBack: () => void;
  onPassCreated: (result: PassResult) => void;
}

export function StepConfirm({ data, onBack, onPassCreated }: StepConfirmProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartParking = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: data.licensePlate,
          unitNumber: data.unitNumber,
          buildingSlug: data.buildingSlug,
          duration: data.duration,
          visitorName: data.visitorName,
          visitorPhone: data.visitorPhone,
          visitorEmail: data.visitorEmail,
          vehicleMake: data.vehicleMake,
          vehicleModel: data.vehicleModel,
          vehicleColor: data.vehicleColor,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        const errorMsg =
          result.errors?.map((e: { message: string }) => e.message).join('. ') ||
          result.error ||
          'Failed to create parking pass';
        setError(errorMsg);
        return;
      }

      onPassCreated({
        id: result.pass.id,
        confirmationCode: result.confirmationCode,
        startTime: result.pass.startTime,
        endTime: result.pass.endTime,
        licensePlate: data.licensePlate,
        unitNumber: data.unitNumber,
        buildingName: data.buildingName,
      });
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Review & Start Parking</CardTitle>
        <CardDescription>Confirm your details before registering</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Building className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Building</p>
              <p className="font-medium">{data.buildingName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Home className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Unit</p>
              <p className="font-medium">{data.unitNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Car className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">License Plate</p>
              <p className="font-medium font-mono">{data.licensePlate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Visitor</p>
              <p className="font-medium">{data.visitorName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-medium">{data.duration} hour{data.duration !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          By registering, you agree to follow all parking rules. Violations may result in citation or towing.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="min-h-[48px]" disabled={isSubmitting}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleStartParking}
            disabled={isSubmitting}
            className="flex-1 min-h-[48px] text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              'Start Parking'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
