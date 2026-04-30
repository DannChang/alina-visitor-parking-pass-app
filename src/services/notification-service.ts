import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { TIMEZONE_DEFAULT } from '@/lib/constants';
import { NotificationType, NotificationStatus } from '@prisma/client';

let resendClient: Resend | null = null;
function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  entityType?: string;
  entityId?: string;
}

interface PassConfirmationData {
  recipientEmail: string;
  licensePlate: string;
  unitNumber: string;
  buildingName: string;
  startTime: Date;
  endTime: Date;
  durationHours: number;
  confirmationCode: string;
  passId: string;
  timezone: string;
}

interface PassExpirationWarningData {
  recipientEmail: string;
  licensePlate: string;
  unitNumber: string;
  buildingName: string;
  durationHours: number;
  endTime: Date;
  passId: string;
}

interface ResidentInviteEmailData {
  inviteId: string;
  recipientEmail: string;
  recipientName: string;
  buildingName: string;
  unitNumber: string;
  registrationUrl: string;
  expiresAt: Date;
}

interface PasswordResetEmailData {
  recipientEmail: string;
  recipientName?: string;
  resetUrl: string;
  expiresAt: Date;
  accountType: 'staff' | 'resident';
  buildingName?: string;
  unitNumber?: string;
}

interface PasswordChangedConfirmationEmailData {
  recipientEmail: string;
  recipientName?: string;
  accountType: 'staff' | 'resident';
}

const FROM_EMAIL = process.env.EMAIL_FROM?.trim() || 'Alina Parking <noreply@alinaparking.com>';

interface PassNotificationContext {
  id: string;
  confirmationCode: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  visitorEmail: string | null;
  vehicle: {
    licensePlate: string;
  };
  unit: {
    unitNumber: string;
    building: {
      name: string;
      timezone: string;
    };
    residents: Array<{
      email: string | null;
    }>;
  };
  createdByResident: {
    email: string | null;
  } | null;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  // Create notification queue entry
  const notification = await prisma.notificationQueue.create({
    data: {
      type: NotificationType.EMAIL,
      recipient: options.to,
      subject: options.subject ?? null,
      body: options.html,
      status: NotificationStatus.PENDING,
      entityType: options.entityType ?? null,
      entityId: options.entityId ?? null,
    },
  });

