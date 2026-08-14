const studentRepository = require('../repositories/studentRepository');
const activityLogRepository = require('../repositories/activityLogRepository');
const { ConflictError, NotFoundError } = require('../utils/customErrors');

/**
 * Student Service - Implements business logic workflows for Student management.
 * Coordinates input validation logic, duplicate checks, transaction audits, and logging.
 */
class StudentService {
  /**
   * Register a new student profile manually.
   * @param {Object} studentData - Student registration payload.
   * @param {string} creatorId - ID of operator staff creating the profile.
   */
  async registerStudent(studentData, creatorId) {
    // Check email uniqueness
    const emailExists = await studentRepository.existsByEmail(studentData.email);
    if (emailExists) {
      throw new ConflictError('A student with this email address already exists.');
    }

    // Check mobile uniqueness
    const mobileExists = await studentRepository.existsByMobile(studentData.mobile);
    if (mobileExists) {
      throw new ConflictError('A student with this mobile number already exists.');
    }

    const studentInfo = {
      ...studentData,
      status: 'ACTIVE',
      createdBy: creatorId
    };

    // Save to Database
    const newStudent = await studentRepository.create(studentInfo);

    // Write Activity Log (Audit)
    await activityLogRepository.create({
      action: 'STUDENT_ADDED',
      description: `Student ${newStudent.fullName} (${newStudent.studentId}) was manually registered.`,
      performedBy: creatorId,
      studentId: newStudent._id
    });

    const cacheHelper = require('../utils/cacheHelper');
    cacheHelper.delByPattern('dashboard:*').catch(() => {});

    return newStudent;
  }

  /**
   * Get complete profile details for a student.
   * @param {string} id - Student database Object ID.
   */
  async getStudentProfile(id) {
    const student = await studentRepository.findById(id);
    if (!student) {
      throw new NotFoundError('Student profile not found.');
    }
    return student;
  }

  /**
   * Retrieve list of students matching filter/pagination criteria.
   * @param {Object} queryParams - Search, pagination, filtering, and sort fields.
   */
  async listStudents(queryParams) {
    const { search, status, course, page = 1, limit = 10, sort = 'newest' } = queryParams;
    const queryFilter = {};

    // Specific filters
    if (status) {
      queryFilter.status = status.toUpperCase();
    }
    if (course) {
      queryFilter.course = { $regex: course, $options: 'i' };
    }

    // Generic search across fields
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      queryFilter.$or = [
        { fullName: searchRegex },
        { studentId: searchRegex },
        { email: searchRegex },
        { mobile: searchRegex },
        { course: searchRegex }
      ];
    }

    // Sort order
    let sortObj = { createdAt: -1 }; // newest by default
    if (sort === 'oldest') {
      sortObj = { createdAt: 1 };
    } else if (sort === 'a-z') {
      sortObj = { fullName: 1 };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const { students, total } = await studentRepository.find(queryFilter, sortObj, skip, limitNum);

    return {
      students,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    };
  }

  /**
   * Update student details.
   * @param {string} id - Student Object ID.
   * @param {Object} updateData - Key-values to update.
   * @param {string} modifierId - ID of operator staff performing update.
   */
  async updateStudent(id, updateData, modifierId) {
    const student = await studentRepository.findById(id);
    if (!student) {
      throw new NotFoundError('Student profile not found.');
    }

    // Duplicate email verification excluding self
    if (updateData.email) {
      const emailExists = await studentRepository.existsByEmail(updateData.email, id);
      if (emailExists) {
        throw new ConflictError('A student with this email address already exists.');
      }
    }

    // Duplicate mobile verification excluding self
    if (updateData.mobile) {
      const mobileExists = await studentRepository.existsByMobile(updateData.mobile, id);
      if (mobileExists) {
        throw new ConflictError('A student with this mobile number already exists.');
      }
    }

    const updatedStudent = await studentRepository.update(id, updateData);

    // Audit Log
    await activityLogRepository.create({
      action: 'STUDENT_UPDATED',
      description: `Student ${updatedStudent.fullName} (${updatedStudent.studentId}) profile was updated.`,
      performedBy: modifierId,
      studentId: updatedStudent._id
    });

    const cacheHelper = require('../utils/cacheHelper');
    cacheHelper.delByPattern('dashboard:*').catch(() => {});

    return updatedStudent;
  }

  /**
   * Soft-delete student (assign INACTIVE status and stamp deleted details).
   * @param {string} id - Student database Object ID.
   * @param {string} userId - Operator User ID.
   */
  async removeStudent(id, userId) {
    const student = await studentRepository.findById(id);
    if (!student) {
      throw new NotFoundError('Student profile not found.');
    }

    const deletedStudent = await studentRepository.softDelete(id, userId);

    // Audit Log
    await activityLogRepository.create({
      action: 'STUDENT_DELETED',
      description: `Student ${student.fullName} (${student.studentId}) profile was soft-deleted.`,
      performedBy: userId,
      studentId: student._id
    });

    const cacheHelper = require('../utils/cacheHelper');
    cacheHelper.delByPattern('dashboard:*').catch(() => {});

    return deletedStudent;
  }

  /**
   * Load summary status figures and counts for the dashboard.
   */
  async getDashboardSummary() {
    return await studentRepository.getDashboardSummary();
  }
}

module.exports = new StudentService();
