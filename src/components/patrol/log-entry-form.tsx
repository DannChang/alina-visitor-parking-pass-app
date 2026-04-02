'use client';

import { useState } from 'react';
import { Loader2, Plus, Camera, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface LogEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LogEntryForm({ open, onOpenChange, onSuccess }: LogEntryFormProps) {
  const t = useTranslations('patrol');
  const tc = useTranslations('common');

  const ENTRY_TYPES = [
    { value: 'SPOT_CHECK', label: t('entrySpotCheck') },
    { value: 'NOTE', label: t('entryNote') },
  ] as const;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [licensePlate, setLicensePlate] = useState('');
  const [entryType, setEntryType] = useState<string>('SPOT_CHECK');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPhoto(dataUrl);
      }
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
  };

  const resetForm = () => {
    setLicensePlate('');
    setEntryType('SPOT_CHECK');
    setLocation('');
    setNotes('');
    setPhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!licensePlate.trim()) {
      toast.error(t('licensePlateRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      const photoUrls: string[] = [];
      if (photo) {
        photoUrls.push(photo);
      }

      const response = await fetch('/api/patrol/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licensePlate: licensePlate.trim().toUpperCase(),
          entryType,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
          photoUrls,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create log entry');
      }

      toast.success(t('logEntryCreated'));
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create log entry'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('logEntryTitle')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* License Plate */}
          <div className="space-y-2">
            <Label htmlFor="licensePlate">{t('licensePlateLabel')}</Label>
            <Input
              id="licensePlate"
              placeholder="e.g., ABC1234"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              className="font-mono uppercase"
              autoFocus
            />
          </div>

          {/* Entry Type */}
          <div className="space-y-2">
            <Label htmlFor="entryType">{t('entryTypeLabel')}</Label>
            <Select value={entryType} onValueChange={setEntryType}>
              <SelectTrigger id="entryType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">{t('locationLabel')}</Label>
            <Input
              id="location"
              placeholder={t('locationPlaceholder')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('notesLabel')}</Label>
            <Textarea
              id="notes"
              placeholder={t('notesPlaceholder')}
              className="resize-none"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Photo */}
          <div className="space-y-2">
            <Label>{t('photoLabel')}</Label>
            {photo ? (
              <div className="relative w-32 aspect-square rounded-md overflow-hidden border">
                <img
                  src={photo}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="w-32 aspect-square rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50">
                <Camera className="h-6 w-6 text-slate-400" />
                <span className="text-xs text-slate-500 mt-1">{t('addPhoto')}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !licensePlate.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('addEntry')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
