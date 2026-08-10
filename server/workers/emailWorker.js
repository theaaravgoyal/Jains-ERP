const { Worker } = require('bullmq');
const { redisConnectionOptions } = require('../config/redis');
const emailService = require('../utils/emailService');

/**
 * Worker to process transactional email jobs
 */
const emailWorker = new Worker(
  'email-queue',
  async (job) => {
    const { type, to, subject, data } = job.data;
    console.log(`[EmailWorker] Processing job #${job.id} (${job.name}) - Type: ${type} To: ${to}`);

    if (!to) {
      console.warn(`[EmailWorker] Skipping job #${job.id} - No recipient email specified.`);
      return { success: false, message: 'No recipient email' };
    }

    try {
      let emailSubject = subject || 'ERP Portal Notification';
      let htmlBody = '';

      switch (type) {
        case 'STUDENT_WELCOME':
          emailSubject = subject || `Welcome to the Institute - ${data.studentName || 'Student'}`;
          htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #4f46e5;">Welcome to Our Institute!</h2>
              <p>Dear <strong>${data.studentName}</strong>,</p>
              <p>Your enrollment has been successfully completed for the course <strong>${data.course}</strong>.</p>
              <p><strong>Student ID / Roll No:</strong> ${data.studentId || 'N/A'}</p>
              <p><strong>Total Fees:</strong> ₹${data.totalFees || 0}</p>
              <p>Please log in to your student portal to review your schedule and fee installment plans.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 12px;">ERP Portal Management System</p>
            </div>
          `;
          break;

        case 'PAYMENT_RECEIPT':
          emailSubject = subject || `Payment Receipt: ${data.receiptNumber || 'Confirmed'}`;
          htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #16a34a;">Payment Confirmed</h2>
              <p>Dear <strong>${data.studentName || 'Student'}</strong>,</p>
              <p>We have successfully received your payment of <strong>₹${data.amount}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Receipt No:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.receiptNumber || 'N/A'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Payment Mode:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.paymentMode || 'Cash'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Transaction Ref:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.transactionId || 'N/A'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date().toLocaleDateString()}</td></tr>
              </table>
              <p>Thank you for your prompt payment.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 12px;">ERP Portal Accounts Department</p>
            </div>
          `;
          break;

        case 'LEAVE_STATUS_UPDATE':
          emailSubject = subject || `Leave Request ${data.status || 'Updated'}`;
          htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: ${data.status === 'Approved' ? '#16a34a' : '#dc2626'};">Leave Request ${data.status}</h2>
              <p>Dear <strong>${data.employeeName || 'Employee'}</strong>,</p>
              <p>Your leave request for <strong>${data.leaveType || 'Leave'}</strong> has been <strong>${data.status}</strong> by Management.</p>
              <p><strong>Remarks:</strong> ${data.remarks || 'No additional remarks.'}</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 12px;">ERP Portal HR Department</p>
            </div>
          `;
          break;

        case 'CERTIFICATE_ISSUED':
          emailSubject = subject || `Certificate Issued: ${data.course || ''}`;
          htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0284c7;">Certificate of Completion Issued</h2>
              <p>Dear <strong>${data.studentName || 'Student'}</strong>,</p>
              <p>Congratulations! Your certificate for <strong>${data.course}</strong> has been issued.</p>
              <p><strong>Enrollment Number:</strong> ${data.enrollmentNumber}</p>
              <p><strong>Issue Date:</strong> ${data.issueDate}</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 12px;">ERP Portal Academics Department</p>
            </div>
          `;
          break;

        case 'LEAD_RECEIVED':
          emailSubject = subject || `Thank you for your enquiry - ${data.course || ''}`;
          htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #4f46e5;">We Received Your Enquiry</h2>
              <p>Dear <strong>${data.name || 'Candidate'}</strong>,</p>
              <p>Thank you for expressing interest in our <strong>${data.course}</strong> program.</p>
              <p>Our counseling team will connect with you shortly on ${data.phone}.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 12px;">ERP Portal Admissions</p>
            </div>
          `;
          break;

        default:
          htmlBody = data?.html || `<p>${data?.message || 'You have a new update in the ERP Portal.'}</p>`;
      }

      const result = await emailService.sendMail({
        to,
        subject: emailSubject,
        html: htmlBody,
        text: data?.text || ''
      });

      return { success: true, result };
    } catch (err) {
      console.error(`[EmailWorker Error] Job #${job.id} failed:`, err.message);
      throw err;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 5
  }
);

emailWorker.on('failed', (job, err) => {
  console.error(`[EmailWorker] Job #${job?.id} failed:`, err.message);
});

module.exports = emailWorker;
