'use client';

import { useState } from 'react';
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
        <CardTitle>Find Your Building</CardTitle>
        <CardDescription>Search for the building you&apos;re visiting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by building name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-12 text-base"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((building) => (
              <button
                key={building.id}
                onClick={() => handleSelect(building)}
                className="w-full text-left rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <p className="font-medium">{building.name}</p>
                <p className="text-sm text-muted-foreground">{building.address}</p>
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && !isSearching && results.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No buildings found. Try a different search.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
