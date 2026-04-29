'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
import { Search, Building, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { WizardData } from './registration-wizard';

interface BuildingResult {
  id: string;
  name: string;
  slug: string;
  address: string;
}

interface StepBuildingSearchProps {
  data: Partial<WizardData>;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
}

export function StepBuildingSearch({ onUpdate, onNext }: StepBuildingSearchProps) {
  const t = useTranslations('registration');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BuildingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  useFetchOnChange(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const fetchBuildings = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/buildings/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.buildings);
        }
      } catch {
        // Silently fail, user can retry
      } finally {
        setIsSearching(false);
      }
    };
    fetchBuildings();
  }, [debouncedQuery]);

  const handleSelect = (building: BuildingResult) => {
    onUpdate({
      buildingId: building.id,
      buildingName: building.name,
      buildingSlug: building.slug,
    });
    onNext();
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Building className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{t('findBuilding')}</CardTitle>
        <CardDescription>{t('buildingSearchDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchBuildingName')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-9 text-base"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {results.length > 0 && (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {results.map((building) => (
              <button
                key={building.id}
                onClick={() => handleSelect(building)}
                className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent"
              >
                <p className="font-medium">{building.name}</p>
                <p className="text-sm text-muted-foreground">{building.address}</p>
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && !isSearching && results.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('noBuildingsFound')}</p>
        )}
      </CardContent>
    </Card>
  );
}
