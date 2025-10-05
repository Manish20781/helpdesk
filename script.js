// public/script.js

const API_URL = "/api/tickets";

// Load all tickets
async function loadTickets() {
  const tbody = document.getElementById("ticketBody");
  tbody.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";

  try {
    const res = await fetch(API_URL);
    const tickets = await res.json();
    tbody.innerHTML = "";

    tickets.forEach((ticket) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${ticket.id}</td>
        <td>${ticket.title}</td>
        <td>${ticket.priority}</td>
        <td>${ticket.status}</td>
        <td>${ticket.description}</td>
        <td>${new Date(ticket.created_at).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = "<tr><td colspan='6'>Error loading tickets.</td></tr>";
  }
}

// Create new ticket
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".ticket-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = document.getElementById("title").value.trim();
      const description = document.getElementById("description").value.trim();
      const priority = document.getElementById("priority").value;

      if (!title || !description) {
        alert("Please fill all fields");
        return;
      }

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, priority }),
        });
        const data = await res.json();
        if (res.ok) {
          alert("✅ Ticket created successfully!");
          form.reset();
          loadTickets();
        } else {
          alert("❌ " + data.error);
        }
      } catch {
        alert("Server error!");
      }
    });
  }

  loadTickets();
});