  try {
    const { error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      await prisma.notificationQueue.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          failedAt: new Date(),
          errorMessage: error.message,
          attempts: { increment: 1 },
        },
      });
      console.error('Email send failed:', error);
      return false;
    }

    await prisma.notificationQueue.update({
      where: { id: notification.id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    return true;
  } catch (error) {
    await prisma.notificationQueue.update({
      where: { id: notification.id },
      data: {
        status: NotificationStatus.FAILED,
        failedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        attempts: { increment: 1 },
      },
    });
    console.error('Email send error:', error);
    return false;
  }
}

export async function sendPassConfirmation(data: PassConfirmationData): Promise<boolean> {
  const formattedStart = data.startTime.toLocaleString('en-US', {
    timeZone: data.timezone || TIMEZONE_DEFAULT,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const formattedEnd = data.endTime.toLocaleString('en-US', {
    timeZone: data.timezone || TIMEZONE_DEFAULT,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Parking Pass Confirmation</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Parking Pass Confirmed</h1>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">Your parking pass has been registered successfully.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef;">
          <div style="text-align: center; margin-bottom: 15px;">
            <span style="font-size: 12px; color: #666;">Confirmation Code</span>
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 3px; color: #1e3a5f;">
              ${data.confirmationCode.slice(0, 8).toUpperCase()}
            </div>
          </div>

          <hr style="border: none; border-top: 1px solid #e9ecef; margin: 15px 0;">

          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Vehicle</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 500;">${data.licensePlate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Building</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 500;">${data.buildingName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Visiting Unit</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 500;">${data.unitNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Valid From</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formattedStart}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Valid Until</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formattedEnd}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Duration</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 500;">${data.durationHours} hour${data.durationHours === 1 ? '' : 's'}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #666;">
          Please ensure you move your vehicle before the pass expires to avoid any violations or citations.
        </p>

        <p style="font-size: 14px; color: #666; margin-bottom: 0;">
          Thank you for visiting!<br>
          <strong>Alina Parking Management</strong>
        </p>
      </div>

      <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Parking Pass Confirmed

Your parking pass has been registered successfully.

Confirmation Code: ${data.confirmationCode.slice(0, 8).toUpperCase()}

Details:
- Vehicle: ${data.licensePlate}
- Building: ${data.buildingName}
- Visiting Unit: ${data.unitNumber}
- Valid From: ${formattedStart}
- Valid Until: ${formattedEnd}
- Duration: ${data.durationHours} hour${data.durationHours === 1 ? '' : 's'}

Please ensure you move your vehicle before the pass expires to avoid any violations or citations.

Thank you for visiting!
Alina Parking Management
  `.trim();

  return sendEmail({
    to: data.recipientEmail,
    subject: `Parking Pass Confirmed - ${data.licensePlate}`,
    html,
    text,
    entityType: 'ParkingPass',
    entityId: data.passId,
  });
}

export async function sendResidentInviteEmail(data: ResidentInviteEmailData): Promise<boolean> {
  const formattedExpiry = data.expiresAt.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Complete Your Resident Registration</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Complete Your Resident Registration</h1>
      </div>

      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">Hi ${data.recipientName},</p>

        <p>
          You have been invited to activate your resident account for
          <strong>${data.buildingName}</strong>, unit <strong>${data.unitNumber}</strong>.
        </p>

        <p>
          This registration link is one-time use and expires on <strong>${formattedExpiry}</strong>.
        </p>

        <div style="margin: 24px 0; text-align: center;">
          <a
            href="${data.registrationUrl}"
            style="display: inline-block; background: #1d4ed8; color: white; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;"
          >
            Complete Registration
          </a>
        </div>

        <p style="font-size: 14px; color: #475569;">
          If the button above does not work, copy and paste this link into your browser:
        </p>
        <p style="font-size: 14px; word-break: break-word; color: #1e293b;">
          ${data.registrationUrl}
        </p>

        <p style="font-size: 14px; color: #475569; margin-bottom: 0;">
          If you were not expecting this invitation, please contact your building management team.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Complete your resident registration

Hi ${data.recipientName},

You have been invited to activate your resident account for ${data.buildingName}, unit ${data.unitNumber}.

This link is one-time use and expires on ${formattedExpiry}.

Complete registration: ${data.registrationUrl}
  `.trim();

  return sendEmail({
    to: data.recipientEmail,
    subject: `Resident registration for ${data.buildingName}`,
    html,
    text,
    entityType: 'ResidentInvite',
    entityId: data.inviteId,
  });
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
  const formattedExpiry = data.expiresAt.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const accountLabel =
    data.accountType === 'resident'
      ? `${data.buildingName}, unit ${data.unitNumber}`
      : 'your staff account';
  const greeting = data.recipientName ? `Hi ${data.recipientName},` : 'Hello,';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
      </div>

      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">${greeting}</p>

        <p>We received a request to reset the password for <strong>${accountLabel}</strong>.</p>

        <p>
          This secure link expires on <strong>${formattedExpiry}</strong> and can only be used once.
        </p>

        <div style="margin: 24px 0; text-align: center;">
          <a
            href="${data.resetUrl}"
            style="display: inline-block; background: #1d4ed8; color: white; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;"
          >
            Reset Password
          </a>
        </div>

        <p style="font-size: 14px; color: #475569;">
          If the button above does not work, copy and paste this link into your browser:
        </p>
        <p style="font-size: 14px; word-break: break-word; color: #1e293b;">
          ${data.resetUrl}
        </p>

        <p style="font-size: 14px; color: #475569; margin-bottom: 0;">
          If you did not request this change, you can ignore this message.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Reset your password

${greeting}

We received a request to reset the password for ${accountLabel}.

This link expires on ${formattedExpiry}.

Reset password: ${data.resetUrl}
  `.trim();

  return sendEmail({
    to: data.recipientEmail,
    subject:
      data.accountType === 'resident'
        ? 'Reset your resident portal password'
        : 'Reset your account password',
    html,
    text,
    entityType: 'PasswordReset',
  });
}

export async function sendPasswordChangedConfirmationEmail(
  data: PasswordChangedConfirmationEmailData
): Promise<boolean> {
  const greeting = data.recipientName ? `Hi ${data.recipientName},` : 'Hello,';
  const accountLabel = data.accountType === 'resident' ? 'resident portal' : 'staff account';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Changed</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #14532d 0%, #16a34a 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Password Updated</h1>
      </div>

      <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">${greeting}</p>

        <p>The password for your <strong>${accountLabel}</strong> was changed successfully.</p>

        <p style="font-size: 14px; color: #166534; margin-bottom: 0;">
          If you did not make this change, contact support or building management immediately.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Password updated

${greeting}

The password for your ${accountLabel} was changed successfully.

If you did not make this change, contact support or building management immediately.
  `.trim();

  return sendEmail({
    to: data.recipientEmail,
    subject: 'Your password was changed',
    html,
    text,
    entityType: 'PasswordReset',
  });
}

export async function sendPassExpirationWarning(data: PassExpirationWarningData): Promise<boolean> {
  const formattedEnd = data.endTime.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Parking Pass Expiring Soon</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Your Parking Pass is Expiring</h1>
      </div>

      <div style="background: #fef2f2; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Your parking pass for <strong>${data.licensePlate}</strong> is about to expire.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #fecaca; text-align: center;">
          <span style="font-size: 14px; color: #666;">Expires At</span>
          <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-top: 5px;">
            ${formattedEnd}
          </div>
        </div>

        <p style="font-size: 14px; color: #666;">
          ${data.buildingName}, unit ${data.unitNumber}. Pass duration: ${data.durationHours} hour${data.durationHours === 1 ? '' : 's'}.
        </p>

        <p style="font-size: 14px; color: #666;">
          Please move your vehicle or extend your pass (if eligible) to avoid any violations or citations.
        </p>

        <p style="font-size: 14px; color: #666; margin-bottom: 0;">
          Thank you,<br>
          <strong>Alina Parking Management</strong>
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: data.recipientEmail,
    subject: `Parking Pass Expiring Soon - ${data.licensePlate}`,
    html,
    entityType: 'ParkingPass',
    entityId: data.passId,
  });
}

function getResidentRecipientEmails(pass: PassNotificationContext): string[] {
  const emails = [
    pass.createdByResident?.email ?? null,
    ...pass.unit.residents.map((resident) => resident.email),
  ];

  return [...new Set(emails.filter((email): email is string => Boolean(email?.trim())))];
}

async function getPassNotificationContext(passId: string): Promise<PassNotificationContext | null> {
  return prisma.parkingPass.findUnique({
    where: { id: passId, deletedAt: null },
    select: {
      id: true,
      confirmationCode: true,
      duration: true,
      startTime: true,
      endTime: true,
      visitorEmail: true,
      vehicle: {
        select: {
          licensePlate: true,
        },
      },
      unit: {
        select: {
          unitNumber: true,
          building: {
            select: {
              name: true,
              timezone: true,
            },
          },
          residents: {
            where: {
              isPrimary: true,
              isActive: true,
              deletedAt: null,
            },
            select: {
              email: true,
            },
          },
        },
      },
      createdByResident: {
        select: {
          email: true,
        },
      },
    },
  });
}

export async function sendPassConfirmationNotifications(passId: string): Promise<number> {
  const pass = await getPassNotificationContext(passId);

  if (!pass) {
    return 0;
  }

  const recipients = [
    pass.visitorEmail,
    ...getResidentRecipientEmails(pass),
  ].filter((email, index, all): email is string => Boolean(email?.trim()) && all.indexOf(email) === index);

  if (recipients.length === 0) {
    return 0;
  }

  const results = await Promise.allSettled(
    recipients.map((recipientEmail) =>
      sendPassConfirmation({
        recipientEmail,
        licensePlate: pass.vehicle.licensePlate,
        unitNumber: pass.unit.unitNumber,
        buildingName: pass.unit.building.name,
        startTime: pass.startTime,
        endTime: pass.endTime,
        durationHours: pass.duration,
        confirmationCode: pass.confirmationCode,
        passId: pass.id,
        timezone: pass.unit.building.timezone,
      })
    )
  );

  const sentCount = results.filter(
    (result) => result.status === 'fulfilled' && result.value
  ).length;

  if (sentCount > 0) {
    await prisma.parkingPass.update({
      where: { id: pass.id },
      data: {
        confirmationSent: true,
        confirmationSentAt: new Date(),
      },
    });
  }

  return sentCount;
}

export async function processPassExpirationWarnings(): Promise<number> {
  const now = new Date();
  const warningThreshold = new Date(now.getTime() + 15 * 60 * 1000);

  const passes = await prisma.parkingPass.findMany({
    where: {
      deletedAt: null,
      status: {
        in: ['ACTIVE', 'EXTENDED'],
      },
      expirationWarningSent: false,
      endTime: {
        gte: now,
        lte: warningThreshold,
      },
    },
    select: {
      id: true,
    },
  });

  let processed = 0;

  for (const passRecord of passes) {
    const pass = await getPassNotificationContext(passRecord.id);

    if (!pass) {
      continue;
    }

    const recipients = [
      pass.visitorEmail,
      ...getResidentRecipientEmails(pass),
    ].filter((email, index, all): email is string => Boolean(email?.trim()) && all.indexOf(email) === index);

    if (recipients.length === 0) {
      continue;
    }

    const results = await Promise.allSettled(
      recipients.map((recipientEmail) =>
        sendPassExpirationWarning({
          recipientEmail,
          licensePlate: pass.vehicle.licensePlate,
          unitNumber: pass.unit.unitNumber,
          buildingName: pass.unit.building.name,
          durationHours: pass.duration,
          endTime: pass.endTime,
          passId: pass.id,
        })
      )
    );

    const sentCount = results.filter(
      (result) => result.status === 'fulfilled' && result.value
    ).length;

    if (sentCount > 0) {
      await prisma.parkingPass.update({
        where: { id: pass.id },
        data: {
          expirationWarningSent: true,
        },
      });
      processed += 1;
    }
  }

  return processed;
}

export async function retryFailedNotifications(): Promise<number> {
  const failedNotifications = await prisma.notificationQueue.findMany({
    where: {
      status: NotificationStatus.FAILED,
      attempts: { lt: 3 },
    },
    take: 10,
  });

  let successCount = 0;

  for (const notification of failedNotifications) {
    if (notification.type === NotificationType.EMAIL) {
      const success = await sendEmail({
        to: notification.recipient,
        subject: notification.subject || 'Notification',
        html: notification.body,
      });

      if (success) {
        successCount++;
      }
    }
  }

  return successCount;
}
