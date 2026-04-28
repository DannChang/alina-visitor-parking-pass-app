'use client';

import { useCallback, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
import { formatDistanceToNow } from 'date-fns';
import { Copy, Loader2, Mail, Plus, RefreshCcw, Search, ShieldX } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreateResidentInviteDialog } from '@/components/dashboard/create-resident-invite-dialog';
import { RevokeResidentInviteDialog } from '@/components/dashboard/revoke-resident-invite-dialog';
import {
  handleClickableRowKeyDown,
  stopClickableRowPropagation,
} from '@/components/dashboard/clickable-row';
import { ListPagination, type ListPaginationState } from '@/components/dashboard/list-pagination';
import { ResidentInviteDetailsSheet } from '@/components/dashboard/resident-invite-details-sheet';
import type {
  ResidentInviteBuildingOption,
  ResidentInviteMutationResult,
  ResidentInviteStatus,
  ResidentInviteSummary,
  ResidentInviteUnitOption,
} from '@/components/dashboard/resident-invite-shared';

interface ResidentInviteResponse {
  invites: ResidentInviteSummary[];
  buildings: ResidentInviteBuildingOption[];
  units: ResidentInviteUnitOption[];
  pagination: ListPaginationState;
}

const DEFAULT_PAGE_SIZE = 10;

