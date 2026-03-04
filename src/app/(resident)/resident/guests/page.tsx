'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Users, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResidentNav } from '@/components/resident/resident-nav';
import { GuestForm } from '@/components/resident/guest-form';

interface Guest {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  licensePlate: string | null;
  isActive: boolean;
}

export default function ResidentGuestsPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  const fetchGuests = useCallback(async () => {
    try {
      const res = await fetch('/api/resident/guests');
      if (res.ok) {
        const data = await res.json();
        setGuests(data.guests);
      }
    } catch {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this guest?')) return;
    try {
      const res = await fetch(`/api/resident/guests/${id}`, { method: 'DELETE' });
      if (res.ok) fetchGuests();
    } catch {
      // Handle error silently
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ResidentNav />
      <main className="container mx-auto max-w-lg px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Authorized Guests</h1>
          <Button onClick={() => { setEditingGuest(null); setShowForm(true); }} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Guest
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : guests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No authorized guests</p>
              <p className="text-sm">Add guests who visit regularly</p>
            </CardContent>
          </Card>
        ) : (
          guests.map((guest) => (
            <Card key={guest.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{guest.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingGuest(guest); setShowForm(true); }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(guest.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                {guest.phone && <p>Phone: {guest.phone}</p>}
                {guest.email && <p>Email: {guest.email}</p>}
                {guest.licensePlate && <p>Plate: {guest.licensePlate}</p>}
              </CardContent>
            </Card>
          ))
        )}

        <GuestForm
          open={showForm}
          onOpenChange={setShowForm}
          guest={editingGuest}
          onSuccess={() => { setShowForm(false); fetchGuests(); }}
        />
      </main>
    </div>
  );
}
