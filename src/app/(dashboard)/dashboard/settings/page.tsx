'use client';

import { useState } from 'react';
import type { TimeBankPeriod } from '@prisma/client';
import { useMountEffect } from '@/hooks/use-mount-effect';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
import { Building2, Clock, Shield, Bell, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface Building {
  id: string;
  name: string;
  slug: string;
  address: string;
  contactEmail: string | null;
  contactPhone: string | null;
  emergencyPhone: string | null;
  timezone: string;
  isActive: boolean;
}

interface ParkingRules {
  id: string;
  buildingId: string;
  maxVehiclesPerUnit: number;
  monthlyHourBank: number;
  timeBankPeriod: TimeBankPeriod;
  maxConsecutiveHours: number;
  cooldownHours: number;
  maxExtensions: number;
  extensionMaxHours: number;
  requireUnitConfirmation: boolean;
  operatingStartHour: number | null;
  operatingEndHour: number | null;
  allowedDurations: number[];
  gracePeriodMinutes: number;
  allowEmergencyOverride: boolean;
}

function SettingsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function SettingsPage() {
  const t = useTranslations('dashboard.settingsPage');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [buildingData, setBuildingData] = useState<Building | null>(null);
  const [parkingRules, setParkingRules] = useState<ParkingRules | null>(null);

  useMountEffect(() => {
    fetchBuildings();
  });

  useFetchOnChange(() => {
    if (selectedBuildingId) {
      fetchBuildingSettings(selectedBuildingId);
    }
  }, [selectedBuildingId]);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/settings/buildings');
      if (!response.ok) throw new Error('Failed to fetch buildings');
      const data = await response.json();
      setBuildings(data.buildings);
      if (data.buildings.length > 0) {
        setSelectedBuildingId(data.buildings[0].id);
      }
    } catch (error) {
      toast.error(t('failedToLoadBuildings'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildingSettings = async (buildingId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/settings/buildings?id=${buildingId}`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setBuildingData(data.building);
      setParkingRules(data.parkingRules);
    } catch (error) {
      toast.error(t('failedToLoadSettings'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBuilding = async () => {
    if (!buildingData) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/settings/buildings?id=${buildingData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildingData),
      });
      if (!response.ok) throw new Error('Failed to save settings');
      toast.success(t('buildingSettingsSaved'));
    } catch (error) {
      toast.error(t('failedToSaveBuilding'));
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveParkingRules = async () => {
    if (!parkingRules) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/settings/parking-rules?buildingId=${selectedBuildingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parkingRules),
      });
      if (!response.ok) throw new Error('Failed to save parking rules');
      toast.success(t('parkingRulesSaved'));
    } catch (error) {
      toast.error(t('failedToSaveParkingRules'));
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading && buildings.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <SettingsLoading />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('title')}</h1>
          <p className="text-sm text-muted-foreground md:text-base">{t('description')}</p>
        </div>
        <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
          <SelectTrigger className="h-11 w-full md:h-10 md:w-[250px]">
            <SelectValue placeholder={t('selectBuilding')} />
          </SelectTrigger>
          <SelectContent>
            {buildings.map((building) => (
              <SelectItem key={building.id} value={building.id}>
                {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="building" className="space-y-4">
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:w-auto">
            <TabsTrigger value="building" className="min-h-[44px] flex-1 md:min-h-0 md:flex-none">
              <Building2 className="mr-2 h-4 w-4" />
              {t('buildingTab')}
            </TabsTrigger>
            <TabsTrigger value="parking" className="min-h-[44px] flex-1 md:min-h-0 md:flex-none">
              <Clock className="mr-2 h-4 w-4" />
              {t('parkingTab')}
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="min-h-[44px] flex-1 md:min-h-0 md:flex-none"
            >
              <Bell className="mr-2 h-4 w-4" />
              {t('notificationsTab')}
            </TabsTrigger>
            <TabsTrigger value="security" className="min-h-[44px] flex-1 md:min-h-0 md:flex-none">
              <Shield className="mr-2 h-4 w-4" />
              {t('securityTab')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="building" className="space-y-4">
          {loading ? (
            <SettingsLoading />
          ) : buildingData ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t('buildingInfo')}</CardTitle>
                  <CardDescription>{t('buildingInfoDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('buildingName')}</Label>
                      <Input
                        id="name"
                        value={buildingData.name}
                        onChange={(e) => setBuildingData({ ...buildingData, name: e.target.value })}
                        className="h-11 text-base md:h-10 md:text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">{t('urlSlug')}</Label>
                      <Input
                        id="slug"
                        value={buildingData.slug}
                        onChange={(e) => setBuildingData({ ...buildingData, slug: e.target.value })}
                        className="h-11 text-base md:h-10 md:text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">{t('address')}</Label>
                    <Input
                      id="address"
                      value={buildingData.address}
                      onChange={(e) =>
                        setBuildingData({ ...buildingData, address: e.target.value })
                      }
                      className="h-11 text-base md:h-10 md:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">{t('timezone')}</Label>
                      <Select
                        value={buildingData.timezone}
                        onValueChange={(value) =>
                          setBuildingData({ ...buildingData, timezone: value })
                        }
                      >
                        <SelectTrigger className="h-11 md:h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between py-2 md:block md:space-y-2">
                      <Label htmlFor="isActive">{t('statusLabel')}</Label>
                      <div className="flex items-center space-x-2 md:pt-2">
                        <Switch
                          id="isActive"
                          checked={buildingData.isActive}
                          onCheckedChange={(checked) =>
                            setBuildingData({ ...buildingData, isActive: checked })
                          }
                        />
                        <Label htmlFor="isActive" className="font-normal">
                          {buildingData.isActive ? t('active') : t('inactive')}
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('contactInfoTitle')}</CardTitle>
                  <CardDescription>{t('contactInfoDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">{t('contactEmail')}</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={buildingData.contactEmail || ''}
                        onChange={(e) =>
                          setBuildingData({ ...buildingData, contactEmail: e.target.value || null })
                        }
                        className="h-11 text-base md:h-10 md:text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">{t('contactPhone')}</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        value={buildingData.contactPhone || ''}
                        onChange={(e) =>
                          setBuildingData({ ...buildingData, contactPhone: e.target.value || null })
                        }
                        className="h-11 text-base md:h-10 md:text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">{t('emergencyPhone')}</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      value={buildingData.emergencyPhone || ''}
                      onChange={(e) =>
                        setBuildingData({ ...buildingData, emergencyPhone: e.target.value || null })
                      }
                      className="h-11 text-base md:h-10 md:text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveBuilding}
                  disabled={saving}
                  className="min-h-[44px] w-full md:min-h-0 md:w-auto"
                >
                  {saving ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t('saveBuildingSettings')}
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('selectBuildingPrompt')}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="parking" className="space-y-4">
          {loading ? (
            <SettingsLoading />
          ) : parkingRules ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t('passLimits')}</CardTitle>
                  <CardDescription>{t('passLimitsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="maxVehiclesPerUnit">{t('maxActivePassesPerUnit')}</Label>
                      <Input
                        id="maxVehiclesPerUnit"
                        type="number"
                        min="1"
                        max="10"
                        value={parkingRules.maxVehiclesPerUnit}
                        onChange={(e) =>
                          setParkingRules({
                            ...parkingRules,
                            maxVehiclesPerUnit: parseInt(e.target.value) || 1,
                          })
                        }
                        className="h-11 text-base md:h-10 md:text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('maxActivePassesPerUnitDesc')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthlyHourBank">{t('timeBankHours')}</Label>
                      <Input
                        id="monthlyHourBank"
                        type="number"
                        min="1"
                        max="744"
                        value={parkingRules.monthlyHourBank}
                        onChange={(e) =>
                          setParkingRules({
                            ...parkingRules,
                            monthlyHourBank: parseInt(e.target.value) || 1,
                          })
                        }
                        className="h-11 text-base md:h-10 md:text-sm"
                      />
                      <p className="text-xs text-muted-foreground">{t('timeBankHoursDesc')}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeBankPeriod">{t('timeBankResetPeriod')}</Label>
                      <Select
                        value={parkingRules.timeBankPeriod}
                        onValueChange={(value) =>
                          setParkingRules({
                            ...parkingRules,
                            timeBankPeriod: value as TimeBankPeriod,
                          })
                        }
                      >
                        <SelectTrigger id="timeBankPeriod" className="h-11 md:h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY">{t('timeBankPeriodDaily')}</SelectItem>
                          <SelectItem value="WEEKLY">{t('timeBankPeriodWeekly')}</SelectItem>
                          <SelectItem value="MONTHLY">{t('timeBankPeriodMonthly')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {t('timeBankResetPeriodDesc')}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxConsecutiveHours">{t('maxConsecutiveHours')}</Label>
                      <Input
                        id="maxConsecutiveHours"
                        type="number"
                        min="1"
                        max="168"
                        value={parkingRules.maxConsecutiveHours}
                        onChange={(e) =>
                          setParkingRules({
                            ...parkingRules,
                            maxConsecutiveHours: parseInt(e.target.value) || 24,
                          })
                        }
                        className="h-11 text-base md:h-10 md:text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cooldownHours">{t('cooldownHours')}</Label>
                      <Input
                        id="cooldownHours"
                        type="number"
                        min="0"
                        max="48"
                        value={parkingRules.cooldownHours}
                        onChange={(e) =>
                          setParkingRules({
                            ...parkingRules,
                            cooldownHours: parseInt(e.target.value) || 0,
                          })
                        }
                        className="h-11 text-base md:h-10 md:text-sm"
                      />
                      <p className="text-xs text-muted-foreground">{t('cooldownHoursDesc')}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gracePeriodMinutes">{t('gracePeriodMinutes')}</Label>
                      <Input
                        id="gracePeriodMinutes"
                        type="number"
                        min="0"
                        max="60"
                        value={parkingRules.gracePeriodMinutes}
                        onChange={(e) =>
                          setParkingRules({
                            ...parkingRules,
                            gracePeriodMinutes: parseInt(e.target.value) || 0,
                          })
                        }
                        className="h-11 text-base md:h-10 md:text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('extensionRules')}</CardTitle>
                  <CardDescription>{t('extensionRulesDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="maxExtensions">{t('maxExtensions')}</Label>
                      <Input
                        id="maxExtensions"
                        type="number"
                        min="0"
                        max="5"
                        value={parkingRules.maxExtensions}
                        onChange={(e) =>
                          setParkingRules({
                            ...parkingRules,
                            maxExtensions: parseInt(e.target.value) || 0,
                          })
                        }
                        className="h-11 text-base md:h-10 md:text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="extensionMaxHours">{t('maxExtensionHours')}</Label>
                      <Input
                        id="extensionMaxHours"
                        type="number"
                        min="1"
                        max="24"
                        value={parkingRules.extensionMaxHours}
                        onChange={(e) =>
                          setParkingRules({
                            ...parkingRules,
                            extensionMaxHours: parseInt(e.target.value) || 4,
                          })
                        }
                        className="h-11 text-base md:h-10 md:text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('additionalOptions')}</CardTitle>
                  <CardDescription>{t('additionalOptionsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="requireUnitConfirmation">
                        {t('requireUnitConfirmation')}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {t('requireUnitConfirmationDesc')}
                      </p>
                    </div>
                    <Switch
                      id="requireUnitConfirmation"
                      checked={parkingRules.requireUnitConfirmation}
                      onCheckedChange={(checked) =>
                        setParkingRules({ ...parkingRules, requireUnitConfirmation: checked })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allowEmergencyOverride">{t('allowEmergencyOverride')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('allowEmergencyOverrideDesc')}
                      </p>
                    </div>
                    <Switch
                      id="allowEmergencyOverride"
                      checked={parkingRules.allowEmergencyOverride}
                      onCheckedChange={(checked) =>
                        setParkingRules({ ...parkingRules, allowEmergencyOverride: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveParkingRules}
                  disabled={saving}
                  className="min-h-[44px] w-full md:min-h-0 md:w-auto"
                >
                  {saving ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t('saveParkingRules')}
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('noParkingRules')}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('emailNotifications')}</CardTitle>
              <CardDescription>{t('emailNotificationsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('passConfirmation')}</Label>
                  <p className="text-sm text-muted-foreground">{t('passConfirmationDesc')}</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('expirationWarning')}</Label>
                  <p className="text-sm text-muted-foreground">{t('expirationWarningDesc')}</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('violationAlerts')}</Label>
                  <p className="text-sm text-muted-foreground">{t('violationAlertsDesc')}</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('securitySettings')}</CardTitle>
              <CardDescription>{t('securitySettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('twoFactor')}</Label>
                  <p className="text-sm text-muted-foreground">{t('twoFactorDesc')}</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('ipAllowlist')}</Label>
                  <p className="text-sm text-muted-foreground">{t('ipAllowlistDesc')}</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('auditLogging')}</Label>
                  <p className="text-sm text-muted-foreground">{t('auditLoggingDesc')}</p>
                </div>
                <Switch defaultChecked disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
