require('dotenv').config()
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const db = require("./db");
const { validateSignup, validateLogin } = require("./middleware/validation.js");
const { authenticateToken, authorizeRoles } = require("./middleware/auth");
const path = require('path');
const upload = require('./middleware/uploadMiddleware');
const csv = require('csv-parser');
const fs = require('fs');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ========================================
// AUTHENTICATION ENDPOINTS
// ========================================

// Signup API
app.post("/signup", limiter, validateSignup, async (req, res) => {
  try {
    const { name, email, password, college, role } = req.sanitizedInputs;

    // Check if user exists
    const [existingUsers] = await db.promise().query(
      "SELECT id FROM Users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: "Email is already registered"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = { name, email, password: hashedPassword, college, role };

    // Insert new user
    await db.promise().query("INSERT INTO Users SET ?", [newUser]);

    res.status(201).json({
      status: 'success',
      message: "User registered successfully"
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({
      status: 'error',
      message: "Failed to create account. Please try again later."
    });
  }
});

// Login API
app.post("/login", limiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.sanitizedInputs;

    // Get user
    const [users] = await db.promise().query(
      "SELECT * FROM Users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: "Invalid email or password"
      });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: "Invalid email or password"
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      status: 'success',
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      status: 'error',
      message: "Login failed. Please try again later."
    });
  }
});

// ========================================
// SUPER ADMIN ENDPOINTS
// ========================================

