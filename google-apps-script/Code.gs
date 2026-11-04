/**
 * =========================================================================================
 * ระบบจองห้องประชุมออนไลน์ (Smart Meeting Room Booking System) - White-Label Template
 * Google Apps Script Backend (Code.gs)
 * 
 * คุณสมบัติ:
 * 1. Auto-Setup Database (ชีต Bookings 28 คอลัมน์ และ Settings สำหรับ White-Label)
 * 2. สร้างเอกสารคำขอขนาด A4 ตามฟอร์มราชการ และแปลงเป็น PDF บันทึกลง Google Drive อัตโนมัติ
 * 3. ลงคิว Google Calendar อัตโนมัติเมื่อคำขอได้รับการอนุมัติ
 * 4. แจ้งเตือนผ่าน Telegram Bot และ LINE Notify แบบเรียลไทม์
 * 5. รองรับทั้ง google.script.run และ REST API (doGet / doPost) สำหรับ GitHub Pages / Standalone
 * =========================================================================================
 */

// ชื่อแท็บชีตมาตรฐาน
const BOOKING_SHEET_NAME = "Bookings";
const SETTINGS_SHEET_NAME = "Settings";

// หัวคอลัมน์ชีต Bookings ทั้งหมด 28 คอลัมน์ตามข้อกำหนดระบบ
const BOOKING_HEADERS = [
  "BookingID",         // 1: รหัสการจอง (เช่น TL-BK-20261104-1001)
  "Timestamp",         // 2: วันเวลาที่ส่งคำขอ
  "PrefixName",        // 3: คำนำหน้าและชื่อ-นามสกุล ผู้ขอ
  "Position",          // 4: ตำแหน่ง
  "Department",        // 5: หน่วยงาน / สาขาวิชา
  "Phone",             // 6: เบอร์โทรศัพท์ติดต่อ
  "RoomName",          // 7: ห้องประชุมที่เลือก
  "RoomOther",         // 8: ห้องอื่นๆ (ระบุเพิ่มเติม)
  "Purpose",           // 9: วัตถุประสงค์ / หัวข้อการดำเนินงาน
  "StartDate",         // 10: วันที่เริ่มต้น (YYYY-MM-DD)
  "EndDate",           // 11: วันที่สิ้นสุด (YYYY-MM-DD)
  "StartTime",         // 12: ตั้งแต่เวลา (HH:mm)
  "EndTime",           // 13: ถึงเวลา (HH:mm)
  "Attendees",         // 14: จำนวนผู้เข้าใช้ (คน)
  "Equipments_JSON",   // 15: รายการอุปกรณ์ที่ขอ (JSON หรือ Comma string)
  "ExtraChairsCount",  // 16: โต๊ะ/เก้าอี้เพิ่มเติม (ตัว/ชุด)
  "Status",            // 17: สถานะภาพรวม (รอตรวจสอบ, รออนุมัติ, อนุมัติแล้ว, ไม่อนุมัติ, ยกเลิก)
  "InspectorStatus",   // 18: จนท.ตรวจห้อง (พร้อมใช้งาน / ไม่พร้อมใช้งาน / รอตรวจสอบ)
  "InspectorNote",     // 19: บันทึกผลการตรวจห้องและอุปกรณ์
  "InspectorDate",     // 20: วันเวลาที่ตรวจห้อง
  "SupervisorStatus",  // 21: หัวหน้างาน (เห็นควรอนุมัติ / ไม่เห็นควรอนุมัติ / รอพิจารณา)
  "SupervisorNote",    // 22: ความเห็นหัวหน้างาน
  "SupervisorDate",    // 23: วันเวลาที่หัวหน้างานพิจารณา
  "ApproverStatus",    // 24: ผู้มีอำนาจอนุมัติ (อนุมัติ / ไม่อนุมัติ / รอพิจารณา)
  "ApproverNote",      // 25: คำสั่งการ / บันทึกผู้อนุมัติ
  "ApproverDate",      // 26: วันเวลาที่อนุมัติ
  "CalendarEventID",   // 27: Event ID ใน Google Calendar
  "PDF_Drive_URL"      // 28: ลิงก์ดาวน์โหลดเอกสาร PDF บน Google Drive
];

// ค่าเริ่มต้นสำหรับการตั้งค่า White-Label Template
const DEFAULT_CONFIG = {
  COLLEGE_NAME: "วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์",
  COLLEGE_LOGO_URL: "https://upload.wikimedia.org/wikipedia/th/thumb/a/a2/Emblem_of_the_Vocational_Education_Commission.svg/1200px-Emblem_of_the_Vocational_Education_Commission.svg.png",
  DRIVE_FOLDER_ID: "", // ปล่อยว่างไว้ ระบบจะสร้างโฟลเดอร์ชื่อ 'เอกสารคำขอใช้ห้องประชุม' ให้อัตโนมัติ
  CALENDAR_ID: "primary", // primary คือ ปฏิทินหลักของบัญชี Google หรือระบุ Calendar ID
  TELEGRAM_BOT_TOKEN: "",
  TELEGRAM_CHAT_ID: "",
  LINE_NOTIFY_TOKEN: "",
  ROOM_LIST: "หอประชุมอดิเรกสาร,ห้องประชุมสักทอง,ห้องประชุม (กาแฟ),อาคารโดมเอนกประสงค์,ห้องประชุมหน้าห้องผู้อำนวยการ,ห้องคอมพิวเตอร์กลาง (ห้องโสต),อื่นๆ",
  INSPECTOR_TITLE: "เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร",
  SUPERVISOR_TITLE: "หัวหน้างานบริหารงานทั่วไป / หัวหน้าแผนกวิชา",
  APPROVER_TITLE: "รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน"
};

