'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Guest {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  licensePlate: string | null;
}

interface GuestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: Guest | null;
  onSuccess: () => void;
}

export function GuestForm({ open, onOpenChange, guest, onSuccess }: GuestFormProps) {
  const t = useTranslations('resident');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = (g: Guest | null) => {
    if (g) {
      setName(g.name);
      setPhone(g.phone ?? '');
      setEmail(g.email ?? '');
      setLicensePlate(g.licensePlate ?? '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setLicensePlate('');
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (value) {
      resetForm(guest);
    }
    onOpenChange(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    const body = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      licensePlate: licensePlate.trim() || undefined,
    };

    try {
      const url = guest ? `/api/resident/guests/${guest.id}` : '/api/resident/guests';
      const method = guest ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSuccess();
      }
    } catch {
      // Handle error silently
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{guest ? t('editGuest') : t('addGuest')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('name')} *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('guestName')}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('phone')}</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="555-123-4567"
              type="tel"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('email')}</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              type="email"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('licensePlate')}</Label>
            <Input
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              placeholder="ABC1234"
              className="h-11 uppercase"
            />
          </div>
          <Button type="submit" className="min-h-[48px] w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : guest ? (
              t('saveChanges')
            ) : (
              t('addGuest')
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
