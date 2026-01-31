'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Home, Phone, Mail, Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Building {
  id: string;
  name: string;
  slug: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  floor: number | null;
  section: string | null;
  primaryPhone: string | null;
  primaryEmail: string | null;
  isOccupied: boolean;
  isActive: boolean;
  building: {
    id: string;
    name: string;
  };
  _count: {
    parkingPasses: number;
    residents: number;
  };
}

function UnitsLoading() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState({
    unitNumber: '',
    floor: '',
    section: '',
    primaryPhone: '',
    primaryEmail: '',
    buildingId: '',
    isOccupied: true,
    isActive: true,
  });

  const fetchUnits = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBuilding !== 'all') {
        params.append('buildingId', selectedBuilding);
      }
      if (search) {
        params.append('search', search);
      }
      const response = await fetch(`/api/units/manage?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch units');
      const data = await response.json();
      setUnits(data.units || []);
      setBuildings(data.buildings || []);
    } catch (error) {
      toast.error('Failed to load units');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedBuilding, search]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleOpenDialog = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        unitNumber: unit.unitNumber,
        floor: unit.floor?.toString() || '',
        section: unit.section || '',
        primaryPhone: unit.primaryPhone || '',
        primaryEmail: unit.primaryEmail || '',
        buildingId: unit.building.id,
        isOccupied: unit.isOccupied,
        isActive: unit.isActive,
      });
    } else {
      setEditingUnit(null);
      setFormData({
        unitNumber: '',
        floor: '',
        section: '',
        primaryPhone: '',
        primaryEmail: '',
        buildingId: buildings[0]?.id || '',
        isOccupied: true,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        floor: formData.floor ? parseInt(formData.floor) : null,
      };

      const url = editingUnit
        ? `/api/units/manage?id=${editingUnit.id}`
        : '/api/units/manage';

      const response = await fetch(url, {
        method: editingUnit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save unit');
      }

      toast.success(editingUnit ? 'Unit updated successfully' : 'Unit created successfully');
      setIsDialogOpen(false);
      fetchUnits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save unit');
    }
  };

  const handleDelete = async (unit: Unit) => {
    if (!confirm(`Are you sure you want to delete unit ${unit.unitNumber}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/units/manage?id=${unit.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete unit');

      toast.success('Unit deleted successfully');
      fetchUnits();
    } catch (error) {
      toast.error('Failed to delete unit');
      console.error(error);
    }
  };

  const filteredUnits = units.filter((unit) => {
    const matchesSearch = search
      ? unit.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
        unit.section?.toLowerCase().includes(search.toLowerCase()) ||
        unit.primaryEmail?.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unit Management</h1>
          <p className="text-muted-foreground">Manage building units and their configuration</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Unit
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search units..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by building" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map((building) => (
              <SelectItem key={building.id} value={building.id}>
                {building.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Units</CardTitle>
          <CardDescription>
            {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <UnitsLoading />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Floor/Section</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Passes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No units found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUnits.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Home className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{unit.unitNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span>{unit.building.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {unit.floor && <span>Floor {unit.floor}</span>}
                        {unit.floor && unit.section && ' - '}
                        {unit.section && <span>{unit.section}</span>}
                        {!unit.floor && !unit.section && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {unit.primaryEmail && (
                            <div className="flex items-center space-x-1 text-xs">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span>{unit.primaryEmail}</span>
                            </div>
                          )}
                          {unit.primaryPhone && (
                            <div className="flex items-center space-x-1 text-xs">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{unit.primaryPhone}</span>
                            </div>
                          )}
                          {!unit.primaryEmail && !unit.primaryPhone && (
                            <span className="text-muted-foreground text-xs">No contact</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{unit._count.parkingPasses} passes</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={unit.isActive ? 'default' : 'secondary'}>
                            {unit.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant={unit.isOccupied ? 'outline' : 'secondary'}>
                            {unit.isOccupied ? 'Occupied' : 'Vacant'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(unit)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(unit)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
            <DialogDescription>
              {editingUnit
                ? 'Make changes to the unit configuration.'
                : 'Add a new unit to the building.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="buildingId" className="text-right">
                  Building
                </Label>
                <Select
                  value={formData.buildingId}
                  onValueChange={(value) => setFormData({ ...formData, buildingId: value })}
                >
                  <SelectTrigger className="col-span-3">
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unitNumber" className="text-right">
                  Unit #
                </Label>
                <Input
                  id="unitNumber"
                  value={formData.unitNumber}
                  onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="floor" className="text-right">
                  Floor
                </Label>
                <Input
                  id="floor"
                  type="number"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="section" className="text-right">
                  Section
                </Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="col-span-3"
                  placeholder="e.g., Wing A"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="primaryEmail" className="text-right">
                  Email
                </Label>
                <Input
                  id="primaryEmail"
                  type="email"
                  value={formData.primaryEmail}
                  onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="primaryPhone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="primaryPhone"
                  type="tel"
                  value={formData.primaryPhone}
                  onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isOccupied" className="text-right">
                  Occupied
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Switch
                    id="isOccupied"
                    checked={formData.isOccupied}
                    onCheckedChange={(checked) => setFormData({ ...formData, isOccupied: checked })}
                  />
                  <Label htmlFor="isOccupied" className="font-normal">
                    {formData.isOccupied ? 'Yes' : 'No'}
                  </Label>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">
                  Active
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive" className="font-normal">
                    {formData.isActive ? 'Yes' : 'No'}
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingUnit ? 'Save Changes' : 'Create Unit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
