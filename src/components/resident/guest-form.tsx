'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (guest) {
      setName(guest.name);
      setPhone(guest.phone ?? '');
      setEmail(guest.email ?? '');
      setLicensePlate(guest.licensePlate ?? '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setLicensePlate('');
    }
  }, [guest, open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{guest ? 'Edit Guest' : 'Add Guest'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-123-4567" type="tel" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guest@email.com" type="email" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>License Plate</Label>
            <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value.toUpperCase())} placeholder="ABC1234" className="h-11 uppercase" />
          </div>
          <Button type="submit" className="w-full min-h-[48px]" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (guest ? 'Save Changes' : 'Add Guest')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
