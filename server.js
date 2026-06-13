const express = require("express");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();

const DATA_FILE = path.join(__dirname, "students.json");
const EXCEL_FILE = path.join(__dirname, "Fees Details 2024-25.xlsx");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function clean(value) {
  return String(value ?? "").trim();
}

function getRoomValue(value) {
  const text = clean(value);
  if (!text) return "";
  return isNaN(Number(text)) ? text : Number(text);
}

function isVacantName(name) {
  return clean(name).toUpperCase().includes("VACATE") ||
         clean(name).toUpperCase().includes("VACANT");
}

function loadStudentsFromExcel() {
  if (!fs.existsSync(EXCEL_FILE)) {
    console.log("Excel file not found:", EXCEL_FILE);
    return [];
  }

  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const students = [];
  let id = 1;

  rows.forEach(row => {
    const roomNo = row[0];
    const bed = row[1];
    const name = row[2];
    const mobile = row[3];
    const city = row[4];
    const outstandingFees = row[5];
    const paymentReceived = row[6];

    if (!roomNo || !bed || !name) return;
    if (clean(name).toUpperCase().includes("NAME OF THE STUDENTS")) return;

    students.push({
      id: id++,
      room: getRoomValue(roomNo),
      bed: clean(bed),
      name: clean(name),
      mobile: clean(mobile),
      city: clean(city),
      outstandingFees: clean(outstandingFees || "0"),
      paymentReceived: clean(paymentReceived || "0"),
      vacant: isVacantName(name)
    });
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
    return res.json({ success: false, message: "Name, room and bed are required" });
  }

  const existingBed = students.find(
    s => String(s.room) === String(room) && String(s.bed) === String(bed)
  );

  if (existingBed) {
    existingBed.name = clean(name);
    existingBed.mobile = clean(mobile || existingBed.mobile);
    existingBed.city = clean(city || existingBed.city);
    existingBed.outstandingFees = clean(outstandingFees || existingBed.outstandingFees || "0");
    existingBed.paymentReceived = clean(paymentReceived || existingBed.paymentReceived || "0");
    existingBed.vacant = false;

    saveStudents(students);
    return res.json({ success: true, student: existingBed });
  }

  const newStudent = {
    id: Date.now(),
    room: getRoomValue(room),
    bed: clean(bed),
    name: clean(name),
    mobile: clean(mobile),
    city: clean(city),
    outstandingFees: clean(outstandingFees || "0"),
    paymentReceived: clean(paymentReceived || "0"),
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

  student.name = clean(req.body.name || student.name);
  student.mobile = clean(req.body.mobile || student.mobile);
  student.city = clean(req.body.city || student.city);
  student.outstandingFees = clean(req.body.outstandingFees || student.outstandingFees || "0");
  student.paymentReceived = clean(req.body.paymentReceived || student.paymentReceived || "0");
  student.vacant = isVacantName(student.name);

  saveStudents(students);

  res.json({ success: true, updatedStudent: student });
});

app.delete("/delete/:id", (req, res) => {
  const student = students.find(s => String(s.id) === String(req.params.id));

  if (!student) {
    return res.json({ success: false, message: "Student not found" });
  }

  student.name = "VACATE";
  student.mobile = "";
  student.city = "";
  student.outstandingFees = "0";
  student.paymentReceived = "0";
  student.vacant = true;

  saveStudents(students);

  res.json({ success: true, updatedStudent: student });
});

app.get("/download-fees-report", (req, res) => {
  const doc = new PDFDocument({ margin: 40 });

  res.setHeader("Content-Disposition", "attachment; filename=Fees_Report.pdf");
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  doc.fontSize(18).text("Shree Jain Oswal Boarding Management", { align: "center" });
  doc.moveDown();
  doc.fontSize(15).text("Fees Report");
  doc.moveDown();

  students.forEach(s => {
    if (s.vacant) return;

    doc.fontSize(10).text(
      `${s.name} | Room ${s.room} | Bed ${s.bed} | Outstanding: Rs.${s.outstandingFees || 0} | Received: Rs.${s.paymentReceived || 0}`
    );
  });

  doc.end();
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});