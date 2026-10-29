/**
 * Calendar Management Module with FullCalendar
 */

let calendarInstance = null;

const ROOM_COLORS = {
  "หอประชุมอดิเรกสาร": { bg: "#2563eb", border: "#1d4ed8" },
  "ห้องประชุมสักทอง": { bg: "#d97706", border: "#b45309" },
  "ห้องประชุม (กาแฟ)": { bg: "#059669", border: "#047857" },
  "อาคารโดมเอนกประสงค์": { bg: "#7c3aed", border: "#6d28d9" },
  "ห้องประชุมหน้าห้องผู้อำนวยการ": { bg: "#dc2626", border: "#b91c1c" },
  "ห้องคอมพิวเตอร์กลาง (ห้องโสต)": { bg: "#0891b2", border: "#0e7490" },
  "อื่นๆ": { bg: "#4b5563", border: "#374151" }
};

function initMeetingCalendar(bookings) {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  const events = formatBookingsForCalendar(bookings);

  if (calendarInstance) {
    calendarInstance.destroy();
  }

  calendarInstance = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "th",
    timeZone: "Asia/Bangkok",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth"
    },
    buttonText: {
      today: "วันนี้",
      month: "เดือน",
      week: "สัปดาห์",
      day: "วัน",
      list: "รายการสรุป"
    },
    navLinks: true,
    editable: false,
    dayMaxEvents: 3,
    events: events,
    eventClick: function(info) {
      if (info.event.extendedProps && info.event.extendedProps.rawBooking) {
        window.openBookingDetailModal(info.event.extendedProps.rawBooking);
      }
    },
    eventDidMount: function(info) {
      // Add tooltip/popover
      info.el.title = `${info.event.title}\nผู้ขอ: ${info.event.extendedProps.rawBooking.FullName}\nสถานะ: ${info.event.extendedProps.rawBooking.OverallStatus}`;
    }
  });

  calendarInstance.render();
}

function formatBookingsForCalendar(bookings, filterRoom = "all") {
  return bookings
    .filter(b => {
      if (filterRoom !== "all" && b.RoomName !== filterRoom) return false;
      // เฉพาะรายการที่ยังไม่ถูกปฏิเสธหรือยกเลิก
      return b.OverallStatus !== "ไม่อนุมัติ" && b.OverallStatus !== "ยกเลิก";
    })
    .map(b => {
      const colorScheme = ROOM_COLORS[b.RoomName] || { bg: "#4b5563", border: "#374151" };
      
      // วันที่และเวลา ISO
      const startStr = `${b.StartDate}T${b.StartTime || '08:00'}:00`;
      const endStr = `${b.EndDate || b.StartDate}T${b.EndTime || '17:00'}:00`;

      let statusIcon = "⏳ ";
      if (b.OverallStatus === "อนุมัติแล้ว") statusIcon = "✅ ";
      else if (b.OverallStatus === "รออนุมัติ") statusIcon = "📋 ";

      return {
        id: b.BookingID,
        title: `${statusIcon}[${b.RoomName}] ${b.Topic}`,
        start: startStr,
        end: endStr,
        backgroundColor: colorScheme.bg,
        borderColor: colorScheme.border,
        textColor: "#ffffff",
        extendedProps: {
          rawBooking: b
        }
      };
    });
}

/**
 * ตรวจสอบการจองซ้ำซ้อน (Conflict Detection)
 */
function checkBookingConflict(allBookings, newRoom, startDate, endDate, startTime, endTime, excludeBookingId = null) {
  const newStart = new Date(`${startDate}T${startTime}:00`).getTime();
  const newEnd = new Date(`${endDate || startDate}T${endTime}:00`).getTime();

  const conflicts = allBookings.filter(b => {
    if (excludeBookingId && b.BookingID === excludeBookingId) return false;
    if (b.RoomName !== newRoom) return false;
    // ข้ามที่ยกเลิกหรือไม่อนุมัติ
    if (b.OverallStatus === "ไม่อนุมัติ" || b.OverallStatus === "ยกเลิก") return false;

    const existStart = new Date(`${b.StartDate}T${b.StartTime}:00`).getTime();
    const existEnd = new Date(`${b.EndDate || b.StartDate}T${b.EndTime}:00`).getTime();

    // ทับซ้อนกันเมื่อ (StartA < EndB) AND (EndA > StartB)
    return (newStart < existEnd && newEnd > existStart);
  });

  return conflicts;
}

window.filterCalendarByRoom = function(roomName) {
  if (!calendarInstance) return;
  const allBookings = window.currentBookings || [];
  const filteredEvents = formatBookingsForCalendar(allBookings, roomName);
  calendarInstance.removeAllEvents();
  calendarInstance.addEventSource(filteredEvents);
};
