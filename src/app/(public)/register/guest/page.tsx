import { redirect } from 'next/navigation';

export default function GuestRegistrationPage() {
  redirect('/resident/login');
}