/**
 * =========================================================================================
 * 1. การตั้งค่าระบบแบบศูนย์กลาง (Config Sheet & Script Properties)
 * =========================================================================================
 */

/**
 * ดึงการตั้งค่าระบบจากชีต Settings หรือ Script Properties
 */
function getAppConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let config = Object.assign({}, DEFAULT_CONFIG);

  try {
    const settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
    if (settingsSheet && settingsSheet.getLastRow() > 1) {
      const data = settingsSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const key = String(data[i][0]).trim();
        const val = data[i][1];
        if (key && val !== undefined && val !== null && String(val).trim() !== "") {
          config[key] = String(val).trim();
        }
      }
    } else {
      // ดึงจาก ScriptProperties สำรอง
      const props = PropertiesService.getScriptProperties().getProperties();
      for (let k in props) {
        if (props[k]) config[k] = props[k];
      }
    }
  } catch (err) {
    Logger.log("getAppConfig error: " + err.toString());
  }

  // แปลง ROOM_LIST เป็น Array สำหรับ Frontend
  let roomArray = [];
  if (config.ROOM_LIST) {
    roomArray = config.ROOM_LIST.split(",").map(r => r.trim()).filter(r => r.length > 0);
  }

  return {
    collegeName: config.COLLEGE_NAME,
    collegeLogoUrl: config.COLLEGE_LOGO_URL,
    driveFolderId: config.DRIVE_FOLDER_ID,
    calendarId: config.CALENDAR_ID,
    hasTelegram: !!(config.TELEGRAM_BOT_TOKEN && config.TELEGRAM_CHAT_ID),
    hasLine: !!config.LINE_NOTIFY_TOKEN,
    roomList: roomArray,
    approvers: {
      inspector: config.INSPECTOR_TITLE,
      supervisor: config.SUPERVISOR_TITLE,
      approver: config.APPROVER_TITLE
    }
  };
}

/**
 * =========================================================================================
 * 2. ฐานข้อมูล Google Sheets (Auto-Setup Database)
 * =========================================================================================
 */

