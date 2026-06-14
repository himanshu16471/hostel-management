const API = "";

let allStudents = [];
let selectedStudentId = null;
let buildingChartInstance = null;

const currentRole = localStorage.getItem("role") || "viewer";

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

function getBuildingType(student) {
  const room = String(student.room || "").toUpperCase().trim();

  if (room.includes("DORM")) return "Dorm";
  if (room.startsWith("NB")) return "New Building";

  return "Old Building";
}

async function loadData() {
  const response = await fetch(`/girls-students?time=${Date.now()}`);
  allStudents = await response.json();

  showStudents(allStudents);
  applyRoleUI();
}

function showStudents(students) {
  const occupiedBeds = allStudents.filter(s => !isVacant(s)).length;
  const vacantList = allStudents.filter(s => isVacant(s));

  const oldVacant = allStudents.filter(
    s => getBuildingType(s) === "Old Building" && isVacant(s)
  ).length;

  const newVacant = allStudents.filter(
    s => getBuildingType(s) === "New Building" && isVacant(s)
  ).length;

  const dormVacant = allStudents.filter(
    s => getBuildingType(s) === "Dorm" && isVacant(s)
  ).length;

  const totalAvailableBeds = oldVacant + newVacant + dormVacant;

  document.getElementById("totalBeds").innerText = allStudents.length;
  document.getElementById("occupied").innerText = occupiedBeds;
  document.getElementById("available").innerText = totalAvailableBeds;

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

  showVacantSummary(oldVacant, newVacant, dormVacant);
  showVacantBeds(vacantList);
  showRoomCards(students);
  showBuildingChart(allStudents);
  showTopDefaulters(allStudents);
}

function showVacantSummary(oldVacant, newVacant, dormVacant) {
  const box = document.getElementById("vacantSummary");
  if (!box) return;

  box.innerHTML = `
    <div class="defaulterItem">
      <span>🏚 Girls Old Building</span>
      <b>${oldVacant} Beds</b>
    </div>

    <div class="defaulterItem">
      <span>🏢 Girls New Building</span>
      <b>${newVacant} Beds</b>
    </div>

    <div class="defaulterItem">
      <span>🛏 Girls Dorm</span>
      <b>${dormVacant} Beds</b>
    </div>
  `;
}

function showVacantBeds(vacantList) {
  const emptyBedsDiv = document.getElementById("emptyBedsList");
  if (!emptyBedsDiv) return;

  emptyBedsDiv.innerHTML = vacantList.length
    ? vacantList
        .sort((a, b) =>
          String(a.room).localeCompare(String(b.room), undefined, {
            numeric: true
          })
        )
        .map(
          bed => `
            <div class="emptyBedItem">
              Room No. ${bed.room} - Bed No. ${bed.bed}
            </div>
          `
        )
        .join("")
    : "<p>No vacant beds available</p>";
}

function showRoomCards(students) {
  const oldBuildingTable = document.getElementById("oldBuildingTable");
  const newBuildingTable = document.getElementById("newBuildingTable");
  const dormTable = document.getElementById("dormTable");

  oldBuildingTable.innerHTML = "";
  newBuildingTable.innerHTML = "";
  dormTable.innerHTML = "";

  const oldBuildingRooms = {};
  const newBuildingRooms = {};
  const dormRooms = {};

  students.forEach(student => {
    const room = String(student.room || "").trim();
    if (!room) return;

    const buildingType = getBuildingType(student);

    if (buildingType === "Dorm") {
      if (!dormRooms[room]) dormRooms[room] = [];
      dormRooms[room].push(student);
    } else if (buildingType === "New Building") {
      if (!newBuildingRooms[room]) newBuildingRooms[room] = [];
      newBuildingRooms[room].push(student);
    } else {
      if (!oldBuildingRooms[room]) oldBuildingRooms[room] = [];
      oldBuildingRooms[room].push(student);
    }
  });

  renderRoomGroup(oldBuildingRooms, oldBuildingTable);
  renderRoomGroup(newBuildingRooms, newBuildingTable);
  renderRoomGroup(dormRooms, dormTable);
}

