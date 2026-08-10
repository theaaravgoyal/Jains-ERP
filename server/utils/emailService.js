const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('[EmailService] SMTP Transporter configured.');
    } else {
      // Fallback transporter: Logs emails in development/test
      this.transporter = null;
    }
  }

  /**
   * Send transactional email
   */
  async sendMail({ to, subject, html, text }) {
    const fromAddress = process.env.SMTP_FROM || '"ERP Portal" <no-reply@erpportal.local>';

    if (!this.transporter) {
      console.log(`[EmailService MOCK] Sending email to: ${to} | Subject: ${subject}`);
      return { success: true, mocked: true, messageId: `mock-${Date.now()}` };
    }

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: text || '',
        html: html || text || ''
      });
      console.log(`[EmailService] Email sent to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[EmailService Error] Failed sending to ${to}:`, err.message);
      throw err;
    }
  }
}

module.exports = new EmailService();