/**
 * ฟังก์ชันสร้างและตั้งค่าโครงสร้างชีต Bookings และ Settings อัตโนมัติ
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. ตั้งค่าชีต Settings
  let settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SETTINGS_SHEET_NAME);
  }
  if (settingsSheet.getLastRow() === 0) {
    const settingsHeaders = ["Key (ชื่อตัวแปร)", "Value (ค่าที่กำหนด)", "Description (คำอธิบาย)"];
    const settingsRows = [
      settingsHeaders,
      ["COLLEGE_NAME", DEFAULT_CONFIG.COLLEGE_NAME, "ชื่อสถานศึกษา/หน่วยงาน (White-Label)"],
      ["COLLEGE_LOGO_URL", DEFAULT_CONFIG.COLLEGE_LOGO_URL, "URL รูปภาพตราสัญลักษณ์ของสถานศึกษา"],
      ["DRIVE_FOLDER_ID", "", "รหัสโฟลเดอร์ Google Drive สำหรับเก็บ PDF (ถ้าเว้นว่างจะสร้างให้อัตโนมัติ)"],
      ["CALENDAR_ID", "primary", "รหัส Google Calendar (ใช้ 'primary' สำหรับปฏิทินหลัก)"],
      ["TELEGRAM_BOT_TOKEN", "", "Bot Token สำหรับแจ้งเตือนผ่าน Telegram"],
      ["TELEGRAM_CHAT_ID", "", "Chat ID กลุ่มหรือบุคคลสำหรับรับแจ้งเตือน Telegram"],
      ["LINE_NOTIFY_TOKEN", "", "LINE Notify Token สำหรับส่งแจ้งเตือนเข้ากลุ่มไลน์"],
      ["ROOM_LIST", DEFAULT_CONFIG.ROOM_LIST, "รายชื่อห้องประชุมที่เปิดให้จอง คั่นด้วยเครื่องหมายจุลภาค (,)"],
      ["INSPECTOR_TITLE", DEFAULT_CONFIG.INSPECTOR_TITLE, "ตำแหน่งเจ้าหน้าที่ผู้ตรวจความพร้อมห้อง/อุปกรณ์"],
      ["SUPERVISOR_TITLE", DEFAULT_CONFIG.SUPERVISOR_TITLE, "ตำแหน่งหัวหน้างาน/หัวหน้าแผนกผู้กำกับดูแล"],
      ["APPROVER_TITLE", DEFAULT_CONFIG.APPROVER_TITLE, "ตำแหน่งผู้บริหารผู้มีอำนาจอนุมัติ"]
    ];
    settingsSheet.getRange(1, 1, settingsRows.length, 3).setValues(settingsRows);
    
    // ตกแต่งชีต Settings
    const headRange = settingsSheet.getRange(1, 1, 1, 3);
    headRange.setBackground("#0f172a").setFontColor("#f8fafc").setFontWeight("bold").setHorizontalAlignment("center");
    settingsSheet.setColumnWidth(1, 220);
    settingsSheet.setColumnWidth(2, 350);
    settingsSheet.setColumnWidth(3, 400);
    settingsSheet.setFrozenRows(1);
  }

  // 2. ตั้งค่าชีต Bookings
  let bookingSheet = ss.getSheetByName(BOOKING_SHEET_NAME);
  if (!bookingSheet) {
    bookingSheet = ss.insertSheet(BOOKING_SHEET_NAME);
  }

  if (bookingSheet.getLastRow() === 0) {
    bookingSheet.appendRow(BOOKING_HEADERS);

    // ตกแต่ง Header
    const bHeaderRange = bookingSheet.getRange(1, 1, 1, BOOKING_HEADERS.length);
    bHeaderRange.setBackground("#1e3a8a")
                .setFontColor("#ffffff")
                .setFontWeight("bold")
                .setHorizontalAlignment("center")
                .setWrap(true);
    bookingSheet.setFrozenRows(1);

    // ปรับความกว้างคอลัมน์สำคัญ
    bookingSheet.setColumnWidth(1, 190); // BookingID
    bookingSheet.setColumnWidth(2, 160); // Timestamp
    bookingSheet.setColumnWidth(3, 180); // PrefixName
    bookingSheet.setColumnWidth(7, 180); // RoomName
    bookingSheet.setColumnWidth(9, 280); // Purpose
    bookingSheet.setColumnWidth(15, 240); // Equipments_JSON
    bookingSheet.setColumnWidth(17, 120); // Status
    bookingSheet.setColumnWidth(28, 250); // PDF_Drive_URL

    // ใส่ข้อมูลตัวอย่าง (Sample Data) เพื่อให้เห็นภาพการทำงาน
    const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    const sampleRow = [
      "TL-BK-DEMO-0001",
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
      "นายสมเกียรติ ปัญญาวงศ์",
      "ครูชำนาญการพิเศษ",
      "แผนกวิชาช่างยนต์",
      "081-234-5678",
      "ห้องประชุมสักทอง",
      "",
      "การประชุมเตรียมความพร้อมแข่งขันทักษะวิชาชีพ ประจำปีการศึกษา 2569",
      todayStr,
      todayStr,
      "09:00",
      "12:00",
      25,
      JSON.stringify(["เครื่องฉายภาพ (Projector)", "ระบบเสียง", "ไมโครโฟน", "เครื่องปรับอากาศ"]),
      0,
      "อนุมัติแล้ว",
      "พร้อมใช้งาน",
      "ระบบเสียงและจอภาพพร้อมใช้งาน",
      todayStr + " 10:00",
      "เห็นควรอนุมัติ",
      "เห็นชอบตามเสนอ",
      todayStr + " 11:00",
      "อนุมัติ",
      "อนุมัติให้ใช้ห้องได้ตามกำหนดการ",
      todayStr + " 13:00",
      "",
      ""
    ];
    bookingSheet.appendRow(sampleRow);
  }

  return {
    status: "success",
    message: "ตั้งค่าฐานข้อมูล Google Sheets และการตั้งค่า White-Label เรียบร้อยสมบูรณ์"
  };
}

/**
 * =========================================================================================
 * 3. การสร้างและบันทึกเอกสาร PDF คำขอลง Google Drive (A4 Format)
 * =========================================================================================
 */

/**
 * ฟังก์ชันสร้างเอกสารคำขอขนาด A4 มาตรฐานราชการ และแปลงเป็น PDF บันทึกลง Google Drive
 * @param {string} bookingId รหัสการจอง
 * @returns {object} { success: boolean, url: string, fileId: string }
 */
