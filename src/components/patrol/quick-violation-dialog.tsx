'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Camera, Plus, X, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const violationSchema = z.object({
  type: z.enum([
    'OVERSTAY',
    'UNREGISTERED',
    'IMPROPER_PARKING',
    'BLOCKING',
    'RESERVED_SPOT',
    'EXPIRED_PASS',
    'FRAUDULENT_REGISTRATION',
    'EMERGENCY_LANE_VIOLATION',
    'HANDICAP_VIOLATION',
    'OTHER',
  ]),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().optional(),
  location: z.string().optional(),
});

type ViolationFormData = z.infer<typeof violationSchema>;

interface QuickViolationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licensePlate: string;
  scanImage: string | null;
  onSuccess: () => void;
}

const VIOLATION_TYPES = [
  { value: 'UNREGISTERED', label: 'Unregistered Vehicle' },
  { value: 'EXPIRED_PASS', label: 'Expired Pass' },
  { value: 'OVERSTAY', label: 'Overstay' },
  { value: 'IMPROPER_PARKING', label: 'Improper Parking' },
  { value: 'BLOCKING', label: 'Blocking' },
  { value: 'RESERVED_SPOT', label: 'Reserved Spot' },
  { value: 'EMERGENCY_LANE_VIOLATION', label: 'Emergency Lane' },
  { value: 'HANDICAP_VIOLATION', label: 'Handicap Violation' },
  { value: 'FRAUDULENT_REGISTRATION', label: 'Fraudulent Registration' },
  { value: 'OTHER', label: 'Other' },
];

const SEVERITY_LEVELS = [
  { value: 'LOW', label: 'Low', color: 'text-green-600' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-600' },
  { value: 'HIGH', label: 'High', color: 'text-orange-600' },
  { value: 'CRITICAL', label: 'Critical', color: 'text-red-600' },
];

export function QuickViolationDialog({
  open,
  onOpenChange,
  licensePlate,
  scanImage,
  onSuccess,
}: QuickViolationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);

  const form = useForm<ViolationFormData>({
    resolver: zodResolver(violationSchema),
    defaultValues: {
      type: 'UNREGISTERED',
      severity: 'MEDIUM',
      description: '',
      location: '',
    },
  });

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setAdditionalPhotos((prev) => [...prev, dataUrl]);
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setAdditionalPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ViolationFormData) => {
    setIsSubmitting(true);

    try {
      // Collect all photos
      const photoUrls: string[] = [];
      if (scanImage) {
        photoUrls.push(scanImage);
      }
      photoUrls.push(...additionalPhotos);

      const response = await fetch('/api/violations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licensePlate,
          type: data.type,
          severity: data.severity,
          description: data.description || undefined,
          location: data.location || undefined,
          photoUrls,
          evidenceNotes: scanImage ? 'Photo captured via patrol scan' : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create violation');
      }

      toast.success('Violation logged successfully');
      onSuccess();
      onOpenChange(false);

      // Reset form
      form.reset();
      setAdditionalPhotos([]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to log violation'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Issue Violation
          </DialogTitle>
          <DialogDescription>
            Log a violation for plate: <strong>{licensePlate}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Violation Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Violation Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VIOLATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Severity */}
            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SEVERITY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <span className={level.color}>{level.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Lot A, Row 3, Spot 15"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about the violation..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photos */}
            <div className="space-y-2">
              <FormLabel>Evidence Photos</FormLabel>
              <div className="grid grid-cols-3 gap-2">
                {/* Scan image */}
                {scanImage && (
                  <div className="relative aspect-square rounded-md overflow-hidden border">
                    <img
                      src={scanImage}
                      alt="Scan"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-0.5">
                      Scan
                    </div>
                  </div>
                )}

                {/* Additional photos */}
                {additionalPhotos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-md overflow-hidden border"
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {/* Add photo button */}
                {additionalPhotos.length < 4 && (
                  <label className="aspect-square rounded-md border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50">
                    <Camera className="h-6 w-6 text-slate-400" />
                    <span className="text-xs text-slate-500 mt-1">Add</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleAddPhoto}
                    />
                  </label>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Log Violation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
