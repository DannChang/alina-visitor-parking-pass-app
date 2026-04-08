'use client';

import { ScrollText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PrivacyPolicyContent } from '@/components/registration/privacy-policy-content';

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ScrollText className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Privacy Policy</CardTitle>
          <CardDescription>
            Alina Visitor Parking — How we handle your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/20 p-6">
            <PrivacyPolicyContent />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
