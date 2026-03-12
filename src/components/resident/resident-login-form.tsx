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
}

export function ResidentLoginForm({
  showResetSuccess = false,
}: ResidentLoginFormProps) {
  const router = useRouter();
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNumber || !password) {
      setError('Please fill in your unit number and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await signIn('resident-credentials', {
      buildingSlug: APP_CONFIG.resident.defaultBuildingSlug,
      unitNumber,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid credentials. Please check your unit number and password.');
      setIsSubmitting(false);
    } else {
      router.push('/dashboard/passes');
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle>Resident Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {showResetSuccess ? (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>Password Updated</AlertTitle>
              <AlertDescription>
                Your password has been changed. Sign in with your new password.
              </AlertDescription>
            </Alert>
          ) : null}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-lg bg-muted/40 p-3 text-center text-sm text-muted-foreground">
            Building: <span className="font-medium text-foreground">{APP_CONFIG.resident.defaultBuildingName}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitNumber">
              <Home className="h-3 w-3 inline mr-1" />
              Unit Number
            </Label>
            <Input
              id="unitNumber"
              placeholder="e.g. 101"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              className="h-11 text-base"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">
                <Lock className="h-3 w-3 inline mr-1" />
                Password
              </Label>
              <Link
                href="/resident/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 text-base"
            />
          </div>

          <Button type="submit" className="w-full min-h-[48px]" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
