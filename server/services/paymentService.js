const mongoose = require('mongoose');
const studentRepository = require('../repositories/studentRepository');
const paymentRepository = require('../repositories/paymentRepository');
const receiptRepository = require('../repositories/receiptRepository');
const feePlanRepository = require('../repositories/feePlanRepository');
const installmentRepository = require('../repositories/installmentRepository');
const activityLogRepository = require('../repositories/activityLogRepository');
const { NotFoundError, ConflictError, BadRequestError } = require('../utils/customErrors');

/**
 * Payment Service - Executes core business logic for processing and collecting student payments.
 * Orchestrates updates across Students, Fee Plans, Installments, Receipts, and Audit Logs inside transactions.
 */
class PaymentService {
  /**
   * Process and register manual payment entry.
   * Runs inside a MongoDB transaction session to guarantee atomic data updates.
   * @param {Object} paymentData - Input parameters from admin.
   * @param {string} staffId - Database ID of staff executing payment entry.
   */
  async collectPayment(paymentData, staffId) {
    const { studentId, paymentType, paymentMode, amount, installmentId, transactionId, remarks, paymentDate } = paymentData;
    const paymentAmount = Number(amount);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Fetch and validate student
      const student = await studentRepository.findById(studentId, session);
      if (!student) {
        throw new NotFoundError('NOT_FOUND: The specified student does not exist.');
      }
      if (student.status !== 'ACTIVE') {
        throw new BadRequestError('VALIDATION_FAILED: Cannot process payments for an INACTIVE student.');
      }

      // 2. Fetch and validate parent Fee Plan
      const feePlan = await feePlanRepository.findOne({ studentId }, session);
      if (!feePlan) {
        throw new NotFoundError('NOT_FOUND: Active Fee Plan not found for this student.');
      }

      // Check payment limit vs remaining amount
      if (paymentAmount > feePlan.remainingAmount) {
        throw new BadRequestError(`VALIDATION_FAILED: Payment amount (₹${paymentAmount}) exceeds the student's remaining balance (₹${feePlan.remainingAmount}).`);
      }

      // Check plan classification constraints
      if (paymentType === 'FULL_PAYMENT' && feePlan.paymentPlan !== 'FULL_PAYMENT') {
        throw new BadRequestError('VALIDATION_FAILED: FULL_PAYMENT type is only allowed for students on a FULL_PAYMENT plan.');
      }
      if (paymentType === 'ADVANCE_PAYMENT' && feePlan.paymentPlan !== 'INSTALLMENT') {
        throw new BadRequestError('VALIDATION_FAILED: ADVANCE_PAYMENT is only allowed for students on an INSTALLMENT plan.');
      }
      if (paymentType === 'INSTALLMENT_PAYMENT' && feePlan.paymentPlan !== 'INSTALLMENT') {
        throw new BadRequestError('VALIDATION_FAILED: INSTALLMENT_PAYMENT is only allowed for students on an INSTALLMENT plan.');
      }

      let logAction = 'PAYMENT_COLLECTED';
      let logDesc = `Payment of ₹${paymentAmount} collected via ${paymentMode}.`;
      let allocatedInstallmentId = null;
      let extraCredit = 0;
      const invoiceRepository = require('../repositories/invoiceRepository');

      // 3. Update records based on Payment Type
      if (paymentType === 'FULL_PAYMENT') {
        if (paymentAmount !== feePlan.remainingAmount) {
          throw new BadRequestError(`VALIDATION_FAILED: FULL_PAYMENT requires paying the exact remaining balance of ₹${feePlan.remainingAmount}.`);
        }

        feePlan.paidAmount += paymentAmount;
        feePlan.remainingAmount = 0;
        feePlan.status = 'PAID';
        feePlan.advanceCreditBalance = 0;
        await feePlan.save({ session });

        // Update corresponding invoice to PAID
        const invoice = await invoiceRepository.findOne({ studentId, installmentId: null }, session);
        if (invoice) {
          invoice.status = 'PAID';
          await invoice.save({ session });
        }

        // Also mark any unpaid installments as PAID if applicable
        const unpaidInstallments = await installmentRepository.find({ studentId, status: { $ne: 'PAID' } }, {}, session);
        for (const inst of unpaidInstallments) {
          inst.paidAmount = inst.amount;
          inst.remainingAmount = 0;
          inst.status = 'PAID';
          inst.paidDate = paymentDate ? new Date(paymentDate) : new Date();
          await inst.save({ session });
          const inv = await invoiceRepository.findOne({ studentId, installmentId: inst._id }, session);
          if (inv) {
            inv.status = 'PAID';
            await inv.save({ session });
          }
        }

        logAction = 'FULL_PAYMENT';
        logDesc = `Full payment of ₹${paymentAmount} received. Fee Plan status marked as PAID.`;

      } else if (paymentType === 'INITIAL_PAYMENT') {
        // Initial/Admission payment at enrollment time
        feePlan.paidAmount += paymentAmount;
        feePlan.remainingAmount = Math.max(0, feePlan.remainingAmount - paymentAmount);
        feePlan.status = feePlan.remainingAmount === 0 ? 'PAID' : 'PARTIAL';
        await feePlan.save({ session });

        logAction = 'INITIAL_PAYMENT';
        logDesc = `Initial / admission payment of ₹${paymentAmount} received. Fee Plan remaining balance: ₹${feePlan.remainingAmount}.`;

      } else if (paymentType === 'INSTALLMENT_PAYMENT') {
        if (!installmentId) {
          throw new BadRequestError('VALIDATION_FAILED: installmentId is required for INSTALLMENT_PAYMENT.');
        }

        const installment = await installmentRepository.findOne({ _id: installmentId, studentId }, session);
        if (!installment) {
          throw new NotFoundError('NOT_FOUND: The specified installment was not found.');
        }
        if (installment.status === 'PAID') {
          throw new ConflictError('VALIDATION_FAILED: Cannot pay an already PAID installment.');
        }

        const installmentRemaining = installment.remainingAmount;

        if (paymentAmount < installmentRemaining) {
          // Partial payment on target installment
          installment.paidAmount += paymentAmount;
          installment.remainingAmount -= paymentAmount;
          installment.status = 'PARTIAL';
          await installment.save({ session });

          feePlan.paidAmount += paymentAmount;
          feePlan.remainingAmount -= paymentAmount;
          feePlan.status = 'PARTIAL';
          await feePlan.save({ session });

          allocatedInstallmentId = installment._id;
          logAction = 'PARTIAL_PAYMENT';
          logDesc = `Partial payment of ₹${paymentAmount} received for Installment #${installment.installmentNo}. Remaining on term: ₹${installment.remainingAmount}.`;

        } else if (paymentAmount === installmentRemaining) {
          // Exact payment completing the installment
          installment.paidAmount = installment.amount;
          installment.remainingAmount = 0;
          installment.status = 'PAID';
          installment.paidDate = paymentDate ? new Date(paymentDate) : new Date();
          await installment.save({ session });

          // Update corresponding invoice to PAID
          const invoice = await invoiceRepository.findOne({ studentId, installmentId }, session);
          if (invoice) {
            invoice.status = 'PAID';
            await invoice.save({ session });
          }

          feePlan.paidAmount += paymentAmount;
          feePlan.remainingAmount -= paymentAmount;

          const hasUnpaid = await installmentRepository.exists({ studentId, status: { $ne: 'PAID' } }, session);
          feePlan.status = hasUnpaid ? 'PARTIAL' : 'PAID';
          await feePlan.save({ session });

          allocatedInstallmentId = installment._id;
          logAction = 'INSTALLMENT_PAID';
          logDesc = `Installment #${installment.installmentNo} paid in full (₹${paymentAmount}).`;

        } else {
          // Overpayment on target installment: paymentAmount > installmentRemaining
          installment.paidAmount = installment.amount;
          installment.remainingAmount = 0;
          installment.status = 'PAID';
          installment.paidDate = paymentDate ? new Date(paymentDate) : new Date();
          await installment.save({ session });

          // Update corresponding invoice to PAID
          const invoice = await invoiceRepository.findOne({ studentId, installmentId }, session);
          if (invoice) {
            invoice.status = 'PAID';
            await invoice.save({ session });
          }

          extraCredit = paymentAmount - installmentRemaining;

          feePlan.paidAmount += paymentAmount;
          feePlan.remainingAmount -= paymentAmount;

          // Sequentially auto-adjust excess credit against subsequent unpaid installments
          const futureInstallments = await installmentRepository.find(
            { studentId, _id: { $ne: installment._id }, status: { $ne: 'PAID' } },
            { installmentNo: 1 },
            session
          );

          let unallocatedCredit = extraCredit;
          const affectedTerms = [];

          for (const nextInst of futureInstallments) {
            if (unallocatedCredit <= 0) break;

            const alloc = Math.min(unallocatedCredit, nextInst.remainingAmount);
            nextInst.paidAmount += alloc;
            nextInst.remainingAmount -= alloc;
            nextInst.advanceApplied = (nextInst.advanceApplied || 0) + alloc;
            nextInst.status = nextInst.remainingAmount === 0 ? 'PAID' : 'PARTIAL';

            if (nextInst.status === 'PAID') {
              nextInst.paidDate = paymentDate ? new Date(paymentDate) : new Date();
              const nextInv = await invoiceRepository.findOne({ studentId, installmentId: nextInst._id }, session);
              if (nextInv) {
                nextInv.status = 'PAID';
                await nextInv.save({ session });
              }
            }

            await nextInst.save({ session });
            affectedTerms.push(`Inst #${nextInst.installmentNo} (₹${alloc})`);
            unallocatedCredit -= alloc;
          }

          feePlan.advanceCreditBalance = (feePlan.advanceCreditBalance || 0) + unallocatedCredit;

          const hasUnpaid = await installmentRepository.exists({ studentId, status: { $ne: 'PAID' } }, session);
          feePlan.status = hasUnpaid ? 'PARTIAL' : 'PAID';
          await feePlan.save({ session });

          allocatedInstallmentId = installment._id;
          logAction = 'OVERPAYMENT_COLLECTED';
          logDesc = `Installment #${installment.installmentNo} paid in full. Extra credit of ₹${extraCredit} generated. ${
            affectedTerms.length > 0 ? `Auto-adjusted against: ${affectedTerms.join(', ')}.` : ''
          } ${unallocatedCredit > 0 ? `Unused advance credit balance: ₹${unallocatedCredit}.` : ''}`.trim();
        }

      } else if (paymentType === 'PARTIAL_PAYMENT') {
        if (feePlan.paymentPlan === 'INSTALLMENT') {
          if (!installmentId) {
            throw new BadRequestError('VALIDATION_FAILED: installmentId is required for PARTIAL_PAYMENT on installment plans.');
          }

          const installment = await installmentRepository.findOne({ _id: installmentId, studentId }, session);
          if (!installment) {
            throw new NotFoundError('NOT_FOUND: The specified installment was not found.');
          }
          if (installment.status === 'PAID') {
            throw new ConflictError('VALIDATION_FAILED: Cannot apply partial payment to a completed installment.');
          }
          if (paymentAmount >= installment.remainingAmount) {
            throw new BadRequestError(`VALIDATION_FAILED: Partial payment amount must be less than remaining installment balance of ₹${installment.remainingAmount}.`);
          }

          // Apply partial payment to installment
          installment.paidAmount += paymentAmount;
          installment.remainingAmount -= paymentAmount;
          installment.status = 'PARTIAL';
          await installment.save({ session });

          allocatedInstallmentId = installment._id;
          logDesc = `Partial payment of ₹${paymentAmount} applied to Installment #${installment.installmentNo}.`;
        } else {
          // PARTIAL_PAYMENT on a FULL_PAYMENT plan
          logDesc = `Partial payment of ₹${paymentAmount} applied to FULL_PAYMENT plan.`;
        }

        // Recalculate parent Fee Plan parameters
        feePlan.paidAmount += paymentAmount;
        feePlan.remainingAmount -= paymentAmount;
        feePlan.status = 'PARTIAL';
        await feePlan.save({ session });

        logAction = 'PARTIAL_PAYMENT';

      } else if (paymentType === 'ADVANCE_PAYMENT') {
        // Collect sequential unpaid installments
        const unpaidInstallments = await installmentRepository.find(
          { studentId, status: { $ne: 'PAID' } },
          { installmentNo: 1 },
          session
        );

        let tempAmount = paymentAmount;
        const affectedInstallments = [];

        for (const inst of unpaidInstallments) {
          if (tempAmount <= 0) break;

          const allocAmount = Math.min(tempAmount, inst.remainingAmount);
          inst.paidAmount += allocAmount;
          inst.remainingAmount -= allocAmount;
          inst.advanceApplied = (inst.advanceApplied || 0) + allocAmount;
          inst.status = inst.remainingAmount === 0 ? 'PAID' : 'PARTIAL';
          if (inst.status === 'PAID') {
            inst.paidDate = paymentDate ? new Date(paymentDate) : new Date();

            // Update corresponding invoice to PAID
            const invoice = await invoiceRepository.findOne({ studentId, installmentId: inst._id }, session);
            if (invoice) {
              invoice.status = 'PAID';
              await invoice.save({ session });
            }
          }

          await inst.save({ session });
          affectedInstallments.push(`Inst #${inst.installmentNo} (₹${allocAmount})`);
          tempAmount -= allocAmount;
        }

        // Leftover credit if paymentAmount exceeded sum of all remaining installments
        feePlan.advanceCreditBalance = (feePlan.advanceCreditBalance || 0) + tempAmount;
        feePlan.paidAmount += paymentAmount;
        feePlan.remainingAmount = Math.max(0, feePlan.remainingAmount - paymentAmount);

        const hasUnpaid = await installmentRepository.exists({ studentId, status: { $ne: 'PAID' } }, session);
        feePlan.status = hasUnpaid ? 'PARTIAL' : 'PAID';
        await feePlan.save({ session });

        extraCredit = paymentAmount;
        logAction = 'ADVANCE_PAYMENT';
        logDesc = `Advance payment of ₹${paymentAmount} received. Allocated to installments: ${
          affectedInstallments.length > 0 ? affectedInstallments.join(', ') : 'None'
        }. ${tempAmount > 0 ? `Unallocated advance credit balance: ₹${tempAmount}.` : ''}`.trim();
      }

      // 4. Record Payment History entry
      const newPayment = await paymentRepository.create({
        studentId,
        feePlanId: feePlan._id,
        installmentId: allocatedInstallmentId,
        paymentType,
        paymentMode,
        amount: paymentAmount,
        advanceAmount: extraCredit,
        transactionId: transactionId || '',
        remarks: remarks || '',
        receivedBy: staffId,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date()
      }, session);

      // 5. Generate Receipt Record (Sequential increment handled inside repository)
      const newReceipt = await receiptRepository.create({
        paymentId: newPayment._id,
        studentId,
        amount: paymentAmount,
        paymentMode,
        generatedDate: paymentDate ? new Date(paymentDate) : new Date(),
        downloadStatus: false
      }, session);

      // 6. Save audit activity log
      await activityLogRepository.create([{
        action: logAction,
        description: `${logDesc} Receipt Generated: ${newReceipt.receiptNumber}.`,
        performedBy: staffId,
        studentId
      }], session);

      // Commit changes
      await session.commitTransaction();
      session.endSession();

      // Clear dashboard caches
      const cacheHelper = require('../utils/cacheHelper');
      cacheHelper.delByPattern('dashboard:*').catch(() => {});

      return await paymentRepository.findById(newPayment._id);

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Fetch all payment entries.
   */
  async listAllPayments() {
    return await paymentRepository.findAll();
  }

  /**
   * Fetch details for a specific payment by ID.
   * @param {string} id - Payment Database Object ID.
   */
  async getPaymentDetails(id) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundError('NOT_FOUND: Payment record not found.');
    }
    return payment;
  }

  /**
   * Fetch payment entries recorded for a specific student profile.
   * @param {string} studentId - Student database Object ID.
   */
  async getStudentPayments(studentId) {
    const student = await studentRepository.findById(studentId);
    if (!student) {
      throw new NotFoundError('NOT_FOUND: The specified student does not exist.');
    }
    return await paymentRepository.findByStudentId(studentId);
  }

  /**
   * Fetch all activity logs recorded for a specific student profile.
   * @param {string} studentId - Student database Object ID.
   */
  async getStudentLogs(studentId) {
    return await activityLogRepository.findByStudentId(studentId);
  }
}

module.exports = new PaymentService();
