'use client';

import { useState, useCallback } from 'react';
import { StepBuildingSearch } from './step-building-search';
import { StepSuiteSelect } from './step-suite-select';
import { StepVehicleInfo } from './step-vehicle-info';
import { StepContactInfo } from './step-contact-info';
import { StepAccessCode } from './step-access-code';
import { StepConfirm } from './step-confirm';
import { PassActiveView } from './pass-active-view';
import { cn } from '@/lib/utils';

export interface WizardData {
  // Building
  buildingId: string;
  buildingName: string;
  buildingSlug: string;
  // Unit
  unitId: string;
  unitNumber: string;
  hasAccessCode: boolean;
  // Vehicle
  licensePlate: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  // Contact
  visitorName: string;
  visitorPhone?: string;
  visitorEmail?: string;
  // Duration
  duration: number;
  // Access code (verified)
  accessCodeVerified: boolean;
}

export interface PassResult {
  id: string;
  confirmationCode: string;
  startTime: string;
  endTime: string;
  licensePlate: string;
  unitNumber: string;
  buildingName: string;
}

interface RegistrationWizardProps {
  // Pre-populate building from slug (QR code flow)
  initialBuildingId?: string;
  initialBuildingName?: string;
  initialBuildingSlug?: string;
}

const STEPS = [
  'building',
  'suite',
  'vehicle',
  'contact',
  'access-code',
  'confirm',
] as const;
type Step = (typeof STEPS)[number];

export function RegistrationWizard({
  initialBuildingId,
  initialBuildingName,
  initialBuildingSlug,
}: RegistrationWizardProps) {
  const skipBuildingSearch = !!(initialBuildingId && initialBuildingName && initialBuildingSlug);

  const [currentStep, setCurrentStep] = useState<Step>(
    skipBuildingSearch ? 'suite' : 'building'
  );
  const [passResult, setPassResult] = useState<PassResult | null>(null);
  const [wizardData, setWizardData] = useState<Partial<WizardData>>({
    buildingId: initialBuildingId || '',
    buildingName: initialBuildingName || '',
    buildingSlug: initialBuildingSlug || '',
    duration: 2,
    accessCodeVerified: false,
  });

  const updateData = useCallback(
    (updates: Partial<WizardData>) => {
      setWizardData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const goToStep = useCallback((step: Step) => {
    setCurrentStep(step);
  }, []);

  const handleBack = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      let prevStep = STEPS[currentIndex - 1]!;
      // Skip building step if pre-populated
      if (prevStep === 'building' && skipBuildingSearch) return;
      // Skip access code step if not needed
      if (prevStep === 'access-code' && !wizardData.hasAccessCode) {
        prevStep = STEPS[currentIndex - 2]!;
      }
      setCurrentStep(prevStep);
    }
  }, [currentStep, skipBuildingSearch, wizardData.hasAccessCode]);

  const handlePassCreated = useCallback((result: PassResult) => {
    setPassResult(result);
  }, []);

  const handleReset = useCallback(() => {
    setPassResult(null);
    setWizardData({
      buildingId: initialBuildingId || '',
      buildingName: initialBuildingName || '',
      buildingSlug: initialBuildingSlug || '',
      duration: 2,
      accessCodeVerified: false,
    });
    setCurrentStep(skipBuildingSearch ? 'suite' : 'building');
  }, [initialBuildingId, initialBuildingName, initialBuildingSlug, skipBuildingSearch]);

  if (passResult) {
    return <PassActiveView pass={passResult} onReset={handleReset} />;
  }

  // Determine visible step index (for progress indicator)
  const visibleSteps = STEPS.filter((s) => {
    if (s === 'building' && skipBuildingSearch) return false;
    if (s === 'access-code' && !wizardData.hasAccessCode) return false;
    return true;
  });
  const currentVisibleIndex = visibleSteps.indexOf(currentStep);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {visibleSteps.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === currentVisibleIndex
                ? 'w-8 bg-primary'
                : i < currentVisibleIndex
                  ? 'w-2 bg-primary/60'
                  : 'w-2 bg-slate-200'
            )}
          />
        ))}
      </div>

      {/* Steps */}
      {currentStep === 'building' && (
        <StepBuildingSearch
          data={wizardData}
          onUpdate={updateData}
          onNext={() => goToStep('suite')}
        />
      )}
      {currentStep === 'suite' && (
        <StepSuiteSelect
          data={wizardData}
          onUpdate={updateData}
          onNext={() => goToStep('vehicle')}
          onBack={handleBack}
        />
      )}
      {currentStep === 'vehicle' && (
        <StepVehicleInfo
          data={wizardData}
          onUpdate={updateData}
          onNext={() => goToStep('contact')}
          onBack={handleBack}
        />
      )}
      {currentStep === 'contact' && (
        <StepContactInfo
          data={wizardData}
          onUpdate={updateData}
          onNext={() => {
            if (wizardData.hasAccessCode) {
              goToStep('access-code');
            } else {
              goToStep('confirm');
            }
          }}
          onBack={handleBack}
        />
      )}
      {currentStep === 'access-code' && (
        <StepAccessCode
          data={wizardData}
          onUpdate={updateData}
          onNext={() => goToStep('confirm')}
          onBack={handleBack}
        />
      )}
      {currentStep === 'confirm' && (
        <StepConfirm
          data={wizardData as WizardData}
          onBack={handleBack}
          onPassCreated={handlePassCreated}
        />
      )}
    </div>
  );
}
