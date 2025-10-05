// server.js
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// --- Database Connection ---
const db = new sqlite3.Database("./helpdesk.db", (err) => {
  if (err) {
    console.error("❌ Database connection error:", err.message);
    return;
  }
  console.log("✅ Connected to SQLite database");
  initializeDb();
});

// --- Database Schema Initialization ---
function initializeDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sla_deadline DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    )`);
  });
}

// --- ROUTES ---

// 🟢 Get all tickets
app.get("/api/tickets", (req, res) => {
  db.all(`SELECT * FROM tickets ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 🟡 Create new ticket
app.post("/api/tickets", (req, res) => {
  const { title, description, priority } = req.body;
  if (!title || !description || !priority)
    return res.status(400).json({ error: "All fields are required" });

  const hours =
    priority === "high" ? 4 : priority === "medium" ? 24 : 72;
  const sla_deadline = new Date(Date.now() + hours * 3600 * 1000).toISOString();

  const sql = `INSERT INTO tickets (title, description, priority, sla_deadline)
               VALUES (?, ?, ?, ?)`;
  db.run(sql, [title, description, priority, sla_deadline], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      id: this.lastID,
      title,
      description,
      priority,
      sla_deadline,
      status: "open",
    });
  });
});

// 🔵 Get a single ticket with comments
app.get("/api/tickets/:id", (req, res) => {
  const { id } = req.params;
  db.get(`SELECT * FROM tickets WHERE id = ?`, [id], (err, ticket) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    db.all(
      `SELECT * FROM comments WHERE ticket_id = ? ORDER BY created_at ASC`,
      [id],
      (err, comments) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ticket, comments });
      }
    );
  });
});

// 🟠 Update ticket status
app.put("/api/tickets/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status is required" });

  db.run(
    `UPDATE tickets SET status = ? WHERE id = ?`,
    [status, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0)
        return res.status(404).json({ error: "Ticket not found" });
      res.json({ message: "Ticket updated successfully" });
    }
  );
});

// 🔴 Delete a ticket
app.delete("/api/tickets/:id", (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM tickets WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0)
      return res.status(404).json({ error: "Ticket not found" });
    res.json({ message: "Ticket deleted successfully" });
  });
});

// 🟣 Add comment to a ticket
app.post("/api/tickets/:id/comments", (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  if (!comment)
    return res.status(400).json({ error: "Comment text is required" });

  db.run(
    `INSERT INTO comments (ticket_id, comment) VALUES (?, ?)`,
    [id, comment],
    function (err) {
      if (err) {
        if (err.message.includes("FOREIGN KEY constraint failed"))
          return res.status(404).json({ error: "Ticket not found" });
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        id: this.lastID,
        message: "Comment added successfully",
      });
    }
  );
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