function generateAndSaveBookingPDF(bookingId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(BOOKING_SHEET_NAME);
  if (!sheet) throw new Error("ไม่พบชีต Bookings");

  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  let b = null;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(bookingId).trim()) {
      rowIndex = i + 1; // 1-indexed
      b = {};
      BOOKING_HEADERS.forEach((h, idx) => {
        let val = data[i][idx];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        }
        b[h] = val;
      });
      break;
    }
  }

  if (!b) throw new Error("ไม่พบข้อมูลการจองรหัส: " + bookingId);

  const config = getAppConfig();

  // แยกรายการอุปกรณ์
  let equipmentList = [];
  try {
    if (b.Equipments_JSON) {
      if (typeof b.Equipments_JSON === "string" && b.Equipments_JSON.startsWith("[")) {
        equipmentList = JSON.parse(b.Equipments_JSON);
      } else {
        equipmentList = String(b.Equipments_JSON).split(",").map(e => e.trim());
      }
    }
  } catch (err) {
    equipmentList = [String(b.Equipments_JSON)];
  }

  // สร้างรายการ Checkbox สำหรับอุปกรณ์
  const standardEquipments = [
    "เครื่องฉายภาพ (Projector)",
    "ระบบเสียง",
    "ไมโครโฟน",
    "เครื่องปรับอากาศ",
    "อินเทอร์เน็ต",
    "โต๊ะ/เก้าอี้เพิ่มเติม"
  ];

  let equipHtml = `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 13px;">`;
  standardEquipments.forEach(item => {
    const isChecked = equipmentList.some(e => e.indexOf(item) !== -1 || item.indexOf(e) !== -1);
    equipHtml += `<div>[${isChecked ? '<b style="color:#1e3a8a;">&#10003;</b>' : '&nbsp;&nbsp;'}] ${item}</div>`;
  });
  equipHtml += `</div>`;
  if (b.ExtraChairsCount && Number(b.ExtraChairsCount) > 0) {
    equipHtml += `<div style="margin-top: 5px; font-size: 13px;"><b>โต๊ะ/เก้าอี้เพิ่มเติม:</b> ${b.ExtraChairsCount} ตัว/ชุด</div>`;
  }

  // สร้าง HTML เอกสาร A4 ตามมาตรฐานแบบฟอร์มราชการ
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: A4; margin: 15mm 15mm 15mm 15mm; }
        body {
          font-family: 'Sarabun', 'TH Sarabun New', sans-serif;
          color: #0f172a;
          line-height: 1.4;
          font-size: 14px;
          margin: 0;
          padding: 10px;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 12px;
          margin-bottom: 14px;
        }
        .logo {
          max-height: 65px;
          margin-bottom: 6px;
        }
        .title {
          font-size: 19px;
          font-weight: bold;
          color: #1e3a8a;
          margin: 0;
        }
        .subtitle {
          font-size: 15px;
          font-weight: 600;
          color: #334155;
          margin-top: 3px;
        }
        .meta-info {
          font-size: 12px;
          color: #64748b;
          margin-top: 5px;
          display: flex;
          justify-content: space-between;
        }
        .section {
          margin-bottom: 12px;
        }
        .section-header {
          font-size: 14px;
          font-weight: bold;
          background: #f1f5f9;
          color: #1e3a8a;
          padding: 4px 8px;
          border-left: 4px solid #1e3a8a;
          margin-bottom: 6px;
        }
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 16px;
        }
        .signature-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        .signature-table td {
          width: 50%;
          border: 1px solid #cbd5e1;
          padding: 8px 10px;
          vertical-align: top;
          font-size: 12px;
        }
        .signature-title {
          font-weight: bold;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .sign-area {
          text-align: center;
          margin-top: 25px;
        }
        .stamp-status {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
        }
        .status-approved { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
        .status-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
      </style>
    </head>
    <body>
      <div class="header">
        ${config.collegeLogoUrl ? `<img src="${config.collegeLogoUrl}" class="logo">` : ''}
        <h1 class="title">${config.collegeName}</h1>
        <div class="subtitle">แบบฟอร์มขออนุญาตใช้ห้องประชุมและอุปกรณ์</div>
        <div style="font-size: 12px; color: #475569; margin-top: 4px;">
          รหัสคำขอ: <b style="color: #1e3a8a;">${b.BookingID}</b> &nbsp;|&nbsp; วันที่ยื่นคำขอ: ${b.Timestamp || '-'}
        </div>
      </div>

      <!-- ส่วนที่ 1: ข้อมูลผู้ขอใช้ -->
      <div class="section">
        <div class="section-header">๑. ข้อมูลผู้ขออนุญาต</div>
        <div class="grid-2">
          <div><b>ชื่อ-นามสกุล:</b> ${b.PrefixName || '-'}</div>
          <div><b>ตำแหน่ง:</b> ${b.Position || '-'}</div>
          <div><b>หน่วยงาน/สาขาวิชา:</b> ${b.Department || '-'}</div>
          <div><b>เบอร์โทรศัพท์:</b> ${b.Phone || '-'}</div>
        </div>
      </div>

      <!-- ส่วนที่ 2: รายละเอียดการขอใช้ -->
      <div class="section">
        <div class="section-header">๒. รายละเอียดการขอใช้ห้องประชุม</div>
        <div style="margin-bottom: 4px;">
          <b>หัวข้อ / วัตถุประสงค์ในการดำเนินงาน:</b> ${b.Purpose || '-'}
        </div>
        <div class="grid-2">
          <div><b>ห้องประชุมที่ขอใช้:</b> <span style="font-weight: bold; color: #1e3a8a;">${b.RoomName} ${b.RoomOther ? '(' + b.RoomOther + ')' : ''}</span></div>
          <div><b>จำนวนผู้เข้าใช้ประมาณ:</b> ${b.Attendees} คน</div>
          <div><b>วันที่ขอใช้:</b> ${b.StartDate} ถึง ${b.EndDate || b.StartDate}</div>
          <div><b>ช่วงเวลา:</b> ${b.StartTime} - ${b.EndTime} น.</div>
        </div>
      </div>

      <!-- ส่วนที่ 3: อุปกรณ์/ครุภัณฑ์ -->
      <div class="section">
        <div class="section-header">๓. รายการขอใช้อุปกรณ์ / ครุภัณฑ์</div>
        ${equipHtml}
      </div>

      <!-- ส่วนที่ 4: การลงนามและการพิจารณา 4 ฝ่าย -->
      <div class="section">
        <div class="section-header">๔. การพิจารณาและการลงนามตามลำดับขั้น</div>
        <table class="signature-table">
          <tr>
            <!-- ฝ่ายที่ 1: ผู้ขออนุญาต -->
            <td>
              <div class="signature-title">๑. ผู้ขออนุญาต</div>
              <div>ข้าพเจ้าขอรับรองว่าจะปฏิบัติตามระเบียบการใช้ห้องประชุมอย่างเคร่งครัด</div>
              <div class="sign-area">
                <div>(ลงชื่อ).......................................................</div>
                <div style="margin-top: 3px;">(${b.PrefixName || 'ผู้ขออนุญาต'})</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">วันที่: ${b.Timestamp ? String(b.Timestamp).slice(0, 10) : '....../....../......'}</div>
              </div>
            </td>

            <!-- ฝ่ายที่ 2: เจ้าหน้าที่ตรวจสอบห้อง -->
            <td>
              <div class="signature-title">๒. งานศูนย์ดิจิทัลและสื่อสารองค์กร</div>
              <div>ผลตรวจห้อง: <b>${b.InspectorStatus || 'รอตรวจสอบ'}</b></div>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">บันทึก: ${b.InspectorNote || '-'}</div>
              <div class="sign-area">
                <div>(ลงชื่อ).......................................................</div>
                <div style="margin-top: 3px;">(${config.approvers.inspector})</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">วันที่: ${b.InspectorDate || '....../....../......'}</div>
              </div>
            </td>
          </tr>
          <tr>
            <!-- ฝ่ายที่ 3: หัวหน้างาน/หัวหน้าแผนก -->
            <td>
              <div class="signature-title">๓. ความเห็นหัวหน้างาน / แผนกวิชา</div>
              <div>ความเห็น: <b>${b.SupervisorStatus || 'รอพิจารณา'}</b></div>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">บันทึก: ${b.SupervisorNote || '-'}</div>
              <div class="sign-area">
                <div>(ลงชื่อ).......................................................</div>
                <div style="margin-top: 3px;">(${config.approvers.supervisor})</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">วันที่: ${b.SupervisorDate || '....../....../......'}</div>
              </div>
            </td>

            <!-- ฝ่ายที่ 4: ผู้มีอำนาจอนุมัติ -->
            <td>
              <div class="signature-title">๔. การพิจารณาอนุมัติ</div>
              <div>คำสั่ง: <b>[ ${b.ApproverStatus === 'อนุมัติ' ? '&#10003;' : '&nbsp;'} ] อนุมัติ &nbsp;&nbsp; [ ${b.ApproverStatus === 'ไม่อนุมัติ' ? '&#10003;' : '&nbsp;'} ] ไม่อนุมัติ</b></div>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">บันทึก: ${b.ApproverNote || '-'}</div>
              <div class="sign-area">
                <div>(ลงชื่อ).......................................................</div>
                <div style="margin-top: 3px;">(${config.approvers.approver})</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">วันที่: ${b.ApproverDate || '....../....../......'}</div>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <div style="margin-top: 15px; font-size: 11px; text-align: right; color: #94a3b8;">
        เอกสารอิเล็กทรอนิกส์ออกโดยระบบจองห้องประชุมออนไลน์ (${config.collegeName})
      </div>
    </body>
    </html>
  `;

  // แปลง HTML เป็น PDF Blob
  const htmlOutput = HtmlService.createHtmlOutput(htmlContent);
  const pdfBlob = htmlOutput.getAs("application/pdf");
  const applicantCleanName = (b.PrefixName || "ผู้ขอ").replace(/[\/\\?%*:|"<>]/g, "");
  const fileName = `[คำขอจองห้องประชุม]_${b.BookingID}_${applicantCleanName}.pdf`;
  pdfBlob.setName(fileName);

  // หาหรือสร้างโฟลเดอร์ใน Google Drive
  let folder;
  if (config.driveFolderId && config.driveFolderId.trim() !== "") {
    try {
      folder = DriveApp.getFolderById(config.driveFolderId.trim());
    } catch (e) {
      Logger.log("Drive folder ID invalid, fallback to root folder: " + e.toString());
    }
  }

  if (!folder) {
    const folderName = "เอกสารคำขอใช้ห้องประชุม (ระบบออนไลน์)";
    const existingFolders = DriveApp.getFoldersByName(folderName);
    if (existingFolders.hasNext()) {
      folder = existingFolders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
  }

  // ลบไฟล์เก่าหากมีการสร้างซ้ำ
  const existingFiles = folder.getFilesByName(fileName);
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }

  // สร้างไฟล์ PDF ในโฟลเดอร์
  const file = folder.createFile(pdfBlob);
  // ตั้งค่าสิทธิ์ให้เข้าถึงได้ผ่านลิงก์
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const pdfUrl = file.getUrl();

  // บันทึกลิงก์ลงในชีต คอลัมน์ที่ 28 (PDF_Drive_URL)
  sheet.getRange(rowIndex, 28).setValue(pdfUrl);

  return {
    success: true,
    url: pdfUrl,
    fileId: file.getId(),
    fileName: fileName
  };
}

/**
 * =========================================================================================
 * 4. การจัดการ Google Calendar & การแจ้งเตือน (Telegram / Line / Email)
 * =========================================================================================
 */

/**
 * เพิ่มกิจกรรมลง Google Calendar เมื่อได้รับการอนุมัติ
 */
function syncToGoogleCalendar(booking) {
  try {
    const config = getAppConfig();
    let calendar;
    if (config.calendarId && config.calendarId !== "primary") {
      calendar = CalendarApp.getCalendarById(config.calendarId);
    }
    if (!calendar) {
      calendar = CalendarApp.getDefaultCalendar();
    }
    if (!calendar) return null;

    const startDateTime = new Date(`${booking.StartDate}T${booking.StartTime || '08:30'}:00`);
    const endDateTime = new Date(`${booking.EndDate || booking.StartDate}T${booking.EndTime || '16:30'}:00`);

    const title = `[ใช้ห้อง: ${booking.RoomName}] ${booking.Purpose}`;
    const description = 
      `ผู้ขอใช้: ${booking.PrefixName} (${booking.Department})\n` +
      `เบอร์โทร: ${booking.Phone}\n` +
      `จำนวนผู้เข้าใช้: ${booking.Attendees} คน\n` +
      `รหัสคำขอ: ${booking.BookingID}\n` +
      `ดูเอกสาร PDF คำขอ: ${booking.PDF_Drive_URL || '-'}`;

    const event = calendar.createEvent(title, startDateTime, endDateTime, {
      location: booking.RoomName,
      description: description
    });

    return event.getId();
  } catch (err) {
    Logger.log("Calendar sync error: " + err.toString());
    return null;
  }
}

/**
 * ส่งแจ้งเตือนผ่าน Telegram Bot
 */
function sendTelegramNotification(message) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settingsSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!settingsSheet) return;

  const config = getAppConfig();
  const token = config.hasTelegram ? getRawSetting("TELEGRAM_BOT_TOKEN") : "";
  const chatId = config.hasTelegram ? getRawSetting("TELEGRAM_CHAT_ID") : "";

  if (!token || !chatId) return;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
      disable_web_page_preview: false
    };
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("Telegram notification error: " + err.toString());
  }
}

/**
 * ส่งแจ้งเตือนผ่าน LINE Notify
 */
function sendLineNotification(message) {
  const token = getRawSetting("LINE_NOTIFY_TOKEN");
  if (!token) return;

  try {
    const url = "https://notify-api.line.me/api/notify";
    UrlFetchApp.fetch(url, {
      method: "post",
      headers: { "Authorization": "Bearer " + token },
      payload: { "message": message },
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log("LINE Notify error: " + err.toString());
  }
}

function getRawSetting(keyName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet) return "";
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === keyName) {
      return String(data[i][1]).trim();
    }
  }
  return "";
}

/**
 * ตรวจสอบการจองทับซ้อนในห้องเดียวกัน
 */
function checkBookingConflictInSheet(sheet, roomName, startDate, endDate, startTime, endTime, excludeBookingId) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const newStart = new Date(`${startDate}T${startTime}:00`).getTime();
  const newEnd = new Date(`${endDate || startDate}T${endTime}:00`).getTime();

  let conflicts = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const bId = String(row[0]).trim();
    const bRoom = String(row[6]).trim();
    const bStatus = String(row[16]).trim();

    if (excludeBookingId && bId === excludeBookingId) continue;
    if (bRoom !== roomName) continue;
    if (bStatus === "ไม่อนุมัติ" || bStatus === "ยกเลิก") continue;

    const existStart = new Date(`${row[9]}T${row[11]}:00`).getTime();
    const existEnd = new Date(`${row[10] || row[9]}T${row[12]}:00`).getTime();

    if (newStart < existEnd && newEnd > existStart) {
      conflicts.push({
        BookingID: bId,
        Purpose: row[8],
        Applicant: row[2],
        StartDate: row[9],
        StartTime: row[11],
        EndTime: row[12]
      });
    }
  }

  return conflicts;
}

/**
 * =========================================================================================
 * 5. API Endpoints (รองรับทั้ง google.script.run และ REST API doGet/doPost)
 * =========================================================================================
 */

/**
 * ดึงรายการจองทั้งหมด สำหรับแสดงในปฏิทินและ Dashboard
 */
function getInitialData() {
  setupDatabase(); // ตรวจสอบและสร้างฐานข้อมูลหากยังไม่มี
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(BOOKING_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return { status: "success", bookings: [], config: getAppConfig() };
  }

  const rows = data.slice(1);
  const bookings = rows.map(row => {
    let obj = {};
    BOOKING_HEADERS.forEach((h, idx) => {
      let val = row[idx];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
      }
      obj[h] = val;
    });
    return obj;
  });

  return {
    status: "success",
    bookings: bookings,
    config: getAppConfig()
  };
}

/**
 * ส่งคำขอจองห้องประชุมใหม่ (Submit Booking)
 */
function submitBooking(formData) {
  setupDatabase();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(BOOKING_SHEET_NAME);

  const roomName = formData.RoomName;
  const startDate = formData.StartDate;
  const endDate = formData.EndDate || formData.StartDate;
  const startTime = formData.StartTime;
  const endTime = formData.EndTime;

  // 1. ตรวจสอบการจองซ้ำซ้อน
  const conflicts = checkBookingConflictInSheet(sheet, roomName, startDate, endDate, startTime, endTime, null);
  if (conflicts.length > 0 && !formData.allowConflict) {
    return {
      status: "conflict",
      message: "พบการจองทับซ้อนในห้องดังกล่าว",
      conflicts: conflicts
    };
  }

  // 2. สร้างรหัสการจอง
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingId = formData.BookingID || `TL-BK-${dateStr}-${randomSuffix}`;
  const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  const newRow = [
    bookingId,
    timestamp,
    formData.PrefixName || formData.FullName || "",
    formData.Position || "",
    formData.Department || "",
    formData.Phone || "",
    roomName,
    formData.RoomOther || "",
    formData.Purpose || formData.Topic || "",
    startDate,
    endDate,
    startTime,
    endTime,
    Number(formData.Attendees) || 1,
    typeof formData.Equipments_JSON === "string" ? formData.Equipments_JSON : JSON.stringify(formData.Equipments_JSON || []),
    Number(formData.ExtraChairsCount) || 0,
    "รอตรวจสอบ", // Status
    "รอตรวจสอบ", // InspectorStatus
    "",           // InspectorNote
    "",           // InspectorDate
    "รอพิจารณา",  // SupervisorStatus
    "",           // SupervisorNote
    "",           // SupervisorDate
    "รอพิจารณา",  // ApproverStatus
    "",           // ApproverNote
    "",           // ApproverDate
    "",           // CalendarEventID
    ""            // PDF_Drive_URL (จะถูกอัปเดตเมื่อสร้าง PDF สำเร็จ)
  ];

  sheet.appendRow(newRow);

  // 3. สร้างเอกสาร PDF ขนาด A4 และบันทึกลง Google Drive ทันที
  let pdfResult = { url: "" };
  try {
    pdfResult = generateAndSaveBookingPDF(bookingId);
  } catch (err) {
    Logger.log("PDF Auto-generation error: " + err.toString());
  }

  // 4. ส่งแจ้งเตือน
  const config = getAppConfig();
  const alertMsg = 
    `<b>📌 มีคำขอจองห้องประชุมใหม่</b>\n` +
    `<b>สถาบัน:</b> ${config.collegeName}\n` +
    `<b>รหัสคำขอ:</b> <code>${bookingId}</code>\n` +
    `<b>ผู้ขอใช้:</b> ${formData.PrefixName || formData.FullName} (${formData.Department})\n` +
    `<b>ห้องประชุม:</b> ${roomName}\n` +
    `<b>เรื่อง:</b> ${formData.Purpose || formData.Topic}\n` +
    `<b>วันที่:</b> ${startDate} ถึง ${endDate}\n` +
    `<b>เวลา:</b> ${startTime} - ${endTime} น.\n` +
    (pdfResult.url ? `<b>📄 เอกสาร PDF คำขอ:</b> <a href="${pdfResult.url}">คลิกเปิดเอกสาร</a>\n` : '') +
    `<b>สถานะ:</b> รอเจ้าหน้าที่งานศูนย์ดิจิทัลฯ ตรวจสอบ`;

  sendTelegramNotification(alertMsg);
  sendLineNotification(`\n📌 มีคำขอจองห้องประชุมใหม่ (${bookingId})\nผู้ขอ: ${formData.PrefixName || formData.FullName}\nห้อง: ${roomName}\nเรื่อง: ${formData.Purpose || formData.Topic}`);

  return {
    status: "success",
    message: "บันทึกคำขอจองห้องประชุมสำเร็จ",
    bookingId: bookingId,
    pdfUrl: pdfResult.url
  };
}

/**
 * อัปเดตสถานะการอนุมัติ 4 ลำดับขั้น (Inspector, Supervisor, Approver)
 */
function updateApprovalStatus(bookingId, role, status, note, approverName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(BOOKING_SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  let rowIndex = -1;
  let bookingRow = null;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(bookingId).trim()) {
      rowIndex = i + 1;
      bookingRow = data[i];
      break;
    }
  }

  if (rowIndex === -1) {
    return { status: "error", message: "ไม่พบรหัสการจอง: " + bookingId };
  }

  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  let overallStatus = bookingRow[16];
  let calendarEventId = bookingRow[26];

  if (role === "inspector") {
    // 1. เจ้าหน้าที่ตรวจสอบห้อง
    sheet.getRange(rowIndex, 18).setValue(status); // InspectorStatus
    sheet.getRange(rowIndex, 19).setValue(note || ""); // InspectorNote
    sheet.getRange(rowIndex, 20).setValue(now); // InspectorDate
    overallStatus = status === "พร้อมใช้งาน" ? "รออนุมัติ" : "ไม่พร้อมใช้งาน";
    sheet.getRange(rowIndex, 17).setValue(overallStatus);
  } else if (role === "supervisor") {
    // 2. หัวหน้างาน / แผนก
    sheet.getRange(rowIndex, 21).setValue(status); // SupervisorStatus
    sheet.getRange(rowIndex, 22).setValue(note || ""); // SupervisorNote
    sheet.getRange(rowIndex, 23).setValue(now); // SupervisorDate
  } else if (role === "approver") {
    // 3. ผู้มีอำนาจอนุมัติ (รอง ผอ. / ผอ.)
    sheet.getRange(rowIndex, 24).setValue(status); // ApproverStatus
    sheet.getRange(rowIndex, 25).setValue(note || ""); // ApproverNote
    sheet.getRange(rowIndex, 26).setValue(now); // ApproverDate
    overallStatus = status === "อนุมัติ" ? "อนุมัติแล้ว" : "ไม่อนุมัติ";
    sheet.getRange(rowIndex, 17).setValue(overallStatus);

    // ถ้าอนุมัติ ให้ลงคิว Google Calendar อัตโนมัติ
    if (status === "อนุมัติ") {
      const bObj = {
        BookingID: bookingRow[0],
        PrefixName: bookingRow[2],
        Department: bookingRow[4],
        Phone: bookingRow[5],
        RoomName: bookingRow[6],
        Purpose: bookingRow[8],
        StartDate: bookingRow[9],
        EndDate: bookingRow[10],
        StartTime: bookingRow[11],
        EndTime: bookingRow[12],
        Attendees: bookingRow[13],
        PDF_Drive_URL: bookingRow[27]
      };
      calendarEventId = syncToGoogleCalendar(bObj);
      if (calendarEventId) {
        sheet.getRange(rowIndex, 27).setValue(calendarEventId);
      }
    }
  }

  // อัปเดตไฟล์ PDF เพื่อให้แสดงบันทึกลายเซ็นล่าสุด
  let updatedPdfUrl = "";
  try {
    const res = generateAndSaveBookingPDF(bookingId);
    updatedPdfUrl = res.url;
  } catch (e) {
    Logger.log("Update PDF after approval error: " + e.toString());
  }

  // ส่งแจ้งเตือน
  const alertMsg = 
    `<b>📋 อัปเดตสถานะการอนุมัติคำขอ</b>\n` +
    `<b>รหัสคำขอ:</b> <code>${bookingId}</code>\n` +
    `<b>ขั้นตอน:</b> ${role.toUpperCase()}\n` +
    `<b>ผลการพิจารณา:</b> ${status}\n` +
    `<b>สถานะภาพรวม:</b> ${overallStatus}\n` +
    (note ? `<b>หมายเหตุ:</b> ${note}\n` : '') +
    (updatedPdfUrl ? `<b>📄 เอกสาร PDF:</b> <a href="${updatedPdfUrl}">เปิดดูเอกสาร</a>` : '');

  sendTelegramNotification(alertMsg);
  sendLineNotification(`\n📋 อัปเดตผลการพิจารณา (${bookingId})\nสถานะ: ${status} (${overallStatus})`);

  return {
    status: "success",
    message: "อัปเดตสถานะการอนุมัติเรียบร้อยแล้ว",
    overallStatus: overallStatus,
    calendarEventId: calendarEventId,
    pdfUrl: updatedPdfUrl
  };
}

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  // หากเข้าผ่านเบราว์เซอร์ตรงๆ ให้บริการหน้า Web Application
  if (!e || !e.parameter || !e.parameter.action) {
    try {
      return HtmlService.createTemplateFromFile("index")
        .evaluate()
        .setTitle(DEFAULT_CONFIG.COLLEGE_NAME + " - ระบบจองห้องประชุมออนไลน์")
        .addMetaTag("viewport", "width=device-width, initial-scale=1")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      // หากไม่มีไฟล์ index.html ใน GAS ให้ส่ง JSON Initial Data
      return createJsonResponse(getInitialData());
    }
  }

  const action = e.parameter.action;
  if (action === "getInitialData" || action === "getAllBookings") {
    return createJsonResponse(getInitialData());
  } else if (action === "getAppConfig") {
    return createJsonResponse({ status: "success", config: getAppConfig() });
  } else if (action === "setupDatabase") {
    return createJsonResponse(setupDatabase());
  } else if (action === "getBooking") {
    const id = e.parameter.id;
    const all = getInitialData().bookings;
    const found = all.find(b => b.BookingID === id);
    return createJsonResponse({ status: "success", booking: found || null });
  }

  return createJsonResponse({ status: "error", message: "Unknown action" });
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    let body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      body = e.parameter;
    }

    const action = body.action || "submitBooking";

    if (action === "submitBooking" || action === "createBooking") {
      return createJsonResponse(submitBooking(body));
    } else if (action === "updateApproval" || action === "updateReview") {
      const role = body.role || (body.ITCheckStatus ? "inspector" : "approver");
      const status = body.status || body.ApprovalStatus || body.ITCheckStatus;
      const note = body.note || body.ApprovalRemarks || body.ITCheckEquipment;
      const approverName = body.approverName || body.ApprovalBy || body.ITCheckBy;
      return createJsonResponse(updateApprovalStatus(body.BookingID, role, status, note, approverName));
    } else if (action === "generatePdf") {
      return createJsonResponse(generateAndSaveBookingPDF(body.BookingID));
    } else if (action === "setupDatabase") {
      return createJsonResponse(setupDatabase());
    } else {
      return createJsonResponse({ status: "error", message: "Unknown action: " + action });
    }
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * ส่งคืนผลลัพธ์เป็น JSON พร้อมตั้งค่า CORS Header
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
