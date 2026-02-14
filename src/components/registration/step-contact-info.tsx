'use client';

import { useState } from 'react';
import { User, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { WizardData } from './registration-wizard';

const DURATION_OPTIONS = [
  { value: 2, label: '2 hrs' },
  { value: 4, label: '4 hrs' },
  { value: 8, label: '8 hrs' },
  { value: 12, label: '12 hrs' },
  { value: 24, label: '24 hrs' },
];

interface StepContactInfoProps {
  data: Partial<WizardData>;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepContactInfo({ data, onUpdate, onNext, onBack }: StepContactInfoProps) {
  const [name, setName] = useState(data.visitorName ?? '');
  const [phone, setPhone] = useState(data.visitorPhone ?? '');
  const [email, setEmail] = useState(data.visitorEmail ?? '');
  const [duration, setDuration] = useState(data.duration ?? 2);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    setError(null);
    onUpdate({
      visitorName: name.trim(),
      visitorPhone: phone.trim() || '',
      visitorEmail: email.trim() || '',
      duration,
    });
    onNext();
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Your Information</CardTitle>
        <CardDescription>Enter your name and select parking duration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="visitorName">Your Name *</Label>
          <Input
            id="visitorName"
            placeholder="John Smith"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            className="h-12 text-base"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="space-y-2">
          <Label>Parking Duration *</Label>
          <div className="grid grid-cols-5 gap-2">
            {DURATION_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={duration === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDuration(option.value)}
                className="text-xs min-h-[44px] touch-manipulation"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="555-123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 text-base"
          />
          <p className="text-xs text-muted-foreground">
            Get text alerts before your pass expires
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email (optional)</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 text-base"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onBack} className="min-h-[48px]">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button onClick={handleContinue} className="flex-1 min-h-[48px]">
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
