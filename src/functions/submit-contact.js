import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import nodemailer from "nodemailer";

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { name, email, message } = data;
  if (!name || !email || !message) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const connectionString = process.env.NEON_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    return { statusCode: 500, body: 'Database connection string is not configured' };
  }

  const sql = neon(connectionString);

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO contact_messages (name, email, message)
      VALUES (${name}, ${email}, ${message})
    `;

    const mailUser = process.env.EMAIL_USER;
    const mailPass = process.env.EMAIL_PASS;
    const adminEmail = process.env.ADMIN_EMAIL;
    const logoUrl = 'https://janudha.com/janulogo.png';

    let emailWarning = null;

    if (mailUser && mailPass && adminEmail) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: mailUser,
          pass: mailPass,
        },
      });

      try {
        await transporter.sendMail({
          from: mailUser,
          to: adminEmail,
          replyTo: email,
          subject: `New message for ${adminEmail} from ${name}`,
          text: `To: ${adminEmail}\nFrom: ${name} <${email}>\n\nMessage:\n${message}`,
          html: `
            <div style="font-family: Arial, sans-serif; background:#f9fafb; padding:24px; color:#111827;">
              <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #f3f4f6; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
                <div style="background:#fff; border-bottom:1px solid #fee2e2; padding:20px 24px; text-align:center;">
                  <img src="${logoUrl}" alt="Janudha Kendangamuwa" style="width:72px; height:72px; object-fit:cover; border-radius:12px; display:block; margin:0 auto 12px;" />
                  <div style="font-size:18px; font-weight:700; color:#dc2626;">Janudha Kendangamuwa</div>
                  <div style="font-size:13px; color:#6b7280;">New contact message received</div>
                </div>

                <div style="padding:24px;">
                  <div style="margin-bottom:16px; padding:14px 16px; background:#fef2f2; border:1px solid #fecaca; border-radius:12px;">
                    <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#b91c1c; font-weight:700; margin-bottom:6px;">Recipient</div>
                    <div style="font-size:15px; color:#111827; font-weight:600;">${adminEmail}</div>
                  </div>

                  <div style="margin-bottom:14px;">
                    <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; font-weight:700;">From</div>
                    <div style="font-size:15px; font-weight:600; color:#111827;">${name}</div>
                    <div style="font-size:14px; color:#374151;">${email}</div>
                  </div>

                  <div style="margin-bottom:12px;">
                    <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; font-weight:700; margin-bottom:8px;">Message</div>
                    <div style="font-size:15px; line-height:1.7; color:#111827; white-space:pre-wrap; background:#fafafa; border:1px solid #e5e7eb; border-radius:12px; padding:16px;">${message}</div>
                  </div>
                </div>
              </div>
            </div>
          `,
        });
      } catch (mailError) {
        console.error('Error sending email:', mailError);
        emailWarning = mailError.message || 'Email could not be sent';
      }
    } else {
      emailWarning = 'Email settings are not configured';
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Message sent successfully!',
        warning: emailWarning,
      })
    };

  } catch (error) {
    console.error("Error in handler:", error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Server error occurred' })
    };
  }
}