app.get("/admin/users", authenticateToken, authorizeRoles("super_admin"), async (req, res) => {
  try {
    const [users] = await db.promise().query(
      `SELECT id, name, email, college, role, 
       (SELECT COUNT(*) FROM Events WHERE college_id = Users.id) as events_created,
       (SELECT COUNT(*) FROM Registrations WHERE user_id = Users.id) as registrations_count
       FROM Users`
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.get("/admin/stats", authenticateToken, authorizeRoles("super_admin"), async (req, res) => {
  try {
    const [[totalUsers]] = await db.promise().query(
      "SELECT COUNT(*) as total FROM Users"
    );
    
    const [[usersByRole]] = await db.promise().query(
      `SELECT 
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as students,
        SUM(CASE WHEN role = 'college_admin' THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN role = 'super_admin' THEN 1 ELSE 0 END) as super_admins
       FROM Users`
    );

    const [[eventStats]] = await db.promise().query(
      `SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT college_id) as colleges_with_events,
        (SELECT COUNT(*) FROM Registrations) as total_registrations,
        (SELECT COUNT(*) FROM Registrations WHERE status = 'approved') as approved_registrations
       FROM Events`
    );

    const [topColleges] = await db.promise().query(
      `SELECT 
        u.college,
        COUNT(e.id) as event_count,
        SUM((SELECT COUNT(*) FROM Registrations r WHERE r.event_id = e.id)) as registration_count
       FROM Users u
       JOIN Events e ON u.id = e.college_id
       GROUP BY u.college
       ORDER BY event_count DESC
       LIMIT 5`
    );

    const [recentActivity] = await db.promise().query(
      `SELECT 
        'event_created' as type,
        e.title as description,
        u.name as user,
        e.created_at as timestamp
       FROM Events e
       JOIN Users u ON e.college_id = u.id
       UNION ALL
       SELECT 
        'registration' as type,
        ev.title as description,
        us.name as user,
        r.timestamp
       FROM Registrations r
       JOIN Events ev ON r.event_id = ev.id
       JOIN Users us ON r.user_id = us.id
       ORDER BY timestamp DESC
       LIMIT 10`
    );

    res.json({
      users: {
        total: totalUsers['total'],
        ...usersByRole
      },
      events: eventStats,
      topColleges,
      recentActivity
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
});

app.put("/admin/users/:id/role", authenticateToken, authorizeRoles("super_admin"), async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    
    if (!['student', 'college_admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    await db.promise().query(
      "UPDATE Users SET role = ? WHERE id = ?",
      [role, userId]
    );

    await db.promise().query(
      "INSERT INTO AdminLogs (action, user_id) VALUES (?, ?)",
      [`Updated user ${userId} role to ${role}`, req.user.id]
    );

    res.json({ message: "User role updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update user role" });
  }
});

// ========================================
// EVENT ENDPOINTS
// ========================================

app.post("/events", 
  authenticateToken, 
  authorizeRoles("college_admin", "super_admin"),
  upload.single('image'), 
  async (req, res) => {
    try {
      const { title, description, category, location, start_date, end_date } = req.body;
      const college_id = req.user.id;
      
      // Handle image
      let image_url = null;
      if (req.file) {
        image_url = `/uploads/events/${req.file.filename}`;
      }
      
      const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 19).replace('T', ' ');
      };
      
      const formattedStartDate = formatDate(start_date);
      const formattedEndDate = formatDate(end_date);
      
      const query = `INSERT INTO Events (college_id, title, description, category, location, start_date, end_date, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      db.query(query, [college_id, title, description, category, location, formattedStartDate, formattedEndDate, image_url], (err, result) => {
        if (err) {
          console.error('Event creation error:', err);
          return res.status(500).json({ message: "Failed to create event", error: err.message });
        }
        res.status(201).json({ 
          message: "Event created successfully", 
          eventId: result.insertId,
          image_url: image_url 
        });
      });
    } catch (error) {
      console.error('Event creation error:', error);
      res.status(500).json({ message: "Failed to create event", error: error.message });
    }
});

app.get("/events", async (req, res) => {
  try {
    const [events] = await db.promise().query(`
      SELECT 
        e.*,
        (SELECT COUNT(*) FROM Registrations WHERE event_id = e.id) as registration_count,
        (SELECT AVG(rating) FROM Feedback WHERE event_id = e.id) as avg_rating,
        (SELECT COUNT(*) FROM Feedback WHERE event_id = e.id) as feedback_count
      FROM Events e
      ORDER BY e.start_date DESC
    `);
    
    res.json(events);
  } catch (error) {
    console.error('Events fetch error:', error);
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

app.get("/events/:id", (req, res) => {
  db.query("SELECT * FROM Events WHERE id = ?", [req.params.id], (err, result) => {
    if (err) throw err;
    if (result.length === 0) return res.status(404).json({ message: "Event not found" });
    res.json(result[0]);
  });
});

app.put("/events/:id", authenticateToken, authorizeRoles("college_admin", "super_admin"), (req, res) => {
  const { title, description, category, location, start_date, end_date } = req.body;
  const query = `UPDATE Events SET title=?, description=?, category=?, location=?, start_date=?, end_date=? WHERE id=?`;

  db.query(query, [title, description, category, location, start_date, end_date, req.params.id], (err, result) => {
    if (err) throw err;
    res.json({ message: "Event updated successfully" });
  });
});

app.delete("/events/:id", authenticateToken, authorizeRoles("college_admin", "super_admin"), (req, res) => {
  db.query("DELETE FROM Events WHERE id=?", [req.params.id], (err, result) => {
    if (err) throw err;
    res.json({ message: "Event deleted successfully" });
  });
});

// ========================================
// REGISTRATION ENDPOINTS
// ========================================

app.post("/registrations", authenticateToken, authorizeRoles("student"), async (req, res) => {
  try {
    const { event_id } = req.body;
    const user_id = req.user.id;
    
    // Check if already registered
    const checkQuery = `SELECT id, status FROM Registrations WHERE event_id = ? AND user_id = ?`;
    const [existingRegistrations] = await db.promise().query(checkQuery, [event_id, user_id]);
    
    if (existingRegistrations.length > 0) {
      return res.status(400).json({
        message: `You have already registered for this event.`
      });
    }
    
    // Insert registration
    const insertQuery = `INSERT INTO Registrations (event_id, user_id, status) VALUES (?, ?, 'pending')`;
    const [result] = await db.promise().query(insertQuery, [event_id, user_id]);
    
    // Update event registration count
    await db.promise().query(
      'UPDATE Events SET registration_count = registration_count + 1 WHERE id = ?',
      [event_id]
    );
    
    // Award points for registration
    await awardPoints(user_id, 10, 'Event registration');
    
    // Track activity
    await db.promise().query(
      'INSERT INTO UserActivity (user_id, event_id, activity_type) VALUES (?, ?, ?)',
      [user_id, event_id, 'register']
    );
    
    res.status(201).json({
      message: "Registration submitted successfully! You earned 10 points.",
      registrationId: result.insertId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: "Failed to process registration" });
  }
});

app.get("/registrations/event/:eventId", authenticateToken, authorizeRoles("college_admin", "super_admin"), (req, res) => {
  const query = `
    SELECT r.id, u.name AS student_name, u.email, r.status, r.timestamp
    FROM Registrations r
    JOIN Users u ON r.user_id = u.id
    WHERE r.event_id = ?`;

  db.query(query, [req.params.eventId], (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

app.put("/registrations/:id", authenticateToken, authorizeRoles("college_admin", "super_admin"), (req, res) => {
  const { status } = req.body;
  const query = `UPDATE Registrations SET status=? WHERE id=?`;

  db.query(query, [status, req.params.id], (err, result) => {
    if (err) throw err;
    res.json({ message: `Registration ${status}` });
  });
});

app.get("/registrations/user/:userId", authenticateToken, authorizeRoles("student"), (req, res) => {
  if (parseInt(req.params.userId) !== req.user.id) {
    return res.status(403).json({ message: "Forbidden: You can only view your own registrations" });
  }

  const query = `
    SELECT r.id, e.title, e.location, r.status, r.timestamp
    FROM Registrations r
    JOIN Events e ON r.event_id = e.id
    WHERE r.user_id = ?`;

  db.query(query, [req.params.userId], (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

// ========================================
// ADMIN HELPER ENDPOINTS
// ========================================

app.get("/admin/students", 
  authenticateToken, 
  authorizeRoles("college_admin", "super_admin"), 
  async (req, res) => {
    try {
      const [students] = await db.promise().query(
        'SELECT id, name, email, college FROM Users WHERE role = ? ORDER BY name',
        ['student']
      );
      res.json(students);
    } catch (error) {
      console.error('Error fetching students:', error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
});

app.get("/admin/events-list", 
  authenticateToken, 
  authorizeRoles("college_admin", "super_admin"), 
  async (req, res) => {
    try {
      const [events] = await db.promise().query(
        `SELECT e.id, e.title, e.start_date, 
         COUNT(r.id) as registration_count
         FROM Events e
         LEFT JOIN Registrations r ON e.id = r.event_id
         WHERE e.college_id = ?
         GROUP BY e.id
         ORDER BY e.start_date DESC`,
        [req.user.id]
      );
      res.json(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
});

app.get("/admin/event/:eventId/students", 
  authenticateToken, 
  authorizeRoles("college_admin", "super_admin"), 
  async (req, res) => {
    try {
      const [students] = await db.promise().query(
        `SELECT DISTINCT u.id, u.name, u.email, r.status
         FROM Users u
         JOIN Registrations r ON u.id = r.user_id
         WHERE r.event_id = ? AND u.role = 'student'
         ORDER BY u.name`,
        [req.params.eventId]
      );
      res.json(students);
    } catch (error) {
      console.error('Error fetching event students:', error);
      res.status(500).json({ message: "Failed to fetch event students" });
    }
});

// ========================================
// NOTIFICATION ENDPOINTS (UPDATED SCHEMA)
// ========================================

// Enhanced notification broadcast with new schema
app.post("/notifications/broadcast", 
  authenticateToken, 
  authorizeRoles("college_admin", "super_admin"), 
  async (req, res) => {
    try {
      const { title, message, type = 'general', targetType, targetIds, eventId } = req.body;
      
      // Validate input
      if (!title || !message) {
        return res.status(400).json({ 
          message: "Title and message are required" 
        });
      }

      if (!targetType || !['all', 'specific', 'event'].includes(targetType)) {
        return res.status(400).json({ 
          message: "Valid targetType is required (all, specific, or event)" 
        });
      }

      let targetStudents = [];
      let eventName = null;

      // Get event name if eventId is provided (works for all target types now)
      if (eventId) {
        const [[event]] = await db.promise().query(
          'SELECT title FROM Events WHERE id = ?',
          [eventId]
        );
        eventName = event ? event.title : null;
      }

      // Determine target students based on targetType
      switch (targetType) {
        case 'all':
          const [allStudents] = await db.promise().query(
            'SELECT id, name FROM Users WHERE role = ?',
            ['student']
          );
          targetStudents = allStudents;
          break;

        case 'specific':
          
          if (!targetIds || !Array.isArray(targetIds) || targetIds.length === 0) {
            return res.status(400).json({ 
              message: "targetIds array is required for specific targeting" 
            });
          }
          
          const placeholders = targetIds.map(() => '?').join(',');
          const [specificStudents] = await db.promise().query(
            `SELECT id, name FROM Users WHERE id IN (${placeholders}) AND role = 'student'`,
            targetIds
          );
          targetStudents = specificStudents;
          
          if (specificStudents.length === 0) {
            return res.status(404).json({ 
              message: "No valid students found in the provided IDs" 
            });
          }
          break;

        case 'event':
          
          if (!eventId) {
            return res.status(400).json({ 
              message: "eventId is required for event targeting" 
            });
          }
          
          const [eventStudents] = await db.promise().query(
            `SELECT DISTINCT u.id, u.name 
             FROM Users u
             JOIN Registrations r ON u.id = r.user_id
             WHERE r.event_id = ? AND u.role = 'student'`,
            [eventId]
          );
          targetStudents = eventStudents;
          break;

        default:
          return res.status(400).json({ 
            message: "Invalid targetType" 
          });
      }

      if (targetStudents.length === 0) {
        return res.status(404).json({ 
          message: "No students found for the specified target" 
        });
      }

      // Step 1: Create the notification record (single record for the broadcast)
      const [notificationResult] = await db.promise().query(
        'INSERT INTO Notifications (event_id, event_name, title, message, type, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [eventId || null, eventName, title, message, type, req.user.id]
      );
      
      const notificationId = notificationResult.insertId;
      // Step 2: Create received notification records for each student
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const student of targetStudents) {
        try {
          await db.promise().query(
            `INSERT INTO ReceivedNotifications 
             (notification_id, user_id, user_name, event_id, event_name, title, message, type, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [                   
              notificationId,
              student.id,
              student.name,
              eventId || null,
              eventName,
              title,
              message,
              type,
              req.user.id
            ]
          );
          successCount++;
        } catch (err) {
          console.error(`✗ Failed to create received notification for user ${student.id}:`, err.message);
          errorCount++;
          errors.push(`Failed for user ${student.id} (${student.name}): ${err.message}`);
        }
      }

      // Log admin action
      const actionLog = eventName 
        ? `Sent notification "${title}" about event "${eventName}" to ${successCount} students (type: ${targetType})`
        : `Sent notification "${title}" to ${successCount} students (type: ${targetType})`;
      
      await db.promise().query(
        "INSERT INTO AdminLogs (action, user_id) VALUES (?, ?)",
        [actionLog, req.user.id]
      );

      res.json({ 
        message: `Notification sent to ${successCount} student${successCount !== 1 ? 's' : ''} successfully`,
        success: successCount,
        failed: errorCount,
        total: targetStudents.length,
        targetType: targetType,
        notificationId: notificationId,
        eventId: eventId,
        eventName: eventName,
        targetStudentIds: targetStudents.map(s => s.id),
        errors: errorCount > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('❌ BROADCAST NOTIFICATION ERROR:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({ 
        message: "Failed to broadcast notifications",
        error: error.message 
      });
    }
  }
);

// Get all received notifications for a specific user
app.get("/notifications/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user is requesting their own notifications (or is super_admin)
    if (req.user.id !== parseInt(userId) && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: "Access denied" });
    }

    const [notifications] = await db.promise().query(
      `SELECT rn.*
       FROM ReceivedNotifications rn
       WHERE rn.user_id = ?
       ORDER BY rn.created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
  }
});

// Get unread notification count for a specific user
app.get("/notifications/:userId/unread-count", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== parseInt(userId) && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: "Access denied" });
    }

    const [result] = await db.promise().query(
      "SELECT COUNT(*) as count FROM ReceivedNotifications WHERE user_id = ? AND is_read = FALSE",
      [userId]
    );

    const count = result[0].count;
    
    res.json({ count: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: "Failed to fetch unread count", error: error.message });
  }
});

// Mark specific notification as read
app.put("/notifications/:notificationId/read", authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Verify notification belongs to user
    const [notification] = await db.promise().query(
      "SELECT user_id FROM ReceivedNotifications WHERE id = ?",
      [notificationId]
    );

    if (notification.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification[0].user_id !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if read_at column exists, if not, just update is_read
    try {
      await db.promise().query(
        "UPDATE ReceivedNotifications SET is_read = TRUE, read_at = NOW() WHERE id = ?",
        [notificationId]
      );
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        // read_at column doesn't exist, just update is_read
        await db.promise().query(
          "UPDATE ReceivedNotifications SET is_read = TRUE WHERE id = ?",
          [notificationId]
        );
      } else {
        throw err;
      }
    }

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read for a user
app.put("/notifications/:userId/read-all", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.id !== parseInt(userId) && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if read_at column exists, if not, just update is_read
    try {
      const [result] = await db.promise().query(
        "UPDATE ReceivedNotifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE",
        [userId]
      );
      res.json({ 
        message: "All notifications marked as read",
        updated: result.affectedRows
      });
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        // read_at column doesn't exist, just update is_read
        const [result] = await db.promise().query(
          "UPDATE ReceivedNotifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE",
          [userId]
        );
        res.json({ 
          message: "All notifications marked as read",
          updated: result.affectedRows
        });
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('❌ Error marking all as read:', error);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

// Delete a received notification
app.delete("/notifications/:notificationId", authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    // Verify notification belongs to user
    const [notification] = await db.promise().query(
      "SELECT user_id FROM ReceivedNotifications WHERE id = ?",
      [notificationId]
    );

    if (notification.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification[0].user_id !== req.user.id && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: "Access denied" });
    }

    await db.promise().query("DELETE FROM ReceivedNotifications WHERE id = ?", [notificationId]);
    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: "Failed to delete notification" });
  }
});

// Admin: View sent notifications
app.get("/admin/notifications/sent", 
  authenticateToken, 
  authorizeRoles("college_admin", "super_admin"), 
  async (req, res) => {
    try {
      const [notifications] = await db.promise().query(
        `SELECT 
          n.*,
          u.name as created_by_name,
          COUNT(rn.id) as recipients_count,
          SUM(CASE WHEN rn.is_read = TRUE THEN 1 ELSE 0 END) as read_count
         FROM Notifications n
         LEFT JOIN Users u ON n.created_by = u.id
         LEFT JOIN ReceivedNotifications rn ON n.id = rn.notification_id
         WHERE n.created_by = ?
         GROUP BY n.id
         ORDER BY n.created_at DESC
         LIMIT 50`,
        [req.user.id]
      );

      res.json(notifications);
    } catch (error) {
      console.error('Error fetching sent notifications:', error);
      res.status(500).json({ message: "Failed to fetch sent notifications" });
    }
});

// Admin: Get notification details with recipients
app.get("/admin/notifications/:notificationId/details", 
  authenticateToken, 
  authorizeRoles("college_admin", "super_admin"), 
  async (req, res) => {
    try {
      const { notificationId } = req.params;

      // Get notification details
      const [[notification]] = await db.promise().query(
        `SELECT n.*, u.name as created_by_name
         FROM Notifications n
         LEFT JOIN Users u ON n.created_by = u.id
         WHERE n.id = ?`,
        [notificationId]
      );

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      // Get recipients
      const [recipients] = await db.promise().query(
        `SELECT 
          rn.id,
          rn.user_id,
          rn.user_name,
          rn.is_read,
          rn.read_at,
          rn.created_at
         FROM ReceivedNotifications rn
         WHERE rn.notification_id = ?
         ORDER BY rn.created_at DESC`,
        [notificationId]
      );

      res.json({
        notification,
        recipients,
        stats: {
          total: recipients.length,
          read: recipients.filter(r => r.is_read).length,
          unread: recipients.filter(r => !r.is_read).length
        }
      });
    } catch (error) {
      console.error('Error fetching notification details:', error);
      res.status(500).json({ message: "Failed to fetch notification details" });
    }
});

// ========================================
// FEEDBACK ENDPOINTS
// ========================================

app.post("/feedback", authenticateToken, async (req, res) => {
  try {
    const { event_id, rating, comments } = req.body;
    const user_id = req.user.id;
    
    // Validation
    if (!event_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Invalid input" });
    }
    
    // Check if event exists
    const [events] = await db.promise().query('SELECT id FROM Events WHERE id = ?', [event_id]);
    if (events.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }
    
    // Check for existing feedback
    const [existingFeedback] = await db.promise().query(
      `SELECT id FROM Feedback WHERE event_id = ? AND user_id = ?`,
      [event_id, user_id]
    );
    
    if (existingFeedback.length > 0) {
      return res.status(400).json({ message: "You have already submitted feedback" });
    }
    
    // Submit feedback
    await db.promise().query(
      'INSERT INTO Feedback (event_id, user_id, rating, comments) VALUES (?, ?, ?, ?)',
      [event_id, user_id, rating, comments]
    );
    
    // Award points
    await awardPoints(user_id, 5, 'Feedback submission');
    
    // Check for feedback badge
    const [[feedbackCount]] = await db.promise().query(
      'SELECT COUNT(*) as count FROM Feedback WHERE user_id = ?',
      [user_id]
    );
    
    if (feedbackCount.count === 5) {
      await awardBadge(user_id, 'Feedback Champion', 'Provided feedback for 5 events');
    } else if (feedbackCount.count === 10) {
      await awardBadge(user_id, 'Feedback Legend', 'Provided feedback for 10 events');
    }
    
    res.status(201).json({ message: "Feedback submitted successfully! You earned 5 points." });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
});

app.get("/feedback/event/:eventId", authenticateToken, async (req, res) => {
  try {
    const [feedback] = await db.promise().query(
      `SELECT 
        f.id,
        u.name as student_name,
        f.rating,
        f.comments,
        f.timestamp
      FROM Feedback f
      JOIN Users u ON f.user_id = u.id
      WHERE f.event_id = ?
      ORDER BY f.timestamp DESC`,
      [req.params.eventId]
    );

    // Calculate average rating
    const [[stats]] = await db.promise().query(
      `SELECT 
        COUNT(*) as total_feedback,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_ratings
      FROM Feedback
      WHERE event_id = ?`,
      [req.params.eventId]
    );

    res.json({
      feedback,
      stats: {
        total_feedback: stats.total_feedback,
        average_rating: stats.average_rating ? Number(stats.average_rating.toFixed(1)) : 0,
        positive_ratings: stats.positive_ratings
      }
    });
  } catch (error) {
    console.error('Feedback retrieval error:', error);
    res.status(500).json({
      message: "Failed to retrieve feedback",
      error: error.message
    });
  }
});

app.get("/feedback/analytics", authenticateToken, authorizeRoles("college_admin", "super_admin"), async (req, res) => {
  try {
    // Overall stats
    const [[overallStats]] = await db.promise().query(
      `SELECT 
        COUNT(DISTINCT event_id) as events_with_feedback,
        AVG(rating) as average_rating,
        COUNT(*) as total_feedback
      FROM Feedback`
    );

    // Rating distribution
    const [ratingDistribution] = await db.promise().query(
      `SELECT 
        rating,
        COUNT(*) as count
      FROM Feedback
      GROUP BY rating
      ORDER BY rating`
    );

    // Top rated events
    const [topEvents] = await db.promise().query(
      `SELECT 
        e.title,
        e.category,
        COUNT(f.id) as feedback_count,
        AVG(f.rating) as average_rating
      FROM Events e
      JOIN Feedback f ON e.id = f.event_id
      GROUP BY e.id
      HAVING feedback_count >= 3
      ORDER BY average_rating DESC
      LIMIT 5`
    );

    // Recent feedback
    const [recentFeedback] = await db.promise().query(
      `SELECT 
        e.title as event_title,
        u.name as student_name,
        f.rating,
        f.comments,
        f.timestamp
      FROM Feedback f
      JOIN Events e ON f.event_id = e.id
      JOIN Users u ON f.user_id = u.id
      ORDER BY f.timestamp DESC
      LIMIT 10`
    );

    const formatRating = (rating) => {
      if (rating === null || rating === undefined) return 0;
      const num = Number(rating);
      return isNaN(num) ? 0 : Number(num.toFixed(1));
    };

    res.json({
      overall: {
        events_with_feedback: overallStats.events_with_feedback || 0,
        average_rating: formatRating(overallStats.average_rating),
        total_feedback: overallStats.total_feedback || 0
      },
      rating_distribution: ratingDistribution,
      top_events: topEvents.map(event => ({
        ...event,
        average_rating: formatRating(event.average_rating)
      })),
      recent_feedback: recentFeedback
    });
  } catch (error) {
    console.error('Feedback analytics error:', error);
    res.status(500).json({
      message: "Failed to retrieve feedback analytics",
      error: error.message
    });
  }
});

// ========================================
// COMMENTS ENDPOINTS
// ========================================

app.post("/event-comments", authenticateToken, authorizeRoles("student"), (req, res) => {
  const { event_id, comment } = req.body;
  const user_id = req.user.id;
  const q = "INSERT INTO EventComments (event_id, user_id, comment) VALUES (?, ?, ?)";
  db.query(q, [event_id, user_id, comment], (err) => {
    if (err) throw err;
    res.status(201).json({ message: "Comment added" });
  });
});

app.get("/event-comments/:eventId", authenticateToken, (req, res) => {
  const q = `
    SELECT c.id, u.name, c.comment, c.created_at
    FROM EventComments c
    JOIN Users u ON c.user_id = u.id
    WHERE c.event_id = ?
    ORDER BY c.created_at DESC`;
  db.query(q, [req.params.eventId], (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

// ========================================
// PROFILE ENDPOINTS
// ========================================

app.get("/profile/:userId", authenticateToken, async (req, res) => {
  try {
    const [users] = await db.promise().query(
      `SELECT id, name, email, college, role, profile_photo, bio, points, badges 
       FROM Users WHERE id = ?`,
      [req.params.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = users[0];
    user.badges = user.badges ? JSON.parse(user.badges) : [];
    
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

app.put("/profile", authenticateToken, upload.single('profilePhoto'), async (req, res) => {
  try {
    const { bio } = req.body;
    const userId = req.user.id;
    
    let profile_photo = null;
    if (req.file) {
      profile_photo = `/uploads/profiles/${req.file.filename}`;
    }
    
    const updates = [];
    const values = [];
    
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio);
    }
    
    if (profile_photo) {
      updates.push('profile_photo = ?');
      values.push(profile_photo);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: "No updates provided" });
    }
    
    values.push(userId);
    const query = `UPDATE Users SET ${updates.join(', ')} WHERE id = ?`;
    
    await db.promise().query(query, values);
    res.json({ message: "Profile updated successfully", profile_photo });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// ========================================
// BOOKMARKS ENDPOINTS
// ========================================

app.post("/bookmarks/toggle", authenticateToken, async (req, res) => {
  try {
    const { event_id } = req.body;
    const user_id = req.user.id;
    
    // Check if bookmark exists
    const [existing] = await db.promise().query(
      'SELECT id FROM Bookmarks WHERE user_id = ? AND event_id = ?',
      [user_id, event_id]
    );
    
    if (existing.length > 0) {
      // Remove bookmark
      await db.promise().query(
        'DELETE FROM Bookmarks WHERE user_id = ? AND event_id = ?',
        [user_id, event_id]
      );
      res.json({ message: "Bookmark removed", bookmarked: false });
    } else {
      // Add bookmark
      await db.promise().query(
        'INSERT INTO Bookmarks (user_id, event_id) VALUES (?, ?)',
        [user_id, event_id]
      );
      
      // Track activity for recommendations
      await db.promise().query(
        'INSERT INTO UserActivity (user_id, event_id, activity_type) VALUES (?, ?, ?)',
        [user_id, event_id, 'bookmark']
      );
      
      res.json({ message: "Bookmark added", bookmarked: true });
    }
  } catch (error) {
    console.error('Bookmark toggle error:', error);
    res.status(500).json({ message: "Failed to toggle bookmark" });
  }
});

app.get("/bookmarks/my", authenticateToken, async (req, res) => {
  try {
    const [bookmarks] = await db.promise().query(
      `SELECT e.*, b.created_at as bookmarked_at,
       (SELECT COUNT(*) FROM Registrations WHERE event_id = e.id) as registration_count
       FROM Bookmarks b
       JOIN Events e ON b.event_id = e.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(bookmarks);
  } catch (error) {
    console.error('Bookmarks fetch error:', error);
    res.status(500).json({ message: "Failed to fetch bookmarks" });
  }
});

