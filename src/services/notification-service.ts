import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { NotificationType, NotificationStatus } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);

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
  visitorName: string;
  licensePlate: string;
  unitNumber: string;
  buildingName: string;
  startTime: Date;
  endTime: Date;
  confirmationCode: string;
  passId: string;
}

interface PassExpirationWarningData {
  recipientEmail: string;
  visitorName: string;
  licensePlate: string;
  unitNumber: string;
  endTime: Date;
  passId: string;
}

const FROM_EMAIL = 'Alina Parking <noreply@alinahospital.com>';

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
    const { error } = await resend.emails.send({
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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

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
      <title>Parking Pass Confirmation</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Parking Pass Confirmed</h1>
      </div>

      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="margin-top: 0;">Hi ${data.visitorName},</p>

        <p>Your visitor parking pass has been registered successfully.</p>

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
          </table>
        </div>

        <p style="font-size: 14px; color: #666;">
          Please ensure you move your vehicle before the pass expires to avoid any violations or citations.
        </p>

        <p style="font-size: 14px; color: #666; margin-bottom: 0;">
          Thank you for visiting!<br>
          <strong>Alina Hospital Parking Management</strong>
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

Hi ${data.visitorName},

Your visitor parking pass has been registered successfully.

Confirmation Code: ${data.confirmationCode.slice(0, 8).toUpperCase()}

Details:
- Vehicle: ${data.licensePlate}
- Building: ${data.buildingName}
- Visiting Unit: ${data.unitNumber}
- Valid From: ${formattedStart}
- Valid Until: ${formattedEnd}

Please ensure you move your vehicle before the pass expires to avoid any violations or citations.

Thank you for visiting!
Alina Hospital Parking Management
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

export async function sendPassExpirationWarning(
  data: PassExpirationWarningData
): Promise<boolean> {
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
        <p style="margin-top: 0;">Hi ${data.visitorName},</p>

        <p>Your parking pass for <strong>${data.licensePlate}</strong> is about to expire.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #fecaca; text-align: center;">
          <span style="font-size: 14px; color: #666;">Expires At</span>
          <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-top: 5px;">
            ${formattedEnd}
          </div>
        </div>

        <p style="font-size: 14px; color: #666;">
          Please move your vehicle or extend your pass (if eligible) to avoid any violations or citations.
        </p>

        <p style="font-size: 14px; color: #666; margin-bottom: 0;">
          Thank you,<br>
          <strong>Alina Hospital Parking Management</strong>
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
