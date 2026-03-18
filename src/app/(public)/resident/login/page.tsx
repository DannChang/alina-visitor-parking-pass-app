import { ResidentLoginForm } from '@/components/resident/resident-login-form';

function getResidentCallbackUrl(rawCallbackUrl?: string) {
  if (!rawCallbackUrl || !rawCallbackUrl.startsWith('/')) {
    return '/resident/passes';
  }

  return rawCallbackUrl.includes('/resident/login') ? '/resident/passes' : rawCallbackUrl;
}

export default async function ResidentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = getResidentCallbackUrl(params.callbackUrl);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Resident Portal</h1>
        <p className="text-sm text-slate-600">Send a parking pass to your visitor</p>
      </div>
      <ResidentLoginForm
        showResetSuccess={params.reset === 'success'}
        callbackUrl={callbackUrl}
      />
    </main>
  );
}