function renderRoomGroup(rooms, container) {
  Object.keys(rooms)
    .sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true })
    )
    .forEach(room => {
      let bedsHTML = "";

      rooms[room].forEach(student => {
        const bedClass = isVacant(student) ? "vacant" : "occupied";
        const studentName = isVacant(student) ? "VACANT" : student.name;

        let buttonHTML = "";

        if (isVacant(student)) {
          buttonHTML = `<button disabled class="vacantBtn">Vacant</button>`;
        } else if (currentRole !== "viewer") {
          buttonHTML = `
            <button 
              onclick="event.stopPropagation(); deleteStudent(${student.id})" 
              class="occupiedBtn">
              Make Vacant
            </button>
          `;
        }

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

function showBuildingChart(students) {
  const oldOccupied = students.filter(
    s => getBuildingType(s) === "Old Building" && !isVacant(s)
  ).length;

  const newOccupied = students.filter(
    s => getBuildingType(s) === "New Building" && !isVacant(s)
  ).length;

  const dormOccupied = students.filter(
    s => getBuildingType(s) === "Dorm" && !isVacant(s)
  ).length;

  const buildingCanvas = document.getElementById("buildingChart");

  if (!buildingCanvas) return;

  if (buildingChartInstance) {
    buildingChartInstance.destroy();
  }

  buildingChartInstance = new Chart(buildingCanvas, {
    type: "bar",
    data: {
      labels: ["Girls Old Building", "Girls New Building", "Girls Dorm"],
      datasets: [
        {
          label: "Occupied Beds",
          data: [oldOccupied, newOccupied, dormOccupied],
          borderWidth: 1,
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function showTopDefaulters(students) {
  const box = document.getElementById("topDefaulters");
  if (!box) return;

  const defaulters = students
    .filter(student => !isVacant(student))
    .map(student => ({
      name: student.name,
      room: student.room,
      bed: student.bed,
      pending: getNumber(student.outstandingFees)
    }))
    .filter(student => student.pending > 0)
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 10);

  if (defaulters.length === 0) {
    box.innerHTML = "<p>No fee defaulters 🎉</p>";
    return;
  }

  box.innerHTML = defaulters
    .map(
      (student, index) => `
        <div class="defaulterItem">
          <span>${index + 1}. ${student.name}</span>
          <small>Room ${student.room} - Bed ${student.bed}</small>
          <b>₹${student.pending.toLocaleString()}</b>
        </div>
      `
    )
    .join("");
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
  if (currentRole === "viewer") {
    alert("Viewer cannot add students");
    return;
  }

  const name = document.getElementById("name").value;
  const room = document.getElementById("room").value;
  const bed = document.getElementById("bed").value;

  if (!name || !room || !bed) {
    alert("Enter student name, room and bed");
    return;
  }

  await fetch(`${API}/add-girl`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      room,
      bed
    })
  });

  await loadData();
}

async function deleteStudent(id) {
  if (currentRole === "viewer") {
    alert("Viewer cannot make beds vacant");
    return;
  }

  await fetch(`${API}/delete-girl/${id}`, {
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
  if (currentRole === "viewer") {
    alert("Viewer cannot edit students");
    return;
  }

  const student = allStudents.find(
    s => String(s.id) === String(selectedStudentId)
  );

  if (!student) return;

  const name = prompt("Enter student name:", student.name || "");
  const mobile = prompt("Enter mobile number:", student.mobile || "");
  const city = prompt("Enter city:", student.city || "");
  const outstandingFees = prompt("Enter outstanding fees:", student.outstandingFees || "0");
  const paymentReceived = prompt("Enter payment received:", student.paymentReceived || "0");

  await fetch(`/update-girl/${student.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
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

function toggleDarkMode() {
  document.body.classList.toggle("darkMode");

  if (document.body.classList.contains("darkMode")) {
    localStorage.setItem("darkMode", "true");
  } else {
    localStorage.setItem("darkMode", "false");
  }
}

function applyRoleUI() {
  const roleBadge = document.getElementById("roleBadge");

  if (roleBadge) {
    roleBadge.innerText = `Logged in as: ${currentRole.toUpperCase()}`;
  }

  if (currentRole === "viewer") {
    const addBtn = document.querySelector(".primary");
    if (addBtn) addBtn.style.display = "none";
  }
}

if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("darkMode");
}

loadData();