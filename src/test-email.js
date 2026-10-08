import "dotenv/config";
import { createMailer } from "./functions/_email.js";

// Verify authentication without sending mail to the configured recipient.
try {
  await createMailer().verify();
  console.log("Gmail SMTP connection and authentication verified.");
} catch (error) {
  console.error("Gmail SMTP check failed:", error.code || "SMTP_ERROR");
  process.exitCode = 1;
}
