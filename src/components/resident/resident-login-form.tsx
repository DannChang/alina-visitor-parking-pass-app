'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, Building, Home, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BuildingOption {
  id: string;
  name: string;
  slug: string;
}

export function ResidentLoginForm() {
  const router = useRouter();
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [buildingSlug, setBuildingSlug] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buildingSearch, setBuildingSearch] = useState('');

  useEffect(() => {
    if (buildingSearch.length < 2) {
      setBuildings([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/buildings/search?q=${encodeURIComponent(buildingSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setBuildings(data.buildings);
        }
      } catch {
        // Silently fail
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [buildingSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingSlug || !unitNumber || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await signIn('resident-credentials', {
      buildingSlug,
      unitNumber,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid credentials. Please check your building, unit, and password.');
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
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="building">
              <Building className="h-3 w-3 inline mr-1" />
              Building
            </Label>
            <Input
              id="building"
              placeholder="Search for your building..."
              value={buildingSearch}
              onChange={(e) => {
                setBuildingSearch(e.target.value);
                setBuildingSlug('');
              }}
              className="h-11 text-base"
            />
            {buildings.length > 0 && !buildingSlug && (
              <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-1">
                {buildings.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBuildingSlug(b.slug);
                      setBuildingSearch(b.name);
                      setBuildings([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded"
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
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
            <Label htmlFor="password">
              <Lock className="h-3 w-3 inline mr-1" />
              Password
            </Label>
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
