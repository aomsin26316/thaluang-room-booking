/**
 * API & Data Management Module
 * เชื่อมต่อ Google Apps Script Web App และ LocalStorage Fallback
 */

const STORAGE_KEY = "thaluang_meeting_bookings";
const CONFIG_KEY = "thaluang_app_config";

// ข้อมูลเริ่มต้นจำลอง (Initial Mock Data) เพื่อให้ระบบพร้อมใช้งานและเห็นภาพทันที
const DEFAULT_MOCK_BOOKINGS = [
  {
    BookingID: "TL-BK-20261029-1001",
    Timestamp: "2026-10-28 09:30:00",
    FullName: "นายสมเกียรติ ปัญญาวงศ์",
    Position: "ครูชำนาญการพิเศษ",
    Department: "แผนกวิชาช่างยนต์",
    Phone: "081-234-5678",
    Topic: "การประชุมเตรียมความพร้อมแข่งขันทักษะวิชาชีพ ประจำปีการศึกษา 2569",
    Attendees: 25,
    RoomName: "ห้องประชุมสักทอง",
    RoomOther: "",
    StartDate: "2026-10-30",
    EndDate: "2026-10-30",
    StartTime: "09:00",
    EndTime: "12:00",
    Equipment: "เครื่องฉายภาพ (Projector), ไมโครโฟน, เครื่องปรับอากาศ, ระบบเสียง",
    EquipmentOther: "สายเชื่อมต่อ HDMI แปลง Type-C",
    OverallStatus: "อนุมัติแล้ว",
    ITCheckStatus: "พร้อมใช้งาน",
    ITCheckEquipment: "ทดสอบจอโปรเจคเตอร์และไมโครโฟน 2 ตัวเรียบร้อย",
    ITCheckBy: "นายธนวัฒน์ ศูนย์ดิจิทัลฯ",
    ITCheckDate: "2026-10-28 11:15:00",
    ApprovalStatus: "อนุมัติ",
    ApprovalBy: "นายประเสริฐ สุขสวัสดิ์ (รอง ผอ. ฝ่ายพัฒนายุทธศาสตร์และแผนงาน)",
    ApprovalDate: "2026-10-28 14:00:00",
    ApprovalRemarks: "อนุมัติให้ใช้ห้องประชุมสักทองได้ตามเวลาที่ขอ"
  },
  {
    BookingID: "TL-BK-20261029-1002",
    Timestamp: "2026-10-29 08:15:00",
    FullName: "นางสาวศิริพร บุญเลิศ",
    Position: "หัวหน้าแผนกวิชา",
    Department: "แผนกวิชาเทคโนโลยีสารสนเทศ",
    Phone: "089-987-6543",
    Topic: "อบรมเชิงปฏิบัติการพัฒนาทักษะ AI และ Data Analytics สำหรับครูผู้สอน",
    Attendees: 40,
    RoomName: "ห้องคอมพิวเตอร์กลาง (ห้องโสต)",
    RoomOther: "",
    StartDate: "2026-11-02",
    EndDate: "2026-11-02",
    StartTime: "08:30",
    EndTime: "16:30",
    Equipment: "เครื่องฉายภาพ (Projector), ระบบเสียง, ไมโครโฟน, เครื่องปรับอากาศ, อินเทอร์เน็ต",
    EquipmentOther: "ขอเพิ่มปลั๊กพ่วง 5 จุด",
    OverallStatus: "รออนุมัติ",
    ITCheckStatus: "พร้อมใช้งาน",
    ITCheckEquipment: "เครื่องคอมพิวเตอร์และระบบเครือข่ายพร้อมให้บริการ",
    ITCheckBy: "นายธนวัฒน์ ศูนย์ดิจิทัลฯ",
    ITCheckDate: "2026-10-29 08:30:00",
    ApprovalStatus: "รอพิจารณา",
    ApprovalBy: "",
    ApprovalDate: "",
    ApprovalRemarks: ""
  },
  {
    BookingID: "TL-BK-20261029-1003",
    Timestamp: "2026-10-29 08:45:00",
    FullName: "นายวิชัย รัตนโชติ",
    Position: "หัวหน้างานกิจกรรมนักเรียนนักศึกษา",
    Department: "ฝ่ายพัฒนากิจการนักเรียนนักศึกษา",
    Phone: "084-555-4321",
    Topic: "ปฐมนิเทศนักศึกษาฝึกงานและเตรียมความพร้อมสู่สถานประกอบการ",
    Attendees: 150,
    RoomName: "หอประชุมอดิเรกสาร",
    RoomOther: "",
    StartDate: "2026-11-05",
    EndDate: "2026-11-05",
    StartTime: "13:00",
    EndTime: "16:30",
    Equipment: "เครื่องฉายภาพ (Projector), ระบบเสียง, ไมโครโฟน, เครื่องปรับอากาศ, โต๊ะ/เก้าอี้เพิ่มเติม",
    EquipmentOther: "ขอจัดเก้าอี้แถวตอน 150 ตัว",
    OverallStatus: "รอตรวจสอบ",
    ITCheckStatus: "รอตรวจสอบ",
    ITCheckEquipment: "",
    ITCheckBy: "",
    ITCheckDate: "",
    ApprovalStatus: "รอพิจารณา",
    ApprovalBy: "",
    ApprovalDate: "",
    ApprovalRemarks: ""
  }
];

