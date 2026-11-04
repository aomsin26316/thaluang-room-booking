/**
 * Reports and Analytics Module with Chart.js and XLSX export
 * สรุปสถิติการใช้งานห้องประชุม และการส่งออกรายงานเป็นไฟล์ Excel (.xlsx)
 */

let roomChartInstance = null;
let equipmentChartInstance = null;

function renderReports(bookings) {
  const filteredBookings = filterBookingsByDateRange(bookings);

  // สรุปตัวเลข KPI Cards
  const total = filteredBookings.length;
  const approved = filteredBookings.filter(b => (b.Status || b.OverallStatus) === "อนุมัติแล้ว").length;
  const pending = filteredBookings.filter(b => {
    const s = b.Status || b.OverallStatus;
    return s === "รอตรวจสอบ" || s === "รออนุมัติ";
  }).length;
  const rejected = filteredBookings.filter(b => (b.Status || b.OverallStatus) === "ไม่อนุมัติ").length;

  document.getElementById("stat-total-bookings").textContent = total;
  document.getElementById("stat-approved-bookings").textContent = approved;
  document.getElementById("stat-pending-bookings").textContent = pending;
  document.getElementById("stat-rejected-bookings").textContent = rejected;

  // Chart 1: สถิติการใช้งานห้องประชุม
  renderRoomChart(filteredBookings);

  // Chart 2: สถิติการขอใช้อุปกรณ์/ครุภัณฑ์
  renderEquipmentChart(filteredBookings);

  // Render Table รายการในรายงาน
  renderReportTable(filteredBookings);
}

function filterBookingsByDateRange(bookings) {
  const startFilter = document.getElementById("report-start-date")?.value;
  const endFilter = document.getElementById("report-end-date")?.value;

  return bookings.filter(b => {
    if (startFilter && b.StartDate < startFilter) return false;
    if (endFilter && b.StartDate > endFilter) return false;
    return true;
  });
}

