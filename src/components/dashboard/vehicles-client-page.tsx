'use client';

import { useCallback, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
import { AlertTriangle, Car, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { handleClickableRowKeyDown } from '@/components/dashboard/clickable-row';
import { VehicleHistoryDialog } from '@/components/patrol/vehicle-history-dialog';

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string | null;
  model: string | null;
  color: string | null;
  state: string | null;
  isBlacklisted: boolean;
  violationCount: number;
  riskScore: number;
  _count: {
    parkingPasses: number;
    violations: number;
  };
}

function VehiclesLoading() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function VehiclesClientPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const fetchVehicles = useCallback(async (searchValue: string) => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ limit: '100' });
      if (searchValue.trim()) {
        params.set('search', searchValue.trim());
      }

      const response = await fetch(`/api/vehicles?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load vehicles');
      }

      setVehicles(data.vehicles || []);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFetchOnChange(() => {
    fetchVehicles(debouncedSearch);
  }, [fetchVehicles, debouncedSearch]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Vehicles</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Search and inspect registered vehicles across the property
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value.toUpperCase())}
            placeholder="Search by plate..."
            className="h-11 pl-9 md:h-10"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl">Registered Vehicles</CardTitle>
          <CardDescription>
            Click a row to open the full vehicle history
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {loading ? (
            <VehiclesLoading />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Passes</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No vehicles found
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicles.map((vehicle) => (
                    <TableRow
                      key={vehicle.id}
                      tabIndex={0}
                      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      onClick={() => setSelectedVehicle(vehicle)}
                      onKeyDown={(event) =>
                        handleClickableRowKeyDown(event, () => setSelectedVehicle(vehicle))
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Car className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{vehicle.licensePlate}</p>
                            <p className="text-xs text-muted-foreground">
                              {[vehicle.color, vehicle.make, vehicle.model]
                                .filter(Boolean)
                                .join(' ') || 'Vehicle details not provided'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{vehicle.state || '-'}</TableCell>
                      <TableCell>{vehicle._count.parkingPasses}</TableCell>
                      <TableCell>{vehicle._count.violations}</TableCell>
                      <TableCell>{vehicle.riskScore}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {vehicle.isBlacklisted ? (
                            <Badge variant="destructive">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Blacklisted
                            </Badge>
                          ) : (
                            <Badge variant="outline">Normal</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VehicleHistoryDialog
        open={!!selectedVehicle}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVehicle(null);
          }
        }}
        vehicleId={selectedVehicle?.id || null}
        licensePlate={selectedVehicle?.licensePlate || ''}
      />
    </div>
  );
}
