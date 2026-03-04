'use client';

import { ResidentNav } from '@/components/resident/resident-nav';
import { ResidentSettingsForm } from '@/components/resident/resident-settings-form';

export default function ResidentSettingsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <ResidentNav />
      <main className="container mx-auto max-w-lg px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold">Settings</h1>
        <ResidentSettingsForm />
      </main>
    </div>
  );
}
