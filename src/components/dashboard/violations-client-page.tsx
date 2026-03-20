'use client';

import { useCallback, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, ArrowUpCircle, CheckCircle2, Search } from 'lucide-react';
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
import {
  ViolationDetailsSheet,
  type ViolationDetails,
} from '@/components/dashboard/violation-details-sheet';

function getSeverityVariant(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return 'destructive';
    case 'HIGH':
      return 'destructive';
    case 'MEDIUM':
      return 'outline';
    case 'LOW':
      return 'secondary';
    default:
      return 'outline';
  }
}

function ViolationsLoading() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function ViolationsClientPage({
  initialDateFilter,
}: {
  initialDateFilter: string | null;
}) {
  const [violations, setViolations] = useState<ViolationDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 350);
  const [selectedViolation, setSelectedViolation] = useState<ViolationDetails | null>(null);

  const fetchViolations = useCallback(async (search: string) => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({ limit: '100' });
      if (initialDateFilter) {
        params.set('date', initialDateFilter);
      }
      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/violations?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load violations');
      }

      setViolations(data.violations || []);
    } catch {
      setViolations([]);
    } finally {
      setIsLoading(false);
    }
  }, [initialDateFilter]);

  useFetchOnChange(() => {
    fetchViolations(debouncedSearch);
  }, [fetchViolations, debouncedSearch]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Violations</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            View and manage parking violations
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by plate, note, location..."
            className="pl-9 h-11 md:h-10 text-base md:text-sm"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl">All Violations</CardTitle>
          <CardDescription>
            {initialDateFilter === 'today'
              ? 'Showing violations logged today'
              : 'A list of all logged violations across all buildings'}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {isLoading ? (
            <ViolationsLoading />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Escalation</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Logged By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Logged</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No violations found
                    </TableCell>
                  </TableRow>
                ) : (
                  violations.map((violation) => (
                    <TableRow
                      key={violation.id}
                      tabIndex={0}
                      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      onClick={() => setSelectedViolation(violation)}
                      onKeyDown={(event) =>
                        handleClickableRowKeyDown(event, () => setSelectedViolation(violation))
                      }
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          </div>
                          <div>
                            <p className="font-medium">{violation.vehicle.licensePlate}</p>
                          </div>
                          {violation.vehicle.isBlacklisted ? (
                            <Badge variant="destructive" className="text-xs">
                              Blacklisted
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{violation.type.replace(/_/g, ' ')}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityVariant(violation.severity)}>
                          {violation.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {violation.escalationLevel !== 'NONE' ? (
                          <div className="flex items-center space-x-1">
                            <ArrowUpCircle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm">
                              {violation.escalationLevel.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {violation.location || (
                          <span className="text-muted-foreground">Not specified</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {violation.loggedBy?.name || (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {violation.isResolved ? (
                          <div className="flex items-center space-x-1 text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Resolved</span>
                          </div>
                        ) : (
                          <Badge variant="outline">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(violation.createdAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ViolationDetailsSheet
        open={!!selectedViolation}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedViolation(null);
          }
        }}
        violation={selectedViolation}
      />
    </div>
  );
}
