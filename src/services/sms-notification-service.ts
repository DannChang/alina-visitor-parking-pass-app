import { prisma } from '@/lib/prisma';
import { NotificationType, NotificationStatus } from '@prisma/client';
import { getSmsProvider } from './sms';

export async function sendPassLink(
  phone: string,
  passUrl: string
): Promise<boolean> {
  const body = `Your visitor parking pass is ready! Click to view: ${passUrl}`;
  return sendSms(phone, body, 'ParkingPass');
}

export async function sendExpirationWarning(
  phone: string,
  plate: string,
  minutesRemaining: number
): Promise<boolean> {
  const body = `Your parking pass for ${plate} expires in ${minutesRemaining} minutes. Please move your vehicle or extend your pass to avoid a violation.`;
  return sendSms(phone, body, 'ParkingPass');
}

export async function sendPassConfirmation(
  phone: string,
  plate: string,
  buildingName: string,
  endTime: Date
): Promise<boolean> {
  const formattedEnd = endTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const body = `Parking pass confirmed for ${plate} at ${buildingName}. Valid until ${formattedEnd}. Please move your vehicle before expiration.`;
  return sendSms(phone, body, 'ParkingPass');
}

async function sendSms(
  to: string,
  body: string,
  entityType?: string,
  entityId?: string
): Promise<boolean> {
  const notification = await prisma.notificationQueue.create({
    data: {
      type: NotificationType.SMS,
      recipient: to,
      body,
      status: NotificationStatus.PENDING,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
    },
  });

  try {
    const provider = getSmsProvider();
    const result = await provider.send(to, body);

    if (result.success) {
      await prisma.notificationQueue.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          attempts: { increment: 1 },
          ...(result.messageId ? { metadata: { messageId: result.messageId } } : {}),
        },
      });
      return true;
    }

    await prisma.notificationQueue.update({
      where: { id: notification.id },
      data: {
        status: NotificationStatus.FAILED,
        failedAt: new Date(),
        errorMessage: result.error ?? 'SMS send failed',
        attempts: { increment: 1 },
      },
    });
    return false;
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
    console.error('SMS send error:', error);
    return false;
  }
}
