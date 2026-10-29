/**
 * =========================================================================================
 * ระบบจองห้องประชุมออนไลน์ - วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์
 * Google Apps Script API Backend
 * Google Sheet ID: 1INM8RbdBHvvFXlepkvF1A_d5k0f4y4y01SH_HmrzIT4
 * =========================================================================================
 */

// ชื่อแผ่นงานหลักสำหรับเก็บข้อมูล
const SHEET_NAME = "Bookings";

// หัวตาราง (Headers) ทั้งหมด 23 คอลัมน์ ครบถ้วนตามแบบฟอร์มทางการ
const HEADERS = [
  "BookingID",         // A: รหัสการจอง (เช่น TL-BK-20261029-1001)
  "Timestamp",         // B: วันเวลาที่ส่งคำขอ
  "FullName",          // C: ชื่อ-นามสกุล ผู้ขอใช้
  "Position",          // D: ตำแหน่ง
  "Department",        // E: หน่วยงาน/สาขาวิชา
  "Phone",             // F: เบอร์โทรศัพท์
  "Topic",             // G: หัวข้อ/เรื่องในการดำเนินงาน
  "Attendees",         // H: จำนวนผู้เข้าใช้ (คน)
  "RoomName",          // I: ห้องประชุมที่เลือก
  "RoomOther",         // J: ห้องอื่นๆ (ถ้ามี)
  "StartDate",         // K: วันที่เริ่มต้น (YYYY-MM-DD)
  "EndDate",           // L: วันที่สิ้นสุด (YYYY-MM-DD)
  "StartTime",         // M: ตั้งแต่เวลา (HH:mm)
  "EndTime",           // N: ถึงเวลา (HH:mm)
  "Equipment",         // O: อุปกรณ์ที่ขอใช้ (คั่นด้วยจุลภาค)
  "EquipmentOther",    // P: อุปกรณ์อื่นๆ (ระบุ)
  "OverallStatus",     // Q: สถานะภาพรวม (รอตรวจสอบ, รออนุมัติ, อนุมัติแล้ว, ไม่อนุมัติ, ยกเลิก)
  "ITCheckStatus",     // R: สถานะตรวจสอบห้อง (พร้อมใช้งาน / ไม่พร้อมใช้งาน / รอตรวจสอบ)
  "ITCheckEquipment",  // S: บันทึกอุปกรณ์พร้อมใช้
  "ITCheckBy",         // T: เจ้าหน้าที่ศูนย์ดิจิทัลผู้ตรวจสอบ
  "ITCheckDate",       // U: วันที่ตรวจสอบ
  "ApprovalStatus",    // V: ผลการพิจารณา (อนุมัติ / ไม่อนุมัติ / รอพิจารณา)
  "ApprovalBy",        // W: ผู้อนุมัติ (รอง ผอ. ฝ่ายพัฒนายุทธศาสตร์และแผนงาน)
  "ApprovalDate",      // X: วันที่อนุมัติ
  "ApprovalRemarks"    // Y: ข้อคิดเห็น/บันทึกของผู้อนุมัติ
];

/**
 * ฟังก์ชันเริ่มต้นสร้างชีตและใส่ Header อัตโนมัติ
 */
function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    // จัดรูปแบบ Header
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground("#1e3a8a"); // สีกรมท่าวิทยาลัย
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Handle GET Requests (ดึงรายการจองทั้งหมด หรือ ค้นหาด้วย BookingID)
 */
