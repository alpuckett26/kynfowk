import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

function getSESClient() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey }
  });
}

export function hasSESEnv() {
  return !!(
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.NOTIFICATION_FROM_EMAIL
  );
}

export async function sendEmailViaSES(input: {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}): Promise<{ messageId: string | null; error: string | null }> {
  const client = getSESClient();
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL;

  if (!client || !fromEmail) {
    return { messageId: null, error: "SES not configured" };
  }

  try {
    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [input.to] },
      Message: {
        Subject: { Data: input.subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: input.bodyText, Charset: "UTF-8" },
          ...(input.bodyHtml
            ? { Html: { Data: input.bodyHtml, Charset: "UTF-8" } }
            : {})
        }
      }
    });

    const result = await client.send(command);
    return { messageId: result.MessageId ?? null, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { messageId: null, error: message };
  }
}
