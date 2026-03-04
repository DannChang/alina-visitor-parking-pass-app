import { RegistrationWizard } from '@/components/registration/registration-wizard';

export default function GuestRegistrationPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Visitor Parking</h1>
        <p className="text-sm text-slate-600">Register your vehicle for temporary parking</p>
      </div>
      <RegistrationWizard />
    </main>
  );
}
