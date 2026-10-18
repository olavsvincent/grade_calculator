
const subjectList = document.getElementById("subjectList");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");

let subjects = [];
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function getRemark(grade) {
  if (grade === "" || grade === null || grade === undefined) {
    return { text: "Pending", className: "remark-pending" };
  }

  const value = Number(grade);

  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { text: "Invalid grade", className: "remark-pending" };
  }

  return value >= 75
    ? { text: "Passed", className: "remark-passed" }
    : { text: "Failed", className: "remark-failed" };
}

function saveSubjects() {
  localStorage.setItem("gradewiseSubjects", JSON.stringify(subjects));
}

function loadSubjects() {
  try {
    const saved = JSON.parse(localStorage.getItem("gradewiseSubjects") || "[]");
    subjects = Array.isArray(saved) ? saved : [];
  } catch {
    subjects = [];
  }
  renderSubjects();
}

function renderSubjects() {
  subjectList.innerHTML = "";

  subjects.forEach((subject, index) => {
    const row = document.createElement("tr");
    const remark = getRemark(subject.grade);

    row.innerHTML = `
      <td>
        <input class="subject-input" type="text"
          placeholder="e.g. Mathematics" maxlength="80"
          aria-label="Subject name" value="${escapeHTML(subject.name)}"
          data-index="${index}" data-field="name">
      </td>
      <td>
        <input class="number-input" type="number"
          placeholder="0–100" min="0" max="100" step="0.01"
          aria-label="Grade" value="${subject.grade}"
          data-index="${index}" data-field="grade">
      </td>
      <td>
        <input class="number-input" type="number"
          placeholder="Units" min="0.5" max="30" step="0.5"
          aria-label="Subject units" value="${subject.units}"
          data-index="${index}" data-field="units">
      </td>
      <td><span class="remark ${remark.className}">${remark.text}</span></td>
      <td>
        <button class="delete-button" data-delete="${index}"
          aria-label="Delete subject" title="Delete subject">×</button>
      </td>
    `;

    subjectList.appendChild(row);
  });

  emptyState.style.display = subjects.length ? "none" : "block";
  document.querySelector(".table-wrap").style.display =
    subjects.length ? "block" : "none";

  updateSummary();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function updateSummary() {
  let totalUnits = 0;
  let weightedTotal = 0;
  let passed = 0;
  let failed = 0;
  let gradedSubjects = 0;

  subjects.forEach(subject => {
    const grade = subject.grade === "" ? NaN : Number(subject.grade);
    const units = Number(subject.units);

    if (Number.isFinite(grade) && grade >= 0 && grade <= 100 &&
        Number.isFinite(units) && units > 0) {
      weightedTotal += grade * units;
      totalUnits += units;
      gradedSubjects++;
      if (grade >= 75) passed++;
      else failed++;
    }
  });

  const average = totalUnits > 0 ? weightedTotal / totalUnits : null;

  document.getElementById("average").textContent =
    average === null ? "--" : average.toFixed(2);

  document.getElementById("averageRemark").textContent =
    average === null
      ? "Add your grades to get started"
      : average >= 75
        ? "Your weighted average is passing"
        : "Your weighted average is below 75";

  document.getElementById("totalSubjects").textContent = subjects.length;
  document.getElementById("passedSubjects").textContent = passed;
  document.getElementById("failedSubjects").textContent = failed;
  document.getElementById("unitSummary").textContent =
    `Total units: ${totalUnits.toFixed(1)} · Graded subjects: ${gradedSubjects}`;
}

function addSubject() {
  subjects.push({
    name: "",
    grade: "",
    units: 3
  });
  saveSubjects();
  renderSubjects();

  const inputs = subjectList.querySelectorAll(".subject-input");
  inputs[inputs.length - 1]?.focus();
}

function validField(field, value) {
  if (field === "grade") {
    return value === "" ||
      (Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100);
  }

  if (field === "units") {
    return value !== "" &&
      Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 30;
  }

  return true;
}

subjectList.addEventListener("change", event => {
  const input = event.target;
  const index = Number(input.dataset.index);
  const field = input.dataset.field;

  if (!field || !subjects[index]) return;

  const value = input.value.trim();

  if (!validField(field, value)) {
    showToast(field === "grade"
      ? "Grade must be between 0 and 100."
      : "Units must be greater than 0 and no more than 30.");
    renderSubjects();
    return;
  }

  subjects[index][field] = field === "units" && value !== ""
    ? Number(value)
    : field === "grade" && value !== ""
      ? Number(value)
      : value;

  saveSubjects();
  renderSubjects();
});

subjectList.addEventListener("click", event => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;

  subjects.splice(Number(button.dataset.delete), 1);
  saveSubjects();
  renderSubjects();
  showToast("Subject removed.");
});

document.getElementById("addSubject").addEventListener("click", addSubject);
document.getElementById("emptyAdd").addEventListener("click", addSubject);

document.getElementById("clearGrades").addEventListener("click", () => {
  if (!subjects.length) {
    showToast("There are no subjects to clear.");
    return;
  }

  if (confirm("Are you sure you want to delete all subjects?")) {
    subjects = [];
    saveSubjects();
    renderSubjects();
    showToast("All subjects cleared.");
  }
});

document.getElementById("exportGrades").addEventListener("click", () => {
  if (!subjects.length) {
    showToast("Add subjects before exporting.");
    return;
  }

  const rows = [
    ["Subject", "Grade", "Units", "Remark"],
    ...subjects.map(subject => [
      subject.name,
      subject.grade,
      subject.units,
      getRemark(subject.grade).text
    ])
  ];

  const csv = rows.map(row =>
    row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "my-grades.csv";
  link.click();
  URL.revokeObjectURL(url);

  showToast("Your grade report was exported.");
});

loadSubjects();
