const express = require("express");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();

const BOYS_DATA_FILE = path.join(__dirname, "students.json");
const GIRLS_DATA_FILE = path.join(__dirname, "girls-students.json");

const BOYS_EXCEL_FILE = path.join(__dirname, "Fees Details 2024-25.xlsx");
const GIRLS_EXCEL_FILE = path.join(__dirname, "Girls Hostel.xlsx");

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
  const value = clean(name).toUpperCase();

  return value.includes("VACATE") || value.includes("VACANT");
}

function readExcelFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log("Excel file not found:", filePath);
    return [];
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1
  });

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

    const upperName = clean(name).toUpperCase();

    if (
      upperName.includes("NAME OF THE STUDENTS") ||
      upperName.includes("STUDENT NAME") ||
      upperName === "NAME"
    ) {
      return;
    }

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

function readJsonFile(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getNextId(data) {
  if (!data.length) return 1;

  return Math.max(...data.map(s => Number(s.id) || 0)) + 1;
}

let students = readJsonFile(BOYS_DATA_FILE, readExcelFile(BOYS_EXCEL_FILE));
let girlsStudents = readJsonFile(
  GIRLS_DATA_FILE,
  readExcelFile(GIRLS_EXCEL_FILE)
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* BOYS ROUTES */

app.get("/students", (req, res) => {
  res.json(students);
});

app.post("/add", (req, res) => {
  handleAddStudent(req, res, students, BOYS_DATA_FILE);
});

app.put("/update/:id", (req, res) => {
  handleUpdateStudent(req, res, students, BOYS_DATA_FILE);
});

app.delete("/delete/:id", (req, res) => {
  handleDeleteStudent(req, res, students, BOYS_DATA_FILE);
});

/* GIRLS ROUTES */

app.get("/girls-students", (req, res) => {
  res.json(girlsStudents);
});

app.post("/add-girl", (req, res) => {
  handleAddStudent(req, res, girlsStudents, GIRLS_DATA_FILE);
});

app.put("/update-girl/:id", (req, res) => {
  handleUpdateStudent(req, res, girlsStudents, GIRLS_DATA_FILE);
});

app.delete("/delete-girl/:id", (req, res) => {
  handleDeleteStudent(req, res, girlsStudents, GIRLS_DATA_FILE);
});

/* COMMON FUNCTIONS */

function handleAddStudent(req, res, dataArray, filePath) {
  const {
    name,
    room,
    bed,
    mobile,
    city,
    outstandingFees,
    paymentReceived
  } = req.body;

  if (!name || !room || !bed) {
    return res.json({
      success: false,
      message: "Name, room and bed are required"
    });
  }

  const existingBed = dataArray.find(
    s => String(s.room) === String(room) && String(s.bed) === String(bed)
  );

  if (existingBed) {
    existingBed.name = clean(name);
    existingBed.mobile = clean(mobile || existingBed.mobile);
    existingBed.city = clean(city || existingBed.city);
    existingBed.outstandingFees = clean(
      outstandingFees || existingBed.outstandingFees || "0"
    );
    existingBed.paymentReceived = clean(
      paymentReceived || existingBed.paymentReceived || "0"
    );
    existingBed.vacant = false;

    saveJsonFile(filePath, dataArray);

    return res.json({
      success: true,
      student: existingBed
    });
  }

  const newStudent = {
    id: getNextId(dataArray),
    room: getRoomValue(room),
    bed: clean(bed),
    name: clean(name),
    mobile: clean(mobile),
    city: clean(city),
    outstandingFees: clean(outstandingFees || "0"),
    paymentReceived: clean(paymentReceived || "0"),
    vacant: false
  };

  dataArray.push(newStudent);
  saveJsonFile(filePath, dataArray);

  res.json({
    success: true,
    student: newStudent
  });
}

function handleUpdateStudent(req, res, dataArray, filePath) {
  const student = dataArray.find(
    s => String(s.id) === String(req.params.id)
  );

  if (!student) {
    return res.json({
      success: false,
      message: "Student not found"
    });
  }

  student.name = clean(req.body.name || student.name);
  student.mobile = clean(req.body.mobile || student.mobile);
  student.city = clean(req.body.city || student.city);
  student.outstandingFees = clean(
    req.body.outstandingFees || student.outstandingFees || "0"
  );
  student.paymentReceived = clean(
    req.body.paymentReceived || student.paymentReceived || "0"
  );
  student.vacant = isVacantName(student.name);

  saveJsonFile(filePath, dataArray);

  res.json({
    success: true,
    updatedStudent: student
  });
}

function handleDeleteStudent(req, res, dataArray, filePath) {
  const student = dataArray.find(
    s => String(s.id) === String(req.params.id)
  );

  if (!student) {
    return res.json({
      success: false,
      message: "Student not found"
    });
  }

  student.name = "VACATE";
  student.mobile = "";
  student.city = "";
  student.outstandingFees = "0";
  student.paymentReceived = "0";
  student.vacant = true;

  saveJsonFile(filePath, dataArray);

  res.json({
    success: true,
    updatedStudent: student
  });
}

/* PDF REPORTS */

app.get("/download-fees-report", (req, res) => {
  generateFeesPDF(
    res,
    "Shree Jain Oswal Boarding Management",
    "Boys Hostel Fees Report",
    "Boys_Fees_Report.pdf",
    students
  );
});

app.get("/download-girls-fees-report", (req, res) => {
  generateFeesPDF(
    res,
    "Girls Hostel Management",
    "Girls Hostel Fees Report",
    "Girls_Fees_Report.pdf",
    girlsStudents
  );
});

function generateFeesPDF(res, title, subtitle, filename, data) {
  const doc = new PDFDocument({
    margin: 40
  });

  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  doc.fontSize(18).text(title, {
    align: "center"
  });

  doc.moveDown();
  doc.fontSize(15).text(subtitle);
  doc.moveDown();

  data.forEach(s => {
    if (s.vacant) return;

    doc.fontSize(10).text(
      `${s.name} | Room ${s.room} | Bed ${s.bed} | Outstanding: Rs.${s.outstandingFees || 0} | Received: Rs.${s.paymentReceived || 0}`
    );
  });

  doc.end();
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});