function doGet(e) {
  try {
    const sheet = initSheet();
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({ status: "success", data: [] });
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const bookings = rows.map((row) => {
      let obj = {};
      headers.forEach((header, idx) => {
        let val = row[idx];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        }
        obj[header] = val;
      });
      return obj;
    });

    // หากมีการระบุ filter ด้วย ID
    if (e && e.parameter && e.parameter.id) {
      const filtered = bookings.find(b => b.BookingID === e.parameter.id);
      return createJsonResponse({ status: "success", data: filtered || null });
    }

    return createJsonResponse({ status: "success", data: bookings });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Handle POST Requests (สร้างการจองใหม่, ตรวจสอบห้อง, หรืออนุมัติการจอง)
 */
function doPost(e) {
  try {
    const sheet = initSheet();
    let body = {};
    
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      body = e.parameter;
    }

    const action = body.action || "createBooking";

    if (action === "createBooking") {
      return handleCreateBooking(sheet, body);
    } else if (action === "updateReview") {
      return handleUpdateReview(sheet, body);
    } else if (action === "updateApproval") {
      return handleUpdateApproval(sheet, body);
    } else if (action === "init") {
      return createJsonResponse({ status: "success", message: "Sheet initialized" });
    } else {
      return createJsonResponse({ status: "error", message: "Unknown action: " + action });
    }
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * 1. บันทึกคำขอจองห้องใหม่
 */
function handleCreateBooking(sheet, body) {
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const bookingId = body.BookingID || `TL-BK-${dateStr}-${randomSuffix}`;
  const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

  const newRow = [
    bookingId,
    timestamp,
    body.FullName || "",
    body.Position || "",
    body.Department || "",
    body.Phone || "",
    body.Topic || "",
    body.Attendees || 0,
    body.RoomName || "",
    body.RoomOther || "",
    body.StartDate || "",
    body.EndDate || "",
    body.StartTime || "",
    body.EndTime || "",
    body.Equipment || "",
    body.EquipmentOther || "",
    "รอตรวจสอบ",           // สถานะเริ่มต้น
    "รอตรวจสอบ",           // ITCheckStatus
    "",                   // ITCheckEquipment
    "",                   // ITCheckBy
    "",                   // ITCheckDate
    "รอพิจารณา",          // ApprovalStatus
    "",                   // ApprovalBy
    "",                   // ApprovalDate
    ""                    // ApprovalRemarks
  ];

  sheet.appendRow(newRow);

  // ส่งแจ้งเตือน Line Notify (ถ้ามีการตั้งค่า Line Token)
  if (body.lineToken) {
    sendLineNotify(body.lineToken, 
      `\n📌 มีคำขอจองห้องประชุมใหม่\n` +
      `รหัส: ${bookingId}\n` +
      `ผู้ขอ: ${body.FullName} (${body.Department})\n` +
      `ห้อง: ${body.RoomName}\n` +
      `เรื่อง: ${body.Topic}\n` +
      `วันที่: ${body.StartDate} ถึง ${body.EndDate}\n` +
      `เวลา: ${body.StartTime} - ${body.EndTime} น.\n` +
      `สถานะ: รอเจ้าหน้าที่งานศูนย์ดิจิทัลตรวจสอบ`
    );
  }

  return createJsonResponse({
    status: "success",
    message: "บันทึกข้อมูลการจองสำเร็จ",
    bookingId: bookingId
  });
}

/**
 * 2. ขั้นตอนเจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กรตรวจสอบ
 */
function handleUpdateReview(sheet, body) {
  const bookingId = body.BookingID;
  if (!bookingId) {
    return createJsonResponse({ status: "error", message: "Missing BookingID" });
  }

  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bookingId) {
      rowIndex = i + 1; // 1-indexed for Sheet
      break;
    }
  }

  if (rowIndex === -1) {
    return createJsonResponse({ status: "error", message: "ไม่พบรหัสการจอง: " + bookingId });
  }

  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  const itStatus = body.ITCheckStatus || "พร้อมใช้งาน"; // พร้อมใช้งาน / ไม่พร้อมใช้งาน
  const overallStatus = itStatus === "พร้อมใช้งาน" ? "รออนุมัติ" : "ไม่พร้อมใช้งาน";

  // Q: OverallStatus (col 17)
  // R: ITCheckStatus (col 18)
  // S: ITCheckEquipment (col 19)
  // T: ITCheckBy (col 20)
  // U: ITCheckDate (col 21)
  sheet.getRange(rowIndex, 17).setValue(overallStatus);
  sheet.getRange(rowIndex, 18).setValue(itStatus);
  sheet.getRange(rowIndex, 19).setValue(body.ITCheckEquipment || "");
  sheet.getRange(rowIndex, 20).setValue(body.ITCheckBy || "เจ้าหน้าที่งานศูนย์ดิจิทัลฯ");
  sheet.getRange(rowIndex, 21).setValue(now);

  if (body.lineToken) {
    sendLineNotify(body.lineToken, 
      `\n🛠️ ผลการตรวจสอบความพร้อมห้องประชุม\n` +
      `รหัส: ${bookingId}\n` +
      `สถานะห้อง: ${itStatus}\n` +
      `ตรวจสอบโดย: ${body.ITCheckBy}\n` +
      `สถานะภาพรวม: ${overallStatus}`
    );
  }

  return createJsonResponse({
    status: "success",
    message: "บันทึกผลการตรวจสอบของงานศูนย์ดิจิทัลฯ สำเร็จ",
    overallStatus: overallStatus
  });
}

/**
 * 3. ขั้นตอนพิจารณาอนุมัติ โดย รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน
 */
function handleUpdateApproval(sheet, body) {
  const bookingId = body.BookingID;
  if (!bookingId) {
    return createJsonResponse({ status: "error", message: "Missing BookingID" });
  }

  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bookingId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return createJsonResponse({ status: "error", message: "ไม่พบรหัสการจอง: " + bookingId });
  }

  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  const decision = body.ApprovalStatus || "อนุมัติ"; // อนุมัติ / ไม่อนุมัติ
  const overallStatus = decision === "อนุมัติ" ? "อนุมัติแล้ว" : "ไม่อนุมัติ";

  // Q: OverallStatus (col 17)
  // V: ApprovalStatus (col 22)
  // W: ApprovalBy (col 23)
  // X: ApprovalDate (col 24)
  // Y: ApprovalRemarks (col 25)
  sheet.getRange(rowIndex, 17).setValue(overallStatus);
  sheet.getRange(rowIndex, 22).setValue(decision);
  sheet.getRange(rowIndex, 23).setValue(body.ApprovalBy || "รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน");
  sheet.getRange(rowIndex, 24).setValue(now);
  sheet.getRange(rowIndex, 25).setValue(body.ApprovalRemarks || "");

  if (body.lineToken) {
    sendLineNotify(body.lineToken, 
      `\n📋 ผลการพิจารณาอนุมัติห้องประชุม\n` +
      `รหัส: ${bookingId}\n` +
      `ผลการพิจารณา: ${decision} (${overallStatus})\n` +
      `ผู้อนุมัติ: ${body.ApprovalBy || "รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน"}\n` +
      `บันทึกข้อความ: ${body.ApprovalRemarks || "-"}`
    );
  }

  return createJsonResponse({
    status: "success",
    message: "บันทึกผลการพิจารณาอนุมัติสำเร็จ",
    overallStatus: overallStatus
  });
}

/**
 * ส่งแจ้งเตือน Line Notify
 */
function sendLineNotify(token, message) {
  if (!token) return;
  try {
    const url = "https://notify-api.line.me/api/notify";
    const options = {
      method: "post",
      headers: { "Authorization": "Bearer " + token },
      payload: { "message": message }
    };
    UrlFetchApp.fetch(url, options);
  } catch (err) {
    Logger.log("Line Notify Error: " + err.toString());
  }
}

/**
 * สร้าง JSON Response รองรับ CORS
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
