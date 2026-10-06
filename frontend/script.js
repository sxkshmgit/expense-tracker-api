const API_URL = "http://127.0.0.1:8000";

const state = { page: 1, limit: 10 };

const $ = (id) => document.getElementById(id);

/* ---------- helpers ---------- */

function showMessage(text, type = "info", autoHide = true) {
  const el = $("message");
  el.textContent = text;
  el.className = `message ${type}`;
  if (autoHide) {
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => el.classList.add("hidden"), 4000);
  }
}

function formatError(data, status) {
  if (data && data.detail) {
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((d) => `${(d.loc || []).slice(1).join(".")}: ${d.msg}`)
        .join("; ");
    }
  }
  return `Request failed (${status})`;
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (err) {
    throw new Error("Cannot reach the API. Is the backend running at " + API_URL + "?");
  }
  if (response.status === 204) return null;
  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    /* no body */
  }
  if (!response.ok) throw new Error(formatError(data, response.status));
  return data;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function cell(text, className) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function emptyRow(tbody, cols, text) {
  tbody.innerHTML = "";
  const tr = document.createElement("tr");
  const td = cell(text, "empty");
  td.colSpan = cols;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

/* ---------- summary ---------- */

async function loadSummary() {
  try {
    const s = await api("/expenses/summary");
    $("stat-total").textContent = money(s.total);
    $("stat-average").textContent = money(s.average);
    $("stat-highest").textContent = money(s.highest);
    $("stat-lowest").textContent = money(s.lowest);
  } catch (err) {
    showMessage(`Summary: ${err.message}`, "error");
  }
}

async function loadCategorySummary() {
  const tbody = $("category-body");
  emptyRow(tbody, 3, "Loading...");
  try {
    const rows = await api("/expenses/summary/category");
    if (!rows.length) return emptyRow(tbody, 3, "No categories yet.");
    tbody.innerHTML = "";
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.append(cell(r.category), cell(money(r.total), "num"), cell(money(r.average), "num"));
      tbody.appendChild(tr);
    });
  } catch (err) {
    emptyRow(tbody, 3, "Failed to load.");
    showMessage(`Category summary: ${err.message}`, "error");
  }
}

/* ---------- expenses ---------- */

function buildQuery() {
  const params = new URLSearchParams();
  const user = $("f-user").value.trim();
  const category = $("f-category").value.trim();
  const min = $("f-min").value;
  const max = $("f-max").value;

  if (user) params.set("user_id", user);
  if (category) params.set("category", category);
  if (min !== "") params.set("min_amount", min);
  if (max !== "") params.set("max_amount", max);
  params.set("sort_by", $("f-sort").value);
  params.set("order", $("f-order").value);
  params.set("page", state.page);
  params.set("limit", state.limit);
  return params.toString();
}

async function loadExpenses() {
  const tbody = $("expense-body");
  emptyRow(tbody, 7, "Loading...");
  try {
    const items = await api(`/expenses?${buildQuery()}`);
    renderExpenses(items);
    updatePagination(items.length);
  } catch (err) {
    emptyRow(tbody, 7, "Failed to load expenses.");
    updatePagination(0);
    showMessage(err.message, "error", false);
  }
}

function renderExpenses(items) {
  const tbody = $("expense-body");
  if (!items.length) return emptyRow(tbody, 7, "No expenses found.");
  tbody.innerHTML = "";

  items.forEach((e) => {
    const tr = document.createElement("tr");
    tr.append(
      cell(e.description),
      cell(money(e.amount), "num"),
      cell(e.category),
      cell(e.payment_method),
      cell(String(e.date).slice(0, 10)),
      cell(e.user_id, "id-cell")
    );

    const actions = document.createElement("td");
    const edit = document.createElement("button");
    edit.className = "btn small";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => startEdit(e));

    const del = document.createElement("button");
    del.className = "btn small danger";
    del.textContent = "Delete";
    del.addEventListener("click", () => deleteExpense(e.id));

    actions.append(edit, " ", del);
    tr.appendChild(actions);
    tbody.appendChild(tr);
  });
}

