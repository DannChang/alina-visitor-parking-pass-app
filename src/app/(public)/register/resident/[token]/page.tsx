import { getResidentInvitePreviewByToken } from '@/services/resident-invite-service';
import { ResidentInviteRegistrationForm } from '@/components/registration/resident-invite-registration-form';

export default async function ResidentInviteRegisterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getResidentInvitePreviewByToken(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <ResidentInviteRegistrationForm token={token} invite={invite} />
    </main>
  );
}
