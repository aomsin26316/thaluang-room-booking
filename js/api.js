/**
 * =========================================================================================
 * API & Data Management Module (White-Label Hybrid)
 * เชื่อมต่อได้ทั้งแบบ native Google Apps Script (google.script.run)
 * และแบบ REST API Web App (doGet / doPost) สำหรับ GitHub Pages / Standalone
 * พร้อมระบบแคช LocalStorage Fallback 100%
 * =========================================================================================
 */

const STORAGE_KEY = "thaluang_meeting_bookings_v2";
const CONFIG_KEY = "thaluang_app_config_v2";

// ข้อมูลจำลองเริ่มต้น (Mock Data ที่ตรงกับ Schema 28 คอลัมน์)
const DEFAULT_MOCK_BOOKINGS_V2 = [
  {
    BookingID: "TL-BK-20261104-1001",
    Timestamp: "2026-11-03 09:30:00",
    PrefixName: "นายสมเกียรติ ปัญญาวงศ์",
    Position: "ครูชำนาญการพิเศษ",
    Department: "แผนกวิชาช่างยนต์",
    Phone: "081-234-5678",
    RoomName: "ห้องประชุมสักทอง",
    RoomOther: "",
    Purpose: "การประชุมเตรียมความพร้อมแข่งขันทักษะวิชาชีพ ประจำปีการศึกษา 2569",
    StartDate: "2026-11-06",
    EndDate: "2026-11-06",
    StartTime: "09:00",
    EndTime: "12:00",
    Attendees: 25,
    Equipments_JSON: '["เครื่องฉายภาพ (Projector)", "ไมโครโฟน", "เครื่องปรับอากาศ", "ระบบเสียง"]',
    ExtraChairsCount: 0,
    Status: "อนุมัติแล้ว",
    InspectorStatus: "พร้อมใช้งาน",
    InspectorNote: "ทดสอบจอโปรเจคเตอร์และไมโครโฟน 2 ตัวเรียบร้อย",
    InspectorDate: "2026-11-03 10:15:00",
    SupervisorStatus: "เห็นควรอนุมัติ",
    SupervisorNote: "เห็นชอบตามเสนอ เพื่อประโยชน์แก่การจัดการเรียนการสอน",
    SupervisorDate: "2026-11-03 11:30:00",
    ApproverStatus: "อนุมัติ",
    ApproverNote: "อนุมัติให้ใช้ห้องประชุมสักทองได้ตามเวลาที่ขอ",
    ApproverDate: "2026-11-03 14:00:00",
    CalendarEventID: "evt_mock_001",
    PDF_Drive_URL: "https://drive.google.com/file/d/sample_pdf_preview/view"
  },
  {
    BookingID: "TL-BK-20261104-1002",
    Timestamp: "2026-11-04 08:15:00",
    PrefixName: "นางสาวศิริพร บุญเลิศ",
    Position: "หัวหน้าแผนกวิชา",
    Department: "แผนกวิชาเทคโนโลยีสารสนเทศ",
    Phone: "089-987-6543",
    RoomName: "ห้องคอมพิวเตอร์กลาง (ห้องโสต)",
    RoomOther: "",
    Purpose: "อบรมเชิงปฏิบัติการพัฒนาทักษะ AI และ Google Apps Script สำหรับครูผู้สอน",
    StartDate: "2026-11-10",
    EndDate: "2026-11-10",
    StartTime: "08:30",
    EndTime: "16:30",
    Attendees: 40,
    Equipments_JSON: '["เครื่องฉายภาพ (Projector)", "ระบบเสียง", "ไมโครโฟน", "เครื่องปรับอากาศ", "อินเทอร์เน็ต"]',
    ExtraChairsCount: 10,
    Status: "รออนุมัติ",
    InspectorStatus: "พร้อมใช้งาน",
    InspectorNote: "เครื่องคอมพิวเตอร์และระบบเครือข่ายพร้อมให้บริการ",
    InspectorDate: "2026-11-04 08:30:00",
    SupervisorStatus: "เห็นควรอนุมัติ",
    SupervisorNote: "สนับสนุนการพัฒนาสมรรถนะครูดิจิทัล",
    SupervisorDate: "2026-11-04 09:00:00",
    ApproverStatus: "รอพิจารณา",
    ApproverNote: "",
    ApproverDate: "",
    CalendarEventID: "",
    PDF_Drive_URL: ""
  },
  {
    BookingID: "TL-BK-20261104-1003",
    Timestamp: "2026-11-04 08:45:00",
    PrefixName: "นายวิชัย รัตนโชติ",
    Position: "หัวหน้างานกิจกรรมนักเรียนนักศึกษา",
    Department: "ฝ่ายพัฒนากิจการนักเรียนนักศึกษา",
    Phone: "084-555-4321",
    RoomName: "หอประชุมอดิเรกสาร",
    RoomOther: "",
    Purpose: "ปฐมนิเทศนักศึกษาฝึกงานและเตรียมความพร้อมสู่สถานประกอบการ",
    StartDate: "2026-11-15",
    EndDate: "2026-11-15",
    StartTime: "13:00",
    EndTime: "16:30",
    Attendees: 150,
    Equipments_JSON: '["เครื่องฉายภาพ (Projector)", "ระบบเสียง", "ไมโครโฟน", "เครื่องปรับอากาศ", "โต๊ะ/เก้าอี้เพิ่มเติม"]',
    ExtraChairsCount: 150,
    Status: "รอตรวจสอบ",
    InspectorStatus: "รอตรวจสอบ",
    InspectorNote: "",
    InspectorDate: "",
    SupervisorStatus: "รอพิจารณา",
    SupervisorNote: "",
    SupervisorDate: "",
    ApproverStatus: "รอพิจารณา",
    ApproverNote: "",
    ApproverDate: "",
    CalendarEventID: "",
    PDF_Drive_URL: ""
  }
];

