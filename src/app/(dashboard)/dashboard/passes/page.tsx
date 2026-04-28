'use client';

import { useState, useCallback } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Car, Clock, Search, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreatePassDialog } from '@/components/dashboard/create-pass-dialog';
import { handleClickableRowKeyDown } from '@/components/dashboard/clickable-row';
import { ListPagination, type ListPaginationState } from '@/components/dashboard/list-pagination';
import { PassDetailsSheet } from '@/components/dashboard/pass-details-sheet';
import { useTranslations } from 'next-intl';

interface PassVehicle {
  id: string;
  licensePlate: string;
  make: string | null;
  model: string | null;
  color: string | null;
  isBlacklisted: boolean;
}

interface PassUnit {
  id: string;
  unitNumber: string;
  building: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Pass {
  id: string;
  status: string;
  duration: number;
  startTime: string;
  endTime: string;
  visitorPhone: string | null;
  visitorEmail: string | null;
  vehicle: PassVehicle;
  unit: PassUnit;
}

const PASSES_CREATE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RESIDENT'];
const DEFAULT_PAGE_SIZE = 10;

function getStatusVariant(status: string, endTime: Date) {
  if (status === 'CANCELLED' || status === 'SUSPENDED') return 'destructive' as const;
  if (status === 'EXPIRED' || endTime < new Date()) return 'secondary' as const;
  if (status === 'ACTIVE') {
    const hoursRemaining = (endTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursRemaining < 1) return 'outline' as const;
    return 'default' as const;
  }
  return 'outline' as const;
}

function PassesLoading() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export default function PassesPage() {
  const t = useTranslations('dashboard.passes');
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passes, setPasses] = useState<Pass[]>([]);
  const [pagination, setPagination] = useState<ListPaginationState>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const debouncedSearch = useDebouncedValue(searchValue, 400);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(
    searchParams.get('passId') || null,
  );

  const role = session?.user?.role;
  const canCreate = role ? PASSES_CREATE_ROLES.includes(role) : false;

  // Redirect if not authenticated
  useFetchOnChange(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  const fetchPasses = useCallback(async (search: string, status: string, page: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(pagination.limit),
        page: String(page),
      });
      if (search) {
        params.set('search', search);
      }
      if (status !== 'all') {
        params.set('status', status);
      }
      const res = await fetch(`/api/passes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPasses(data.passes);
        setPagination(data.pagination);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit]);

  // Fetch passes when search changes
  useFetchOnChange(() => {
    if (sessionStatus === 'authenticated') {
      fetchPasses(debouncedSearch, statusFilter, pagination.page);
    }
  }, [debouncedSearch, sessionStatus, fetchPasses, statusFilter, pagination.page]);

  const handlePassCreated = () => {
    fetchPasses(debouncedSearch, statusFilter, pagination.page);
  };

  if (sessionStatus === 'loading') {
    return (
      <div className="space-y-4 md:space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              className="pl-9 h-11 md:h-10 text-base md:text-sm"
              value={searchValue}
              onChange={(e) => {
                setPagination((current) => ({ ...current, page: 1 }));
                setSearchValue(e.target.value);
              }}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setPagination((current) => ({ ...current, page: 1 }));
              setStatusFilter(value);
            }}
          >
            <SelectTrigger className="h-11 w-[180px] md:h-10">
              <SelectValue placeholder={t('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              <SelectItem value="ACTIVE">{t('active')}</SelectItem>
              <SelectItem value="EXPIRING_SOON">{t('expiringSoon')}</SelectItem>
              <SelectItem value="EXPIRED">{t('expired')}</SelectItem>
              <SelectItem value="CANCELLED">{t('cancelled')}</SelectItem>
              <SelectItem value="SUSPENDED">{t('suspended')}</SelectItem>
            </SelectContent>
          </Select>
          {canCreate && (
            <Button onClick={() => setDialogOpen(true)} size="sm" className="shrink-0">
              <Plus className="h-4 w-4 mr-1" />
              {t('newPass')}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl">{t('allPasses')}</CardTitle>
          <CardDescription>{t('allPassesDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {isLoading ? (
            <PassesLoading />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('vehicle')}</TableHead>
                  <TableHead>{t('unit')}</TableHead>
                  <TableHead>{t('visitor')}</TableHead>
                  <TableHead>{t('duration')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('expires')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {t('noPassesFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  passes.map((pass) => {
                    const endTime = new Date(pass.endTime);
                    const isExpired = endTime < new Date();
                    return (
                      <TableRow
                        key={pass.id}
                        tabIndex={0}
                        className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        onClick={() => setSelectedPassId(pass.id)}
                        onKeyDown={(event) =>
                          handleClickableRowKeyDown(event, () => setSelectedPassId(pass.id))
                        }
                      >
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <Car className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{pass.vehicle.licensePlate}</p>
                              {pass.vehicle.make && (
                                <p className="text-xs text-muted-foreground">
                                  {pass.vehicle.color} {pass.vehicle.make} {pass.vehicle.model}
                                </p>
                              )}
                            </div>
                            {pass.vehicle.isBlacklisted && (
                              <Badge variant="destructive" className="text-xs">
                                {t('blacklisted')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{pass.unit.unitNumber}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{pass.visitorEmail || t('notProvided')}</p>
                            <p className="text-muted-foreground">
                              {pass.visitorPhone || t('notProvided')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{pass.duration}h</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(pass.status, endTime)}>
                            {isExpired && pass.status === 'ACTIVE' ? 'EXPIRED' : pass.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={isExpired ? 'text-muted-foreground' : ''}>
                            {isExpired
                              ? `Expired ${formatDistanceToNow(endTime, { addSuffix: true })}`
                              : formatDistanceToNow(endTime, { addSuffix: true })}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
          <ListPagination
            pagination={pagination}
            onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
            onLimitChange={(limit) => setPagination((current) => ({ ...current, page: 1, limit }))}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <CreatePassDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handlePassCreated}
      />
      <PassDetailsSheet
        open={!!selectedPassId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPassId(null);
          }
        }}
        passId={selectedPassId}
      />
    </div>
  );
}
