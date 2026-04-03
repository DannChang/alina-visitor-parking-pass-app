import { Shield, Database, Clock, Eye, UserCheck, Globe, Mail } from 'lucide-react';
import { PRIVACY_POLICY_LAST_UPDATED } from '@/lib/privacy-policy';

export function PrivacyPolicyContent() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
      <div>
        <p className="text-xs text-muted-foreground/70">
          Last updated: {PRIVACY_POLICY_LAST_UPDATED}
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Shield className="h-4 w-4 text-primary" />
          1. Introduction
        </h3>
        <p>
          Alina Visitor Parking (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) provides a
          visitor parking registration service for residential properties. This Privacy Policy
          explains how personal information is collected, used, disclosed, and protected when you
          use the service.
        </p>
        <p>
          For visitor parking activity in British Columbia, we intend this policy to reflect the{' '}
          <strong>Personal Information Protection Act (British Columbia)</strong> and other
          applicable Canadian privacy requirements. Depending on how the service is operated or
          where information is processed, other privacy laws may also apply.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Database className="h-4 w-4 text-primary" />
          2. Information We Collect
        </h3>
        <p>When you register a visitor parking pass, we collect information such as:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Vehicle information:</strong> license plate number and vehicle details you
            provide, such as make, model, year, colour, and plate jurisdiction where applicable.
          </li>
          <li>
            <strong>Contact information:</strong> phone number and email address.
          </li>
          <li>
            <strong>Visit details:</strong> the building and unit you are visiting, requested
            parking duration, and pass timestamps.
          </li>
          <li>
            <strong>Technical information:</strong> for web submissions, we may record IP address,
            browser user agent, and related request metadata for security, troubleshooting, and
            service integrity purposes.
          </li>
        </ul>
        <p>
          We do not ask for payment card information through this registration flow. Please do not
          provide sensitive personal information that is not required for visitor parking.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Eye className="h-4 w-4 text-primary" />
          3. How We Use Your Information
        </h3>
        <p>We use personal information for the following purposes:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Parking pass administration:</strong> to create, validate, display, update, and
            manage visitor parking passes.
          </li>
          <li>
            <strong>Parking enforcement and compliance:</strong> to verify authorization, identify
            misuse, and support the property&apos;s parking administration processes.
          </li>
          <li>
            <strong>Service communications:</strong> to send confirmations, reminders, and other
            operational notices related to the parking session.
          </li>
          <li>
            <strong>Security and fraud prevention:</strong> to detect duplicate or abusive use,
            investigate issues, and maintain the integrity of the service.
          </li>
          <li>
            <strong>Legal and operational obligations:</strong> to comply with applicable law,
            respond to lawful requests, and maintain appropriate internal records.
          </li>
        </ul>
        <p>We do not use this registration information for unrelated marketing purposes.</p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <UserCheck className="h-4 w-4 text-primary" />
          4. Consent
        </h3>
        <p>
          By acknowledging the privacy notice and submitting a visitor parking registration, you
          consent to the collection, use, and disclosure of your personal information for the
          purposes described in this policy.
        </p>
        <p>
          You may ask questions about these practices or seek to withdraw consent, subject to legal
          or contractual restrictions and reasonable notice. If required information cannot be used
          for parking administration, we may be unable to issue or maintain a pass.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Globe className="h-4 w-4 text-primary" />
          5. Disclosure of Information
        </h3>
        <p>
          We may disclose personal information where reasonably necessary to operate the service:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Property management and authorized staff:</strong> including strata,
            condominium, building management, and security personnel responsible for parking
            administration at the property you are visiting.
          </li>
          <li>
            <strong>Service providers:</strong> providers that help host, support, or communicate
            through the service, acting on our instructions or under appropriate contractual terms.
          </li>
          <li>
            <strong>Legal authorities or other parties:</strong> where required or permitted by
            applicable law.
          </li>
        </ul>
        <p>
          We do not sell personal information collected through the visitor parking registration
          flow.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Clock className="h-4 w-4 text-primary" />
          6. Data Retention
        </h3>
        <p>
          We retain personal information only for as long as reasonably necessary for the purposes
          described in this policy, our documented retention practices, and applicable legal
          requirements.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Visitor parking records may remain available while a pass is active and for a reasonable
            period afterward to support administration, dispute handling, enforcement, security
            review, and system integrity.
          </li>
          <li>
            Records used to make a decision that directly affects an individual may be retained for
            at least the minimum period required by applicable law.
          </li>
          <li>
            Information that is no longer required will be deleted, anonymized, or otherwise removed
            from routine use within our normal data-management processes.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Shield className="h-4 w-4 text-primary" />
          7. Data Security
        </h3>
        <p>
          We use reasonable administrative, technical, and physical safeguards appropriate to the
          sensitivity of the information and the nature of the service.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Access controls intended to limit personal information to authorized users.</li>
          <li>
            Security measures to protect the web service and related systems from unauthorized
            access or misuse.
          </li>
          <li>Operational processes for reviewing incidents, misuse, and service activity.</li>
        </ul>
        <p>
          No method of storage or transmission is completely secure, but we work to protect personal
          information against unauthorized access, use, disclosure, or loss.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <UserCheck className="h-4 w-4 text-primary" />
          8. Your Rights
        </h3>
        <p>Subject to applicable law, you may have the right to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Access:</strong> request access to your personal information.
          </li>
          <li>
            <strong>Correction:</strong> request correction of inaccurate personal information.
          </li>
          <li>
            <strong>Questions or complaints:</strong> contact us about our privacy practices or make
            a complaint if you believe your information has been handled improperly.
          </li>
          <li>
            <strong>Withdrawal of consent:</strong> ask to withdraw consent, subject to legal or
            operational limits.
          </li>
        </ul>
        <p>
          Please contact us using the information in Section 10. Where applicable, we will respond
          within the time required by law.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Globe className="h-4 w-4 text-primary" />
          9. Strata/Condominium Parking Rules
        </h3>
        <p>
          The visitor parking rules enforced through this Service (including time limits, maximum
          consecutive days, and vehicle restrictions) are established by the strata/condominium
          corporation that manages the property you are visiting, not by us. Enforcement actions are
          carried out by the property&apos;s authorized management or security personnel in
          accordance with applicable property rules and law.
        </p>
        <p>
          This Service facilitates the administration of visitor parking but does not independently
          determine or resolve all enforcement disputes. Questions about a specific property&apos;s
          parking rules should be directed to that property&apos;s management.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Mail className="h-4 w-4 text-primary" />
          10. Contact Us
        </h3>
        <p>
          If you have questions about this Privacy Policy, would like to request access or
          correction, or have a concern about how personal information is handled, please contact
          the property manager, strata/condominium corporation, or organization that provided your
          parking registration link.
        </p>
        <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
          <p>
            <strong>Privacy contact for your property or service provider</strong>
          </p>
          <p>
            Use the contact information made available by the property or the operator of this
            service.
          </p>
        </div>
        <p>
          You may also contact the{' '}
          <strong>Office of the Information and Privacy Commissioner for British Columbia</strong>{' '}
          at <strong>www.oipc.bc.ca</strong>. If federal privacy law applies to your situation, you
          may also contact the <strong>Office of the Privacy Commissioner of Canada</strong> at{' '}
          <strong>www.priv.gc.ca</strong>.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">11. Changes to This Policy</h3>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will post the updated
          version and revise the &quot;Last updated&quot; date. Material changes will apply to
          future uses of the service after the updated notice has been presented.
        </p>
      </section>
    </div>
  );
}
