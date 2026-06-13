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
  console.log("Sheets:", workbook.SheetNames);
 const sheet = workbook.Sheets["Sheet2"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const students = [];
  let currentRoom = null;
  let id = 1;

  rows.forEach(row => {
    console.log(row);
    const roomNo = row[0];
const bed = row[1];
const name = row[2];
const mobile = row[3];
const city = row[4];
const outstandingFees = row[5];
const paymentReceived = row[6];
   if (
  roomNo &&
  bed &&
  name &&
  String(name).trim() !== "NAME OF THE STUDENTS"
) {
      students.push({
        id: id++,
  room: isNaN(Number(roomNo)) ? String(roomNo).trim() : Number(roomNo),
        bed: String(bed),
        name: String(name).trim(),
        mobile: String(mobile || ""),
        city: String(city || ""),
        outstandingFees: String(outstandingFees || "0"),
        paymentReceived: String(paymentReceived || "0"),
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

let students = readStudents();

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/students", (req, res) => {
  res.json(students);
});

app.post("/add", (req, res) => {
  const { name, room, bed, mobile, city, outstandingFees, paymentReceived } = req.body;

  if (!name || !room || !bed) {
    return res.json({
      success: false,
      message: "Name, room and bed are required"
    });
  }

  const existingBed = students.find(
    s => Number(s.room) === Number(room) && String(s.bed) === String(bed)
  );

  if (existingBed) {
    existingBed.name = String(name).trim();
    existingBed.mobile = String(mobile || existingBed.mobile || "");
    existingBed.city = String(city || existingBed.city || "");
    existingBed.outstandingFees = String(outstandingFees || existingBed.outstandingFees || "0");
    existingBed.paymentReceived = String(paymentReceived || existingBed.paymentReceived || "0");
    existingBed.vacant = false;

    saveStudents(students);
    return res.json({ success: true, student: existingBed });
  }

  const newStudent = {
    id: Date.now(),
    room: Number(room),
    bed: String(bed),
    name: String(name).trim(),
    mobile: String(mobile || ""),
    city: String(city || ""),
    outstandingFees: String(outstandingFees || "0"),
    paymentReceived: String(paymentReceived || "0"),
    vacant: false
  };

  students.push(newStudent);
  saveStudents(students);

  res.json({ success: true, student: newStudent });
});

app.put("/update/:id", (req, res) => {
  const student = students.find(s => String(s.id) === String(req.params.id));

  if (!student) {
    return res.json({ success: false, message: "Student not found" });
  }

  student.name = req.body.name || student.name;
  student.mobile = req.body.mobile || student.mobile;
  student.city = req.body.city || student.city;
  student.outstandingFees = req.body.outstandingFees || student.outstandingFees;
  student.paymentReceived = req.body.paymentReceived || student.paymentReceived;
  student.vacant = false;

  saveStudents(students);

  res.json({ success: true, updatedStudent: student });
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});