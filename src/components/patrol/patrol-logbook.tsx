'use client';

import { useState, useCallback } from 'react';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
import { Plus, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { LogEntryForm } from './log-entry-form';
import { LogEntryList, type PatrolLogEntry } from './log-entry-list';
import { VehicleHistoryDialog } from './vehicle-history-dialog';
import { LogEntryDetailsSheet } from './log-entry-details-sheet';
import { useTranslations } from 'next-intl';

const PAGE_SIZE = 20;

export function PatrolLogbook() {
  const t = useTranslations('patrol');
  const tc = useTranslations('common');

  const ENTRY_TYPE_OPTIONS = [
    { value: 'ALL', label: t('allTypes') },
    { value: 'ENTRY', label: t('entryEntry') },
    { value: 'EXIT', label: t('entryExit') },
    { value: 'SPOT_CHECK', label: t('entrySpotCheck') },
    { value: 'NOTE', label: t('entryNote') },
  ] as const;

  const [entries, setEntries] = useState<PatrolLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PatrolLogEntry | null>(null);

  // Filter state
  const [filterType, setFilterType] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const buildQueryParams = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));

      if (filterType !== 'ALL') {
        params.set('entryType', filterType);
      }
      if (filterDateFrom) {
        params.set('from', filterDateFrom);
      }
      if (filterDateTo) {
        params.set('to', filterDateTo);
      }
      if (cursor) {
        params.set('cursor', cursor);
      }

      return params.toString();
    },
    [filterType, filterDateFrom, filterDateTo]
  );

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);

    try {
      const queryString = buildQueryParams();
      const response = await fetch(`/api/patrol/log?${queryString}`);

      if (!response.ok) {
        throw new Error('Failed to fetch log entries');
      }

      const data = await response.json();
      setEntries(data.entries ?? []);
      setHasMore(data.hasMore ?? false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load log entries'
      );
    } finally {
      setIsLoading(false);
    }
  }, [buildQueryParams]);

  const loadMore = async () => {
    if (entries.length === 0 || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const lastEntry = entries[entries.length - 1];
      const queryString = buildQueryParams(lastEntry?.id);
      const response = await fetch(`/api/patrol/log?${queryString}`);

      if (!response.ok) {
        throw new Error('Failed to fetch more entries');
      }

      const data = await response.json();
      setEntries((prev) => [...prev, ...(data.entries ?? [])]);
      setHasMore(data.hasMore ?? false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load more entries'
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    fetchEntries();
  };

  const handleFormSuccess = () => {
    fetchEntries();
  };

  const handleFilterChange = () => {
    fetchEntries();
  };

  const handleClearFilters = () => {
    setFilterType('ALL');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Fetch entries on mount and when filters change
  useFetchOnChange(() => {
    fetchEntries();
  }, [fetchEntries]);

  const hasActiveFilters =
    filterType !== 'ALL' || filterDateFrom !== '' || filterDateTo !== '';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">{t('logbookTitle')}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {tc('refresh')}
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addEntry')}
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle
              className="text-sm font-medium flex items-center gap-2 cursor-pointer"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              {t('filters')}
              {hasActiveFilters && (
                <span className="text-xs text-primary font-normal">{t('filtersActive')}</span>
              )}
            </CardTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={handleClearFilters}
              >
                {t('clearFilters')}
              </Button>
            )}
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="pt-0 space-y-4">
            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Entry Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="filterType" className="text-xs">
                  {t('entryTypeLabel')}
                </Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger id="filterType" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="filterDateFrom" className="text-xs">
                  {t('dateFromLabel')}
                </Label>
                <Input
                  id="filterDateFrom"
                  type="date"
                  className="h-9"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="filterDateTo" className="text-xs">
                  {t('dateToLabel')}
                </Label>
                <Input
                  id="filterDateTo"
                  type="date"
                  className="h-9"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>

            <Button
              size="sm"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={handleFilterChange}
            >
              {t('applyFilters')}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Entry List */}
      <LogEntryList
        entries={entries}
        onEntrySelect={setSelectedEntry}
        onLoadMore={loadMore}
        hasMore={hasMore}
        isLoading={isLoading || isLoadingMore}
      />

      {/* Add Entry Dialog */}
      <LogEntryForm
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={handleFormSuccess}
      />
      <VehicleHistoryDialog
        open={!!selectedEntry?.vehicleId}
        onOpenChange={(open) => {
          if (!open && selectedEntry?.vehicleId) {
            setSelectedEntry(null);
          }
        }}
        vehicleId={selectedEntry?.vehicleId || null}
        licensePlate={selectedEntry?.licensePlate || ''}
      />
      <LogEntryDetailsSheet
        entry={selectedEntry && !selectedEntry.vehicleId ? selectedEntry : null}
        open={!!selectedEntry && !selectedEntry.vehicleId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEntry(null);
          }
        }}
      />
    </div>
  );
}
