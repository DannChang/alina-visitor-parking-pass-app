import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Car, Clock, Search } from 'lucide-react';
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

async function getPasses() {
  return prisma.parkingPass.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      vehicle: {
        select: {
          id: true,
          licensePlate: true,
          make: true,
          model: true,
          color: true,
          isBlacklisted: true,
        },
      },
      unit: {
        select: {
          unitNumber: true,
          building: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

function getStatusVariant(status: string, endTime: Date) {
  if (status === 'CANCELLED' || status === 'SUSPENDED') return 'destructive';
  if (status === 'EXPIRED' || endTime < new Date()) return 'secondary';
  if (status === 'ACTIVE') {
    const hoursRemaining = (endTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursRemaining < 1) return 'outline';
    return 'default';
  }
  return 'outline';
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

async function PassesTable() {
  const passes = await getPasses();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vehicle</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Visitor</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expires</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {passes.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No parking passes found
            </TableCell>
          </TableRow>
        ) : (
          passes.map((pass) => {
            const isExpired = pass.endTime < new Date();
            return (
              <TableRow key={pass.id}>
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
                        Blacklisted
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{pass.unit.unitNumber}</TableCell>
                <TableCell>
                  {pass.visitorName || (
                    <span className="text-muted-foreground">Not provided</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{pass.duration}h</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(pass.status, pass.endTime)}>
                    {isExpired && pass.status === 'ACTIVE' ? 'EXPIRED' : pass.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={isExpired ? 'text-muted-foreground' : ''}>
                    {isExpired
                      ? `Expired ${formatDistanceToNow(pass.endTime, { addSuffix: true })}`
                      : formatDistanceToNow(pass.endTime, { addSuffix: true })}
                  </span>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

export default async function PassesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parking Passes</h1>
          <p className="text-muted-foreground">View and manage all parking passes</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by plate or name..." className="pl-9" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Passes</CardTitle>
          <CardDescription>
            A list of all registered parking passes across all buildings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<PassesLoading />}>
            <PassesTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
