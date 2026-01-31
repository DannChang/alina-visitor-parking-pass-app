'use client';

import { useState, useEffect, useCallback } from 'react';
import { Database, Server, RefreshCw, CheckCircle, AlertCircle, XCircle, Wifi } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { format, formatDistanceToNow } from 'date-fns';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    api: ServiceStatus;
    email: ServiceStatus;
  };
  metrics: {
    activePasses: number;
    expiringSoon: number;
    todayViolations: number;
    pendingNotifications: number;
    avgResponseTime: number;
  };
  resources: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

interface ServiceStatus {
  status: 'operational' | 'degraded' | 'down';
  latency?: number;
  lastCheck: string;
  message?: string;
}

function StatusIcon({ status }: { status: 'operational' | 'degraded' | 'down' | 'healthy' | 'critical' }) {
  switch (status) {
    case 'operational':
    case 'healthy':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'degraded':
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case 'down':
    case 'critical':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-500" />;
  }
}

function StatusBadge({ status }: { status: 'operational' | 'degraded' | 'down' | 'healthy' | 'critical' }) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    operational: 'default',
    healthy: 'default',
    degraded: 'secondary',
    down: 'destructive',
    critical: 'destructive',
  };

  const labels: Record<string, string> = {
    operational: 'Operational',
    healthy: 'Healthy',
    degraded: 'Degraded',
    down: 'Down',
    critical: 'Critical',
  };

  return (
    <Badge variant={variants[status] || 'outline'}>
      {labels[status] || status}
    </Badge>
  );
}

function ServiceCard({
  name,
  icon: Icon,
  service,
}: {
  name: string;
  icon: React.ElementType;
  service: ServiceStatus;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{name}</h3>
              {service.latency !== undefined && (
                <p className="text-sm text-muted-foreground">{service.latency}ms latency</p>
              )}
            </div>
          </div>
          <StatusIcon status={service.status} />
        </div>
        {service.message && (
          <p className="mt-3 text-sm text-muted-foreground">{service.message}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Last checked: {formatDistanceToNow(new Date(service.lastCheck), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  );
}

function HealthLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealth = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error('Failed to fetch health status');
      const data = await response.json();
      setHealth(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching health:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchHealth(), 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">Monitor system status and performance</p>
        </div>
        <HealthLoading />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">Monitor system status and performance</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium">Unable to fetch health status</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The health check endpoint is not responding
            </p>
            <Button onClick={() => fetchHealth(true)} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">Monitor system status and performance</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Last updated: {format(lastRefresh, 'HH:mm:ss')}
          </span>
          <Button variant="outline" onClick={() => fetchHealth(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <StatusIcon status={health.status} />
              <div>
                <h2 className="text-xl font-semibold">System Status</h2>
                <p className="text-sm text-muted-foreground">
                  All systems {health.status === 'healthy' ? 'operational' : health.status}
                </p>
              </div>
            </div>
            <StatusBadge status={health.status} />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{formatUptime(health.uptime)}</p>
              <p className="text-sm text-muted-foreground">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{health.version}</p>
              <p className="text-sm text-muted-foreground">Version</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{health.metrics.avgResponseTime}ms</p>
              <p className="text-sm text-muted-foreground">Avg Response</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold capitalize">{health.environment}</p>
              <p className="text-sm text-muted-foreground">Environment</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <div>
        <h3 className="text-lg font-medium mb-4">Services</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <ServiceCard
            name="Database"
            icon={Database}
            service={health.services.database}
          />
          <ServiceCard
            name="API"
            icon={Server}
            service={health.services.api}
          />
          <ServiceCard
            name="Email Service"
            icon={Wifi}
            service={health.services.email}
          />
        </div>
      </div>

      {/* Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Metrics</CardTitle>
          <CardDescription>Current system activity and resource usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Activity</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Passes</span>
                  <Badge variant="outline">{health.metrics.activePasses}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Expiring Soon</span>
                  <Badge variant="secondary">{health.metrics.expiringSoon}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Today&apos;s Violations</span>
                  <Badge variant="destructive">{health.metrics.todayViolations}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending Notifications</span>
                  <Badge variant="outline">{health.metrics.pendingNotifications}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Resources</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Memory Usage</span>
                    <span className="text-sm text-muted-foreground">
                      {health.resources.memory.used}MB / {health.resources.memory.total}MB
                    </span>
                  </div>
                  <Progress value={health.resources.memory.percentage} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status History Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>System events and status changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div className="flex-1">
                <p className="text-sm">System health check passed</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(health.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div className="flex-1">
                <p className="text-sm">Database connection verified</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(health.services.database.lastCheck), 'MMM dd, yyyy HH:mm:ss')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
