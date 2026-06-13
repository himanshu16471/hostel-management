const API = "";
let allStudents = [];
let selectedStudentId = null;

function isVacant(s) {
  const name = String(s.name || "").toUpperCase().trim();
  return (
    name === "" ||
    name.includes("VACATE") ||
    name.includes("VACANT") ||
    s.vacant === true
  );
}

function getNumber(value) {
  return Number(String(value || "0").replace(/[^0-9]/g, "")) || 0;
}

async function loadData() {
  const response = await fetch(`/students?time=${Date.now()}`);
  allStudents = await response.json();
  showStudents(allStudents);
}

function showStudents(students) {
  const occupiedBeds = allStudents.filter(s => !isVacant(s)).length;
  const vacantList = allStudents.filter(s => isVacant(s));

  document.getElementById("total").innerText = allStudents.length;
  document.getElementById("occupied").innerText = occupiedBeds;
  document.getElementById("available").innerText = vacantList.length;

  const totalOutstanding = allStudents.reduce(
    (sum, student) => sum + getNumber(student.outstandingFees),
    0
  );

  const totalReceived = allStudents.reduce(
    (sum, student) => sum + getNumber(student.paymentReceived),
    0
  );

  document.getElementById("totalFees").innerText = totalOutstanding.toLocaleString();
  document.getElementById("totalReceived").innerText = totalReceived.toLocaleString();

  showEmptyBeds(vacantList);
  showRoomCards(students);
}

function showEmptyBeds(vacantList) {
  const emptyBedsDiv = document.getElementById("emptyBedsList");

  emptyBedsDiv.innerHTML = vacantList.length
    ? vacantList
        .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }))
        .map(bed => `
          <div class="emptyBedItem">
            Room ${bed.room} - Bed ${bed.bed}
          </div>
        `)
        .join("")
    : "<p>No empty beds available</p>";
}

function showRoomCards(students) {
  const table = document.getElementById("table");
  const dormTable = document.getElementById("dormTable");

  table.innerHTML = "";
  dormTable.innerHTML = "";

  const normalRooms = {};
  const dormRooms = {};

  students.forEach(student => {
    const room = String(student.room || "").trim();
    if (!room) return;

    if (room.toUpperCase().includes("DORM")) {
      if (!dormRooms[room]) dormRooms[room] = [];
      dormRooms[room].push(student);
    } else {
      if (!normalRooms[room]) normalRooms[room] = [];
      normalRooms[room].push(student);
    }
  });

  renderRoomGroup(normalRooms, table);
  renderRoomGroup(dormRooms, dormTable);
}

function renderRoomGroup(rooms, container) {
  Object.keys(rooms)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
    .forEach(room => {
      let bedsHTML = "";

      rooms[room].forEach(student => {
        const bedClass = isVacant(student) ? "vacant" : "occupied";
        const studentName = isVacant(student) ? "VACANT" : student.name;

        const buttonHTML = isVacant(student)
          ? `<button disabled class="vacantBtn">Vacant</button>`
          : `<button onclick="event.stopPropagation(); deleteStudent(${student.id})" class="occupiedBtn">Make Vacant</button>`;

        bedsHTML += `
          <div class="bed ${bedClass}" onclick="showStudentInfo(${student.id})">
            <strong>Bed ${student.bed}</strong>
            <span>${studentName}</span>
            <small>Room ${student.room}</small>
            ${buttonHTML}
          </div>
        `;
      });

      container.innerHTML += `
        <div class="roomCard" id="room-${room}">
          <h2>Room ${room}</h2>
          ${bedsHTML}
        </div>
      `;
    });
}

function goToRoom() {
  const roomNo = document.getElementById("roomSearch").value.trim();
  const roomCard = document.getElementById(`room-${roomNo}`);

  if (roomCard) {
    roomCard.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    alert("Room not found");
  }
}

function findStudent() {
  const name = document.getElementById("studentSearch").value.toLowerCase().trim();

  const student = allStudents.find(s =>
    String(s.name).toLowerCase().includes(name)
  );

  if (!student) {
    alert("Student not found");
    return;
  }

  const roomCard = document.getElementById(`room-${student.room}`);

  if (roomCard) {
    roomCard.scrollIntoView({ behavior: "smooth", block: "start" });
    roomCard.style.border = "3px solid #2563eb";

    setTimeout(() => {
      roomCard.style.border = "";
    }, 3000);
  }

  showStudentInfo(student.id);
}

async function addStudent() {
  const name = document.getElementById("name").value;
  const room = document.getElementById("room").value;
  const bed = document.getElementById("bed").value;

  if (!name || !room || !bed) {
    alert("Enter student name, room and bed");
    return;
  }

  await fetch(`${API}/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, room, bed })
  });

  await loadData();
}

async function deleteStudent(id) {
  await fetch(`${API}/delete/${id}`, {
    method: "DELETE"
  });

  await loadData();
}

function showStudentInfo(id) {
  const student = allStudents.find(s => String(s.id) === String(id));

  if (!student) return;

  selectedStudentId = student.id;

  document.getElementById("modalName").innerText = student.name || "VACANT";
  document.getElementById("modalRoom").innerText = student.room || "-";
  document.getElementById("modalBed").innerText = student.bed || "-";
  document.getElementById("modalMobile").innerText = student.mobile || "Not added";
  document.getElementById("modalCity").innerText = student.city || "Not added";
  document.getElementById("modalFees").innerText = student.outstandingFees || "0";
  document.getElementById("modalReceived").innerText = student.paymentReceived || "0";

  const cleanMobile = String(student.mobile || "").replace(/\D/g, "");
  const whatsappBtn = document.getElementById("whatsappBtn");

  whatsappBtn.href = cleanMobile ? `https://wa.me/91${cleanMobile}` : "#";

  document.getElementById("studentModal").style.display = "flex";
}

async function editStudent() {
  const student = allStudents.find(
    s => String(s.id) === String(selectedStudentId)
  );

  if (!student) return;

  const name = prompt("Enter student name:", student.name || "");
  const mobile = prompt("Enter mobile number:", student.mobile || "");
  const city = prompt("Enter city:", student.city || "");
  const outstandingFees = prompt("Enter outstanding fees:", student.outstandingFees || "0");
  const paymentReceived = prompt("Enter payment received:", student.paymentReceived || "0");

  await fetch(`/update/${student.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mobile,
      city,
      outstandingFees,
      paymentReceived
    })
  });

  closeStudentModal();
  await loadData();
}

function closeStudentModal() {
  document.getElementById("studentModal").style.display = "none";
}

loadData();