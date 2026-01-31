'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
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

const registerSchema = z.object({
  licensePlate: z
    .string()
    .min(2, 'License plate must be at least 2 characters')
    .max(10, 'License plate must be at most 10 characters')
    .regex(/^[A-Za-z0-9]+$/, 'License plate can only contain letters and numbers'),
  unitNumber: z.string().min(1, 'Please select a unit'),
  duration: z.number().int().min(1).max(24),
  visitorName: z.string().min(1, 'Name is required').max(100),
  visitorPhone: z.string().max(20).optional(),
  visitorEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  vehicleMake: z.string().max(50).optional(),
  vehicleModel: z.string().max(50).optional(),
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

export default function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const response = await fetch(`/api/units?buildingSlug=${slug}`);
        if (response.status === 404) {
          setBuildingNotFound(true);
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to fetch units');
        }
        const data = await response.json();
        setUnits(data.units);
        setBuilding(data.building);
      } catch (err) {
        setError('Failed to load building information. Please try again.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnits();
  }, [slug]);

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
          visitorEmail: data.visitorEmail || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors && result.errors.length > 0) {
          setError(result.errors.map((e: { message: string }) => e.message).join('. '));
        } else {
          setError(result.error || 'Failed to register parking pass');
        }
        return;
      }

      setSuccess(result);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (buildingNotFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Building Not Found</CardTitle>
            <CardDescription>
              The parking registration link you used is invalid or the building is no longer
              active.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/')} className="w-full">
              Go Home
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
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-success">Pass Registered!</CardTitle>
            <CardDescription>Your visitor parking pass has been created</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Confirmation Code</p>
              <p className="text-2xl font-bold tracking-wider">
                {success.confirmationCode.slice(0, 8).toUpperCase()}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vehicle</span>
                <span className="font-medium">{success.pass.vehicle.licensePlate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visiting Unit</span>
                <span className="font-medium">{success.pass.unit.unitNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valid Until</span>
                <span className="font-medium">
                  {endTime.toLocaleString('en-US', {
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
                <AlertTitle>Note</AlertTitle>
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
              className="w-full"
            >
              Register Another Vehicle
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Car className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Visitor Parking Registration</CardTitle>
          <CardDescription>
            {building?.name || 'Register your vehicle for temporary parking'}
          </CardDescription>
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
              <Label htmlFor="visitorName">Your Name *</Label>
              <Input
                id="visitorName"
                placeholder="John Smith"
                disabled={isSubmitting}
                {...register('visitorName')}
              />
              {errors.visitorName && (
                <p className="text-sm text-destructive">{errors.visitorName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="licensePlate">License Plate *</Label>
              <Input
                id="licensePlate"
                placeholder="ABC1234"
                className="uppercase"
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
              <Label htmlFor="unitNumber">Unit You&apos;re Visiting *</Label>
              <Select
                onValueChange={(value) => setValue('unitNumber', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.unitNumber}>
                      {unit.unitNumber}
                      {unit.floor && ` (Floor ${unit.floor})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unitNumber && (
                <p className="text-sm text-destructive">{errors.unitNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Parking Duration *</Label>
              <div className="grid grid-cols-5 gap-2">
                {DURATION_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={selectedDuration === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setValue('duration', option.value)}
                    disabled={isSubmitting}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visitorPhone">Phone (optional)</Label>
                <Input
                  id="visitorPhone"
                  type="tel"
                  placeholder="555-123-4567"
                  disabled={isSubmitting}
                  {...register('visitorPhone')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visitorEmail">Email (optional)</Label>
                <Input
                  id="visitorEmail"
                  type="email"
                  placeholder="you@email.com"
                  disabled={isSubmitting}
                  {...register('visitorEmail')}
                />
                {errors.visitorEmail && (
                  <p className="text-sm text-destructive">{errors.visitorEmail.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="vehicleMake">Make</Label>
                <Input
                  id="vehicleMake"
                  placeholder="Toyota"
                  disabled={isSubmitting}
                  {...register('vehicleMake')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleModel">Model</Label>
                <Input
                  id="vehicleModel"
                  placeholder="Camry"
                  disabled={isSubmitting}
                  {...register('vehicleModel')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleColor">Color</Label>
                <Input
                  id="vehicleColor"
                  placeholder="Blue"
                  disabled={isSubmitting}
                  {...register('vehicleColor')}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Register Parking Pass
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By registering, you agree to follow all parking rules and regulations.
              Violations may result in citation or towing.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