class SmartBookingAPI {
  constructor() {
    this.config = this.loadConfig();
    this.appConfig = {
      collegeName: "วิทยาลัยเทคนิคท่าหลวงซิเมนต์ไทยอนุสรณ์",
      collegeLogoUrl: "",
      roomList: [
        "หอประชุมอดิเรกสาร",
        "ห้องประชุมสักทอง",
        "ห้องประชุม (กาแฟ)",
        "อาคารโดมเอนกประสงค์",
        "ห้องประชุมหน้าห้องผู้อำนวยการ",
        "ห้องคอมพิวเตอร์กลาง (ห้องโสต)",
        "อื่นๆ"
      ],
      approvers: {
        inspector: "เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร",
        supervisor: "หัวหน้างานบริหารงานทั่วไป / หัวหน้าแผนกวิชา",
        approver: "รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน"
      }
    };
    this.initLocalData();
  }

  loadConfig() {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      appsScriptUrl: "",
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1INM8RbdBHvvFXlepkvF1A_d5k0f4y4y01SH_HmrzIT4/edit",
      telegramBotToken: "",
      telegramChatId: "",
      lineToken: ""
    };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
  }

  initLocalData() {
    const local = localStorage.getItem(STORAGE_KEY);
    if (!local) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_BOOKINGS_V2));
    }
  }

  getLocalBookings() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  setLocalBookings(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  /**
   * ดึงการตั้งค่า White-Label Template จาก Apps Script หรือ Local
   */
  async fetchAppConfig() {
    // 1. ถ้าทำงานใน Google Apps Script Web App
    if (window.google && google.script && google.script.run) {
      return new Promise((resolve) => {
        google.script.run
          .withSuccessHandler((cfg) => {
            if (cfg) this.appConfig = cfg;
            resolve(this.appConfig);
          })
          .withFailureHandler(() => resolve(this.appConfig))
          .getAppConfig();
      });
    }

    // 2. ถ้ามี Apps Script URL ภายนอก
    if (this.config.appsScriptUrl && this.config.appsScriptUrl.trim() !== "") {
      try {
        const res = await fetch(`${this.config.appsScriptUrl}?action=getAppConfig&t=${Date.now()}`);
        const result = await res.json();
        if (result && result.status === "success" && result.config) {
          this.appConfig = result.config;
          return this.appConfig;
        }
      } catch (err) {
        console.warn("fetchAppConfig error, fallback to default:", err);
      }
    }

    return this.appConfig;
  }

  /**
   * ดึงรายการจองทั้งหมด
   */
  async getAllBookings() {
    // 1. โหมด Google Apps Script
    if (window.google && google.script && google.script.run) {
      return new Promise((resolve) => {
        google.script.run
          .withSuccessHandler((res) => {
            if (res && res.bookings) {
              this.setLocalBookings(res.bookings);
              if (res.config) this.appConfig = res.config;
              resolve(res.bookings);
            } else {
              resolve(this.getLocalBookings());
            }
          })
          .withFailureHandler(() => resolve(this.getLocalBookings()))
          .getInitialData();
      });
    }

    // 2. โหมด REST API ผ่าน URL
    if (this.config.appsScriptUrl && this.config.appsScriptUrl.trim() !== "") {
      try {
        const res = await fetch(`${this.config.appsScriptUrl}?action=getInitialData&t=${Date.now()}`);
        const result = await res.json();
        if (result && result.status === "success" && Array.isArray(result.bookings)) {
          this.setLocalBookings(result.bookings);
          if (result.config) this.appConfig = result.config;
          return result.bookings;
        }
      } catch (err) {
        console.warn("REST API getInitialData error, using local fallback:", err);
      }
    }

    return this.getLocalBookings();
  }

  /**
   * ส่งคำขอจองห้องประชุมใหม่
   */
  async createBooking(formData) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingId = formData.BookingID || `TL-BK-${dateStr}-${randomSuffix}`;
    const timestamp = now.toLocaleString("th-TH", { hour12: false });

    const newBooking = {
      BookingID: bookingId,
      Timestamp: timestamp,
      PrefixName: formData.PrefixName || formData.FullName || "",
      Position: formData.Position || "",
      Department: formData.Department || "",
      Phone: formData.Phone || "",
      RoomName: formData.RoomName,
      RoomOther: formData.RoomOther || "",
      Purpose: formData.Purpose || formData.Topic || "",
      StartDate: formData.StartDate,
      EndDate: formData.EndDate || formData.StartDate,
      StartTime: formData.StartTime,
      EndTime: formData.EndTime,
      Attendees: Number(formData.Attendees) || 1,
      Equipments_JSON: typeof formData.Equipments_JSON === "string" ? formData.Equipments_JSON : JSON.stringify(formData.Equipments_JSON || []),
      ExtraChairsCount: Number(formData.ExtraChairsCount) || 0,
      Status: "รอตรวจสอบ",
      InspectorStatus: "รอตรวจสอบ",
      InspectorNote: "",
      InspectorDate: "",
      SupervisorStatus: "รอพิจารณา",
      SupervisorNote: "",
      SupervisorDate: "",
      ApproverStatus: "รอพิจารณา",
      ApproverNote: "",
      ApproverDate: "",
      CalendarEventID: "",
      PDF_Drive_URL: ""
    };

    // บันทึกลง LocalStorage
    const current = this.getLocalBookings();
    current.unshift(newBooking);
    this.setLocalBookings(current);

    // 1. Google Apps Script Mode
    if (window.google && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((res) => {
            if (res && res.status === "success") {
              if (res.pdfUrl) newBooking.PDF_Drive_URL = res.pdfUrl;
              this.setLocalBookings(current);
              resolve({ status: "success", data: newBooking, pdfUrl: res.pdfUrl });
            } else if (res && res.status === "conflict") {
              reject(new Error(res.message || "พบการจองซ้ำซ้อน"));
            } else {
              resolve({ status: "success", data: newBooking });
            }
          })
          .withFailureHandler((err) => reject(err))
          .submitBooking(newBooking);
      });
    }

    // 2. REST API Mode
    if (this.config.appsScriptUrl && this.config.appsScriptUrl.trim() !== "") {
      try {
        await fetch(this.config.appsScriptUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "submitBooking",
            ...newBooking
          })
        });
      } catch (err) {
        console.error("POST submitBooking error:", err);
      }
    }

    return { status: "success", data: newBooking };
  }

  /**
   * อัปเดตผลการตรวจสอบและการอนุมัติตามขั้นตอน (4-Tier Workflow)
   */
  async updateApproval(bookingId, role, status, note, approverName) {
    const list = this.getLocalBookings();
    const idx = list.findIndex(b => b.BookingID === bookingId);
    if (idx === -1) throw new Error("ไม่พบข้อมูลคำขอจอง");

    const now = new Date().toLocaleString("th-TH", { hour12: false });

    if (role === "inspector") {
      list[idx].InspectorStatus = status;
      list[idx].InspectorNote = note || "";
      list[idx].InspectorDate = now;
      list[idx].Status = status === "พร้อมใช้งาน" ? "รออนุมัติ" : "ไม่พร้อมใช้งาน";
    } else if (role === "supervisor") {
      list[idx].SupervisorStatus = status;
      list[idx].SupervisorNote = note || "";
      list[idx].SupervisorDate = now;
    } else if (role === "approver") {
      list[idx].ApproverStatus = status;
      list[idx].ApproverNote = note || "";
      list[idx].ApproverDate = now;
      list[idx].Status = status === "อนุมัติ" ? "อนุมัติแล้ว" : "ไม่อนุมัติ";
    }

    this.setLocalBookings(list);

    // 1. Google Apps Script Mode
    if (window.google && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((res) => {
            if (res && res.pdfUrl) {
              list[idx].PDF_Drive_URL = res.pdfUrl;
              this.setLocalBookings(list);
            }
            resolve(res);
          })
          .withFailureHandler((err) => reject(err))
          .updateApprovalStatus(bookingId, role, status, note, approverName);
      });
    }

    // 2. REST API Mode
    if (this.config.appsScriptUrl && this.config.appsScriptUrl.trim() !== "") {
      try {
        await fetch(this.config.appsScriptUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateApproval",
            BookingID: bookingId,
            role: role,
            status: status,
            note: note,
            approverName: approverName
          })
        });
      } catch (err) {
        console.error("POST updateApproval error:", err);
      }
    }

    return { status: "success", booking: list[idx] };
  }

  /**
   * สั่งให้ระบบสร้าง PDF อีกครั้ง (หากต้องการ Re-generate)
   */
  async generatePdf(bookingId) {
    if (window.google && google.script && google.script.run) {
      return new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((res) => resolve(res))
          .withFailureHandler((err) => reject(err))
          .generateAndSaveBookingPDF(bookingId);
      });
    }

    if (this.config.appsScriptUrl && this.config.appsScriptUrl.trim() !== "") {
      try {
        const res = await fetch(this.config.appsScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generatePdf", BookingID: bookingId })
        });
        return await res.json();
      } catch (e) {
        console.warn("generatePdf REST error:", e);
      }
    }

    return { success: false, message: "ระบบออฟไลน์ ไม่สามารถติดต่อ Google Drive ได้" };
  }
}

// Global API instance
window.api = new SmartBookingAPI();
