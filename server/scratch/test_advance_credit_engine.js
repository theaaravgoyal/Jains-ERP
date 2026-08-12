const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const Student = require('../models/Student');
const FeePlan = require('../models/FeePlan');
const Installment = require('../models/Installment');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Receipt = require('../models/Receipt');
const Settings = require('../models/Settings');
const User = require('../models/User');
const feePlanService = require('../services/feePlanService');
const paymentService = require('../services/paymentService');

async function runTests() {
  console.log('--- Connecting to MongoDB ---');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  let testUser = await User.findOne({});
  if (!testUser) {
    testUser = await User.create({
      name: 'Test Staff',
      email: `teststaff${Date.now()}@example.com`,
      password: 'password123',
      role: 'admin'
    });
  }
  const staffId = testUser._id.toString();

  // Helper to create a student with fee plan
  async function createTestStudent(totalFees = 50000, numInstallments = 10, paymentPlan = 'INSTALLMENT') {
    const student = await Student.create({
      fullName: `Test Student ${Date.now()}`,
      fatherName: 'Father Test',
      address: '123 Jaipur Road',
      createdBy: staffId,
      email: `student_${Date.now()}_${Math.random()}@test.com`,
      mobile: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      course: 'Digital Marketing',
      status: 'ACTIVE',
      paymentPlan,
      totalFees
    });

    const plan = await feePlanService.setupFeePlan({
      studentId: student._id.toString(),
      totalFees,
      paymentPlan,
      numberOfInstallments: numInstallments,
      firstDueDate: new Date()
    }, staffId);

    const installments = await Installment.find({ studentId: student._id }).sort({ installmentNo: 1 });
    return { student, plan, installments };
  }

  try {
    console.log('\n==============================');
    console.log('TEST 1: Exact Installment Payment (5000 / 5000)');
    console.log('==============================');
    {
      const { student, installments } = await createTestStudent(50000, 10);
      const inst1 = installments[0];
      const res = await paymentService.collectPayment({
        studentId: student._id.toString(),
        paymentType: 'INSTALLMENT_PAYMENT',
        paymentMode: 'Cash',
        amount: 5000,
        installmentId: inst1._id.toString()
      }, staffId);

      const updatedInst1 = await Installment.findById(inst1._id);
      const updatedPlan = await FeePlan.findOne({ studentId: student._id });
      console.log('Inst 1 Status:', updatedInst1.status, '(Expected: PAID)');
      console.log('Inst 1 Paid:', updatedInst1.paidAmount, 'Remaining:', updatedInst1.remainingAmount);
      console.log('Plan Paid:', updatedPlan.paidAmount, 'Remaining:', updatedPlan.remainingAmount);
      console.log('Plan Advance Credit:', updatedPlan.advanceCreditBalance, '(Expected: 0)');
      if (updatedInst1.status !== 'PAID' || updatedPlan.advanceCreditBalance !== 0) throw new Error('Test 1 Failed');
      console.log('✅ TEST 1 PASSED');
    }

    console.log('\n==============================');
    console.log('TEST 2: Partial Installment Payment (3000 on 5000)');
    console.log('==============================');
    {
      const { student, installments } = await createTestStudent(50000, 10);
      const inst1 = installments[0];
      const res = await paymentService.collectPayment({
        studentId: student._id.toString(),
        paymentType: 'INSTALLMENT_PAYMENT',
        paymentMode: 'UPI',
        amount: 3000,
        installmentId: inst1._id.toString()
      }, staffId);

      const updatedInst1 = await Installment.findById(inst1._id);
      const updatedPlan = await FeePlan.findOne({ studentId: student._id });
      console.log('Inst 1 Status:', updatedInst1.status, '(Expected: PARTIAL)');
      console.log('Inst 1 Paid:', updatedInst1.paidAmount, 'Remaining:', updatedInst1.remainingAmount, '(Expected Remaining: 2000)');
      console.log('Plan Advance Credit:', updatedPlan.advanceCreditBalance, '(Expected: 0)');
      if (updatedInst1.status !== 'PARTIAL' || updatedInst1.remainingAmount !== 2000) throw new Error('Test 2 Failed');
      console.log('✅ TEST 2 PASSED');
    }

    console.log('\n==============================');
    console.log('TEST 3 & 4: Overpayment (7000 on 5000) -> Extra Credit 2000 auto-adjusts next inst (5000 -> 3000 remaining PARTIAL)');
    console.log('==============================');
    {
      const { student, installments } = await createTestStudent(50000, 10);
      const inst1 = installments[0];
      const inst2 = installments[1];

      const res = await paymentService.collectPayment({
        studentId: student._id.toString(),
        paymentType: 'INSTALLMENT_PAYMENT',
        paymentMode: 'Bank Transfer',
        amount: 7000,
        installmentId: inst1._id.toString()
      }, staffId);

      const updatedInst1 = await Installment.findById(inst1._id);
      const updatedInst2 = await Installment.findById(inst2._id);
      const updatedPlan = await FeePlan.findOne({ studentId: student._id });

      console.log('Inst 1 Status:', updatedInst1.status, 'Paid:', updatedInst1.paidAmount, 'Remaining:', updatedInst1.remainingAmount, '(Expected: PAID, 5000, 0)');
      console.log('Inst 2 Status:', updatedInst2.status, 'Paid:', updatedInst2.paidAmount, 'Remaining:', updatedInst2.remainingAmount, '(Expected: PARTIAL, 2000, 3000)');
      console.log('Inst 2 AdvanceApplied:', updatedInst2.advanceApplied, '(Expected: 2000)');
      console.log('Plan Paid:', updatedPlan.paidAmount, 'Remaining:', updatedPlan.remainingAmount);
      console.log('Plan Advance Credit:', updatedPlan.advanceCreditBalance, '(Expected: 0)');

      if (updatedInst1.status !== 'PAID' || updatedInst2.status !== 'PARTIAL' || updatedInst2.remainingAmount !== 3000 || updatedInst2.advanceApplied !== 2000) {
        throw new Error('Test 3/4 Failed');
      }
      console.log('✅ TEST 3 & 4 PASSED');
    }

    console.log('\n==============================');
    console.log('TEST 5: Multi-Installment Advance (12000 on 5000 Inst 1) -> Inst 1 PAID, Inst 2 PAID, Inst 3 PARTIAL 2000 applied (3000 remaining)');
    console.log('==============================');
    {
      const { student, installments } = await createTestStudent(50000, 10);
      const inst1 = installments[0];
      const inst2 = installments[1];
      const inst3 = installments[2];

      const res = await paymentService.collectPayment({
        studentId: student._id.toString(),
        paymentType: 'INSTALLMENT_PAYMENT',
        paymentMode: 'Cash',
        amount: 12000,
        installmentId: inst1._id.toString()
      }, staffId);

      const updatedInst1 = await Installment.findById(inst1._id);
      const updatedInst2 = await Installment.findById(inst2._id);
      const updatedInst3 = await Installment.findById(inst3._id);
      const updatedPlan = await FeePlan.findOne({ studentId: student._id });

      console.log('Inst 1 Status:', updatedInst1.status, '(Expected: PAID)');
      console.log('Inst 2 Status:', updatedInst2.status, '(Expected: PAID)');
      console.log('Inst 3 Status:', updatedInst3.status, 'Paid:', updatedInst3.paidAmount, 'Remaining:', updatedInst3.remainingAmount, '(Expected: PARTIAL, 2000, 3000)');
      console.log('Plan Paid:', updatedPlan.paidAmount, 'Remaining:', updatedPlan.remainingAmount, '(Expected: 12000, 38000)');

      if (updatedInst1.status !== 'PAID' || updatedInst2.status !== 'PAID' || updatedInst3.status !== 'PARTIAL' || updatedInst3.remainingAmount !== 3000) {
        throw new Error('Test 5 Failed');
      }
      console.log('✅ TEST 5 PASSED');
    }

    console.log('\n==============================');
    console.log('TEST 6: Initial / Admission Payment (10000 on 50000 Total)');
    console.log('==============================');
    {
      const { student, installments } = await createTestStudent(50000, 10);
      const res = await paymentService.collectPayment({
        studentId: student._id.toString(),
        paymentType: 'INITIAL_PAYMENT',
        paymentMode: 'Cash',
        amount: 10000
      }, staffId);

      const updatedPlan = await FeePlan.findOne({ studentId: student._id });
      const instList = await Installment.find({ studentId: student._id }).sort({ installmentNo: 1 });

      console.log('Plan Paid:', updatedPlan.paidAmount, 'Remaining:', updatedPlan.remainingAmount, '(Expected: 10000, 40000)');
      console.log('Installment 1 Amount:', instList[0].amount, '(Expected: 5000, unchanged)');
      console.log('Installment 2 Amount:', instList[1].amount, '(Expected: 5000, unchanged)');

      if (updatedPlan.paidAmount !== 10000 || updatedPlan.remainingAmount !== 40000 || instList[0].amount !== 5000) {
        throw new Error('Test 6 Failed');
      }
      console.log('✅ TEST 6 PASSED');
    }

    console.log('\n==============================');
    console.log('TEST 7: FULL_PAYMENT Exact');
    console.log('==============================');
    {
      const { student } = await createTestStudent(50000, 1, 'FULL_PAYMENT');
      const res = await paymentService.collectPayment({
        studentId: student._id.toString(),
        paymentType: 'FULL_PAYMENT',
        paymentMode: 'UPI',
        amount: 50000
      }, staffId);

      const updatedPlan = await FeePlan.findOne({ studentId: student._id });
      console.log('Plan Status:', updatedPlan.status, '(Expected: PAID)');
      console.log('Plan Paid:', updatedPlan.paidAmount, 'Remaining:', updatedPlan.remainingAmount, '(Expected: 50000, 0)');
      if (updatedPlan.status !== 'PAID' || updatedPlan.remainingAmount !== 0) throw new Error('Test 7 Failed');
      console.log('✅ TEST 7 PASSED');
    }

    console.log('\n==============================');
    console.log('TEST 8: Negative / Zero Payment Validation');
    console.log('==============================');
    {
      const { student } = await createTestStudent(50000, 10);
      let errorThrown = false;
      try {
        await paymentService.collectPayment({
          studentId: student._id.toString(),
          paymentType: 'INITIAL_PAYMENT',
          paymentMode: 'Cash',
          amount: -500
        }, staffId);
      } catch (e) {
        errorThrown = true;
        console.log('Caught expected error:', e.message);
      }
      if (!errorThrown) throw new Error('Test 8 Failed - should reject negative amount');
      console.log('✅ TEST 8 PASSED');
    }

    console.log('\n==============================');
    console.log('TEST 9: Payment on Already PAID Installment');
    console.log('==============================');
    {
      const { student, installments } = await createTestStudent(50000, 10);
      const inst1 = installments[0];
      // Pay first time
      await paymentService.collectPayment({
        studentId: student._id.toString(),
        paymentType: 'INSTALLMENT_PAYMENT',
        paymentMode: 'Cash',
        amount: 5000,
        installmentId: inst1._id.toString()
      }, staffId);

      // Attempt second time
      let errorThrown = false;
      try {
        await paymentService.collectPayment({
          studentId: student._id.toString(),
          paymentType: 'INSTALLMENT_PAYMENT',
          paymentMode: 'Cash',
          amount: 5000,
          installmentId: inst1._id.toString()
        }, staffId);
      } catch (e) {
        errorThrown = true;
        console.log('Caught expected error on duplicate payment:', e.message);
      }
      if (!errorThrown) throw new Error('Test 9 Failed - should reject payment on paid installment');
      console.log('✅ TEST 9 PASSED');
    }

    console.log('\n==============================');
    console.log('ALL 9 TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('==============================');

  } catch (err) {
    console.error('TEST SUITE FAILED:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