function renderRoomChart(bookings) {
  const ctx = document.getElementById("roomUsageChart")?.getContext("2d");
  if (!ctx) return;

  const roomCounts = {};
  // ตั้งค่าห้องจาก Config ถ้ามี
  if (window.api && window.api.appConfig && window.api.appConfig.roomList) {
    window.api.appConfig.roomList.forEach(r => { roomCounts[r] = 0; });
  } else {
    roomCounts["หอประชุมอดิเรกสาร"] = 0;
    roomCounts["ห้องประชุมสักทอง"] = 0;
    roomCounts["ห้องประชุม (กาแฟ)"] = 0;
    roomCounts["อาคารโดมเอนกประสงค์"] = 0;
    roomCounts["ห้องประชุมหน้าห้องผู้อำนวยการ"] = 0;
    roomCounts["ห้องคอมพิวเตอร์กลาง (ห้องโสต)"] = 0;
    roomCounts["อื่นๆ"] = 0;
  }

  bookings.forEach(b => {
    const room = b.RoomName;
    if (roomCounts.hasOwnProperty(room)) {
      roomCounts[room]++;
    } else {
      roomCounts["อื่นๆ"] = (roomCounts["อื่นๆ"] || 0) + 1;
    }
  });

  if (roomChartInstance) {
    roomChartInstance.destroy();
  }

  roomChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(roomCounts),
      datasets: [{
        label: "จำนวนครั้งที่ขอใช้",
        data: Object.values(roomCounts),
        backgroundColor: [
          "#2563eb",
          "#d97706",
          "#059669",
          "#7c3aed",
          "#dc2626",
          "#0891b2",
          "#64748b"
        ],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "สถิติการใช้งานห้องประชุมแต่ละห้อง (ครั้ง)",
          font: { family: "Sarabun", size: 14, weight: "bold" }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

function renderEquipmentChart(bookings) {
  const ctx = document.getElementById("equipmentUsageChart")?.getContext("2d");
  if (!ctx) return;

  const equipmentCounts = {
    "เครื่องฉายภาพ (Projector)": 0,
    "ระบบเสียง": 0,
    "ไมโครโฟน": 0,
    "เครื่องปรับอากาศ": 0,
    "อินเทอร์เน็ต": 0,
    "โต๊ะ/เก้าอี้เพิ่มเติม": 0
  };

  bookings.forEach(b => {
    const equipStr = String(b.Equipments_JSON || b.Equipment || "");
    Object.keys(equipmentCounts).forEach(key => {
      if (equipStr.includes(key)) {
        equipmentCounts[key]++;
      }
    });
  });

  if (equipmentChartInstance) {
    equipmentChartInstance.destroy();
  }

  equipmentChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(equipmentCounts),
      datasets: [{
        data: Object.values(equipmentCounts),
        backgroundColor: [
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#6366f1",
          "#ec4899",
          "#8b5cf6"
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        title: {
          display: true,
          text: "สัดส่วนการขอใช้อุปกรณ์/ครุภัณฑ์",
          font: { family: "Sarabun", size: 14, weight: "bold" }
        }
      }
    }
  });
}

function renderReportTable(bookings) {
  const tbody = document.getElementById("report-table-body");
  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-gray-500">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map((b, idx) => {
    const status = b.Status || b.OverallStatus;
    const purpose = b.Purpose || b.Topic;
    const applicant = b.PrefixName || b.FullName;
    return `
      <tr class="hover:bg-slate-50 border-b text-sm">
        <td class="px-4 py-3 text-center text-gray-600">${idx + 1}</td>
        <td class="px-4 py-3 font-semibold text-blue-900">${b.BookingID}</td>
        <td class="px-4 py-3 font-medium text-slate-800">${purpose}</td>
        <td class="px-4 py-3 text-slate-600">${b.RoomName}</td>
        <td class="px-4 py-3 text-slate-600">${b.StartDate} (${b.StartTime} - ${b.EndTime})</td>
        <td class="px-4 py-3 text-slate-600">${applicant} (${b.Department})</td>
        <td class="px-4 py-3 text-center">
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(status)}">
            ${status}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

function exportReportToExcel() {
  const bookings = filterBookingsByDateRange(window.currentBookings || []);
  if (bookings.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "ไม่มีข้อมูลสำหรับส่งออก",
      text: "กรุณาปรับช่วงวันที่หรือสร้างคำขอจองก่อนทำการส่งออก"
    });
    return;
  }

  const excelData = bookings.map((b, index) => ({
    "ลำดับ": index + 1,
    "รหัสการจอง": b.BookingID,
    "วันเวลาที่ส่งคำขอ": b.Timestamp,
    "ชื่อ-นามสกุล ผู้ขอ": b.PrefixName || b.FullName,
    "ตำแหน่ง": b.Position,
    "หน่วยงาน/สาขาวิชา": b.Department,
    "เบอร์โทรศัพท์": b.Phone,
    "หัวข้อ/วัตถุประสงค์": b.Purpose || b.Topic,
    "จำนวนผู้เข้าใช้ (คน)": b.Attendees,
    "ห้องประชุม": b.RoomName,
    "ห้องอื่นๆ": b.RoomOther,
    "วันที่เริ่มต้น": b.StartDate,
    "วันที่สิ้นสุด": b.EndDate,
    "ตั้งแต่เวลา": b.StartTime,
    "ถึงเวลา": b.EndTime,
    "อุปกรณ์ที่ขอใช้": b.Equipments_JSON || b.Equipment,
    "โต๊ะ/เก้าอี้เพิ่มเติม (ตัว)": b.ExtraChairsCount || 0,
    "สถานะภาพรวม": b.Status || b.OverallStatus,
    "ผลตรวจห้อง (ศูนย์ดิจิทัล)": b.InspectorStatus || b.ITCheckStatus,
    "บันทึกตรวจห้อง": b.InspectorNote || b.ITCheckEquipment,
    "วันที่ตรวจห้อง": b.InspectorDate || b.ITCheckDate,
    "ความเห็นหัวหน้างาน": b.SupervisorStatus || "-",
    "บันทึกหัวหน้างาน": b.SupervisorNote || "-",
    "ผลการอนุมัติ (ผู้บริหาร)": b.ApproverStatus || b.ApprovalStatus,
    "คำสั่งการผู้อนุมัติ": b.ApproverNote || b.ApprovalRemarks,
    "วันที่อนุมัติ": b.ApproverDate || b.ApprovalDate,
    "Google Calendar Event": b.CalendarEventID || "-",
    "ลิงก์เอกสาร PDF (Drive)": b.PDF_Drive_URL || "-"
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  const sheetName = "รายงานการจองห้องประชุม";
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const college = (window.api && window.api.appConfig && window.api.appConfig.collegeName) ? window.api.appConfig.collegeName : "วท_ท่าหลวง";
  const cleanCollege = college.replace(/\s+/g, "_");
  const todayStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `รายงานการจองห้องประชุม_${cleanCollege}_${todayStr}.xlsx`);

  Swal.fire({
    icon: "success",
    title: "ส่งออกไฟล์ Excel สำเร็จ!",
    timer: 2000,
    showConfirmButton: false
  });
}
