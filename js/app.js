/**
 * Main Application Logic
 * ระบบจองห้องประชุมออนไลน์ - วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 */

window.currentBookings = [];
let currentActiveTab = "calendar";
let currentModalBooking = null;

document.addEventListener("DOMContentLoaded", async () => {
  initLucideIcons();
  setupTabNavigation();
  setupBookingForm();
  setupSearchAndFilters();
  setupSettingsModal();
  setupReportsControls();

  // โหลดข้อมูลครั้งแรก
  await loadAndRefreshData();
});

function initLucideIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * โหลดข้อมูลและ Refresh ทุกหน้าจอ
 */
async function loadAndRefreshData() {
  showLoadingIndicator(true);
  try {
    const list = await window.api.getAllBookings();
    window.currentBookings = list || [];

    // อัปเดตในปฏิทิน
    if (typeof initMeetingCalendar === "function") {
      initMeetingCalendar(window.currentBookings);
    }

    // อัปเดตตารางติดตามสถานะ
    renderMyBookingsTable(window.currentBookings);

    // อัปเดตหน้า Dashboard ผู้อนุมัติ
    renderApproverDashboard(window.currentBookings);

    // อัปเดตรายงาน
    if (typeof renderReports === "function") {
      renderReports(window.currentBookings);
    }

    // อัปเดตตัวเลขแจ้งเตือนบนแท็บ
    updateBadges(window.currentBookings);
  } catch (err) {
    console.error("Error loading data:", err);
  } finally {
    showLoadingIndicator(false);
  }
}

function updateBadges(bookings) {
  const pendingITCount = bookings.filter(b => b.OverallStatus === "รอตรวจสอบ").length;
  const pendingExecCount = bookings.filter(b => b.OverallStatus === "รออนุมัติ").length;
  const totalPending = pendingITCount + pendingExecCount;

  const badgeEl = document.getElementById("approver-pending-badge");
  if (badgeEl) {
    if (totalPending > 0) {
      badgeEl.textContent = totalPending;
      badgeEl.classList.remove("hidden");
    } else {
      badgeEl.classList.add("hidden");
    }
  }
}

/**
 * สลับแท็บหน้าจอ
 */
