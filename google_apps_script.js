/**
 * Google Apps Script - ระบบจัดการแบบสอบถามไดนามิกสไตล์ Minimalist (เวอร์ชั่นปรับปรุง)
 * 
 * รองรับ:
 * 1. รับคำตอบแบบสอบถามสาธารณะ (Public POST)
 * 2. ตรวจสอบสิทธิ์และการขอดึงข้อมูลประชากรแอดมิน (Secure POST)
 * 3. ดึงค่าเปิด/ปิดระบบ วันเวลา และโครงสร้างแบบสอบถาม (Public GET - doGet)
 * 4. เพิ่ม/ลบรายชื่อแอดมิน จากหน้าเว็บได้โดยตรง (Secure POST)
 * 5. บันทึกวันเวลาเริ่ม/สิ้นสุด และบันทึกคำถามแบบไดนามิก (Secure POST)
 */

function doGet(e) {
  var corsHeader = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // ดึงพารามิเตอร์ id และ token
    var id = e && e.parameter ? e.parameter.id : null;
    var token = e && e.parameter ? e.parameter.token : null;
    
    // ดึงข้อมูลแบบสอบถามทั้งหมด (และทำการอพยพข้อมูลย้ายมา Surveys อัตโนมัติหากทำครั้งแรก)
    var surveys = getSurveysList(ss);
    
    var selectedSurvey = null;
    if (token) {
      for (var i = 0; i < surveys.length; i++) {
        if (surveys[i].accessToken === token) {
          selectedSurvey = surveys[i];
          break;
        }
      }
    }
    
    if (!selectedSurvey && id) {
      for (var i = 0; i < surveys.length; i++) {
        if (surveys[i].id === id) {
          selectedSurvey = surveys[i];
          break;
        }
      }
    }
    
    // หากไม่ระบุหรือระบุแล้วไม่พบ ให้ค้นหาแบบสอบถามที่ active ตัวแรก
    if (!selectedSurvey) {
      for (var i = 0; i < surveys.length; i++) {
        if (surveys[i].isActive === true || surveys[i].isActive === "true") {
          selectedSurvey = surveys[i];
          break;
        }
      }
    }
    
    // หากยังไม่เจอเลย ให้ใช้แบบสอบถามตัวแรกสุดที่มี
    if (!selectedSurvey && surveys.length > 0) {
      selectedSurvey = surveys[0];
    }
    
    // จัดรูปแบบให้สอดคล้องกับของเดิมสำหรับหน้าจอฝั่งผู้กรอก
    var settings = selectedSurvey ? {
      id: selectedSurvey.id,
      surveyName: selectedSurvey.surveyName,
      startTime: selectedSurvey.startTime,
      endTime: selectedSurvey.endTime,
      isActive: selectedSurvey.isActive,
      accessToken: selectedSurvey.accessToken || ""
    } : {
      id: "default",
      surveyName: "ไม่มีแบบสอบถามที่เปิดใช้งานในขณะนี้",
      startTime: "",
      endTime: "",
      isActive: false,
      accessToken: ""
    };
    
    var schema = selectedSurvey && selectedSurvey.schema ? selectedSurvey.schema : [];

    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "settings": settings,
      "schema": schema,
      "surveys": surveys
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(corsHeader);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(corsHeader);
  }
}

