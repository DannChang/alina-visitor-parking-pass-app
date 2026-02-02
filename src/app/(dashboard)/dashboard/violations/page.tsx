import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Search, CheckCircle2 } from 'lucide-react';
import { hasPermission } from '@/lib/authorization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

async function getViolations() {
  return prisma.violation.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      vehicle: {
        select: {
          licensePlate: true,
          isBlacklisted: true,
        },
      },
      loggedBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

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

async function ViolationsTable() {
  const violations = await getViolations();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vehicle</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Logged By</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Logged</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {violations.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              No violations found
            </TableCell>
          </TableRow>
        ) : (
          violations.map((violation) => (
            <TableRow key={violation.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">{violation.vehicle.licensePlate}</p>
                  </div>
                  {violation.vehicle.isBlacklisted && (
                    <Badge variant="destructive" className="text-xs">
                      Blacklisted
                    </Badge>
                  )}
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
                {formatDistanceToNow(violation.createdAt, { addSuffix: true })}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export default async function ViolationsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Defense in depth: verify permission at page level
  if (!hasPermission(session.user.role, 'violations:view')) {
    redirect('/dashboard?error=access_denied');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Violations</h1>
          <p className="text-muted-foreground">View and manage parking violations</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by plate..." className="pl-9" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Violations</CardTitle>
          <CardDescription>
            A list of all logged violations across all buildings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ViolationsLoading />}>
            <ViolationsTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
