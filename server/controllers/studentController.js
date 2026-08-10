const studentService = require('../services/studentService');
const { sendSuccess } = require('../utils/responseHelper');
const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notificationService');
const { addEmailJob } = require('../queues/queueManager');
const cacheHelper = require('../utils/cacheHelper');

/**
 * Student Controller - Handles incoming HTTP requests for Student profiles.
 * Dispatches input values to the Student service and manages HTTP status code mapping.
 */

/**
 * Create a new student manual enrollment entry.
 * @route POST /api/students
 */
const createStudent = asyncHandler(async (req, res) => {
  const creatorId = req.user.id || req.user._id;
  const newStudent = await studentService.registerStudent(req.body, creatorId);

  // Dynamic Notifications Center Trigger via BullMQ
  await notificationService.create({
    title: 'Student Enrolled',
    message: `Student ${newStudent.fullName} (${newStudent.studentId}) registered successfully in ${newStudent.course}.`,
    module: 'Fees Management',
    type: 'SUCCESS',
    priority: 'LOW',
    targetUser: creatorId,
    createdBy: creatorId,
    referenceId: newStudent._id,
    referenceType: 'Student',
    actionUrl: `/fees/students`
  });

  // Enqueue Welcome Email via BullMQ if student email exists
  if (newStudent.email) {
    await addEmailJob('student-welcome-email', {
      type: 'STUDENT_WELCOME',
      to: newStudent.email,
      subject: `Welcome to ERP Portal - Enrollment Confirmed for ${newStudent.course}`,
      data: {
        studentName: newStudent.fullName,
        studentId: newStudent.studentId,
        course: newStudent.course,
        totalFees: newStudent.totalFees
      }
    });
  }

  // Invalidate cached student summaries and dashboard metrics
  await cacheHelper.delByPattern('dashboard:*');
  await cacheHelper.delByPattern('report:*');

  return sendSuccess(res, 'Student registered successfully', newStudent, 201);
});

/**
 * Fetch a paginated and filtered list of students.
 * @route GET /api/students
 */
const getStudents = asyncHandler(async (req, res) => {
  const paginatedData = await studentService.listStudents(req.query);
  return sendSuccess(res, 'Students list retrieved successfully', paginatedData, 200);
});

/**
 * Retrieve complete profile for a single student.
 * @route GET /api/students/:id
 */
const getStudentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const student = await studentService.getStudentProfile(id);
  return sendSuccess(res, 'Student profile retrieved successfully', student, 200);
});

/**
 * Update editable fields of a student.
 * @route PUT /api/students/:id
 */
const updateStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const modifierId = req.user.id || req.user._id;
  const updatedStudent = await studentService.updateStudent(id, req.body, modifierId);
  return sendSuccess(res, 'Student profile updated successfully', updatedStudent, 200);
});

/**
 * Soft-delete a student from active listings.
 * @route DELETE /api/students/:id
 */
const deleteStudent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id || req.user._id;
  const deletedStudent = await studentService.removeStudent(id, userId);
  return sendSuccess(res, 'Student profile deleted successfully', deletedStudent, 200);
});

/**
 * Retrieve aggregates and statistics for fees management dashboard metrics.
 * @route GET /api/students/dashboard-summary
 */
const getDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await studentService.getDashboardSummary();
  return sendSuccess(res, 'Dashboard summary statistics retrieved successfully', summary, 200);
});

module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getDashboardSummary
};