app.get("/bookmarks/check/:eventId", authenticateToken, async (req, res) => {
  try {
    const [result] = await db.promise().query(
      'SELECT id FROM Bookmarks WHERE user_id = ? AND event_id = ?',
      [req.user.id, req.params.eventId]
    );
    res.json({ bookmarked: result.length > 0 });
  } catch (error) {
    console.error('Bookmark check error:', error);
    res.status(500).json({ message: "Failed to check bookmark" });
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

// Create notification (updated for new schema)
async function createNotification(userId, eventId, title, message, type, createdBy) {
  try {
    // Get event name if eventId is provided
    let eventName = null;
    if (eventId) {
      const [[event]] = await db.promise().query(
        'SELECT title FROM Events WHERE id = ?',
        [eventId]
      );
      eventName = event ? event.title : null;
    }

    // Get user name
    const [[user]] = await db.promise().query(
      'SELECT name FROM Users WHERE id = ?',
      [userId]
    );
    const userName = user ? user.name : 'Unknown';

    // Create notification record
    const [notificationResult] = await db.promise().query(
      'INSERT INTO Notifications (event_id, event_name, title, message, type, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [eventId, eventName, title, message, type, createdBy]
    );

    // Create received notification for the user
    await db.promise().query(
      `INSERT INTO ReceivedNotifications 
       (notification_id, user_id, user_name, event_id, event_name, title, message, type, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [notificationResult.insertId, userId, userName, eventId, eventName, title, message, type, createdBy]
    );

  } catch (error) {
    console.error('Notification creation error:', error);
  }
}

// Award points to user
async function awardPoints(userId, points, reason) {
  try {
    await db.promise().query(
      'UPDATE Users SET points = points + ? WHERE id = ?',
      [points, userId]
    );
  } catch (error) {
    console.error('Points award error:', error);
  }
}

// Award badge to user
async function awardBadge(userId, badgeName, badgeDescription) {
  try {
    const [[user]] = await db.promise().query(
      'SELECT badges FROM Users WHERE id = ?',
      [userId]
    );
    
    let badges = user.badges ? JSON.parse(user.badges) : [];
    
    // Check if badge already exists
    if (!badges.find(b => b.name === badgeName)) {
      badges.push({
        name: badgeName,
        description: badgeDescription,
        earned_at: new Date().toISOString()
      });
      
      await db.promise().query(
        'UPDATE Users SET badges = ? WHERE id = ?',
        [JSON.stringify(badges), userId]
      );
      
      // Notify user using new schema
      await createNotification(
        userId,
        null,
        '🏆 New Badge Earned!',
        `You've earned the "${badgeName}" badge!`,
        'badge_earned',
        1 // System user ID
      );
    }
  } catch (error) {
    console.error('Badge award error:', error);
  }
}

// ========================================
// GAMIFICATION ENDPOINTS
// ========================================

app.get("/leaderboard", authenticateToken, async (req, res) => {
  try {
    const [leaders] = await db.promise().query(
      `SELECT id, name, profile_photo, points, badges,
       (SELECT COUNT(*) FROM Registrations WHERE user_id = Users.id AND status = 'approved') as events_attended,
       (SELECT COUNT(*) FROM Feedback WHERE user_id = Users.id) as feedback_given
       FROM Users
       WHERE role = 'student'
       ORDER BY points DESC
       LIMIT 20`
    );
    
    const leadersWithBadges = leaders.map(leader => ({
      ...leader,
      badges: leader.badges ? JSON.parse(leader.badges) : []
    }));
    
    res.json(leadersWithBadges);
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

app.get("/leaderboard/rank", authenticateToken, async (req, res) => {
  try {
    const [[userRank]] = await db.promise().query(
      `SELECT COUNT(*) + 1 as rank
       FROM Users
       WHERE role = 'student' AND points > (SELECT points FROM Users WHERE id = ?)`,
      [req.user.id]
    );
    res.json({ rank: userRank.rank });
  } catch (error) {
    console.error('Rank fetch error:', error);
    res.status(500).json({ message: "Failed to fetch rank" });
  }
});

// ========================================
// RECOMMENDATIONS ENDPOINT
// ========================================

app.get("/events/recommended", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    
    // Get user's activity to determine preferences
    const [userActivity] = await db.promise().query(
      `SELECT e.category, COUNT(*) as count
       FROM UserActivity ua
       JOIN Events e ON ua.event_id = e.id
       WHERE ua.user_id = ?
       GROUP BY e.category
       ORDER BY count DESC
       LIMIT 3`,
      [user_id]
    );
    
    let recommended = [];
    
    if (userActivity.length > 0) {
      // Get events in preferred categories that user hasn't registered for
      const categories = userActivity.map(a => a.category);
      const placeholders = categories.map(() => '?').join(',');
      
      const [events] = await db.promise().query(
        `SELECT e.*, 
         (SELECT COUNT(*) FROM Registrations WHERE event_id = e.id) as registration_count,
         (SELECT AVG(rating) FROM Feedback WHERE event_id = e.id) as avg_rating
         FROM Events e
         WHERE e.category IN (${placeholders})
         AND e.id NOT IN (SELECT event_id FROM Registrations WHERE user_id = ?)
         AND e.start_date > NOW()
         ORDER BY e.created_at DESC
         LIMIT 6`,
        [...categories, user_id]
      );
      
      recommended = events;
    }
    
    // If not enough recommendations, add popular events
    if (recommended.length < 6) {
      const [popularEvents] = await db.promise().query(
        `SELECT e.*, 
         (SELECT COUNT(*) FROM Registrations WHERE event_id = e.id) as registration_count,
         (SELECT AVG(rating) FROM Feedback WHERE event_id = e.id) as avg_rating
         FROM Events e
         WHERE e.id NOT IN (SELECT event_id FROM Registrations WHERE user_id = ?)
         AND e.start_date > NOW()
         ORDER BY registration_count DESC
         LIMIT ?`,
        [user_id, 6 - recommended.length]
      );
      
      recommended = [...recommended, ...popularEvents];
    }
    
    res.json(recommended);
  } catch (error) {
    console.error('Recommendations fetch error:', error);
    res.status(500).json({ message: "Failed to fetch recommendations" });
  }
});

// ========================================
// CSV BULK IMPORT
// ========================================

app.post("/events/bulk-import", 
  authenticateToken, 
  authorizeRoles("college_admin", "super_admin"),
  upload.single('csv'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }
      
      const college_id = req.user.id;
      const events = [];
      const errors = [];
      
      // Read and parse CSV
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          // Validate required fields
          if (!row.title || !row.category || !row.location || !row.start_date || !row.end_date) {
            errors.push(`Missing required fields in row: ${JSON.stringify(row)}`);
            return;
          }
          
          events.push({
            title: row.title,
            description: row.description || '',
            category: row.category,
            location: row.location,
            start_date: new Date(row.start_date),
            end_date: new Date(row.end_date)
          });
        })
        .on('end', async () => {
          // Delete uploaded CSV file
          fs.unlinkSync(req.file.path);
          
          if (errors.length > 0) {
            return res.status(400).json({ 
              message: "CSV validation errors", 
              errors,
              imported: 0 
            });
          }
          
          // Insert events into database
          let imported = 0;
          for (const event of events) {
            try {
              const formatDate = (date) => {
                return date.toISOString().slice(0, 19).replace('T', ' ');
              };
              
              await db.promise().query(
                `INSERT INTO Events (college_id, title, description, category, location, start_date, end_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  college_id,
                  event.title,
                  event.description,
                  event.category,
                  event.location,
                  formatDate(event.start_date),
                  formatDate(event.end_date)
                ]
              );
              imported++;
            } catch (err) {
              errors.push(`Failed to import event "${event.title}": ${err.message}`);
            }
          }
          
          res.json({ 
            message: `Successfully imported ${imported} out of ${events.length} events`,
            imported,
            total: events.length,
            errors: errors.length > 0 ? errors : undefined
          });
        })
        .on('error', (error) => {
          fs.unlinkSync(req.file.path);
          res.status(500).json({ message: "Failed to parse CSV file", error: error.message });
        });
        
    } catch (error) {
      console.error('CSV import error:', error);
      res.status(500).json({ message: "Failed to import events", error: error.message });
    }
});

app.get("/events/csv-template", authenticateToken, authorizeRoles("college_admin", "super_admin"), (req, res) => {
  const csvContent = `title,description,category,location,start_date,end_date
Sample Event,This is a sample event description,Workshop,Main Hall,2025-12-01 10:00:00,2025-12-01 17:00:00
Tech Talk,Learn about latest technology trends,Hackathon,Auditorium,2025-12-05 09:00:00,2025-12-05 16:00:00`;
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=event_import_template.csv');
  res.send(csvContent);
});

// ========================================
// START SERVER
// ========================================

app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));