'use client';

import { useState, useCallback } from 'react';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
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
import {
  handleClickableRowKeyDown,
  stopClickableRowPropagation,
} from '@/components/dashboard/clickable-row';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('dashboard.unitsPage');
  const tc = useTranslations('common');
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
      toast.error(t('failedToLoad'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedBuilding, search]);

  useFetchOnChange(() => {
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

      toast.success(editingUnit ? t('unitUpdated') : t('unitCreated'));
      setIsDialogOpen(false);
      fetchUnits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('failedToSave'));
    }
  };

  const handleDelete = async (unit: Unit) => {
    if (!confirm(t('deleteConfirm', { number: unit.unitNumber }))) {
      return;
    }

    try {
      const response = await fetch(`/api/units/manage?id=${unit.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete unit');

      toast.success(t('unitDeleted'));
      fetchUnits();
    } catch (error) {
      toast.error(t('failedToDelete'));
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto min-h-[44px] md:min-h-0">
          <Plus className="mr-2 h-4 w-4" />
          {t('addUnit')}
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="relative w-full md:flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 md:h-10 text-base md:text-sm"
          />
        </div>
        <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
          <SelectTrigger className="w-full md:w-[200px] h-11 md:h-10">
            <SelectValue placeholder={t('filterBuilding')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allBuildings')}</SelectItem>
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
          <CardTitle className="text-lg md:text-xl">{t('unit')}</CardTitle>
          <CardDescription>{t('unitsFound', { count: filteredUnits.length })}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {loading ? (
            <UnitsLoading />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('unit')}</TableHead>
                  <TableHead>{t('building')}</TableHead>
                  <TableHead>{t('floorSection')}</TableHead>
                  <TableHead>{t('contact')}</TableHead>
                  <TableHead>{t('passes')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {t('noUnitsFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUnits.map((unit) => (
                    <TableRow
                      key={unit.id}
                      tabIndex={0}
                      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      onClick={() => handleOpenDialog(unit)}
                      onKeyDown={(event) =>
                        handleClickableRowKeyDown(event, () => handleOpenDialog(unit))
                      }
                    >
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
                        {unit.floor && <span>{t('floor', { number: unit.floor })}</span>}
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
                            <span className="text-muted-foreground text-xs">{t('noContact')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t('passesCount', { count: unit._count.parkingPasses })}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={unit.isActive ? 'default' : 'secondary'}>
                            {unit.isActive ? t('active') : t('inactive')}
                          </Badge>
                          <Badge variant={unit.isOccupied ? 'outline' : 'secondary'}>
                            {unit.isOccupied ? t('occupied') : t('vacant')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              stopClickableRowPropagation(event);
                              handleOpenDialog(unit);
                            }}
                            onKeyDown={stopClickableRowPropagation}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              stopClickableRowPropagation(event);
                              handleDelete(unit);
                            }}
                            onKeyDown={stopClickableRowPropagation}
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
            <DialogTitle>{editingUnit ? t('editUnit') : t('addNewUnit')}</DialogTitle>
            <DialogDescription>
              {editingUnit ? t('editUnitDesc') : t('addNewUnitDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="buildingId">{t('building')}</Label>
                <Select
                  value={formData.buildingId}
                  onValueChange={(value) => setFormData({ ...formData, buildingId: value })}
                >
                  <SelectTrigger className="h-11 md:h-10">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="unitNumber">{t('unitNumber')}</Label>
                  <Input
                    id="unitNumber"
                    value={formData.unitNumber}
                    onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                    className="h-11 md:h-10 text-base md:text-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">{t('floorSection').split('/')[0]}</Label>
                  <Input
                    id="floor"
                    type="number"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="h-11 md:h-10 text-base md:text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">{t('section')}</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="h-11 md:h-10 text-base md:text-sm"
                  placeholder={t('sectionPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryEmail">{t('contact')}</Label>
                <Input
                  id="primaryEmail"
                  type="email"
                  value={formData.primaryEmail}
                  onChange={(e) => setFormData({ ...formData, primaryEmail: e.target.value })}
                  className="h-11 md:h-10 text-base md:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryPhone">{t('contact')}</Label>
                <Input
                  id="primaryPhone"
                  type="tel"
                  value={formData.primaryPhone}
                  onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                  className="h-11 md:h-10 text-base md:text-sm"
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="isOccupied">{t('occupied')}</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isOccupied"
                    checked={formData.isOccupied}
                    onCheckedChange={(checked) => setFormData({ ...formData, isOccupied: checked })}
                  />
                  <Label htmlFor="isOccupied" className="font-normal">
                    {formData.isOccupied ? t('yes') : t('no')}
                  </Label>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <Label htmlFor="isActive">{t('active')}</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive" className="font-normal">
                    {formData.isActive ? t('yes') : t('no')}
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="min-h-[44px] md:min-h-0">
                {tc('cancel')}
              </Button>
              <Button type="submit" className="min-h-[44px] md:min-h-0">
                {editingUnit ? t('saveChanges') : t('createUnit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
