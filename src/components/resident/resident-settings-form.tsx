'use client';

import { useState } from 'react';
import { useMountEffect } from '@/hooks/use-mount-effect';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PASSWORD_REQUIREMENTS_TEXT, getPasswordValidationError } from '@/lib/validation';

export function ResidentSettingsForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [currentPasswordTouched, setCurrentPasswordTouched] = useState(false);
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);

  const isChangingPassword = Boolean(currentPassword || newPassword);
  const currentPasswordError =
    isChangingPassword && !currentPassword.trim() ? 'Current password is required.' : null;
  const newPasswordError = newPassword ? getPasswordValidationError(newPassword) : null;
  const showCurrentPasswordError =
    (currentPasswordTouched || hasAttemptedSubmit) && Boolean(currentPasswordError);
  const showNewPasswordError =
    (newPasswordTouched || hasAttemptedSubmit) && Boolean(newPasswordError);

  useMountEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/resident/settings');
        if (res.ok) {
          const data = await res.json();
          setName(data.name ?? '');
          setEmail(data.email ?? '');
          setPhone(data.phone ?? '');
        }
      } catch {
        // Handle error silently
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setMessage(null);

    if (currentPasswordError || newPasswordError) {
      return;
    }

    setIsSaving(true);

    try {
      const body: Record<string, string | undefined> = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      };

      if (accessCode.trim()) {
        body.accessCode = accessCode.trim();
      }

      if (newPassword && currentPassword) {
        body.currentPassword = currentPassword;
        body.password = newPassword;
      }

      const res = await fetch('/api/resident/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        setAccessCode('');
        setCurrentPassword('');
        setNewPassword('');
        setHasAttemptedSubmit(false);
        setCurrentPasswordTouched(false);
        setNewPasswordTouched(false);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="h-11" />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="h-11" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unit Access Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Set a PIN that visitors must enter to register for your unit.
          </p>
          <Input
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Enter new access code"
            type="password"
            className="h-11"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Current Password</Label>
            <Input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              onBlur={() => setCurrentPasswordTouched(true)}
              type="password"
              className="h-11"
            />
            {showCurrentPasswordError ? (
              <p className="text-sm text-destructive">{currentPasswordError}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>New Password</Label>
            <Input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onBlur={() => setNewPasswordTouched(true)}
              type="password"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_TEXT}</p>
            {showNewPasswordError ? (
              <p className="text-sm text-destructive">{newPasswordError}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full min-h-[48px]" disabled={isSaving}>
        {isSaving ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
        ) : (
          <><Save className="h-4 w-4 mr-2" /> Save Settings</>
        )}
      </Button>
    </form>
  );
}
