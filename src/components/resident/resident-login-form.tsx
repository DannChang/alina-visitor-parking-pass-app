'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, Home, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { APP_CONFIG } from '@/lib/constants';

interface ResidentLoginFormProps {
  showResetSuccess?: boolean;
  callbackUrl?: string;
  labels: {
    login: string;
    passwordUpdatedTitle: string;
    passwordUpdatedDescription: string;
    building: string;
    unitNumber: string;
    unitNumberPlaceholder: string;
    password: string;
    forgotPassword: string;
    passwordPlaceholder: string;
    signingIn: string;
    signIn: string;
    loginMissingFields: string;
    invalidResidentCredentials: string;
    unexpectedError: string;
  };
}

export function ResidentLoginForm({
  showResetSuccess = false,
  callbackUrl = '/resident/passes',
  labels,
}: ResidentLoginFormProps) {
  const router = useRouter();
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNumber || !password) {
      setError(labels.loginMissingFields);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await signIn('resident-credentials', {
        buildingSlug: APP_CONFIG.resident.defaultBuildingSlug,
        unitNumber,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError(labels.invalidResidentCredentials);
        return;
      }

      const destination = result?.url ?? callbackUrl;
      router.replace(destination);
      router.refresh();
    } catch {
      setError(labels.unexpectedError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>{labels.login}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {showResetSuccess ? (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>{labels.passwordUpdatedTitle}</AlertTitle>
              <AlertDescription>{labels.passwordUpdatedDescription}</AlertDescription>
            </Alert>
          ) : null}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg bg-muted/40 p-3 text-center text-sm text-muted-foreground">
            {labels.building}:{' '}
            <span className="font-medium text-foreground">
              {APP_CONFIG.resident.defaultBuildingName}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitNumber">
              <Home className="mr-1 inline h-3 w-3" />
              {labels.unitNumber}
            </Label>
            <Input
              id="unitNumber"
              placeholder={labels.unitNumberPlaceholder}
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              className="h-11 text-base"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">
                <Lock className="mr-1 inline h-3 w-3" />
                {labels.password}
              </Label>
              <Link
                href="/resident/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                {labels.forgotPassword}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder={labels.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 text-base"
            />
          </div>

          <Button type="submit" className="min-h-[48px] w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {labels.signingIn}
              </>
            ) : (
              labels.signIn
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
