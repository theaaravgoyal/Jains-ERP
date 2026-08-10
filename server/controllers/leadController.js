const Lead = require('../models/Lead');

const createLead = async (req, res) => {
  try {
    let { name, phone, course, source, email, message } = req.body;

    // Validation
    if (!name || !phone || !course) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    name = name.trim();
    course = course.trim();
    source = source || "popup";

    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 to 50 characters",
      });
    }

    phone = phone.replace(/\D/g, "");

    if (phone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Phone must be exactly 10 digits",
      });
    }
    const recentLead = await Lead.findOne({
      phone,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    });

    if (recentLead) {
      return res.status(400).json({
        success: false,
        message: "You already submitted recently",
      });
    }

    const existing = await Lead.findOne({ phone, course });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Lead already exists",
      });
    }
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }
    }

    // Save to DB
    const lead = await Lead.create({
      name,
      phone,
      email,
      message,
      course,
      source,
    });

    // Enqueue Admin notification via BullMQ
    const notificationService = require('../services/notificationService');
    const { addEmailJob } = require('../queues/queueManager');

    notificationService.create({
      isAdmin: true,
      title: 'New Lead Received',
      message: `New enquiry received from ${name} (${phone}) for course ${course}.`,
      module: 'Admissions',
      type: 'INFO',
      priority: 'MEDIUM',
      actionUrl: '/lead'
    }).catch(e => console.warn('[LeadController] Notification enqueue warning:', e.message));

    // Enqueue candidate acknowledgement email via BullMQ if email provided
    if (email) {
      addEmailJob('lead-enquiry-email', {
        type: 'LEAD_RECEIVED',
        to: email,
        subject: `Thank you for your enquiry - ${course}`,
        data: {
          name,
          phone,
          course
        }
      }).catch(e => console.warn('[LeadController] Email enqueue warning:', e.message));
    }

    res.status(201).json({
      success: true,
      message: "Lead saved successfully",
      data: lead,
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json({ data: leads });
  } catch (err) {
    res.status(500).json({ message: "Error fetching leads" });
  }
};

const deleteLead = async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Delete error" });
  }
};

const updateLead = async (req, res) => {
  try {
    const { name, phone, email, message, course, source, status, counsellor, date } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.replace(/\D/g, "");
    if (email !== undefined) updateData.email = email;
    if (message !== undefined) updateData.message = message;
    if (course !== undefined) updateData.course = course.trim();
    if (source !== undefined) updateData.source = source;
    if (status !== undefined) updateData.status = status;
    if (counsellor !== undefined) updateData.counsellor = counsellor;
    if (date !== undefined) updateData.date = date;

    const updated = await Lead.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.json({ success: true, data: updated });

  } catch (err) {
    console.error("❌ Update Lead Error:", err.message);
    res.status(500).json({ success: false, message: "Update error" });
  }
};

const createOfflineLead = async (req, res) => {
  try {
    let { name, phone, course, source, email, message, counsellor, date } = req.body;

    if (!name || !phone || !course) {
      return res.status(400).json({
        success: false,
        message: "Name, Phone, and Course are required",
      });
    }

    name = name.trim();
    course = course.trim();
    phone = phone.replace(/\D/g, "");

    if (phone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: "Phone must be exactly 10 digits",
      });
    }

    // Since this is manually entered by admin, we don't do recent submission block.
    // But we check if the exact phone/course duplicate already exists.
    const existing = await Lead.findOne({ phone, course });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Lead with this phone and course already exists",
      });
    }

    const lead = await Lead.create({
      name,
      phone,
      email,
      message,
      course,
      source: source || "Walk-in",
      counsellor: counsellor || "Unassigned",
      date: date || new Date()
    });

    res.status(201).json({
      success: true,
      message: "Offline lead saved successfully",
      data: lead,
    });

  } catch (error) {
    console.error("❌ Create Offline Lead Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  createLead,
  getLeads,
  deleteLead,
  updateLead,
  createOfflineLead,
};