function setupTabNavigation() {
  const navButtons = document.querySelectorAll("[data-tab-target]");
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab-target");
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  currentActiveTab = tabId;

  // เปลี่ยนสไตล์ปุ่ม Nav
  document.querySelectorAll("[data-tab-target]").forEach(btn => {
    const isCurrent = btn.getAttribute("data-tab-target") === tabId;
    if (isCurrent) {
      btn.classList.add("bg-blue-900", "text-white", "shadow-sm");
      btn.classList.remove("text-slate-600", "hover:bg-slate-100");
    } else {
      btn.classList.remove("bg-blue-900", "text-white", "shadow-sm");
      btn.classList.add("text-slate-600", "hover:bg-slate-100");
    }
  });

  // แสดง/ซ่อนหน้าเนื้อหา
  document.querySelectorAll(".tab-pane").forEach(pane => {
    if (pane.id === `tab-${tabId}`) {
      pane.classList.remove("hidden");
    } else {
      pane.classList.add("hidden");
    }
  });

  // Re-render UI components if needed
  if (tabId === "calendar" && window.calendarInstance) {
    setTimeout(() => window.calendarInstance.render(), 100);
  } else if (tabId === "reports" && typeof renderReports === "function") {
    renderReports(window.currentBookings);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * บันทึกฟอร์มขอใช้ห้องประชุม
 */
function setupBookingForm() {
  const form = document.getElementById("booking-form");
  if (!form) return;

  // ตั้งค่าวันที่เริ่มต้นเป็นวันนี้เป็นอย่างน้อย
  const today = new Date().toISOString().slice(0, 10);
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  if (startDateInput) startDateInput.min = today;
  if (endDateInput) endDateInput.min = today;

  // สลับการแสดงผลช่องห้องอื่นๆ
  const roomSelect = document.getElementById("roomName");
  const roomOtherDiv = document.getElementById("roomOtherContainer");
  if (roomSelect && roomOtherDiv) {
    roomSelect.addEventListener("change", (e) => {
      if (e.target.value === "อื่นๆ") {
        roomOtherDiv.classList.remove("hidden");
        document.getElementById("roomOther").required = true;
      } else {
        roomOtherDiv.classList.add("hidden");
        document.getElementById("roomOther").required = false;
      }
    });
  }

  // Submit Handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // ดึงอุปกรณ์ที่เลือก
    const equipmentCheckboxes = document.querySelectorAll("input[name='equipment']:checked");
    const selectedEquipment = Array.from(equipmentCheckboxes).map(cb => cb.value).join(", ");

    const formData = {
      FullName: document.getElementById("fullName").value.trim(),
      Position: document.getElementById("position").value.trim(),
      Department: document.getElementById("department").value.trim(),
      Phone: document.getElementById("phone").value.trim(),
      Topic: document.getElementById("topic").value.trim(),
      Attendees: Number(document.getElementById("attendees").value) || 1,
      RoomName: document.getElementById("roomName").value,
      RoomOther: document.getElementById("roomOther") ? document.getElementById("roomOther").value.trim() : "",
      StartDate: document.getElementById("startDate").value,
      EndDate: document.getElementById("endDate").value || document.getElementById("startDate").value,
      StartTime: document.getElementById("startTime").value,
      EndTime: document.getElementById("endTime").value,
      Equipment: selectedEquipment,
      EquipmentOther: document.getElementById("equipmentOther").value.trim()
    };

    // ตรวจสอบความถูกต้องของวันเวลา
    if (formData.StartDate > formData.EndDate) {
      Swal.fire({
        icon: "error",
        title: "วันที่ไม่ถูกต้อง",
        text: "วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด"
      });
      return;
    }

    if (formData.StartDate === formData.EndDate && formData.StartTime >= formData.EndTime) {
      Swal.fire({
        icon: "error",
        title: "เวลาไม่ถูกต้อง",
        text: "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น"
      });
      return;
    }

    // ตรวจสอบการจองซ้ำซ้อนในห้องเดียวกัน
    const conflicts = checkBookingConflict(
      window.currentBookings,
      formData.RoomName,
      formData.StartDate,
      formData.EndDate,
      formData.StartTime,
      formData.EndTime
    );

    if (conflicts.length > 0) {
      const conflictMsg = conflicts.map(c => 
        `• ${c.Topic} โดย ${c.FullName} (${c.StartDate} เวลา ${c.StartTime}-${c.EndTime} น.)`
      ).join("<br>");

      const result = await Swal.fire({
        icon: "warning",
        title: "พบการจองห้องในช่วงเวลาดังกล่าว!",
        html: `<p class="mb-2 text-sm text-red-600 font-semibold">ห้องประชุมนี้มีการจองไว้แล้ว:</p><div class="text-left text-xs bg-slate-100 p-3 rounded">${conflictMsg}</div><p class="mt-3 text-xs text-gray-500">ท่านต้องการยืนยันส่งคำขอต่อไป หรือต้องการเปลี่ยนช่วงเวลา/ห้อง?</p>`,
        showCancelButton: true,
        confirmButtonText: "ยืนยันส่งคำขอต่อไป",
        cancelButtonText: "กลับไปแก้ไข",
        confirmButtonColor: "#d97706"
      });

      if (!result.isConfirmed) return;
    }

    // Confirm submission
    const confirm = await Swal.fire({
      title: "ยืนยันการส่งคำขอจองห้องประชุม?",
      html: `<div class="text-left text-sm space-y-1">
        <p><b>ห้อง:</b> ${formData.RoomName}</p>
        <p><b>เรื่อง:</b> ${formData.Topic}</p>
        <p><b>วันที่:</b> ${formData.StartDate} (${formData.StartTime} - ${formData.EndTime} น.)</p>
        <p><b>ผู้ขอ:</b> ${formData.FullName}</p>
      </div>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ส่งคำขอทันที",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#1e3a8a"
    });

    if (!confirm.isConfirmed) return;

    showLoadingIndicator(true, "กำลังบันทึกข้อมูลและส่งเข้าระบบ Google Sheets...");

    try {
      const res = await window.api.createBooking(formData);
      showLoadingIndicator(false);

      await Swal.fire({
        icon: "success",
        title: "ส่งคำขอจองสำเร็จ!",
        html: `รหัสการจองของท่านคือ: <b class="text-blue-900 text-lg">${res.data.BookingID}</b><br><span class="text-xs text-gray-500">ระบบได้บันทึกลงในฐานข้อมูลแล้ว ขณะนี้อยู่ในขั้นตอน "รอตรวจสอบ"</span>`,
        confirmButtonText: "ตรวจสอบสถานะการจอง",
        confirmButtonColor: "#1e3a8a"
      });

      form.reset();
      await loadAndRefreshData();
      switchTab("my-bookings");
    } catch (err) {
      showLoadingIndicator(false);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message
      });
    }
  });
}

/**
 * ตารางติดตามสถานะการจองของผู้ใช้งาน
 */
function renderMyBookingsTable(bookings) {
  const tbody = document.getElementById("my-bookings-table-body");
  if (!tbody) return;

  const searchTerm = (document.getElementById("search-booking-input")?.value || "").toLowerCase().trim();
  const statusFilter = document.getElementById("filter-status-select")?.value || "all";

  const filtered = bookings.filter(b => {
    if (statusFilter !== "all" && b.OverallStatus !== statusFilter) return false;
    if (searchTerm) {
      const matchId = (b.BookingID || "").toLowerCase().includes(searchTerm);
      const matchName = (b.FullName || "").toLowerCase().includes(searchTerm);
      const matchTopic = (b.Topic || "").toLowerCase().includes(searchTerm);
      const matchDept = (b.Department || "").toLowerCase().includes(searchTerm);
      const matchRoom = (b.RoomName || "").toLowerCase().includes(searchTerm);
      return matchId || matchName || matchTopic || matchDept || matchRoom;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-400">ไม่พบข้อมูลการจองตามเงื่อนไข</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => `
    <tr class="hover:bg-slate-50 border-b transition">
      <td class="px-4 py-3 font-semibold text-blue-900 whitespace-nowrap">
        ${b.BookingID}
        <div class="text-[11px] text-gray-400 font-normal">${b.Timestamp ? b.Timestamp.slice(0, 16) : ""}</div>
      </td>
      <td class="px-4 py-3 font-medium text-slate-800">
        <div>${b.Topic}</div>
        <div class="text-xs text-slate-500">จำนวน: ${b.Attendees} คน</div>
      </td>
      <td class="px-4 py-3 whitespace-nowrap">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800">
          <i data-lucide="door-closed" class="w-3.5 h-3.5"></i>
          ${b.RoomName}
        </span>
      </td>
      <td class="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
        <div class="font-medium">${b.StartDate}</div>
        <div class="text-slate-400">${b.StartTime} - ${b.EndTime} น.</div>
      </td>
      <td class="px-4 py-3 text-xs text-slate-600">
        <div class="font-medium">${b.FullName}</div>
        <div class="text-slate-400">${b.Department}</div>
      </td>
      <td class="px-4 py-3 text-center whitespace-nowrap">
        <span class="px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(b.OverallStatus)}">
          ${b.OverallStatus}
        </span>
      </td>
      <td class="px-4 py-3 text-center whitespace-nowrap">
        <div class="flex items-center justify-center gap-2">
          <button onclick="openBookingDetailModalById('${b.BookingID}')" class="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition flex items-center gap-1" title="ดูรายละเอียด">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i> ดูข้อมูล
          </button>
          <button onclick="printOfficialSlipById('${b.BookingID}')" class="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded transition flex items-center gap-1" title="พิมพ์แบบฟอร์มขออนุญาต">
            <i data-lucide="printer" class="w-3.5 h-3.5"></i> พิมพ์ใบขอ
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  initLucideIcons();
}

/**
 * แดชบอร์ดสำหรับผู้ดูแลระบบและผู้อนุมัติ (IT Staff & Deputy Director)
 */
function renderApproverDashboard(bookings) {
  // 1. ตารางสำหรับเจ้าหน้าที่ศูนย์ดิจิทัลและสื่อสารองค์กร (รอตรวจสอบ)
  const itTbody = document.getElementById("it-review-table-body");
  if (itTbody) {
    const itQueue = bookings.filter(b => b.OverallStatus === "รอตรวจสอบ");
    if (itQueue.length === 0) {
      itTbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-emerald-600 font-medium">✨ ไม่มีคำขอค้างตรวจสอบ (ห้องและอุปกรณ์พร้อมใช้งานทั้งหมด)</td></tr>`;
    } else {
      itTbody.innerHTML = itQueue.map(b => `
        <tr class="hover:bg-amber-50/50 border-b text-sm">
          <td class="px-4 py-3 font-semibold text-blue-900">${b.BookingID}</td>
          <td class="px-4 py-3">
            <div class="font-medium text-slate-800">${b.Topic}</div>
            <div class="text-xs text-slate-500">${b.FullName} (${b.Department}) - โทร ${b.Phone}</div>
          </td>
          <td class="px-4 py-3 font-semibold text-amber-900">${b.RoomName}</td>
          <td class="px-4 py-3 text-xs text-slate-600">
            <div>${b.StartDate}</div>
            <div class="text-slate-400">${b.StartTime} - ${b.EndTime} น.</div>
          </td>
          <td class="px-4 py-3 text-xs text-slate-600">
            <div class="max-w-[200px] truncate" title="${b.Equipment}">${b.Equipment || "ไม่ได้ขออุปกรณ์เพิ่ม"}</div>
          </td>
          <td class="px-4 py-3 text-center whitespace-nowrap">
            <button onclick="openITReviewModal('${b.BookingID}')" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shadow-sm transition flex items-center gap-1 mx-auto">
              <i data-lucide="check-square" class="w-3.5 h-3.5"></i> ตรวจสอบห้อง
            </button>
          </td>
        </tr>
      `).join("");
    }
  }

  // 2. ตารางสำหรับรองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน (รออนุมัติ)
  const execTbody = document.getElementById("exec-approval-table-body");
  if (execTbody) {
    const execQueue = bookings.filter(b => b.OverallStatus === "รออนุมัติ");
    if (execQueue.length === 0) {
      execTbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400">ไม่มีคำขอที่รอการพิจารณาอนุมัติในขณะนี้</td></tr>`;
    } else {
      execTbody.innerHTML = execQueue.map(b => `
        <tr class="hover:bg-blue-50/50 border-b text-sm">
          <td class="px-4 py-3 font-semibold text-blue-900">${b.BookingID}</td>
          <td class="px-4 py-3">
            <div class="font-medium text-slate-800">${b.Topic}</div>
            <div class="text-xs text-slate-500">${b.FullName} (${b.Position} ${b.Department})</div>
          </td>
          <td class="px-4 py-3 font-semibold text-blue-900">${b.RoomName}</td>
          <td class="px-4 py-3 text-xs text-slate-600">
            <div>${b.StartDate} (${b.StartTime} - ${b.EndTime} น.)</div>
            <div class="text-emerald-600 font-medium">✓ ผ่านการตรวจห้องโดย: ${b.ITCheckBy || "ศูนย์ดิจิทัลฯ"}</div>
          </td>
          <td class="px-4 py-3 text-xs text-slate-600">
            <div>ผู้เข้าร่วม: ${b.Attendees} คน</div>
            <div class="text-slate-400 truncate max-w-[150px]">${b.Equipment}</div>
          </td>
          <td class="px-4 py-3 text-center whitespace-nowrap">
            <button onclick="openExecutiveApprovalModal('${b.BookingID}')" class="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-sm transition flex items-center gap-1 mx-auto">
              <i data-lucide="shield-check" class="w-3.5 h-3.5"></i> พิจารณาอนุมัติ
            </button>
          </td>
        </tr>
      `).join("");
    }
  }

  initLucideIcons();
}

/**
 * Modal ตรวจสอบห้อง (ศูนย์ดิจิทัลและสื่อสารองค์กร)
 */
window.openITReviewModal = function(bookingId) {
  const booking = window.currentBookings.find(b => b.BookingID === bookingId);
  if (!booking) return;

  currentModalBooking = booking;
  document.getElementById("it-modal-booking-id").textContent = booking.BookingID;
  document.getElementById("it-modal-room").textContent = booking.RoomName;
  document.getElementById("it-modal-topic").textContent = booking.Topic;
  document.getElementById("it-modal-applicant").textContent = `${booking.FullName} (${booking.Department})`;
  document.getElementById("it-modal-time").textContent = `${booking.StartDate} เวลา ${booking.StartTime} - ${booking.EndTime} น.`;
  document.getElementById("it-modal-equip-list").textContent = booking.Equipment || "ไม่มี";

  document.getElementById("it-reviewer-name").value = "เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร";
  document.getElementById("it-equipment-notes").value = "ตรวจสอบความพร้อมของห้องและอุปกรณ์ระบบเสียงเรียบร้อย พร้อมใช้งาน";

  document.getElementById("modal-it-review").classList.remove("hidden");
};

window.closeITReviewModal = function() {
  document.getElementById("modal-it-review").classList.add("hidden");
};

window.submitITReview = async function(isReady) {
  if (!currentModalBooking) return;

  const reviewerName = document.getElementById("it-reviewer-name").value.trim() || "เจ้าหน้าที่งานศูนย์ดิจิทัลฯ";
  const notes = document.getElementById("it-equipment-notes").value.trim();
  const itStatus = isReady ? "พร้อมใช้งาน" : "ไม่พร้อมใช้งาน";

  showLoadingIndicator(true, "กำลังบันทึกผลการตรวจสอบ...");
  try {
    await window.api.updateITReview(currentModalBooking.BookingID, itStatus, notes, reviewerName);
    closeITReviewModal();
    await loadAndRefreshData();
    showLoadingIndicator(false);

    Swal.fire({
      icon: isReady ? "success" : "info",
      title: "บันทึกผลการตรวจสอบสำเร็จ",
      text: isReady ? "สถานะเปลี่ยนเป็น 'รออนุมัติ' ส่งต่อไปยังรอง ผอ. เรียบร้อย" : "สถานะเปลี่ยนเป็น 'ไม่พร้อมใช้งาน'",
      timer: 2000,
      showConfirmButton: false
    });
  } catch (err) {
    showLoadingIndicator(false);
    Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
  }
};

/**
 * Modal พิจารณาอนุมัติ (รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน)
 */
window.openExecutiveApprovalModal = function(bookingId) {
  const booking = window.currentBookings.find(b => b.BookingID === bookingId);
  if (!booking) return;

  currentModalBooking = booking;
  document.getElementById("exec-modal-booking-id").textContent = booking.BookingID;
  document.getElementById("exec-modal-topic").textContent = booking.Topic;
  document.getElementById("exec-modal-room").textContent = booking.RoomName;
  document.getElementById("exec-modal-applicant").textContent = `${booking.FullName} (${booking.Position} ${booking.Department})`;
  document.getElementById("exec-modal-time").textContent = `${booking.StartDate} (${booking.StartTime} - ${booking.EndTime} น.)`;
  document.getElementById("exec-modal-it-check").textContent = `ห้อง: ${booking.ITCheckStatus} | ตรวจโดย: ${booking.ITCheckBy} (${booking.ITCheckEquipment || "-"})`;

  document.getElementById("exec-approver-name").value = "นายประเสริฐ สุขสวัสดิ์ (รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน)";
  document.getElementById("exec-remarks").value = "อนุมัติให้ใช้ห้องประชุมและอุปกรณ์ได้ตามวันเวลาดังกล่าว";

  document.getElementById("modal-exec-approval").classList.remove("hidden");
};

window.closeExecutiveApprovalModal = function() {
  document.getElementById("modal-exec-approval").classList.add("hidden");
};

window.submitExecutiveApproval = async function(isApproved) {
  if (!currentModalBooking) return;

  const approverName = document.getElementById("exec-approver-name").value.trim() || "รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน";
  const remarks = document.getElementById("exec-remarks").value.trim();
  const decision = isApproved ? "อนุมัติ" : "ไม่อนุมัติ";

  showLoadingIndicator(true, "กำลังบันทึกผลการพิจารณาอนุมัติ...");
  try {
    await window.api.updateApproval(currentModalBooking.BookingID, decision, approverName, remarks);
    closeExecutiveApprovalModal();
    await loadAndRefreshData();
    showLoadingIndicator(false);

    Swal.fire({
      icon: isApproved ? "success" : "warning",
      title: isApproved ? "อนุมัติการใช้ห้องเรียบร้อย" : "ไม่อนุมัติการใช้ห้อง",
      text: `รหัส ${currentModalBooking.BookingID} ได้รับการพิจารณาเป็น "${decision}" เรียบร้อยแล้ว`,
      timer: 2000,
      showConfirmButton: false
    });
  } catch (err) {
    showLoadingIndicator(false);
    Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
  }
};

/**
 * Modal รายละเอียดการจอง
 */
window.openBookingDetailModalById = function(bookingId) {
  const booking = window.currentBookings.find(b => b.BookingID === bookingId);
  if (booking) openBookingDetailModal(booking);
};

window.openBookingDetailModal = function(booking) {
  currentModalBooking = booking;
  document.getElementById("detail-booking-id").textContent = booking.BookingID;
  document.getElementById("detail-status-badge").className = `px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(booking.OverallStatus)}`;
  document.getElementById("detail-status-badge").textContent = booking.OverallStatus;
  document.getElementById("detail-fullname").textContent = booking.FullName;
  document.getElementById("detail-position").textContent = booking.Position || "-";
  document.getElementById("detail-department").textContent = booking.Department;
  document.getElementById("detail-phone").textContent = booking.Phone;
  document.getElementById("detail-topic").textContent = booking.Topic;
  document.getElementById("detail-attendees").textContent = `${booking.Attendees} คน`;
  document.getElementById("detail-room").textContent = booking.RoomName + (booking.RoomOther ? ` (${booking.RoomOther})` : "");
  document.getElementById("detail-dates").textContent = `${booking.StartDate} ถึง ${booking.EndDate}`;
  document.getElementById("detail-times").textContent = `${booking.StartTime} - ${booking.EndTime} น.`;
  document.getElementById("detail-equipment").textContent = booking.Equipment || "ไม่มี";
  document.getElementById("detail-equip-other").textContent = booking.EquipmentOther || "-";

  // IT & Approval Sections
  document.getElementById("detail-it-status").textContent = booking.ITCheckStatus || "ยังไม่ได้ตรวจสอบ";
  document.getElementById("detail-it-by").textContent = booking.ITCheckBy || "-";
  document.getElementById("detail-it-date").textContent = booking.ITCheckDate || "-";
  document.getElementById("detail-it-notes").textContent = booking.ITCheckEquipment || "-";

  document.getElementById("detail-approval-status").textContent = booking.ApprovalStatus || "รอพิจารณา";
  document.getElementById("detail-approval-by").textContent = booking.ApprovalBy || "-";
  document.getElementById("detail-approval-date").textContent = booking.ApprovalDate || "-";
  document.getElementById("detail-approval-remarks").textContent = booking.ApprovalRemarks || "-";

  document.getElementById("modal-booking-detail").classList.remove("hidden");
};

window.closeBookingDetailModal = function() {
  document.getElementById("modal-booking-detail").classList.add("hidden");
};

/**
 * พิมพ์แบบฟอร์มขออนุญาตใช้ห้องประชุมทางการ (Official Printable Slip)
 */
window.printOfficialSlipById = function(bookingId) {
  const booking = window.currentBookings.find(b => b.BookingID === bookingId);
  if (!booking) return;

  const slipContainer = document.getElementById("printable-official-slip");
  if (!slipContainer) return;

  slipContainer.innerHTML = `
    <div class="border-2 border-slate-800 p-8 max-w-4xl mx-auto bg-white text-slate-900 leading-relaxed font-['Sarabun']">
      <!-- หัวหนังสือราชการ -->
      <div class="text-center pb-4 border-b-2 border-slate-800">
        <h2 class="text-2xl font-bold font-['Prompt'] text-blue-900">วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์</h2>
        <h3 class="text-lg font-semibold mt-1">แบบฟอร์มขออนุญาตใช้ห้องประชุมและอุปกรณ์</h3>
        <p class="text-xs text-slate-500 mt-1">รหัสคำขอ: <b>${booking.BookingID}</b> | วันที่ยื่นคำขอ: ${booking.Timestamp || "-"}</p>
      </div>

      <!-- ส่วนที่ 1: ข้อมูลผู้ขอใช้ -->
      <div class="mt-4">
        <h4 class="font-bold text-sm bg-slate-100 p-1.5 border-l-4 border-blue-900">๑. ข้อมูลผู้ขออนุญาต</h4>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 text-sm">
          <div><b>ชื่อ-นามสกุล:</b> ${booking.FullName}</div>
          <div><b>ตำแหน่ง:</b> ${booking.Position || "-"}</div>
          <div><b>หน่วยงาน/สาขาวิชา:</b> ${booking.Department}</div>
          <div><b>เบอร์โทรศัพท์:</b> ${booking.Phone}</div>
        </div>
      </div>

      <!-- ส่วนที่ 2: รายละเอียดการขอใช้ -->
      <div class="mt-4">
        <h4 class="font-bold text-sm bg-slate-100 p-1.5 border-l-4 border-blue-900">๒. รายละเอียดการขอใช้ห้องประชุม</h4>
        <div class="space-y-1.5 mt-2 text-sm">
          <div><b>หัวข้อ/เรื่องในการดำเนินงาน:</b> ${booking.Topic}</div>
          <div class="grid grid-cols-2 gap-4">
            <div><b>ห้องประชุมที่ขอใช้:</b> <span class="text-blue-900 font-bold">${booking.RoomName} ${booking.RoomOther ? `(${booking.RoomOther})` : ""}</span></div>
            <div><b>จำนวนผู้เข้าใช้ประมาณ:</b> ${booking.Attendees} คน</div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><b>วันที่เริ่มต้น - สิ้นสุด:</b> ${booking.StartDate} ถึง ${booking.EndDate}</div>
            <div><b>เวลา:</b> ${booking.StartTime} - ${booking.EndTime} น.</div>
          </div>
        </div>
      </div>

      <!-- ส่วนที่ 3: อุปกรณ์/ครุภัณฑ์ -->
      <div class="mt-4">
        <h4 class="font-bold text-sm bg-slate-100 p-1.5 border-l-4 border-blue-900">๓. รายการขอใช้อุปกรณ์/ครุภัณฑ์</h4>
        <p class="text-sm mt-1"><b>อุปกรณ์ที่ขอใช้:</b> ${booking.Equipment || "ไม่ได้ขออุปกรณ์เพิ่ม"}</p>
        ${booking.EquipmentOther ? `<p class="text-sm"><b>เพิ่มเติม:</b> ${booking.EquipmentOther}</p>` : ""}
      </div>

      <!-- ส่วนที่ 4: การตรวจสอบและการพิจารณาอนุมัติ (2 ช่องลายเซ็น) -->
      <div class="grid grid-cols-2 gap-6 mt-6 pt-4 border-t border-slate-300">
        <!-- ช่องที่ 1: เจ้าหน้าที่ศูนย์ดิจิทัล -->
        <div class="border border-slate-300 p-3 rounded text-sm flex flex-col justify-between">
          <div>
            <p class="font-bold text-center border-b pb-1">ความเห็นเจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร</p>
            <div class="mt-2 space-y-1">
              <p>ผลการตรวจสอบห้อง: <b>${booking.ITCheckStatus || "......................."}</b></p>
              <p class="text-xs text-slate-600">บันทึก: ${booking.ITCheckEquipment || "-"}</p>
            </div>
          </div>
          <div class="text-center mt-8">
            <p>(ลงชื่อ).........................................................</p>
            <p class="text-xs mt-1">(${booking.ITCheckBy || "เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร"})</p>
            <p class="text-xs text-slate-500">วันที่: ${booking.ITCheckDate || "....../....../......"}</p>
          </div>
        </div>

        <!-- ช่องที่ 2: รองผู้อำนวยการ -->
        <div class="border border-slate-300 p-3 rounded text-sm flex flex-col justify-between">
          <div>
            <p class="font-bold text-center border-b pb-1">การพิจารณาอนุมัติ</p>
            <div class="mt-2 space-y-1">
              <p>ผลการพิจารณา: <b>[ ${booking.ApprovalStatus === 'อนุมัติ' ? '✓' : ' '} ] อนุมัติ &nbsp;&nbsp; [ ${booking.ApprovalStatus === 'ไม่อนุมัติ' ? '✓' : ' '} ] ไม่อนุมัติ</b></p>
              <p class="text-xs text-slate-600">ข้อคิดเห็น: ${booking.ApprovalRemarks || "-"}</p>
            </div>
          </div>
          <div class="text-center mt-8">
            <p>(ลงชื่อ).........................................................</p>
            <p class="text-xs mt-1">(${booking.ApprovalBy || "รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน"})</p>
            <p class="text-xs text-slate-500">วันที่: ${booking.ApprovalDate || "....../....../......"}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // เรียกคำสั่ง Print ของเบราว์เซอร์
  window.print();
};

/**
 * Filter & Search Controls
 */
function setupSearchAndFilters() {
  const searchInput = document.getElementById("search-booking-input");
  const filterSelect = document.getElementById("filter-status-select");

  if (searchInput) {
    searchInput.addEventListener("input", () => renderMyBookingsTable(window.currentBookings));
  }
  if (filterSelect) {
    filterSelect.addEventListener("change", () => renderMyBookingsTable(window.currentBookings));
  }
}

/**
 * Reports Controls
 */
function setupReportsControls() {
  const startInput = document.getElementById("report-start-date");
  const endInput = document.getElementById("report-end-date");
  const exportBtn = document.getElementById("btn-export-excel");

  if (startInput) startInput.addEventListener("change", () => renderReports(window.currentBookings));
  if (endInput) endInput.addEventListener("change", () => renderReports(window.currentBookings));
  if (exportBtn) exportBtn.addEventListener("click", () => exportReportToExcel());
}

/**
 * Settings Modal
 */
function setupSettingsModal() {
  const modal = document.getElementById("modal-settings");
  const openBtn = document.getElementById("btn-open-settings");
  const closeBtn = document.getElementById("btn-close-settings");
  const saveBtn = document.getElementById("btn-save-settings");

  const urlInput = document.getElementById("setting-apps-script-url");
  const lineInput = document.getElementById("setting-line-token");

  if (openBtn && modal) {
    openBtn.addEventListener("click", () => {
      urlInput.value = window.api.config.appsScriptUrl || "";
      lineInput.value = window.api.config.lineToken || "";
      modal.classList.remove("hidden");
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const newUrl = urlInput.value.trim();
      const newLine = lineInput.value.trim();

      window.api.saveConfig({
        appsScriptUrl: newUrl,
        lineToken: newLine
      });

      modal.classList.add("hidden");
      await Swal.fire({
        icon: "success",
        title: "บันทึกการตั้งค่าแล้ว",
        timer: 1500,
        showConfirmButton: false
      });

      await loadAndRefreshData();
    });
  }
}

/**
 * Helper: Badge Styling
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case "รอตรวจสอบ":
      return "badge-pending-it";
    case "รออนุมัติ":
      return "badge-pending-exec";
    case "อนุมัติแล้ว":
      return "badge-approved";
    case "ไม่อนุมัติ":
      return "badge-rejected";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

/**
 * Helper: Loading Indicator
 */
function showLoadingIndicator(show, text = "กำลังโหลดข้อมูล...") {
  const loader = document.getElementById("global-loading");
  const loaderText = document.getElementById("global-loading-text");
  if (!loader) return;

  if (show) {
    if (loaderText) loaderText.textContent = text;
    loader.classList.remove("hidden");
  } else {
    loader.classList.add("hidden");
  }
}