function doPost(e) {
  var corsHeader = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    // ==========================================
    // ส่วนคำสั่งที่ต้องผ่านการยืนยันตัวตนแอดมิน (Secure Actions)
    // ==========================================
    if (action === "fetch_data" || action === "fetch_admins" || action === "add_admin" || action === "delete_admin" || action === "save_settings" || action === "save_schema" || action === "fetch_surveys" || action === "save_surveys") {
      var idToken = payload.idToken;
      if (!idToken) {
        return ContentService.createTextOutput(JSON.stringify({
          "status": "error",
          "message": "กรุณาส่งรหัส ID Token ยืนยันสิทธิ์"
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(corsHeader);
      }

      // ตรวจสอบ Token กับกูเกิลเซิร์ฟเวอร์
      var email = verifyGoogleToken(idToken);
      if (!email) {
        return ContentService.createTextOutput(JSON.stringify({
          "status": "error",
          "message": "Token ตรวจสอบไม่ผ่าน หรือหมดเวลาเชื่อมต่อ"
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(corsHeader);
      }

      // เช็คว่าอีเมลนี้มีสิทธิ์แอดมินหรือไม่
      if (!checkIsAdmin(ss, email)) {
        return ContentService.createTextOutput(JSON.stringify({
          "status": "unauthorized",
          "message": "บัญชีของคุณ (" + email + ") ไม่มีสิทธิ์เข้าถึงฟังก์ชั่นจัดการหลังบ้าน"
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(corsHeader);
      }

      // ดำเนินการตามแต่ละ Action ของผู้ดูแลระบบ
      // 1. ดึงข้อมูลคำตอบแบบสอบถาม
      if (action === "fetch_data") {
        var responses = getResponsesData(ss);
        return ContentService.createTextOutput(JSON.stringify({
          "status": "success",
          "email": email,
          "data": responses
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(corsHeader);
      }
      
      // 2. ดึงรายชื่อแอดมินทั้งหมด
      else if (action === "fetch_admins") {
        var admins = getAdminsList(ss);
        return ContentService.createTextOutput(JSON.stringify({
          "status": "success",
          "admins": admins
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(corsHeader);
      }
      
      // 3. เพิ่มแอดมินใหม่
      else if (action === "add_admin") {
        var newEmail = payload.newEmail;
        if (!newEmail || newEmail.indexOf("@") === -1) {
          throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
        }
        var success = addAdminEmail(ss, newEmail);
        return ContentService.createTextOutput(JSON.stringify({
          "status": success ? "success" : "exists",
          "message": success ? "เพิ่มรายชื่อแอดมินเรียบร้อยแล้ว" : "อีเมลนี้ได้รับสิทธิ์แอดมินอยู่แล้ว"
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(corsHeader);
      }
      
      // 4. ลบสิทธิ์แอดมิน
      else if (action === "delete_admin") {
        var deleteEmail = payload.deleteEmail;
        if (deleteEmail.trim().toLowerCase() === email.trim().toLowerCase()) {
          return ContentService.createTextOutput(JSON.stringify({
            "status": "error",
            "message": "ไม่สามารถลบสิทธิ์บัญชีของตัวเองได้ เพื่อความปลอดภัย"
          }))
          .setMimeType(ContentService.MimeType.JSON)
          .setHeaders(corsHeader);
        }
        var success = deleteAdminEmail(ss, deleteEmail);
        return ContentService.createTextOutput(JSON.stringify({
          "status": success ? "success" : "error",
          "message": success ? "ลบสิทธิ์แอดมินเรียบร้อยแล้ว" : "ไม่พบรายชื่ออีเมลที่ระบุ"
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(corsHeader);
      }
      
      // 5. ดึงข้อมูลแบบสอบถามทั้งหมด (Admin endpoint)
      else if (action === "fetch_surveys") {
        var surveys = getSurveysList(ss);
        return ContentService.createTextOutput(JSON.stringify({
          "status": "success",
          "surveys": surveys
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(corsHeader);
      }
      
      // 6. เซฟข้อมูลรายการแบบสอบถามทั้งหมด (Admin endpoint)
      else if (action === "save_surveys") {
        saveSurveysList(ss, payload.surveys);
        return ContentService.createTextOutput(JSON.stringify({
          "status": "success",
          "message": "บันทึกรายการแบบสอบถามแล้ว"
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(corsHeader);
      }
      
      // 7. บันทึกการตั้งค่าเวลาและชื่อแบบประเมิน (ของเดิม - ปรับปรุงลงชีต Surveys)
      else if (action === "save_settings") {
        var sData = payload.settingsData;
        var surveys = getSurveysList(ss);
        var found = false;
        for (var i = 0; i < surveys.length; i++) {
          if (surveys[i].id === sData.id) {
            surveys[i].surveyName = sData.surveyName;
            surveys[i].startTime = sData.startTime;
            surveys[i].endTime = sData.endTime;
            surveys[i].isActive = sData.isActive;
            found = true;
            break;
          }
        }
        if (!found && surveys.length > 0) {
          surveys[0].surveyName = sData.surveyName;
          surveys[0].startTime = sData.startTime;
          surveys[0].endTime = sData.endTime;
          surveys[0].isActive = sData.isActive;
        }
        saveSurveysList(ss, surveys);
        return ContentService.createTextOutput(JSON.stringify({
          "status": "success",
          "message": "บันทึกการตั้งค่าเรียบร้อยแล้ว"
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(corsHeader);
      }
      
      // 8. บันทึกโครงสร้างแบบสอบถาม (Schema JSON) (ของเดิม - ปรับปรุงลงชีต Surveys)
      else if (action === "save_schema") {
        var schemaData = payload.schemaData;
        var surveyId = payload.surveyId;
        var surveys = getSurveysList(ss);
        var found = false;
        for (var i = 0; i < surveys.length; i++) {
          if (surveys[i].id === surveyId) {
            surveys[i].schema = schemaData;
            found = true;
            break;
          }
        }
        if (!found && surveys.length > 0) {
          surveys[0].schema = schemaData;
        }
        saveSurveysList(ss, surveys);
        return ContentService.createTextOutput(JSON.stringify({
          "status": "success",
          "message": "ปรับปรุงโครงสร้างคำถามเรียบร้อยแล้ว"
        }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeaders(corsHeader);
      }
    } 
    
    // ==========================================
    // ส่วนรับส่งคำตอบทั่วไป (Public Survey Submission)
    // ==========================================
    else {
      // ตรวจสอบเวลาก่อนบันทึกคำตอบเพื่อความปลอดภัยอีกชั้นหนึ่ง
      var surveys = getSurveysList(ss);
      var surveyId = payload.Survey_ID;
      var activeSurvey = null;
      
      for (var i = 0; i < surveys.length; i++) {
        if (surveys[i].id === surveyId) {
          activeSurvey = surveys[i];
          break;
        }
      }
      if (!activeSurvey) {
        for (var i = 0; i < surveys.length; i++) {
          if (surveys[i].isActive === true || surveys[i].isActive === "true") {
            activeSurvey = surveys[i];
            break;
          }
        }
      }
      if (!activeSurvey && surveys.length > 0) {
        activeSurvey = surveys[0];
      }

      if (activeSurvey) {
        var now = new Date();
        if (activeSurvey.isActive === false || activeSurvey.isActive === "false") {
          throw new Error("แบบสอบถามนี้ถูกปิดใช้งานชั่วคราว");
        }
        if (activeSurvey.startTime) {
          var start = parseThaiDateTimeForScript(activeSurvey.startTime);
          if (start && now < start) {
            throw new Error("แบบสอบถามยังไม่เริ่มเปิดให้กรอกข้อมูล");
          }
        }
        if (activeSurvey.endTime) {
          var end = parseThaiDateTimeForScript(activeSurvey.endTime);
          if (end && now > end) {
            throw new Error("แบบสอบถามหมดเวลาเปิดรับข้อมูลแล้ว");
          }
        }
      }

      var sheet = ss.getSheets()[0]; // เก็บในชีตคำตอบแผ่นแรก
      var lastRow = sheet.getLastRow();
      var headers = [];

      if (lastRow === 0) {
        // หากชีตว่าง ให้สร้างหัวข้อตามคำตอบที่ส่งเข้ามา
        headers = Object.keys(payload);
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2f0d9");
      } else {
        headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        // ตรวจเช็คคีย์ใหม่
        var keys = Object.keys(payload);
        for (var i = 0; i < keys.length; i++) {
          if (headers.indexOf(keys[i]) === -1) {
            headers.push(keys[i]);
            sheet.getRange(1, headers.length).setValue(keys[i]).setFontWeight("bold").setBackground("#e2f0d9");
          }
        }
      }

      // สร้างข้อมูลแถวคำตอบ
      var rowData = [];
      for (var j = 0; j < headers.length; j++) {
        var header = headers[j];
        if (header === "Timestamp") {
          rowData.push(now);
        } else {
          var val = payload[header];
          if (val === undefined || val === null) {
            rowData.push("");
          } else if (Array.isArray(val)) {
            rowData.push(val.join(", "));
          } else {
            rowData.push(val);
          }
        }
      }

      sheet.appendRow(rowData);
      return ContentService.createTextOutput(JSON.stringify({
        "status": "success",
        "message": "บันทึกคำตอบแล้ว",
        "row": sheet.getLastRow()
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(corsHeader);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(corsHeader);
  }
}

// ==========================================================
// ฟังก์ชันช่วยย่อยสำหรับการดึงและเก็บข้อมูล
// ==========================================================

function verifyGoogleToken(idToken) {
  var url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
  try {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      var payload = JSON.parse(response.getContentText());
      return payload.email;
    }
  } catch (e) {
    Logger.log("Token verification error: " + e.toString());
  }
  return null;
}

function checkIsAdmin(ss, email) {
  if (!email) return false;
  var adminSheet = ss.getSheetByName("Admins");
  if (!adminSheet) {
    // สร้างแผ่นออโต้เมื่อไม่พบ
    adminSheet = ss.insertSheet("Admins");
    adminSheet.getRange(1, 1).setValue("Email").setFontWeight("bold").setBackground("#e2f0d9");
    var owner = Session.getEffectiveUser().getEmail();
    adminSheet.getRange(2, 1).setValue(owner);
  }
  
  var lastRow = adminSheet.getLastRow();
  if (lastRow <= 1) return false;
  
  var emails = adminSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var cleanEmail = email.trim().toLowerCase();
  
  for (var i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).trim().toLowerCase() === cleanEmail) {
      return true;
    }
  }
  return false;
}

function getAdminsList(ss) {
  var adminSheet = ss.getSheetByName("Admins");
  if (!adminSheet) return [];
  
  var lastRow = adminSheet.getLastRow();
  if (lastRow <= 1) return [];
  
  var emails = adminSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  return emails.map(row => row[0]);
}

function addAdminEmail(ss, newEmail) {
  var adminSheet = ss.getSheetByName("Admins");
  if (!adminSheet) return false;
  
  var emails = getAdminsList(ss);
  var cleanEmail = newEmail.trim().toLowerCase();
  
  if (emails.map(e => e.toLowerCase()).indexOf(cleanEmail) !== -1) {
    return false; // มีอยู่แล้ว
  }
  
  adminSheet.appendRow([newEmail]);
  return true;
}

function deleteAdminEmail(ss, deleteEmail) {
  var adminSheet = ss.getSheetByName("Admins");
  if (!adminSheet) return false;
  
  var lastRow = adminSheet.getLastRow();
  if (lastRow <= 1) return false;
  
  var emails = adminSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var cleanEmail = deleteEmail.trim().toLowerCase();
  
  for (var i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).trim().toLowerCase() === cleanEmail) {
      // แถวที่ลบต้องบวกเพิ่ม 2 (1-indexed และเว้นบรรทัดหัวข้อ)
      adminSheet.deleteRow(i + 2);
      return true;
    }
  }
  return false;
}

// จัดการ Settings (ชีตเก็บวันเวลาเปิดปิดแบบสอบถาม)
function getSurveySettings(ss) {
  var sheet = ss.getSheetByName("Settings");
  var defaultSettings = {
    surveyName: "แบบประเมินออนไลน์ ความคิดเห็นและความพึงพอใจต่อภาพรวมของการจัดเวที “สานพลัง สร้างนวัตกรรม สู่สุขภาวะชุมชนที่ยั่งยืน” ปี 2568",
    startTime: "",
    endTime: "",
    isActive: true
  };
  
  if (!sheet) {
    // สร้างชีตตั้งค่าเริ่มต้นให้อัตโนมัติ
    sheet = ss.insertSheet("Settings");
    sheet.getRange(1, 1, 1, 2).setValues([["Key", "Value"]]).setFontWeight("bold").setBackground("#e2f0d9");
    sheet.appendRow(["Survey_Name", defaultSettings.surveyName]);
    sheet.appendRow(["Start_Time", ""]);
    sheet.appendRow(["End_Time", ""]);
    sheet.appendRow(["Is_Active", "true"]);
    return defaultSettings;
  }
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return defaultSettings;
  
  var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var settings = {};
  for (var i = 0; i < data.length; i++) {
    var key = data[i][0];
    var val = data[i][1];
    if (key === "Survey_Name") settings.surveyName = val;
    else if (key === "Start_Time") settings.startTime = val;
    else if (key === "End_Time") settings.endTime = val;
    else if (key === "Is_Active") settings.isActive = (val === "true" || val === true);
  }
  return settings;
}

function saveSurveySettings(ss, settingsData) {
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) {
    sheet = ss.insertSheet("Settings");
  }
  sheet.clear();
  sheet.getRange(1, 1, 1, 2).setValues([["Key", "Value"]]).setFontWeight("bold").setBackground("#e2f0d9");
  sheet.appendRow(["Survey_Name", settingsData.surveyName]);
  sheet.appendRow(["Start_Time", settingsData.startTime]);
  sheet.appendRow(["End_Time", settingsData.endTime]);
  sheet.appendRow(["Is_Active", String(settingsData.isActive)]);
}

// จัดการ Survey Schema (เก็บโครงสร้างคำถามทั้งหมดเป็น JSON String)
function getSurveySchema(ss) {
  var sheet = ss.getSheetByName("SurveySchema");
  if (!sheet) return null;
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;
  
  var jsonStr = sheet.getRange(2, 1).getValue();
  if (!jsonStr) return null;
  
  try {
    return JSON.parse(jsonStr);
  } catch(e) {
    return null;
  }
}

function saveSurveySchema(ss, schemaArray) {
  var sheet = ss.getSheetByName("SurveySchema");
  if (!sheet) {
    sheet = ss.insertSheet("SurveySchema");
  }
  sheet.clear();
  sheet.getRange(1, 1).setValue("Schema_JSON").setFontWeight("bold").setBackground("#e2f0d9");
  
  var jsonString = JSON.stringify(schemaArray);
  sheet.getRange(2, 1).setValue(jsonString);
  
  // ซิงค์คอลัมน์ในชีตหลัก
  syncSheetHeadersWithSchema(ss, schemaArray);
}

// ซิงโครไนซ์คอลัมน์ของชีตเก็บคำตอบให้มีช่องเก็บข้อมูลของคำถามล่าสุด
function syncSheetHeadersWithSchema(ss, schemaArray) {
  var ansSheet = ss.getSheets()[0]; // ชีตเก็บคำตอบ
  if (!ansSheet) return;
  
  var lastRow = ansSheet.getLastRow();
  var currentHeaders = [];
  
  if (lastRow > 0) {
    currentHeaders = ansSheet.getRange(1, 1, 1, ansSheet.getLastColumn()).getValues()[0];
  } else {
    currentHeaders = ["Timestamp", "Consent"];
    ansSheet.getRange(1, 1, 1, 2).setValues([currentHeaders]).setFontWeight("bold");
  }
  
  // ดึงคีย์ทั้งหมดที่จำเป็นต้องมีในชีตจาก Schema คำถามใหม่
  var requiredHeaders = ["Timestamp", "Consent"];
  
  schemaArray.forEach(q => {
    if (q.type === "facilities") {
      // ข้อ Q30 มี 4 หัวข้อย่อย
      if (q.subfields) {
        q.subfields.forEach(sub => requiredHeaders.push(sub));
      } else {
        requiredHeaders.push("Q30_Facility_Venue");
        requiredHeaders.push("Q30_Facility_AV");
        requiredHeaders.push("Q30_Facility_Catering");
        requiredHeaders.push("Q30_Facility_Duration");
      }
    } 
    else if (q.type === "ranking") {
      // ข้อ Q27 มี 4 อันดับ
      requiredHeaders.push("Q27_Rank1");
      requiredHeaders.push("Q27_Rank2");
      requiredHeaders.push("Q27_Rank3");
      requiredHeaders.push("Q27_Rank4");
    } 
    else {
      requiredHeaders.push(q.id);
      
      // เพิ่มคอลัมน์สำหรับเก็บข้อมูลระบุข้อความอื่น ๆ (ถ้ามี)
      if (q.id === "Gender") requiredHeaders.push("Gender_Other");
      if (q.id === "Info_Channels") requiredHeaders.push("Info_Channels_Other");
      if (q.id === "Primary_Channel") requiredHeaders.push("Primary_Channel_Other");
      if (q.id === "Q37_Future_Participants") requiredHeaders.push("Q37_Future_Participants_Other");
    }
  });

  // ลูปเช็คคอลัมน์ไหนยังไม่มีในสเปรดชีต ให้แอดเพิ่มต่อท้ายแถวที่ 1
  for (var k = 0; k < requiredHeaders.length; k++) {
    var reqHeader = requiredHeaders[k];
    if (currentHeaders.indexOf(reqHeader) === -1) {
      currentHeaders.push(reqHeader);
      ansSheet.getRange(1, currentHeaders.length).setValue(reqHeader).setFontWeight("bold").setBackground("#e2f0d9");
    }
  }
}

function getResponsesData(ss) {
  var sheet = ss.getSheets()[0];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  if (lastRow <= 1) return [];
  
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var jsonArr = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      if (val instanceof Date) {
        obj[headers[j]] = val.toISOString();
      } else {
        obj[headers[j]] = val;
      }
    }
    jsonArr.push(obj);
  }
  return jsonArr;
}

// MULTI-SURVEY MANAGEMENT HELPERS
function getSurveysList(ss) {
  var sheet = ss.getSheetByName("Surveys");
  
  // Backward compatibility migration:
  // If "Surveys" sheet doesn't exist, check if old "Settings" and "SurveySchema" sheets exist.
  // If so, load their values, create "Surveys" sheet, and save the old settings as the first survey.
  // If not, initialize "Surveys" with a default survey.
  if (!sheet) {
    sheet = ss.insertSheet("Surveys");
    sheet.getRange(1, 1, 1, 7).setValues([["ID", "Survey_Name", "Start_Time", "End_Time", "Is_Active", "Schema_JSON", "Access_Token"]]).setFontWeight("bold").setBackground("#e2f0d9");
    
    var oldSettingsSheet = ss.getSheetByName("Settings");
    var oldSchemaSheet = ss.getSheetByName("SurveySchema");
    
    var initialSurvey = {
      id: "s_" + new Date().getTime(),
      surveyName: "แบบประเมินออนไลน์ ความคิดเห็นและความพึงพอใจต่อภาพรวมของการจัดเวที “สานพลัง สร้างนวัตกรรม สู่สุขภาวะชุมชนที่ยั่งยืน” ปี 2568",
      startTime: "",
      endTime: "",
      isActive: true,
      schema: [],
      accessToken: "tk_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)
    };
    
    // Try migration
    if (oldSettingsSheet) {
      var oldSettings = getSurveySettings(ss);
      initialSurvey.surveyName = oldSettings.surveyName || initialSurvey.surveyName;
      initialSurvey.startTime = oldSettings.startTime || "";
      initialSurvey.endTime = oldSettings.endTime || "";
      initialSurvey.isActive = oldSettings.isActive !== undefined ? oldSettings.isActive : true;
    }
    
    if (oldSchemaSheet) {
      var oldSchema = getSurveySchema(ss);
      if (oldSchema) {
        initialSurvey.schema = oldSchema;
      }
    }
    
    // Save the initial survey to the new sheet
    sheet.appendRow([
      initialSurvey.id,
      initialSurvey.surveyName,
      initialSurvey.startTime,
      initialSurvey.endTime,
      String(initialSurvey.isActive),
      JSON.stringify(initialSurvey.schema),
      initialSurvey.accessToken
    ]);
    
    return [initialSurvey];
  }
  
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  
  // Ensure "Access_Token" header exists if migrating sheet column structure
  if (lastColumn < 7) {
    sheet.getRange(1, 7).setValue("Access_Token").setFontWeight("bold").setBackground("#e2f0d9");
    lastColumn = 7;
  }
  
  if (lastRow <= 1) {
    return [];
  }
  
  var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  var surveys = [];
  
  for (var i = 0; i < data.length; i++) {
    var schema = [];
    try {
      if (data[i][5]) {
        schema = JSON.parse(data[i][5]);
      }
    } catch(e) {
      schema = [];
    }
    
    var token = data[i][6] ? String(data[i][6]) : "";
    if (!token) {
      token = "tk_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      data[i][6] = token;
      sheet.getRange(i + 2, 7).setValue(token); // Write new token to sheet immediately
    }
    
    surveys.push({
      id: String(data[i][0]),
      surveyName: String(data[i][1]),
      startTime: String(data[i][2]),
      endTime: String(data[i][3]),
      isActive: (data[i][4] === "true" || data[i][4] === true),
      schema: schema,
      accessToken: token
    });
  }
  return surveys;
}

function saveSurveysList(ss, surveys) {
  var sheet = ss.getSheetByName("Surveys");
  if (!sheet) {
    sheet = ss.insertSheet("Surveys");
  }
  sheet.clear();
  sheet.getRange(1, 1, 1, 7).setValues([["ID", "Survey_Name", "Start_Time", "End_Time", "Is_Active", "Schema_JSON", "Access_Token"]]).setFontWeight("bold").setBackground("#e2f0d9");
  
  if (surveys && surveys.length > 0) {
    var rows = [];
    for (var i = 0; i < surveys.length; i++) {
      var s = surveys[i];
      var token = s.accessToken || s.Access_Token || ("tk_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10));
      rows.push([
        s.id,
        s.surveyName || "",
        s.startTime || "",
        s.endTime || "",
        String(s.isActive),
        JSON.stringify(s.schema || []),
        token
      ]);
    }
    sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  }
}

function parseThaiDateTimeForScript(str) {
  if (!str) return null;
  var cleanStr = str.replace(/เวลา/g, ' ').replace(/น\./g, ' ').replace(/\s+/g, ' ').trim();
  if (cleanStr.indexOf('T') !== -1 || cleanStr.indexOf('-') !== -1) {
    var d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
  }
  
  var parts = cleanStr.split(' ');
  var datePart = parts[0];
  var timePart = parts[1] || "00:00";
  
  var dateSubparts = datePart.split('/');
  if (dateSubparts.length !== 3) return null;
  
  var day = parseInt(dateSubparts[0], 10);
  var month = parseInt(dateSubparts[1], 10) - 1;
  var year = parseInt(dateSubparts[2], 10);
  
  if (year > 2400) {
    year -= 543;
  }
  
  var timeSubparts = timePart.split(':');
  var hours = parseInt(timeSubparts[0] || 0, 10);
  var minutes = parseInt(timeSubparts[1] || 0, 10);
  
  var parsedDate = new Date(year, month, day, hours, minutes);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
}
