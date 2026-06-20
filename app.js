// app.js – Core client‑side logic for ServiceDeskAI frontend
// ---------------------------------------------------------------
// Simple hash‑router, authentication handling, role‑based UI toggling,
// API wrapper, and minimal state management.

const API_BASE = "/api"; // Vercel relative path

// -------------------------------------------------------------------
// Utility: Get token and role from localStorage
function getAuth() {
  const token = localStorage.getItem("jwt_token");
  const role = localStorage.getItem("user_role");
  const user_name = localStorage.getItem("user_name");
  return { token, role, user_name };
}

function setAuth({ token, role, userId, userName }) {
  localStorage.setItem("jwt_token", token);
  localStorage.setItem("user_role", role);
  localStorage.setItem("user_id", userId);
  localStorage.setItem("user_name", userName);
}

function clearAuth() {
  localStorage.clear();
}

function hasRole(required) {
  const { role } = getAuth();
  if (!role) return false;
  const hierarchy = ["employee", "service_agent", "manager", "admin"]; // ascending privileges
  const userIdx = hierarchy.indexOf(role);
  const reqIdx = hierarchy.indexOf(required);
  return userIdx >= reqIdx;
}

// -------------------------------------------------------------------
// API wrapper – adds Authorization header automatically
async function apiRequest(path, method = "GET", body = null) {
  const { token } = getAuth();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(`${API_BASE}${path}`, opts);
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API error ${resp.status}: ${err}`);
  }
  return resp.json();
}

// -------------------------------------------------------------------
// Simple router – uses window.location.hash (e.g., #/login, #/dashboard)
function router() {
  const route = location.hash.replace(/^#/, "") || "/login";
  const sidebar = document.getElementById("sidebar");
  const topbar = document.getElementById("topbar");
  const contentWrapper = document.getElementById("content-wrapper");

  // Hide sidebar/topbar for login page
  if (route.startsWith("/login")) {
    sidebar.classList.add("hidden");
    topbar.classList.add("hidden");
    contentWrapper.classList.add("full-width");
    loadComponent("login.html");
    return;
  }

  // Show layout for authenticated pages
  sidebar.classList.remove("hidden");
  topbar.classList.remove("hidden");
  contentWrapper.classList.remove("full-width");
  renderLayout(route);

  if (route === "/dashboard") loadComponent("dashboard.html");
  else if (route === "/tickets") loadComponent("ticket-list.html");
  else if (route === "/knowledge") loadComponent("knowledge-base.html");
  else if (route === "/chat") loadComponent("chat-box.html");
  else if (route === "/admin") loadComponent("admin-panel.html");
  else loadComponent("not-found.html");
}

window.addEventListener("hashchange", router);
window.addEventListener("load", router);

// -------------------------------------------------------------------
// Load HTML fragment into #app container
async function loadComponent(file) {
  const resp = await fetch(`components/${file}`);
  const html = await resp.text();
  document.getElementById("app").innerHTML = html;
  if (window.componentInit) {
    const init = window.componentInit;
    window.componentInit = null;
    init();
  }
}

// -------------------------------------------------------------------
// Layout rendering (Sidebar + Topbar)
function renderLayout(currentRoute) {
  const { role, user_name } = getAuth();
  const sidebar = document.getElementById("sidebar");
  const topbar = document.getElementById("topbar");
  
  const navItems = [
    { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: 'ph-house' },
    { id: 'ai', path: '/ai', label: 'AI Assistant', icon: 'ph-sparkle' },
    { id: 'tickets', path: '/tickets', label: 'Tickets', icon: 'ph-ticket' },
    { id: 'knowledge', path: '/knowledge', label: 'Knowledge Base', icon: 'ph-book-open' }
  ];
  
  const mgtItems = [
    { id: 'team', path: '/team', label: 'Team Overview', icon: 'ph-users-three' },
    { id: 'analytics', path: '/analytics', label: 'Analytics', icon: 'ph-chart-line-up' }
  ];
  
  if (hasRole("admin")) {
    mgtItems.push({ id: 'admin', path: '/admin', label: 'Administration', icon: 'ph-shield-check' });
  }

  const renderLink = (item) => `
    <a href="#${item.path}" class="nav-link ${currentRoute === item.path ? 'active' : ''}">
      <i class="ph ${item.icon}"></i> ${item.label}
    </a>
  `;

  sidebar.innerHTML = `
    <div class="brand">
      <div class="brand-logo">SD</div>
      <div class="brand-text">
        <span class="brand-title">SERVICEDESK AI</span>
        <span class="brand-subtitle">ENTERPRISE PORTAL</span>
      </div>
    </div>
    
    <div class="nav-section">
      <div class="nav-label">MAIN NAVIGATION</div>
      ${navItems.map(renderLink).join('')}
    </div>
    
    <div class="nav-section">
      <div class="nav-label">MANAGEMENT</div>
      ${mgtItems.map(renderLink).join('')}
    </div>
    
    <div style="margin-top:auto; padding:1rem; cursor:pointer;" id="logoutBtn" class="nav-link">
      <i class="ph ph-sign-out"></i> Logout
    </div>
  `;

  const displayUser = user_name || (role === 'admin' ? "Anita Sharma" : "User");
  const initials = displayUser.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase();

  const titleMap = {
    '/dashboard': 'SYSTEM DASHBOARD',
    '/tickets': 'TICKET MANAGEMENT',
    '/admin': 'SYSTEM ADMINISTRATION',
  };
  const topTitle = titleMap[currentRoute] || 'SYSTEM DASHBOARD';

  topbar.innerHTML = `
    <div class="topbar-left">
      <span class="topbar-title">${topTitle}</span>
      <div class="search-bar">
        <i class="ph ph-magnifying-glass"></i>
        <input type="text" placeholder="Search tickets, articles..." />
      </div>
    </div>
    <div class="topbar-right">
      <button class="icon-btn" id="theme-toggle" title="Toggle dark mode"><i class="ph ph-moon"></i></button>
      <button class="icon-btn"><i class="ph ph-bell"></i></button>
      <div class="user-profile">
        <div class="avatar">${initials}</div>
        <div class="user-info">
          <span class="user-name">${displayUser}</span>
          <span class="user-role">${role || 'Admin'}</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearAuth();
    location.hash = "#/login";
  });
  
  document.getElementById("theme-toggle").addEventListener("click", toggleDarkMode);
}

