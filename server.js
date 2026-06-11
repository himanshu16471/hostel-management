console.log("THIS SERVER FILE IS RUNNING");
const express = require("express");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const app = express();

const DATA_FILE = path.join(__dirname, "students.json");
const EXCEL_FILE = path.join(__dirname, "Fees Details 2024-25.xlsx");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function loadStudentsFromExcel() {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const students = [];
  let currentRoom = null;
  let id = 1;

  rows.forEach(row => {;
    if (row[3]) {
      const roomNo = parseInt(row[3]);
      if (!isNaN(roomNo)) currentRoom = roomNo;
    }
const bed = row[4];
const name = row[5];
const mobile = row[6];

if (currentRoom && bed && name) {
  students.push({
    id: id++,
    room: Number(currentRoom),
    bed: String(bed),
    name: String(name).trim(),
    mobile: String(mobile || ""),
    vacant: String(name).toUpperCase().includes("VACATE")
  });
}
  });

  return students;
}

function readStudents() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = loadStudentsFromExcel();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }

  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveStudents(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
console.log("DATA FILE =", DATA_FILE);

let students = readStudents();

app.get("/students", (req, res) => {
  res.json(students);
});

app.post("/add", (req, res) => {
  const { name, room, bed } = req.body;

  const existingBed = students.find(
    s => Number(s.room) === Number(room) && String(s.bed) === String(bed)
  );

  if (existingBed) {
    existingBed.name = String(name).trim();
    existingBed.vacant = false;
  } else {
    students.push({
      id: Date.now(),
      name: String(name).trim(),
      room: Number(room),
      bed: String(bed),
      vacant: false
    });
  }

  saveStudents(students);
  res.json({ success: true });
});

app.delete("/delete/:id", (req, res) => {
  const student = students.find(s => String(s.id) === String(req.params.id));

  if (!student) {
    return res.json({ success: false, message: "Student not found" });
  }

  student.name = "VACATE";
  student.vacant = true;

  saveStudents(students);

  res.json({ success: true, updatedStudent: student });
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});