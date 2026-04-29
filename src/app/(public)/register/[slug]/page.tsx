'use client';

import { useState, use } from 'react';
import { useMountEffect } from '@/hooks/use-mount-effect';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Car, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LanguageSwitcherDock } from '@/components/language-switcher-dock';

const registerSchema = z.object({
  licensePlate: z
    .string()
    .min(2, 'License plate must be at least 2 characters')
    .max(10, 'License plate must be at most 10 characters')
    .regex(/^[A-Za-z0-9]+$/, 'License plate can only contain letters and numbers'),
  unitNumber: z.string().min(1, 'Please select a unit'),
  duration: z.number().int().min(1).max(24),
  visitorPhone: z.string().trim().min(1, 'Phone is required').max(20),
  visitorEmail: z.string().trim().email('Invalid email'),
  vehicleMake: z.string().trim().min(1, 'Make is required').max(50),
  vehicleModel: z.string().trim().min(1, 'Model is required').max(50),
  vehicleYear: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  vehicleColor: z.string().max(30).optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface Unit {
  id: string;
  unitNumber: string;
  floor: number | null;
  section: string | null;
}

interface Building {
  id: string;
  name: string;
}

interface PassResponse {
  pass: {
    id: string;
    confirmationCode: string;
    startTime: string;
    endTime: string;
    vehicle: {
      licensePlate: string;
    };
    unit: {
      unitNumber: string;
      building: {
        name: string;
      };
    };
  };
  confirmationCode: string;
  warnings?: Array<{ message: string }>;
}

const DURATION_OPTIONS = [
  { value: 2, label: '2 hours' },
  { value: 4, label: '4 hours' },
  { value: 8, label: '8 hours' },
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
];

export default function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('registration');
  const locale = useLocale();
  const { slug } = use(params);
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [building, setBuilding] = useState<Building | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<PassResponse | null>(null);
  const [buildingNotFound, setBuildingNotFound] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      duration: 2,
    },
  });

  const selectedDuration = watch('duration');

  useMountEffect(() => {
    const fetchUnits = async () => {
      try {
        const response = await fetch(`/api/units?buildingSlug=${slug}`);
        if (response.status === 404) {
          setBuildingNotFound(true);
          return;
        }
        if (!response.ok) {
          throw new Error(t('failedToFetchUnits'));
        }
        const data = await response.json();
        setUnits(data.units);
        setBuilding(data.building);
      } catch (err) {
        setError(t('failedToLoadBuilding'));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnits();
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          buildingSlug: slug,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors && result.errors.length > 0) {
          setError(result.errors.map((e: { message: string }) => e.message).join('. '));
        } else {
          setError(result.error || t('failedToRegisterPass'));
        }
        return;
      }

      setSuccess(result);
    } catch (err) {
      setError(t('unexpectedError'));
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <LanguageSwitcherDock />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (buildingNotFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <LanguageSwitcherDock />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>{t('buildingNotFound')}</CardTitle>
            <CardDescription>{t('buildingNotFoundDesc')}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/')} className="min-h-[48px] w-full">
              {t('goHome')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (success) {
    const endTime = new Date(success.pass.endTime);
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
        <LanguageSwitcherDock />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-success">{t('passRegistered')}</CardTitle>
            <CardDescription>{t('passCreated')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">{t('confirmationCode')}</p>
              <p className="text-2xl font-bold tracking-wider">
                {success.confirmationCode.slice(0, 8).toUpperCase()}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('vehicle')}</span>
                <span className="font-medium">{success.pass.vehicle.licensePlate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('visitingUnit')}</span>
                <span className="font-medium">{success.pass.unit.unitNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('validUntil')}</span>
                <span className="font-medium">
                  {endTime.toLocaleString(locale, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>

            {success.warnings && success.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('note')}</AlertTitle>
                <AlertDescription>
                  {success.warnings.map((w, i) => (
                    <p key={i}>{w.message}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex-col space-y-2">
            <Button
              onClick={() => {
                setSuccess(null);
                setError(null);
              }}
              variant="outline"
              className="min-h-[48px] w-full"
            >
              {t('registerAnotherVehicle')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <LanguageSwitcherDock />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>{t('visitorParkingRegistration')}</CardTitle>
          <CardDescription>{building?.name || t('registerVehicleTemporary')}</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="licensePlate">{t('licensePlate')} *</Label>
              <Input
                id="licensePlate"
                placeholder="ABC1234"
                className="h-11 text-base uppercase md:h-10 md:text-sm"
                disabled={isSubmitting}
                {...register('licensePlate', {
                  setValueAs: (v) => v?.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                })}
              />
              {errors.licensePlate && (
                <p className="text-sm text-destructive">{errors.licensePlate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitNumber">{t('unitVisiting')} *</Label>
              <Select
                onValueChange={(value) => setValue('unitNumber', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-11 md:h-10">
                  <SelectValue placeholder={t('selectUnitPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.unitNumber}>
                      {unit.unitNumber}
                      {unit.floor && ` (${t('floor', { floor: unit.floor })})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unitNumber && (
                <p className="text-sm text-destructive">{errors.unitNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">{t('parkingDuration')} *</Label>
              <div className="grid grid-cols-2 gap-2 xs:grid-cols-3 md:grid-cols-5">
                {DURATION_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selectedDuration === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setValue('duration', option.value)}
                    disabled={isSubmitting}
                    className="min-h-[44px] touch-manipulation text-xs"
                  >
                    {t('durationHoursShort', { count: option.value })}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="visitorPhone">{t('phone')} *</Label>
                <Input
                  id="visitorPhone"
                  type="tel"
                  placeholder="555-123-4567"
                  disabled={isSubmitting}
                  className="h-11 text-base md:h-10 md:text-sm"
                  {...register('visitorPhone')}
                />
                {errors.visitorPhone && (
                  <p className="text-sm text-destructive">{errors.visitorPhone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="visitorEmail">{t('email')} *</Label>
                <Input
                  id="visitorEmail"
                  type="email"
                  placeholder="you@email.com"
                  disabled={isSubmitting}
                  className="h-11 text-base md:h-10 md:text-sm"
                  {...register('visitorEmail')}
                />
                {errors.visitorEmail && (
                  <p className="text-sm text-destructive">{errors.visitorEmail.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleMake">{t('make')} *</Label>
                <Input
                  id="vehicleMake"
                  placeholder="Toyota"
                  disabled={isSubmitting}
                  className="h-11 text-base md:h-10 md:text-sm"
                  {...register('vehicleMake')}
                />
                {errors.vehicleMake && (
                  <p className="text-sm text-destructive">{errors.vehicleMake.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleModel">{t('model')} *</Label>
                <Input
                  id="vehicleModel"
                  placeholder="Camry"
                  disabled={isSubmitting}
                  className="h-11 text-base md:h-10 md:text-sm"
                  {...register('vehicleModel')}
                />
                {errors.vehicleModel && (
                  <p className="text-sm text-destructive">{errors.vehicleModel.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleYear">{t('year')} *</Label>
                <Input
                  id="vehicleYear"
                  placeholder="2024"
                  disabled={isSubmitting}
                  inputMode="numeric"
                  className="h-11 text-base md:h-10 md:text-sm"
                  {...register('vehicleYear', {
                    setValueAs: (value) => (value ? Number(value) : undefined),
                  })}
                />
                {errors.vehicleYear && (
                  <p className="text-sm text-destructive">{errors.vehicleYear.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleColor">{t('color')}</Label>
                <Input
                  id="vehicleColor"
                  placeholder="Blue"
                  disabled={isSubmitting}
                  className="h-11 text-base md:h-10 md:text-sm"
                  {...register('vehicleColor')}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col space-y-4">
            <Button type="submit" className="min-h-[48px] w-full text-base" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('registering')}
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  {t('registerParkingPass')}
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">{t('parkingAgreement')}</p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