// -------------------------------------------------------------------
// Dark mode handling
(function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') document.documentElement.classList.add('dark');
})();
function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// -------------------------------------------------------------------
// Component‑specific initialization functions
function initLoginComponent() {
  const form = document.getElementById("loginForm");
  
  // Handle Role Selection
  let selectedRole = "employee";
  const roleBtns = document.querySelectorAll(".role-btn");
  roleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      roleBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedRole = btn.dataset.role;
    });
  });

  // Handle Password Visibility Toggle
  const togglePw = document.querySelector(".toggle-pw");
  const pwInput = document.getElementById("password");
  if (togglePw && pwInput) {
    togglePw.addEventListener("click", () => {
      const type = pwInput.getAttribute("type") === "password" ? "text" : "password";
      pwInput.setAttribute("type", type);
      togglePw.classList.toggle("ph-eye");
      togglePw.classList.toggle("ph-eye-slash");
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    try {
      // Mocked login flow since we don't have a real backend responding properly yet
      // In a real app we would call: await apiRequest("/auth/login", "POST", { email, password });
      setAuth({ token: "mock_token_123", role: selectedRole, userId: "u123", userName: "Anita Sharma" });
      location.hash = "#/dashboard";
    } catch (err) {
      alert(err.message);
    }
  });
}

function initDashboardComponent() {
  // Update mock dashboard stats
  const totalTickets = document.getElementById("totalTicketsVal");
  if (totalTickets) totalTickets.textContent = "20";
  const resolvedTickets = document.getElementById("resolvedTicketsVal");
  if (resolvedTickets) resolvedTickets.textContent = "6";
  
  // Any extra initialization for dashboard goes here
}

function initTicketListComponent() {
  const tbody = document.querySelector("#ticketTable tbody");
  if (!tbody) return;
  apiRequest("/tickets", "GET")
    .then((tickets) => {
      tbody.innerHTML = "";
      tickets.forEach((t) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${t.ticket_id}</td>
          <td>${t.title}</td>
          <td>${t.priority || "-"}</td>
          <td>${t.status}</td>
          <td>${t.created_by_name || "-"}</td>
          <td>${t.assigned_to_name || "-"}</td>
          <td>
            <button class="btn secondary" data-id="${t.ticket_id}" data-action="edit">Edit</button>
            <button class="btn secondary" data-id="${t.ticket_id}" data-action="delete">Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
      // Attach actions
      tbody.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
        btn.addEventListener("click", () => openTicketModal(btn.dataset.id));
      });
      tbody.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
        btn.addEventListener("click", () => deleteTicket(btn.dataset.id));
      });
    })
    .catch(showError);
}

function deleteTicket(id) {
  if (!confirm(`Delete ticket ${id}?`)) return;
  apiRequest(`/tickets/${id}`, "DELETE")
    .then(() => initTicketListComponent())
    .catch(showError);
}