function updatePagination(count) {
  $("page-info").textContent = `Page ${state.page}`;
  $("prev-page").disabled = state.page <= 1;
  $("next-page").disabled = count < state.limit;
}

async function refreshAll() {
  await Promise.all([loadSummary(), loadCategorySummary(), loadExpenses()]);
}

/* ---------- create / update / delete ---------- */

function resetExpenseForm() {
  const keepUser = $("user_id").value;
  $("expense-form").reset();
  $("expense-id").value = "";
  $("user_id").value = keepUser;
  $("form-title").textContent = "Add Expense";
  $("expense-submit").textContent = "Add Expense";
  $("expense-cancel").hidden = true;
}

function startEdit(expense) {
  $("expense-id").value = expense.id;
  $("description").value = expense.description;
  $("amount").value = expense.amount;
  $("category").value = expense.category;
  $("payment_method").value = expense.payment_method;
  $("date").value = String(expense.date).slice(0, 10);
  $("user_id").value = expense.user_id;
  $("form-title").textContent = "Edit Expense";
  $("expense-submit").textContent = "Update Expense";
  $("expense-cancel").hidden = false;
  $("expense-form").scrollIntoView({ behavior: "smooth", block: "center" });
}

async function submitExpense(event) {
  event.preventDefault();
  const id = $("expense-id").value;
  const payload = {
    description: $("description").value.trim(),
    amount: parseFloat($("amount").value),
    category: $("category").value.trim(),
    payment_method: $("payment_method").value.trim(),
    date: `${$("date").value}T00:00:00`,
    user_id: $("user_id").value.trim(),
  };

  const button = $("expense-submit");
  button.disabled = true;
  try {
    if (id) {
      await api(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      showMessage("Expense updated.", "success");
    } else {
      await api("/expenses", { method: "POST", body: JSON.stringify(payload) });
      showMessage("Expense added.", "success");
    }
    resetExpenseForm();
    await refreshAll();
  } catch (err) {
    showMessage(err.message, "error", false);
  } finally {
    button.disabled = false;
  }
}

async function deleteExpense(id) {
  if (!confirm("Delete this expense?")) return;
  try {
    await api(`/expenses/${id}`, { method: "DELETE" });
    showMessage("Expense deleted.", "success");
    if ($("expense-id").value === id) resetExpenseForm();
    await refreshAll();
  } catch (err) {
    showMessage(err.message, "error", false);
  }
}

/* ---------- users ---------- */

async function createUser(event) {
  event.preventDefault();
  const payload = {
    name: $("user-name").value.trim(),
    email: $("user-email").value.trim(),
  };
  try {
    const user = await api("/users", { method: "POST", body: JSON.stringify(payload) });
    $("user-result").textContent = `Created ${user.name} — ID: ${user.id}`;
    $("user_id").value = user.id;
    $("user-form").reset();
    showMessage("User created. ID copied into the expense form.", "success");
  } catch (err) {
    showMessage(err.message, "error", false);
  }
}

/* ---------- filters & pagination ---------- */

function applyFilters(event) {
  if (event) event.preventDefault();
  state.page = 1;
  state.limit = parseInt($("f-limit").value, 10);
  loadExpenses();
}

function resetFilters() {
  $("filter-form").reset();
  applyFilters();
}

/* ---------- init ---------- */

document.addEventListener("DOMContentLoaded", () => {
  $("user-form").addEventListener("submit", createUser);
  $("expense-form").addEventListener("submit", submitExpense);
  $("expense-cancel").addEventListener("click", resetExpenseForm);
  $("filter-form").addEventListener("submit", applyFilters);
  $("filter-reset").addEventListener("click", resetFilters);
  $("f-sort").addEventListener("change", applyFilters);
  $("f-order").addEventListener("change", applyFilters);
  $("f-limit").addEventListener("change", applyFilters);
  $("prev-page").addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      loadExpenses();
    }
  });
  $("next-page").addEventListener("click", () => {
    state.page += 1;
    loadExpenses();
  });

  refreshAll();
});