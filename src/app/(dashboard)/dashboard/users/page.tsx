'use client';

import { useState, useCallback } from 'react';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
import { Users, Search, Plus, Edit2, Trash2, Ban, CheckCircle } from 'lucide-react';
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
import { formatDistanceToNow } from 'date-fns';
import {
  handleClickableRowKeyDown,
  stopClickableRowPropagation,
} from '@/components/dashboard/clickable-row';
import { useTranslations } from 'next-intl';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  isSuspended: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: {
    violations: number;
    managedBuildings: number;
  };
}


function UsersLoading() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export default function UsersPage() {
  const t = useTranslations('dashboard.usersPage');
  const tc = useTranslations('common');
  const roleLabels: Record<string, { label: string; color: string }> = {
    SUPER_ADMIN: { label: t('superAdmin'), color: 'destructive' },
    ADMIN: { label: t('admin'), color: 'default' },
    MANAGER: { label: t('manager'), color: 'secondary' },
    SECURITY: { label: t('security'), color: 'outline' },
  };
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'MANAGER',
    isActive: true,
  });

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);

      const response = await fetch(`/api/users?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      toast.error(t('noUsersFound'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useFetchOnChange(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        name: user.name || '',
        password: '',
        role: user.role,
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        name: '',
        password: '',
        role: 'MANAGER',
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
        ...(formData.password ? { password: formData.password } : {}),
      };

      const url = editingUser ? `/api/users?id=${editingUser.id}` : '/api/users';

      const response = await fetch(url, {
        method: editingUser ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save user');
      }

      toast.success(editingUser ? t('editUser') : t('addUser'));
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('error'));
    }
  };

  const handleToggleSuspend = async (user: User) => {
    const action = user.isSuspended ? 'unsuspend' : 'suspend';
    if (!confirm(`Are you sure you want to ${action} ${user.email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: !user.isSuspended }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} user`);

      toast.success(`User ${action}ed successfully`);
      fetchUsers();
    } catch (error) {
      toast.error(`Failed to ${action} user`);
      console.error(error);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete user');

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
      console.error(error);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto min-h-[44px] md:min-h-0">
          <Plus className="mr-2 h-4 w-4" />
          {t('addUser')}
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
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full md:w-[180px] h-11 md:h-10">
            <SelectValue placeholder={t('allRoles')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allRoles')}</SelectItem>
            <SelectItem value="SUPER_ADMIN">{t('superAdmin')}</SelectItem>
            <SelectItem value="ADMIN">{t('admin')}</SelectItem>
            <SelectItem value="MANAGER">{t('manager')}</SelectItem>
            <SelectItem value="SECURITY">{t('security')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl">{t('title')}</CardTitle>
          <CardDescription>{t('usersFound', { count: users.length })}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {loading ? (
            <UsersLoading />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('lastLogin')}</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {t('noUsersFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow
                      key={user.id}
                      tabIndex={0}
                      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      onClick={() => handleOpenDialog(user)}
                      onKeyDown={(event) =>
                        handleClickableRowKeyDown(event, () => handleOpenDialog(user))
                      }
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{user.name || 'No name'}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleLabels[user.role]?.color as 'default' | 'secondary' | 'destructive' | 'outline'}>
                          {roleLabels[user.role]?.label || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? t('active') : tc('inactive')}
                          </Badge>
                          {user.isSuspended && (
                            <Badge variant="destructive">{t('suspended')}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt ? (
                          <span className="text-sm">
                            {formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">{t('never')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          <span>{user._count.violations} violations logged</span>
                          <span>{user._count.managedBuildings} buildings</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              stopClickableRowPropagation(event);
                              handleOpenDialog(user);
                            }}
                            title="Edit user"
                            onKeyDown={stopClickableRowPropagation}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              stopClickableRowPropagation(event);
                              handleToggleSuspend(user);
                            }}
                            title={user.isSuspended ? 'Unsuspend user' : 'Suspend user'}
                            onKeyDown={stopClickableRowPropagation}
                          >
                            {user.isSuspended ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Ban className="h-4 w-4 text-orange-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              stopClickableRowPropagation(event);
                              handleDelete(user);
                            }}
                            title="Delete user"
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
            <DialogTitle>{editingUser ? t('editUser') : t('addUser')}</DialogTitle>
            <DialogDescription>
              {editingUser ? t('description') : t('description')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-11 md:h-10 text-base md:text-sm"
                  required
                  disabled={!!editingUser}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{t('name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-11 md:h-10 text-base md:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-11 md:h-10 text-base md:text-sm"
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Required'}
                  required={!editingUser}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t('role')}</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger className="h-11 md:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">{t('manager')}</SelectItem>
                    <SelectItem value="ADMIN">{t('admin')}</SelectItem>
                    <SelectItem value="SECURITY">{t('security')}</SelectItem>
                  </SelectContent>
                </Select>
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
                    {formData.isActive ? tc('yes') : tc('no')}
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="min-h-[44px] md:min-h-0">
                {tc('cancel')}
              </Button>
              <Button type="submit" className="min-h-[44px] md:min-h-0">
                {editingUser ? tc('save') : t('addUser')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
