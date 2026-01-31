'use client';

import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [buildingData, setBuildingData] = useState<Building | null>(null);
  const [parkingRules, setParkingRules] = useState<ParkingRules | null>(null);

  useEffect(() => {
    fetchBuildings();
  }, []);

  useEffect(() => {
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
      toast.error('Failed to load buildings');
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
      toast.error('Failed to load building settings');
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
      toast.success('Building settings saved successfully');
    } catch (error) {
      toast.error('Failed to save building settings');
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
      toast.success('Parking rules saved successfully');
    } catch (error) {
      toast.error('Failed to save parking rules');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading && buildings.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage system configuration</p>
        </div>
        <SettingsLoading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage building and system configuration</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select building" />
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
      </div>

      <Tabs defaultValue="building" className="space-y-4">
        <TabsList>
          <TabsTrigger value="building">
            <Building2 className="mr-2 h-4 w-4" />
            Building
          </TabsTrigger>
          <TabsTrigger value="parking">
            <Clock className="mr-2 h-4 w-4" />
            Parking Rules
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="building" className="space-y-4">
          {loading ? (
            <SettingsLoading />
          ) : buildingData ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Building Information</CardTitle>
                  <CardDescription>Basic building details and contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Building Name</Label>
                      <Input
                        id="name"
                        value={buildingData.name}
                        onChange={(e) => setBuildingData({ ...buildingData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">URL Slug</Label>
                      <Input
                        id="slug"
                        value={buildingData.slug}
                        onChange={(e) => setBuildingData({ ...buildingData, slug: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={buildingData.address}
                      onChange={(e) => setBuildingData({ ...buildingData, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={buildingData.timezone}
                        onValueChange={(value) => setBuildingData({ ...buildingData, timezone: value })}
                      >
                        <SelectTrigger>
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
                    <div className="space-y-2">
                      <Label htmlFor="isActive">Status</Label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          id="isActive"
                          checked={buildingData.isActive}
                          onCheckedChange={(checked) => setBuildingData({ ...buildingData, isActive: checked })}
                        />
                        <Label htmlFor="isActive" className="font-normal">
                          {buildingData.isActive ? 'Active' : 'Inactive'}
                        </Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>Emergency and general contact details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={buildingData.contactEmail || ''}
                        onChange={(e) => setBuildingData({ ...buildingData, contactEmail: e.target.value || null })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        type="tel"
                        value={buildingData.contactPhone || ''}
                        onChange={(e) => setBuildingData({ ...buildingData, contactPhone: e.target.value || null })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      value={buildingData.emergencyPhone || ''}
                      onChange={(e) => setBuildingData({ ...buildingData, emergencyPhone: e.target.value || null })}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveBuilding} disabled={saving}>
                  {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Building Settings
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a building to view settings
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
                  <CardTitle>Pass Limits</CardTitle>
                  <CardDescription>Configure limits for parking passes</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxVehiclesPerUnit">Max Vehicles per Unit</Label>
                      <Input
                        id="maxVehiclesPerUnit"
                        type="number"
                        min="1"
                        max="10"
                        value={parkingRules.maxVehiclesPerUnit}
                        onChange={(e) => setParkingRules({ ...parkingRules, maxVehiclesPerUnit: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxConsecutiveHours">Max Consecutive Hours</Label>
                      <Input
                        id="maxConsecutiveHours"
                        type="number"
                        min="1"
                        max="168"
                        value={parkingRules.maxConsecutiveHours}
                        onChange={(e) => setParkingRules({ ...parkingRules, maxConsecutiveHours: parseInt(e.target.value) || 24 })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cooldownHours">Cooldown Hours</Label>
                      <Input
                        id="cooldownHours"
                        type="number"
                        min="0"
                        max="48"
                        value={parkingRules.cooldownHours}
                        onChange={(e) => setParkingRules({ ...parkingRules, cooldownHours: parseInt(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground">Hours before same vehicle can register again</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gracePeriodMinutes">Grace Period (minutes)</Label>
                      <Input
                        id="gracePeriodMinutes"
                        type="number"
                        min="0"
                        max="60"
                        value={parkingRules.gracePeriodMinutes}
                        onChange={(e) => setParkingRules({ ...parkingRules, gracePeriodMinutes: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Extension Rules</CardTitle>
                  <CardDescription>Configure pass extension settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxExtensions">Max Extensions</Label>
                      <Input
                        id="maxExtensions"
                        type="number"
                        min="0"
                        max="5"
                        value={parkingRules.maxExtensions}
                        onChange={(e) => setParkingRules({ ...parkingRules, maxExtensions: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="extensionMaxHours">Max Extension Hours</Label>
                      <Input
                        id="extensionMaxHours"
                        type="number"
                        min="1"
                        max="24"
                        value={parkingRules.extensionMaxHours}
                        onChange={(e) => setParkingRules({ ...parkingRules, extensionMaxHours: parseInt(e.target.value) || 4 })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Additional Options</CardTitle>
                  <CardDescription>Configure additional parking options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="requireUnitConfirmation">Require Unit Confirmation</Label>
                      <p className="text-sm text-muted-foreground">
                        Require residents to confirm visitor registrations
                      </p>
                    </div>
                    <Switch
                      id="requireUnitConfirmation"
                      checked={parkingRules.requireUnitConfirmation}
                      onCheckedChange={(checked) => setParkingRules({ ...parkingRules, requireUnitConfirmation: checked })}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allowEmergencyOverride">Allow Emergency Override</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow managers to override limits for emergencies
                      </p>
                    </div>
                    <Switch
                      id="allowEmergencyOverride"
                      checked={parkingRules.allowEmergencyOverride}
                      onCheckedChange={(checked) => setParkingRules({ ...parkingRules, allowEmergencyOverride: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveParkingRules} disabled={saving}>
                  {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Parking Rules
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No parking rules configured for this building
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure email notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Pass Confirmation</Label>
                  <p className="text-sm text-muted-foreground">
                    Send confirmation email when pass is created
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Expiration Warning</Label>
                  <p className="text-sm text-muted-foreground">
                    Send warning email before pass expires
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Violation Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email when violations are logged
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require 2FA for all admin accounts
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>IP Allowlist</Label>
                  <p className="text-sm text-muted-foreground">
                    Restrict dashboard access to specific IPs
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Audit Logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Log all user actions for compliance
                  </p>
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