function getStatusVariant(status: ResidentInviteStatus) {
  switch (status) {
    case 'PENDING':
      return 'default' as const;
    case 'REVOKED':
      return 'destructive' as const;
    case 'CONSUMED':
      return 'secondary' as const;
    case 'EXPIRED':
    default:
      return 'outline' as const;
  }
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

export default function RegistrationPassesPage() {
  const [invites, setInvites] = useState<ResidentInviteSummary[]>([]);
  const [pagination, setPagination] = useState<ListPaginationState>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [buildings, setBuildings] = useState<ResidentInviteBuildingOption[]>([]);
  const [units, setUnits] = useState<ResidentInviteUnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [statusFilter, setStatusFilter] = useState<'all' | ResidentInviteStatus>('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteToRevoke, setInviteToRevoke] = useState<ResidentInviteSummary | null>(null);
  const [reissuingInviteId, setReissuingInviteId] = useState<string | null>(null);
  const [latestInvite, setLatestInvite] = useState<ResidentInviteMutationResult | null>(null);
  const [selectedInvite, setSelectedInvite] = useState<ResidentInviteSummary | null>(null);

  const fetchInvites = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (buildingFilter !== 'all') {
        params.set('buildingId', buildingFilter);
      }
      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.limit));

      const response = await fetch(`/api/resident-invites?${params.toString()}`);
      const data: ResidentInviteResponse & { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load registration passes');
      }

      setInvites(data.invites ?? []);
      setBuildings(data.buildings ?? []);
      setUnits(data.units ?? []);
      setPagination(data.pagination);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : 'Failed to load registration passes'
      );
    } finally {
      setLoading(false);
    }
  }, [buildingFilter, debouncedSearch, pagination.page, pagination.limit, statusFilter]);

  useFetchOnChange(() => {
    fetchInvites();
  }, [fetchInvites]);

  const availableUnits = useMemo(() => units.filter((unit) => unit.isAvailableForInvite), [units]);

  async function handleCopyLink() {
    if (!latestInvite) {
      return;
    }

    try {
      await navigator.clipboard.writeText(latestInvite.registrationUrl);
      toast.success('Registration link copied to clipboard');
    } catch {
      toast.error('Unable to copy the registration link');
    }
  }

  async function handleReissue(invite: ResidentInviteSummary) {
    const confirmed = window.confirm(
      `Generate a fresh registration link for ${
        invite.recipientName ?? `unit ${invite.unit.unitNumber}`
      }?`
    );

    if (!confirmed) {
      return;
    }

    setReissuingInviteId(invite.id);

    try {
      const response = await fetch(`/api/resident-invites/${invite.id}/reissue`, {
        method: 'POST',
      });
      const data: ResidentInviteMutationResult & { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reissue registration pass');
      }

      setLatestInvite(data);
      toast.success(
        data.emailSent
          ? 'Registration pass reissued'
          : 'Registration pass reissued, but the email could not be sent'
      );
      await fetchInvites();
    } catch (reissueError) {
      toast.error(
        reissueError instanceof Error ? reissueError.message : 'Failed to reissue registration pass'
      );
    } finally {
      setReissuingInviteId(null);
    }
  }

  function handleCreated(result: ResidentInviteMutationResult) {
    setLatestInvite(result);
    toast.success(
      result.emailSent
        ? 'Registration pass created'
        : 'Registration pass created, but the email could not be sent'
    );
    void fetchInvites();
  }

  function handleRevoked(invite: ResidentInviteSummary) {
    setInvites((current) => current.map((entry) => (entry.id === invite.id ? invite : entry)));
    toast.success('Registration pass revoked');
    void fetchInvites();
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Registration Passes</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Issue, revoke, and reissue one-time resident onboarding links.
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="w-full md:w-auto"
          disabled={buildings.length === 0 || availableUnits.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Registration Pass
        </Button>
      </div>

      {latestInvite ? (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Latest Registration Link</CardTitle>
            <CardDescription>
              This link is shown once. Reissue the pass later if you need a fresh one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="break-all rounded-lg border bg-muted/30 p-3 font-mono text-sm">
              {latestInvite.registrationUrl}
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                {latestInvite.emailSent ? (
                  <span>Email delivery succeeded for {latestInvite.invite.recipientEmail}.</span>
                ) : (
                  <span>
                    Share this registration link manually
                    {latestInvite.invite.recipientEmail
                      ? ` with ${latestInvite.invite.recipientEmail}`
                      : ''}
                    .
                  </span>
                )}
              </div>
              <Button type="button" variant="outline" onClick={handleCopyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {buildings.length === 0 && !loading ? (
        <Alert>
          <ShieldX className="h-4 w-4" />
          <AlertDescription>
            No accessible active buildings are available for resident onboarding.
          </AlertDescription>
        </Alert>
      ) : null}

      {availableUnits.length === 0 && buildings.length > 0 && !loading ? (
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            Every accessible unit already has a primary resident or a pending registration pass.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setPagination((current) => ({ ...current, page: 1 }));
              setSearch(event.target.value);
            }}
            placeholder="Search by resident, email, unit, or building..."
            className="h-11 pl-9 md:h-10"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setPagination((current) => ({ ...current, page: 1 }));
            setStatusFilter(value as 'all' | ResidentInviteStatus);
          }}
        >
          <SelectTrigger className="h-11 w-full md:h-10 md:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONSUMED">Consumed</SelectItem>
            <SelectItem value="REVOKED">Revoked</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={buildingFilter}
          onValueChange={(value) => {
            setPagination((current) => ({ ...current, page: 1 }));
            setBuildingFilter(value);
          }}
        >
          <SelectTrigger className="h-11 w-full md:h-10 md:w-[220px]">
            <SelectValue placeholder="Building" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All buildings</SelectItem>
            {buildings.map((building) => (
              <SelectItem key={building.id} value={building.id}>
                {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl">Resident Onboarding</CardTitle>
          <CardDescription>
            {pagination.total} registration pass{pagination.total === 1 ? '' : 'es'} found
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Issued By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No registration passes found
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((invite) => (
                    <TableRow
                      key={invite.id}
                      tabIndex={0}
                      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      onClick={() => setSelectedInvite(invite)}
                      onKeyDown={(event) =>
                        handleClickableRowKeyDown(event, () => setSelectedInvite(invite))
                      }
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {invite.recipientName ?? 'Unit registration link'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {invite.recipientEmail ?? 'Email collected at activation'}
                          </p>
                          {invite.recipientPhone ? (
                            <p className="text-xs text-muted-foreground">{invite.recipientPhone}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{invite.building.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Unit {invite.unit.unitNumber}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={getStatusVariant(invite.status)}>{invite.status}</Badge>
                          {invite.status === 'CONSUMED' && invite.resident ? (
                            <p className="text-xs text-muted-foreground">
                              Activated by {invite.resident.name}
                            </p>
                          ) : null}
                          {invite.status === 'REVOKED' && invite.revokeReason ? (
                            <p className="text-xs text-muted-foreground">{invite.revokeReason}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <p>
                            {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}
                          </p>
                          {invite.sentAt ? (
                            <p className="text-xs text-muted-foreground">
                              Sent{' '}
                              {formatDistanceToNow(new Date(invite.sentAt), { addSuffix: true })}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Not emailed</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {invite.issuer.name || 'Unknown issuer'}
                          </p>
                          <p className="text-xs text-muted-foreground">{invite.issuer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {invite.status !== 'CONSUMED' ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                stopClickableRowPropagation(event);
                                handleReissue(invite);
                              }}
                              disabled={reissuingInviteId === invite.id}
                              onKeyDown={stopClickableRowPropagation}
                            >
                              {reissuingInviteId === invite.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Reissuing...
                                </>
                              ) : (
                                <>
                                  <RefreshCcw className="mr-2 h-4 w-4" />
                                  Reissue
                                </>
                              )}
                            </Button>
                          ) : null}
                          {invite.status === 'PENDING' ? (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={(event) => {
                                stopClickableRowPropagation(event);
                                setInviteToRevoke(invite);
                              }}
                              onKeyDown={stopClickableRowPropagation}
                            >
                              Revoke
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          <ListPagination
            pagination={pagination}
            onPageChange={(page) => setPagination((current) => ({ ...current, page }))}
            onLimitChange={(limit) => setPagination((current) => ({ ...current, page: 1, limit }))}
            isLoading={loading}
          />
        </CardContent>
      </Card>

      <CreateResidentInviteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        buildings={buildings}
        units={units}
        onCreated={handleCreated}
      />

      <RevokeResidentInviteDialog
        open={!!inviteToRevoke}
        onOpenChange={(open) => {
          if (!open) {
            setInviteToRevoke(null);
          }
        }}
        invite={inviteToRevoke}
        onRevoked={handleRevoked}
      />
      <ResidentInviteDetailsSheet
        invite={selectedInvite}
        open={!!selectedInvite}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedInvite(null);
          }
        }}
      />
    </div>
  );
}
