import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resident Portal - Alina Visitor Parking',
  description: 'Manage visitor parking passes for your unit',
};

export default function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
