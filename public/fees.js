function getNumber(value) {
  return Number(String(value || "0").replace(/[^0-9]/g, "")) || 0;
}

async function loadFees() {
  const response = await fetch("/students");
  let students = await response.json();

  const search = document.getElementById("searchFees").value.toLowerCase();
  const filter = document.getElementById("statusFilter").value;

  students = students.filter(student => {
    const name = String(student.name || "").toLowerCase();
    const room = String(student.room || "").toLowerCase();

    const outstanding = getNumber(student.outstandingFees);
    const status = outstanding > 0 ? "pending" : "paid";

    const matchSearch = name.includes(search) || room.includes(search);
    const matchFilter = filter === "all" || filter === status;

    return matchSearch && matchFilter;
  });

  const tbody = document.getElementById("feesTableBody");
  tbody.innerHTML = "";

  let totalOutstanding = 0;
  let totalReceived = 0;
  let totalPending = 0;

  students.forEach(student => {
    const outstanding = getNumber(student.outstandingFees);
    const received = getNumber(student.paymentReceived);

    // Outstanding Fees column already means pending amount
    const pending = outstanding;

    totalOutstanding += outstanding;
    totalReceived += received;
    totalPending += pending;

    tbody.innerHTML += `
      <tr>
        <td>${student.name}</td>
        <td>${student.room}</td>
        <td>₹${outstanding.toLocaleString()}</td>
        <td>₹${received.toLocaleString()}</td>
        <td>₹${pending.toLocaleString()}</td>
        <td>${pending > 0 ? "❌ Pending" : "✅ Paid"}</td>
      </tr>
    `;
  });

  document.getElementById("totalOutstanding").innerText =
    "₹" + totalOutstanding.toLocaleString();

  document.getElementById("totalReceived").innerText =
    "₹" + totalReceived.toLocaleString();

  document.getElementById("totalPending").innerText =
    "₹" + totalPending.toLocaleString();
}

loadFees();