function openTicketModal(ticketId) {
  // Load modal HTML and then populate (create vs edit)
  fetch("components/ticket-modal.html")
    .then((r) => r.text())
    .then((html) => {
      const container = document.getElementById("modal-container");
      container.innerHTML = `<div class="modal">${html}</div>`;
      container.classList.remove("hidden");
      const form = document.getElementById("ticketForm");
      const titleEl = document.getElementById("title");
      const descEl = document.getElementById("description");
      const cancelBtn = document.getElementById("cancelTicketBtn");

      cancelBtn.addEventListener("click", () => container.classList.add("hidden"));

      if (ticketId) {
        document.getElementById("modalTitle").textContent = "Edit Ticket";
        apiRequest(`/tickets/${ticketId}`, "GET")
          .then((t) => {
            titleEl.value = t.title;
            descEl.value = t.description;
            // Populate other fields if needed
          })
          .catch(showError);
      }

      // AI description suggestion
      document.getElementById("suggestBtn").addEventListener("click", async () => {
        const title = titleEl.value.trim();
        if (!title) return alert("Enter a title first");
        try {
          const suggestion = await apiRequest("/ai/suggest-description", "POST", { title });
          descEl.value = suggestion.description || descEl.value;
        } catch (e) { showError(e); }
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          title: titleEl.value,
          description: descEl.value,
          category: document.getElementById("category").value,
          priority: document.getElementById("priority").value,
        };
        const fileInput = document.getElementById("attachment");
        const formData = new FormData();
        formData.append("data", JSON.stringify(payload));
        if (fileInput.files[0]) formData.append("attachment", fileInput.files[0]);

        const url = ticketId ? `/tickets/${ticketId}` : "/tickets";
        const resp = await fetch(`${API_BASE}${url}`, {
          method: ticketId ? "PUT" : "POST",
          body: formData,
          headers: { Authorization: `Bearer ${getAuth().token}` },
        });
        if (!resp.ok) return showError(`Ticket error ${resp.status}`);
        container.classList.add("hidden");
        initTicketListComponent();
      });
    })
    .catch(showError);
}

function initKnowledgeBaseComponent() {
  const searchInput = document.getElementById("kbSearch");
  const listEl = document.getElementById("kbList");
  async function load(query = "") {
    try {
      const articles = await apiRequest(`/knowledge/search?q=${encodeURIComponent(query)}`, "GET");
      listEl.innerHTML = articles.map(a => `<li><a href="#" data-id="${a.article_id}">${a.title}</a></li>`).join("");
    } catch (e) { showError(e); }
  }
  searchInput.addEventListener("input", (e) => load(e.target.value));
  load();
}

let chatSocket = null;
function initChatComponent() {
  const chatWin = document.getElementById("chatWindow");
  const form = document.getElementById("chatForm");
  if (chatSocket) chatSocket.close();
  chatSocket = new WebSocket(`${API_BASE.replace("/api", "")}/ws/chat`);
  chatSocket.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    const div = document.createElement("div");
    div.textContent = `${msg.sender}: ${msg.text}`;
    chatWin.appendChild(div);
    chatWin.scrollTop = chatWin.scrollHeight;
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if (!text) return;
    chatSocket.send(JSON.stringify({ text }));
    input.value = "";
  });
}

function initAdminPanelComponent() {
  const container = document.getElementById("app");
  container.innerHTML = `
    <div class="card"><h2>Admin Panel</h2></div>
    <div class="card"><h3>Users</h3>
      <table class="table" id="usersTable"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody></tbody></table>
    </div>
    <div class="card"><h3>Audit Logs</h3><pre id="auditLogs" style="max-height:300px;overflow:auto;"></pre></div>
  `;
  // Load users
  apiRequest("/users", "GET")
    .then((users) => {
      const tbody = document.querySelector("#usersTable tbody");
      tbody.innerHTML = users.map(u => `<tr><td>${u.user_id}</td><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td><button class="btn secondary" data-id="${u.user_id}" data-action="remove">Delete</button></td></tr>`).join("");
      tbody.querySelectorAll('button[data-action="remove"]').forEach(btn => {
        btn.addEventListener("click", () => {
          if (!confirm("Delete user?")) return;
          apiRequest(`/users/${btn.dataset.id}`, "DELETE").then(() => initAdminPanelComponent()).catch(showError);
        });
      });
    })
    .catch(showError);
  // Load audit logs
  apiRequest("/audit-logs", "GET")
    .then((logs) => {
      const pre = document.getElementById("auditLogs");
      pre.textContent = logs.map(l => `[${l.created_at}] ${l.user_id} ${l.action} ${l.entity_type}:${l.entity_id}`).join("\n");
    })
    .catch(showError);
}

// -------------------------------------------------------------------
// Central component dispatcher
window.componentInit = function () {
  const hash = location.hash;
  if (hash.startsWith("#/login")) initLoginComponent();
  else if (hash.startsWith("#/dashboard")) initDashboardComponent();
  else if (hash.startsWith("#/tickets")) initTicketListComponent();
  else if (hash.startsWith("#/knowledge")) initKnowledgeBaseComponent();
  else if (hash.startsWith("#/chat")) initChatComponent();
  else if (hash.startsWith("#/admin")) initAdminPanelComponent();
};

// -------------------------------------------------------------------
// Minimal error handling UI
function showError(msg) {
  alert(msg);
}

// End of app.js