class ThaluangAPI {
  constructor() {
    this.config = this.loadConfig();
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
      lineToken: "",
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1INM8RbdBHvvFXlepkvF1A_d5k0f4y4y01SH_HmrzIT4/edit?gid=0#gid=0",
      autoSync: true
    };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
  }

  initLocalData() {
    const local = localStorage.getItem(STORAGE_KEY);
    if (!local) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_BOOKINGS));
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
   * ดึงรายการจองทั้งหมด
   */
  async getAllBookings() {
    // หากมี Apps Script URL ที่ตั้งค่าไว้ ให้ดึงจาก Google Sheets
    if (this.config.appsScriptUrl && this.config.appsScriptUrl.trim() !== "") {
      try {
        const res = await fetch(this.config.appsScriptUrl + "?t=" + Date.now(), {
          method: "GET",
          headers: { "Accept": "application/json" }
        });
        const result = await res.json();
        if (result && result.status === "success" && Array.isArray(result.data)) {
          // Sync กลับเข้า LocalStorage แคช
          this.setLocalBookings(result.data);
          return result.data;
        }
      } catch (err) {
        console.warn("ไม่สามารถดึงข้อมูลจาก Google Apps Script ได้ กำลังใช้ข้อมูลในเครื่อง:", err);
      }
    }
    return this.getLocalBookings();
  }

  /**
   * บันทึกคำขอจองห้องใหม่
   */
  async createBooking(bookingData) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newId = `TL-BK-${dateStr}-${randomSuffix}`;
    const timestamp = new Date().toLocaleString("th-TH", { hour12: false });

    const newBooking = {
      BookingID: newId,
      Timestamp: timestamp,
      FullName: bookingData.FullName,
      Position: bookingData.Position,
      Department: bookingData.Department,
      Phone: bookingData.Phone,
      Topic: bookingData.Topic,
      Attendees: Number(bookingData.Attendees) || 1,
      RoomName: bookingData.RoomName,
      RoomOther: bookingData.RoomOther || "",
      StartDate: bookingData.StartDate,
      EndDate: bookingData.EndDate || bookingData.StartDate,
      StartTime: bookingData.StartTime,
      EndTime: bookingData.EndTime,
      Equipment: bookingData.Equipment || "",
      EquipmentOther: bookingData.EquipmentOther || "",
      OverallStatus: "รอตรวจสอบ",
      ITCheckStatus: "รอตรวจสอบ",
      ITCheckEquipment: "",
      ITCheckBy: "",
      ITCheckDate: "",
      ApprovalStatus: "รอพิจารณา",
      ApprovalBy: "",
      ApprovalDate: "",
      ApprovalRemarks: ""
    };

    // บันทึกลง LocalStorage ทันที
    const current = this.getLocalBookings();
    current.unshift(newBooking);
    this.setLocalBookings(current);

    // ส่งเข้า Google Apps Script ถ้ามี URL
    if (this.config.appsScriptUrl && this.config.appsScriptUrl.trim() !== "") {
      try {
        await fetch(this.config.appsScriptUrl, {
          method: "POST",
          mode: "no-cors", // Google Apps Script Web App works reliably with no-cors or form-urlencoded
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "createBooking",
            lineToken: this.config.lineToken,
            ...newBooking
          })
        });
      } catch (err) {
        console.error("Error pushing to Google Sheets:", err);
      }
    }

    return { status: "success", data: newBooking };
  }

  /**
   * บันทึกการตรวจสอบของงานศูนย์ดิจิทัลและสื่อสารองค์กร
   */
  async updateITReview(bookingId, itStatus, equipmentNotes, reviewerName) {
    const list = this.getLocalBookings();
    const idx = list.findIndex(b => b.BookingID === bookingId);
    if (idx === -1) throw new Error("ไม่พบข้อมูลการจอง");

    const now = new Date().toLocaleString("th-TH", { hour12: false });
    const overallStatus = itStatus === "พร้อมใช้งาน" ? "รออนุมัติ" : "ไม่พร้อมใช้งาน";

    list[idx].ITCheckStatus = itStatus;
    list[idx].ITCheckEquipment = equipmentNotes || "";
    list[idx].ITCheckBy = reviewerName || "เจ้าหน้าที่งานศูนย์ดิจิทัลและสื่อสารองค์กร";
    list[idx].ITCheckDate = now;
    list[idx].OverallStatus = overallStatus;

    this.setLocalBookings(list);

    // Sync to Google Apps Script
    if (this.config.appsScriptUrl && this.config.appsScriptUrl.trim() !== "") {
      try {
        await fetch(this.config.appsScriptUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateReview",
            BookingID: bookingId,
            ITCheckStatus: itStatus,
            ITCheckEquipment: equipmentNotes,
            ITCheckBy: reviewerName,
            lineToken: this.config.lineToken
          })
        });
      } catch (err) {
        console.error("Error updating review to Google Sheets:", err);
      }
    }

    return { status: "success", booking: list[idx] };
  }

  /**
   * บันทึกการพิจารณาอนุมัติ โดย รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน
   */
  async updateApproval(bookingId, decision, approverName, remarks) {
    const list = this.getLocalBookings();
    const idx = list.findIndex(b => b.BookingID === bookingId);
    if (idx === -1) throw new Error("ไม่พบข้อมูลการจอง");

    const now = new Date().toLocaleString("th-TH", { hour12: false });
    const overallStatus = decision === "อนุมัติ" ? "อนุมัติแล้ว" : "ไม่อนุมัติ";

    list[idx].ApprovalStatus = decision;
    list[idx].ApprovalBy = approverName || "รองผู้อำนวยการฝ่ายพัฒนายุทธศาสตร์และแผนงาน";
    list[idx].ApprovalDate = now;
    list[idx].ApprovalRemarks = remarks || "";
    list[idx].OverallStatus = overallStatus;

    this.setLocalBookings(list);

    // Sync to Google Apps Script
    if (this.config.appsScriptUrl && this.config.appsScriptUrl.trim() !== "") {
      try {
        await fetch(this.config.appsScriptUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "updateApproval",
            BookingID: bookingId,
            ApprovalStatus: decision,
            ApprovalBy: approverName,
            ApprovalRemarks: remarks,
            lineToken: this.config.lineToken
          })
        });
      } catch (err) {
        console.error("Error updating approval to Google Sheets:", err);
      }
    }

    return { status: "success", booking: list[idx] };
  }
}

// Global instance
window.api = new ThaluangAPI();
