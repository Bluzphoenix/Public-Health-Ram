// CONFIGURATIONS
// คัดลอก URL ของ Web App จาก Google Apps Script ที่ Deploy แล้วมาใส่ที่นี่
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwbZLbgd6FGVptbdekDHxqUugYAVsI7hRHeGO61CynGNPiqcgVhm8yZg6mqsMXFY5mq/exec";
// ใส่ Client ID ที่ได้จาก Google Cloud Console ที่นี่ (หากเว้นว่างไว้ ระบบจะใช้ Login จำลองสำหรับการทดสอบ)
const GOOGLE_CLIENT_ID = "799024999113-el95t5e96keiv3h0ci7mb1qu1uu8n0tm.apps.googleusercontent.com";
// คัดลอก URL ของ CSV ที่ได้จากการสั่ง Share > Publish to Web ของ Google Sheets มาใส่ที่นี่ (กรณีดึงแบบสาธารณะ - ปัจจุบันระบบใช้ความปลอดภัยดึงผ่านสคริปต์แทน)
const GOOGLE_SHEET_CSV_URL = ""; 

// DEFAULT QUESTIONNAIRE SCHEMA (Word Template fallback)
const DEFAULT_SCHEMA = [
  { id: "Gender", type: "categorical", text: "1. เพศของผู้ตอบแบบสอบถาม", choices: ["ชาย", "หญิง", "เพศทางเลือก"], step: 1, required: true },
  { id: "Age", type: "numeric", text: "2. อายุของผู้ตอบแบบสอบถาม (ปี)", min: 15, max: 100, step: 1, required: true },
  { id: "Network_Number", type: "text", text: "3. เลขที่เครือข่ายร่วมสร้างชุมชนท้องถิ่นน่าอยู่ (จำนวน 7 หลัก)", pattern: "^\\d{7}$", step: 1, required: true },
  { id: "Respondent_Type", type: "categorical", text: "บทบาทการเข้าร่วมงาน", choices: ["กลุ่มเข้าร่วมงาน", "คณะทำงานจัดเวที / ผู้จัด / วิทยากร / ผู้ทรงคุณวุฒิ"], step: 1, required: true },
  { id: "Attendance_Count", type: "numeric", text: "4. การเข้าร่วมเวทีสานพลัง (จำนวนครั้ง)", min: 0, step: 1, required: true },
  { id: "Attendance_Years", type: "years-checkbox", text: "ระบุปีที่เคยเข้าร่วม (เลือกได้มากกว่า 1 ข้อ)", step: 1 },
  { id: "Info_Channels", type: "multi-select", text: "5. ท่านรับรู้การจัดเวทีสานพลังฯ ในครั้งนี้จากช่องทางใด (เลือกได้มากกว่า 1 ข้อ)", choices: ["LINE", "E-mail", "โทรศัพท์", "เว๊บไซต์ สสส.", "อื่น ๆ"], hasOther: true, step: 1, required: true },
  { id: "Primary_Channel", type: "categorical", text: "6. ช่องทางใดเป็นช่องทางการสื่อสารเพื่อประชาสัมพันธ์การจัดเวทีสานพลังฯ ที่สำคัญที่สุด (เลือกได้เพียงข้อเดียว)", choices: ["LINE", "E-mail", "โทรศัพท์", "เว๊บไซต์ สสส.", "อื่น ๆ"], hasOther: true, step: 1, required: true },
  
  // Part 2: Likert 1-5
  { id: "Q7", type: "likert", text: "ก่อนเข้าร่วมเวทีสานพลังในครั้งนี้ ท่านรู้ว่ามีการจัดเวทีนี้เป็นอย่างดี", section: "Context", step: 2, required: true },
  { id: "Q8", type: "likert", text: "ก่อนเข้าร่วมเวทีสานพลังในครั้งนี้ ท่านทราบถึงวัตถุประสงค์ของการจัดเวทีนี้เป็นอย่างดี", section: "Context", step: 2, required: true },
  { id: "Q9", type: "likert", text: "ก่อนเข้าร่วมเวทีสานพลังในครั้งนี้ ท่านทราบถึงนโยบายของแผนสุขภาวะชุมชนเป็นอย่างดี", section: "Context", step: 2, required: true },
  { id: "Q10", type: "likert", text: "ก่อนเข้าร่วมเวทีสานพลังในครั้งนี้ ท่านทราบถึงยุทธศาสตร์หรือแนวทางการทำงานตามแผนสุขภาวะชุมชนเป็นอย่างดี", section: "Context", step: 2, required: true },
  { id: "Q11", type: "likert", text: "ท่านได้รับการสนับสนุนด้านทรัพยากรเพื่อใช้ในการเข้าร่วมเวทีสานพลังในครั้งนี้", section: "Input", step: 2, required: true },
  { id: "Q12", type: "likert", text: "ท่านมีส่วนร่วมในการจัดกิจกรรมชี้นำ จุดประกายและสร้างแรงบันดาลใจ", section: "Process", step: 2, required: true },
  { id: "Q13", type: "likert", text: "ท่านพอใจต่อการจัดกิจกรรมชี้นำ จุดประกายและสร้างแรงบันดาลใจ", section: "Process", step: 2, required: true },
  { id: "Q14", type: "likert", text: "ท่านมีส่วนร่วมในการจัดกิจกรรมการแลกเปลี่ยนเรียนรู้ปฏิบัติการสุขภาวะชุมชน", section: "Process", step: 2, required: true },
  { id: "Q15", type: "likert", text: "ท่านพอใจต่อการจัดกิจกรรมการแลกเปลี่ยนเรียนรู้ปฏิบัติการสุขภาวะชุมชน", section: "Process", step: 2, required: true },
  { id: "Q16", type: "likert", text: "ท่านมีส่วนร่วมในการจัดกิจกรรมลานความรู้จากปฏิบัติการของชุมชนท้องถิ่น 4 ภาค", section: "Process", step: 2, required: true },
  { id: "Q17", type: "likert", text: "ท่านพอใจต่อการจัดกิจกรรมลานความรู้จากปฏิบัติการของชุมชนท้องถิ่น 4 ภาค", section: "Process", step: 2, required: true },
  { id: "Q18", type: "likert", text: "ท่านมีส่วนร่วมในการจัดกิจกรรมรูปธรรมจากการปฏิบัติของชุมชนท้องถิ่น", section: "Process", step: 2, required: true },
  { id: "Q19", type: "likert", text: "ท่านพอใจต่อการจัดกิจกรรมรูปธรรมจากการปฏิบัติของชุมชนท้องถิ่น", section: "Process", step: 2, required: true },
  { id: "Q20", type: "likert", text: "ท่านพอใจต่อสื่อที่นำเสนอในแต่ละกิจกรรม (ยกตัวอย่างสื่อ/คลิป)", section: "Process", step: 2, required: true },
  { id: "Q21", type: "likert", text: "ท่านพอใจต่อระยะเวลาในแต่ละกิจกรรม", section: "Process", step: 2, required: true },
  { id: "Q22", type: "likert", text: "ท่านพอใจต่อสถานที่ในการจัดแต่ละกิจกรรม", section: "Process", step: 2, required: true },
  { id: "Q23", type: "likert", text: "หลังจากการเข้าร่วมเวทีสานพลัง ท่านรู้จักเวทีสานพลังฯ นี้เป็นอย่างดี", section: "Output", step: 2, required: true },
  { id: "Q24", type: "likert", text: "หลังจากการเข้าร่วมเวทีสานพลัง ท่านทราบถึงวัตถุประสงค์ของการจัดเวทีสานพลังฯนี้เป็นอย่างดี", section: "Output", step: 2, required: true },
  { id: "Q25", type: "likert", text: "หลังจากการเข้าร่วมเวทีสานพลัง ท่านทราบถึงนโยบายของแผนสุขภาวะชุมชนเป็นอย่างดี", section: "Output", step: 2, required: true },
  { id: "Q26", type: "likert", text: "หลังจากการเข้าร่วมเวทีสานพลัง ท่านทราบถึงยุทธศาสตร์หรือแนวทางการทำงานตามแผนสุขภาวะชุมชนเป็นอย่างดี", section: "Output", step: 2, required: true },
  
  // Part 3
  { id: "Q27", type: "ranking", text: "27. ความพึงพอใจต่อแนวทางการจัดกิจกรรมทั้ง 4 กิจกรรม (เรียงลำดับกิจกรรมที่พึงพอใจสูงสุด โดยแตะหรือลากวางสลับลำดับ)", choices: [
    "กิจกรรมชี้นำ จุดประกายและสร้างแรงบันดาลใจ",
    "กิจกรรมการแลกเปลี่ยนเรียนรู้ปฏิบัติการสุขภาวะชุมชน",
    "กิจกรรมลานความรู้จากปฏิบัติการของชุมชนท้องถิ่น 4 ภาค",
    "กิจกรรมรูปธรรมจากการปฏิบัติของชุมชนท้องถิ่น"
  ], step: 3, required: true },
  { id: "Q28", type: "likert", text: "28. ระดับความพึงพอใจต่อภาพอินโฟกราฟฟิกสื่อความหมายในกิจกรรมลานความรู้จากปฏิบัติการของชุมชนท้องถิ่น 4 ภาค (คะแนน 1-5)", section: "Infographic", image: "assets/image1.png", step: 3, required: true },
  { id: "Q29", type: "text", text: "29. ข้อเสนอแนะต่อการเพิ่มระดับความพึงพอใจของภาพอินโฟกราฟฟิกที่ใช้ในเวทีสานพลัง (คำถามปลายเปิด)", step: 3, required: false },
  { id: "Q30", type: "facilities", text: "30. ระดับความพึงพอใจต่อสิ่งอำนวยความสะดวกในเวทีสานพลัง", subfields: ["Q30_Facility_Venue", "Q30_Facility_AV", "Q30_Facility_Catering", "Q30_Facility_Duration"], sublabels: ["สถานที่และสภาพแวดล้อมในการจัดงาน", "อุปกรณ์โสตทัศนูปกรณ์", "อาหารกลางวันและเครื่องดื่ม", "ระยะเวลาในการจัดงาน"], step: 3, required: true },
  { id: "Q31", type: "text", text: "31. ข้อเสนอแนะต่อการเพิ่มระดับความพึงพอใจของสิ่งอำนวยความสะดวกในเวทีสานพลัง (คำถามปลายเปิด)", step: 3, required: false },
  { id: "Q32", type: "score10", text: "32. ระดับการมีส่วนร่วมของท่านในเวทีสานพลัง (1-10 คะแนน)", step: 3, required: true },
  { id: "Q33", type: "text", text: "33. ข้อเสนอแนะต่อการสร้างการมีส่วนร่วมในการจัดเวทีสานพลังฯ (คำถามปลายเปิด)", step: 3, required: false },
  { id: "Q34", type: "score10", text: "34. ระดับความพึงพอใจในภาพรวมของท่านต่อเวทีสานพลัง (1-10 คะแนน)", step: 3, required: true },
  { id: "Q35", type: "text", text: "35. ข้อเสนอแนะต่อการจัดเวทีสานพลังฯ ในภาพรวม (คำถามปลายเปิด)", step: 3, required: false },
  { id: "Q36", type: "text", text: "36. รูปแบบของการจัดเวทีสานพลังฯ ในอนาคต ควรเป็นอย่างไร (คำถามปลายเปิด)", step: 3, required: false },
  { id: "Q37", type: "multi-select", text: "37. ตามรูปแบบของข้อ 36 ตามที่ท่านเสนอมา ใครควรเข้าร่วมเวทีสานพลังฯ บ้างในอนาคต (เลือกได้มากกว่า 1 ข้อ)", choices: [
    "องค์กรปกครองส่วนท้องถิ่น",
    "ท้องที่ (กำนัน-ผู้ใหญ่)",
    "องค์กรชุมชน (กลุ่มทางสังคม)",
    "หน่วยงานรัฐในพื้นที่ (4 องค์กรหลัก)",
    "อื่น ๆ"
  ], hasOther: true, step: 3, required: true },
  { id: "Q38", type: "score10", text: "38. ระดับของการนำความรู้ที่ได้จากเวทีสานพลังไปใช้ประโยชน์ (1-10 คะแนน)", step: 3, required: true },
  { id: "Q39", type: "text", text: "39. ข้อเสนอแนะต่อแนวทางการนำไปใช้ประโยชน์ (คำถามปลายเปิด)", step: 3, required: false }
];

// STATE MANAGER
let currentSchema = [...DEFAULT_SCHEMA];
let currentSettings = {
  id: "default",
  surveyName: "แบบประเมินออนไลน์ ความคิดเห็นและความพึงพอใจต่อภาพรวมของการจัดเวที “สานพลัง สร้างนวัตกรรม สู่สุขภาวะชุมชนที่ยั่งยืน” ปี 2568",
  startTime: "",
  endTime: "",
  isActive: true
};
let surveys = []; // รายการแบบสอบถามทั้งหมด
let selectedSurveyId = ""; // ID แบบสอบถามที่เลือกเพื่อแก้ไขในแผงตั้งค่า
let selectedDashboardSurveyId = "all"; // ID แบบสอบถามที่เลือกเพื่อดูสถิติกราฟ
let QUESTIONS_META = {};
function rebuildQuestionsMeta() {
  QUESTIONS_META = {};
  currentSchema.forEach(q => {
    QUESTIONS_META[q.id] = q;
  });
}
rebuildQuestionsMeta();

function getFilteredAppData() {
  if (!selectedDashboardSurveyId || selectedDashboardSurveyId === "all") {
    return appData;
  }
  return appData.filter(row => {
    if (selectedDashboardSurveyId === "default") {
      return !row.Survey_ID || row.Survey_ID === "default";
    }
    return row.Survey_ID === selectedDashboardSurveyId;
  });
}

const MOCK_RESPONSES = [];
function generateMockData() {
  const genders = ["ชาย", "หญิง", "เพศทางเลือก"];
  const roles = ["กลุ่มเข้าร่วมงาน", "คณะทำงานจัดเวที / ผู้จัด / วิทยากร / ผู้ทรงคุณวุฒิ"];
  const channels = ["LINE", "E-mail", "โทรศัพท์", "เว๊บไซต์ สสส."];
  const activities = [
    "กิจกรรมชี้นำ จุดประกายและสร้างแรงบันดาลใจ",
    "กิจกรรมการแลกเปลี่ยนเรียนรู้ปฏิบัติการสุขภาวะชุมชน",
    "กิจกรรมลานความรู้จากปฏิบัติการของชุมชนท้องถิ่น 4 ภาค",
    "กิจกรรมรูปธรรมจากการปฏิบัติของชุมชนท้องถิ่น"
  ];
  
  const commentsQ29 = [
    "อินโฟกราฟิกสวยมาก แต่อยากให้ขนาดฟอนต์ใหญ่กว่านี้เล็กน้อยเพื่อให้อ่านง่ายสำหรับผู้สูงอายุ",
    "สีสันสวยสะดุดตาดีครับ จัดกลุ่มหัวข้อดีมาก",
    "อยากให้มี QR Code สแกนดาวน์โหลดไฟล์ภาพเก็บไว้ศึกษาต่อด้วยค่ะ",
    "ภาพสวยสื่อความหมายดี แต่อยากให้ลดปริมาณตัวหนังสือลงอีกนิด",
    "ชอบการจัดวางและโทนสีดูสบายตาและมินิมอลดีค่ะ"
  ];

  const commentsQ31 = [
    "อาหารกลางวันอร่อยมาก แต่คิวรับอาหารค่อนข้างยาว ควรเพิ่มจุดบริการ",
    "เครื่องเสียงช่วงเช้ามีเสียงหอนเล็กน้อย แต่ช่วงบ่ายแก้ไขได้ดี สถานที่กว้างขวางเดินทางสะดวก",
    "ห้องน้ำไม่ค่อยเพียงพอกับจำนวนคนในช่วงเวลาพักเบรก",
    "ระยะเวลาดำเนินงานกระชับดีมาก แอร์ในหอประชุมหนาวเกินไปนิดนึงครับ",
    "สิ่งอำนวยความสะดวกครบถ้วน แอร์เย็นสบาย อาหารเบรกหลากหลายดี"
  ];

  const commentsQ33 = [
    "ควรมีช่วงเวทีแลกเปลี่ยนถามตอบกับชุมชนให้ยาวขึ้น",
    "ชอบการจัดกระบวนการกลุ่มย่อย ทำให้ทุกคนมีส่วนร่วมได้พูดคุยจริง ๆ",
    "การมีส่วนร่วมผ่านระบบโหวตออนไลน์ช่วยให้ร่วมแสดงความเห็นได้สะดวกดี",
    "อยากให้เน้นกลุ่มเยาวชนเข้ามาร่วมแบ่งปันประสบการณ์เพิ่มขึ้น",
    "จัดกิจกรรมได้มีปฏิสัมพันธ์ดีมากครับ วิทยากรชวนคุยสนุกดี"
  ];

  const commentsQ35 = [
    "เป็นเวทีที่ดีมาก ได้สร้างเครือข่ายแลกเปลี่ยนกับจังหวัดอื่น ๆ",
    "จัดงานได้สมบูรณ์แบบมากในปีนี้ ชื่นชมคณะทำงานคณะสาธารณสุข ม.บูรพา ครับ",
    "เวทีแบบนี้ควรมีจัดทุกปีเพื่อติดตามความก้าวหน้างานสุขภาวะชุมชน",
    "ประทับใจนวัตกรรมของท้องถิ่นต่าง ๆ มากมาย สามารถนำมาปรับใช้ที่ อบต. ได้",
    "การจัดการเวทีดีขึ้นเรื่อย ๆ ครับ ขอบคุณผู้จัดงานและวิทยากรทุกท่าน"
  ];

  const commentsQ36 = [
    "อยากให้จัดแบบกระจายตามภูมิภาค เพื่อให้ชุมชนเดินทางมาร่วมได้สะดวกขึ้น",
    "จัดเป็นแบบ Hybrid มีถ่ายทอดสดผ่าน Facebook/Zoom สำหรับผู้ที่มาไม่ได้",
    "ควรเพิ่มระยะเวลาเป็น 3 วันเต็มเพื่อที่จะได้ลงรายละเอียดในแต่ละห้องย่อยได้ครบ",
    "ควรมีการจัดบูธแสดงสินค้าชุมชนแบบตลาดนัดสุขภาวะเพื่อจำหน่ายสินค้าจริง",
    "ดีอยู่แล้วครับ แต่อาจเพิ่มการศึกษาดูงานในพื้นที่ชุมชนจริงประกอบด้วย"
  ];

  const commentsQ39 = [
    "จะนำแนวคิดระบบลานความรู้ 4 ภาค ไปทดลองตั้งในศูนย์สุขภาพชุมชน",
    "สามารถนำข้อตกลงและนโยบายกลับไปประยุกต์ทำธรรมนูญตำบลได้ทันที",
    "ได้แรงบันดาลใจในการนำนวัตกรรมสุขภาวะไปปรับทำข้อบัญญัติท้องถิ่นเพื่อสนับสนุนการทำงาน",
    "จะประสานงานเชื่อมโยง 4 องค์กรหลักในระดับพื้นที่ให้แน่นแฟ้นขึ้นตามแบบอย่างที่นี่",
    "นำเอกสารและคลิปนำเสนอไปเปิดอบรมให้คณะทำงานของ อบต. ฟังต่อครับ"
  ];

  for (let i = 0; i < 48; i++) {
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const role = roles[Math.random() > 0.3 ? 0 : 1];
    const age = Math.floor(Math.random() * 35) + 25; 
    const networkNum = String(Math.floor(Math.random() * 9000000) + 1000000);
    const attendCount = Math.floor(Math.random() * 5);
    
    const possibleYears = [2554, 2555, 2556, 2557, 2558, 2559, 2560, 2561, 2562, 2563, 2565, 2566, 2567];
    const attendYears = [];
    if (attendCount > 0) {
      for(let y = 0; y < attendCount; y++) {
        const yr = possibleYears[Math.floor(Math.random() * possibleYears.length)];
        if (!attendYears.includes(yr)) attendYears.push(yr);
      }
    }
    
    const numCh = Math.floor(Math.random() * 2) + 1;
    const selectedCh = [];
    for(let c=0; c<numCh; c++) {
      const ch = channels[Math.floor(Math.random() * channels.length)];
      if (!selectedCh.includes(ch)) selectedCh.push(ch);
    }
    const primCh = selectedCh[0];
    
    const row = {
      Timestamp: new Date(2026, 5, 5, 9 + (i % 8), 12 + i, 30).toISOString(),
      Consent: "ยินยอม",
      Gender: gender,
      Age: age,
      Network_Number: networkNum,
      Respondent_Type: role,
      Attendance_Count: attendCount,
      Attendance_Years: attendYears.join(", "),
      Info_Channels: selectedCh.join(", "),
      Info_Channels_Other: "",
      Primary_Channel: primCh,
      Primary_Channel_Other: ""
    };

    const baseSatisfaction = Math.floor(Math.random() * 2) + 4; 
    for (let q = 7; q <= 26; q++) {
      let score = baseSatisfaction;
      if (Math.random() > 0.8) score -= 1;
      if (Math.random() > 0.95) score -= 1;
      row["Q" + q] = Math.max(1, score);
    }
    
    const shuffledAct = [...activities].sort(() => Math.random() - 0.5);
    row.Q27_Rank1 = shuffledAct[0];
    row.Q27_Rank2 = shuffledAct[1];
    row.Q27_Rank3 = shuffledAct[2];
    row.Q27_Rank4 = shuffledAct[3];
    
    row.Q28 = Math.floor(Math.random() * 2) + 4; 
    row.Q29 = Math.random() > 0.7 ? commentsQ29[Math.floor(Math.random() * commentsQ29.length)] : "";
    
    row.Q30_Facility_Venue = Math.floor(Math.random() * 2) + 4;
    row.Q30_Facility_AV = Math.floor(Math.random() * 3) + 3;
    row.Q30_Facility_Catering = Math.floor(Math.random() * 3) + 3;
    row.Q30_Facility_Duration = Math.floor(Math.random() * 2) + 4;
    row.Q31 = Math.random() > 0.7 ? commentsQ31[Math.floor(Math.random() * commentsQ31.length)] : "";
    
    row.Q32 = Math.floor(Math.random() * 4) + 7; 
    row.Q33 = Math.random() > 0.7 ? commentsQ33[Math.floor(Math.random() * commentsQ33.length)] : "";
    
    row.Q34 = Math.floor(Math.random() * 3) + 8; 
    row.Q35 = Math.random() > 0.7 ? commentsQ35[Math.floor(Math.random() * commentsQ35.length)] : "";
    row.Q36 = Math.random() > 0.6 ? commentsQ36[Math.floor(Math.random() * commentsQ36.length)] : "";
    
    const futPart = ["องค์กรปกครองส่วนท้องถิ่น", "หน่วยงานรัฐในพื้นที่ (4 องค์กรหลัก)"];
    if (Math.random() > 0.5) futPart.push("องค์กรชุมชน (กลุ่มทางสังคม)");
    row.Q37 = futPart.join(", ");
    row.Q37_Other = "";
    
    row.Q38 = Math.floor(Math.random() * 3) + 8; 
    row.Q39 = Math.random() > 0.7 ? commentsQ39[Math.floor(Math.random() * commentsQ39.length)] : "";

    MOCK_RESPONSES.push(row);
  }
}
generateMockData();

// APP DATA
let appData = [...MOCK_RESPONSES];
let mockAdmins = ["earth.ekka@gmail.com"];
let overviewChartInstance = null;
window.activeCharts = {};

// DOM ELEMENTS
const viewDashboard = document.getElementById('view-dashboard');
const viewSurvey = document.getElementById('view-survey');
const btnGoSurvey = document.getElementById('btn-go-survey');
const btnBackDashboard = document.getElementById('btn-back-dashboard');
const btnGoAdmin = document.getElementById('btn-go-admin');
const btnToggleTheme = document.getElementById('btn-toggle-theme');
const syncStatusText = document.getElementById('sync-status');
const syncDot = document.querySelector('.sync-dot');

// ON APPLICATION INIT
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupEventListeners();
  checkIfSurveyCompleted();
  setupFormWizard();
  setupAdminTabs();
  
  // โหลดค่าและการตั้งค่าแบบสอบถามไดนามิก
  loadPublicSettingsAndSchema();
  
  // ตรวจเช็คสิทธิ์ล็อกอินสำหรับเปิดดู Dashboard
  initAdminAuth();
  
  // Check for direct routing via query parameters
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('v') === 'admin' || urlParams.get('mode') === 'admin') {
    showView('dashboard');
  } else {
    showView('survey');
  }
});

// THEME TOGGLE (Light/Dark)
function initTheme() {
  const isDark = localStorage.getItem('theme-dark') === 'true';
  if (isDark) {
    document.body.classList.add('dark-theme');
  }
}

function setupEventListeners() {
  // ปุ่มปลดล็อกการทำแบบสอบถามซ้ำ (แสดงเฉพาะแอดมิน บนหน้าแจ้งเตือนถูกล็อก)
  const btnResetRepeat = document.getElementById("btn-reset-repeat");
  if (btnResetRepeat) {
    btnResetRepeat.addEventListener("click", () => {
      if (!confirm("ยืนยันปลดล็อกให้อุปกรณ์เครื่องนี้ทำแบบสอบถามนี้ได้อีกครั้งใช่หรือไม่?")) return;
      localStorage.removeItem("survey_completed_" + currentSettings.id);
      checkSurveyStatus();
    });
  }

  btnToggleTheme.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme-dark', isDark);
    if (overviewChartInstance) renderOverviewChart();
    // Redraw all dynamic charts
    currentSchema.forEach(q => {
      createQuestionChart(q, `chart-canvas-${q.id}`);
    });
  });

  // Navigation
  btnGoSurvey.addEventListener('click', () => {
    if (selectedSurveyId) {
      const survey = surveys.find(s => s.id === selectedSurveyId);
      if (survey && survey.accessToken) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('token', survey.accessToken);
        urlParams.delete('v');
        window.history.pushState(null, '', window.location.pathname + '?' + urlParams.toString());
      }
    }
    showView('survey');
  });
  btnBackDashboard.addEventListener('click', () => showView('dashboard'));
  if (btnGoAdmin) {
    btnGoAdmin.addEventListener('click', () => showView('dashboard'));
  }
  document.getElementById('btn-closed-back-dash').addEventListener('click', () => showView('dashboard'));

  // Bind Regenerate Token
  const btnRegenToken = document.getElementById('btn-regenerate-token');
  if (btnRegenToken) {
    btnRegenToken.addEventListener('click', () => {
      const tokenInput = document.getElementById('input-set-token');
      if (tokenInput) {
        const newToken = "tk_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        tokenInput.value = newToken;
        
        // Also update QR Code and Link immediately
        const currentUrl = window.location.origin + window.location.pathname + "?token=" + newToken;
        const linkEl = document.getElementById("qr-url-link");
        if (linkEl) {
          linkEl.href = currentUrl;
          linkEl.innerText = currentUrl;
        }
        const qrImg = document.getElementById("qr-code-img");
        if (qrImg) {
          qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(currentUrl);
        }
      }
    });
  }

  // Bind Add Admin form
  const formAddAdmin = document.getElementById('form-add-admin');
  if (formAddAdmin) {
    formAddAdmin.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('input-new-admin-email');
      if (emailInput) {
        addAdmin(emailInput.value.trim());
      }
    });
  }

  // Bind Settings form
  const formSettings = document.getElementById('form-survey-settings');
  if (formSettings) {
    formSettings.addEventListener('submit', handleSettingsSubmit);
  }

  // ปุ่มเพิ่มคำถามถูกสร้างแบบไดนามิกใน renderBuilder() ของแต่ละส่วนแล้ว (ไม่ต้องผูกที่นี่)

  // Bind QR Code Download
  const btnDownloadQr = document.getElementById('btn-download-qr');
  if (btnDownloadQr) {
    btnDownloadQr.addEventListener('click', downloadQRCode);
  }

  // Bind Dashboard Survey Selector
  const dashSurveySelector = document.getElementById('dashboard-survey-selector');
  if (dashSurveySelector) {
    dashSurveySelector.addEventListener('change', (e) => {
      selectedDashboardSurveyId = e.target.value;
      renderDashboardOverview();
    });
  }

  // Bind manual dashboard refresh
  const btnRefreshDash = document.getElementById('btn-refresh-dashboard');
  if (btnRefreshDash) {
    btnRefreshDash.addEventListener('click', () => {
      btnRefreshDash.style.transform = 'rotate(360deg)';
      btnRefreshDash.style.transition = 'transform 0.5s';
      setTimeout(() => { btnRefreshDash.style.transform = ''; }, 500);
      refreshDashboardData();
    });
  }

  // Bind Survey List Actions
  const btnSurveyCreate = document.getElementById('btn-survey-create');
  if (btnSurveyCreate) {
    btnSurveyCreate.addEventListener('click', prepareCreateSurvey);
  }
  const btnSurveyEdit = document.getElementById('btn-survey-edit');
  if (btnSurveyEdit) {
    btnSurveyEdit.addEventListener('click', prepareEditSurvey);
  }
  const btnSurveyDelete = document.getElementById('btn-survey-delete');
  if (btnSurveyDelete) {
    btnSurveyDelete.addEventListener('click', deleteSelectedSurveys);
  }
  const chkSelectAll = document.getElementById('survey-select-all');
  if (chkSelectAll) {
    chkSelectAll.addEventListener('change', toggleSelectAllSurveys);
  }
}

function loadPublicSettingsAndSchema() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get('id');
  const targetToken = urlParams.get('token');
  
  let fetchUrl = APPS_SCRIPT_URL;
  if (fetchUrl) {
    const params = [];
    if (targetToken) params.push("token=" + encodeURIComponent(targetToken));
    if (targetId) params.push("id=" + encodeURIComponent(targetId));
    if (params.length > 0) {
      fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + params.join('&');
    }
  }
  
  if (!APPS_SCRIPT_URL) {
    console.log("ไม่มี APPS_SCRIPT_URL: โหลดสคีมาจาก LocalStorage หรือค่าตั้งต้น");
    loadDefaultSettingsAndSchema();
    
    let targetSurvey = null;
    if (targetToken) {
      targetSurvey = surveys.find(s => s.accessToken === targetToken);
    } else if (targetId) {
      targetSurvey = surveys.find(s => s.id === targetId);
    }
    
    if (targetSurvey) {
      currentSettings = {
        id: targetSurvey.id,
        surveyName: targetSurvey.surveyName,
        startTime: targetSurvey.startTime,
        endTime: targetSurvey.endTime,
        isActive: targetSurvey.isActive,
        blockRepeat: targetSurvey.blockRepeat === true,
        accessToken: targetSurvey.accessToken
      };
      currentSchema = targetSurvey.schema || DEFAULT_SCHEMA;
      rebuildQuestionsMeta();
      applySettings();
      renderSurveyForm();
      renderDashboardQuestionCards();
      checkSurveyStatus();
    } else if (targetToken || targetId) {
      currentSettings = {
        id: "not_found",
        surveyName: "ไม่พบแบบสอบถามที่ท่านระบุ",
        startTime: "",
        endTime: "",
        isActive: false,
        accessToken: ""
      };
      currentSchema = [];
      rebuildQuestionsMeta();
      applySettings();
      renderSurveyForm();
      checkSurveyStatus();
    }
    return;
  }
  
  if (syncStatusText) {
    syncStatusText.innerText = "กำลังดาวน์โหลดโครงสร้างคำถาม...";
  }
  
  fetch(fetchUrl)
    .then(res => {
      if (!res.ok) throw new Error("HTTP error " + res.status);
      return res.json();
    })
    .then(res => {
      if (res.status === "success") {
        if (res.settings) {
          currentSettings = res.settings;
        }
        if (res.schema && Array.isArray(res.schema)) {
          currentSchema = res.schema;
        } else {
          currentSchema = DEFAULT_SCHEMA;
        }
        if (res.surveys && Array.isArray(res.surveys)) {
          surveys = res.surveys;
        } else {
          surveys = [{
            id: currentSettings.id || "default",
            surveyName: currentSettings.surveyName,
            startTime: currentSettings.startTime,
            endTime: currentSettings.endTime,
            isActive: currentSettings.isActive,
            schema: currentSchema,
            accessToken: currentSettings.accessToken || ""
          }];
        }
        
        rebuildQuestionsMeta();
        applySettings();
        renderSurveyForm();
        renderDashboardQuestionCards();
        checkSurveyStatus();
        updateDashboardSurveySelector();
        
        if (syncStatusText) {
          syncStatusText.innerText = "เชื่อมต่อและดึงข้อมูลแบบสอบถามแล้ว";
          syncStatusText.style.color = "var(--success)";
        }
        if (syncDot) syncDot.classList.add('connected');
      } else {
        console.error("Apps Script load error:", res.message);
        loadDefaultSettingsAndSchema();
      }
    })
    .catch(err => {
      console.error("Failed to fetch settings from Apps Script:", err);
      loadDefaultSettingsAndSchema();
    });
}

function loadDefaultSettingsAndSchema() {
  const localSurveys = localStorage.getItem("surveys_list");
  if (localSurveys) {
    surveys = JSON.parse(localSurveys);
  } else {
    const localSettings = localStorage.getItem("survey_settings");
    const localSchema = localStorage.getItem("survey_schema");
    
    const initialSurvey = {
      id: "s_default",
      surveyName: "แบบประเมินออนไลน์ ความคิดเห็นและความพึงพอใจต่อภาพรวมของการจัดเวที “สานพลัง สร้างนวัตกรรม สู่สุขภาวะชุมชนที่ยั่งยืน” ปี 2568",
      startTime: "2026-07-03T13:00",
      endTime: "2026-07-05T13:00",
      isActive: true,
      schema: DEFAULT_SCHEMA
    };
    
    if (localSettings) {
      const parsedSettings = JSON.parse(localSettings);
      initialSurvey.surveyName = parsedSettings.surveyName || initialSurvey.surveyName;
      initialSurvey.startTime = parsedSettings.startTime || "";
      initialSurvey.endTime = parsedSettings.endTime || "";
      initialSurvey.isActive = parsedSettings.isActive !== undefined ? parsedSettings.isActive : true;
    }
    if (localSchema) {
      initialSurvey.schema = JSON.parse(localSchema);
    }
    
    surveys = [initialSurvey];
    localStorage.setItem("surveys_list", JSON.stringify(surveys));
  }
  
  // Ensure all surveys have tokens
  let updatedLocal = false;
  surveys.forEach(s => {
    if (!s.accessToken) {
      s.accessToken = "tk_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      updatedLocal = true;
    }
  });
  if (updatedLocal) {
    localStorage.setItem("surveys_list", JSON.stringify(surveys));
  }
  
  let activeSurvey = surveys.find(s => s.isActive);
  if (!activeSurvey && surveys.length > 0) activeSurvey = surveys[0];
  
  if (activeSurvey) {
    currentSettings = {
      id: activeSurvey.id,
      surveyName: activeSurvey.surveyName,
      startTime: activeSurvey.startTime,
      endTime: activeSurvey.endTime,
      isActive: activeSurvey.isActive,
      blockRepeat: activeSurvey.blockRepeat === true,
      accessToken: activeSurvey.accessToken
    };
    currentSchema = activeSurvey.schema || DEFAULT_SCHEMA;
  } else {
    currentSettings = {
      id: "default",
      surveyName: "ไม่มีแบบสอบถามที่เปิดใช้งาน",
      startTime: "",
      endTime: "",
      isActive: false
    };
    currentSchema = DEFAULT_SCHEMA;
  }
  
  rebuildQuestionsMeta();
  applySettings();
  renderSurveyForm();
  renderDashboardQuestionCards();
  checkSurveyStatus();
  updateDashboardSurveySelector();
  
  if (syncStatusText) {
    syncStatusText.innerText = "ใช้งานโหมดจำลอง (Local Mode)";
    syncStatusText.style.color = "var(--text-muted)";
  }
}

function updateDashboardSurveySelector() {
  const selector = document.getElementById("dashboard-survey-selector");
  if (!selector) return;
  
  const currentVal = selector.value || "all";
  selector.innerHTML = '<option value="all">ดูทุกแบบสอบถามรวมกัน</option>';
  
  surveys.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.innerText = s.surveyName;
    selector.appendChild(opt);
  });
  
  selector.value = currentVal;
  if (!selector.value) selector.value = "all";
}

function applySettings() {
  const headerTitle = document.getElementById("header-survey-title");
  if (headerTitle) headerTitle.innerText = currentSettings.surveyName;
  
  const welcomeTitle = document.getElementById("dashboard-welcome-title");
  if (welcomeTitle) welcomeTitle.innerText = "แดชบอร์ดสรุปผลภาพรวม - " + currentSettings.surveyName;
  
  const activeSubtitle = document.getElementById("survey-active-subtitle");
  if (activeSubtitle) activeSubtitle.innerText = "ความคิดเห็นและความพึงพอใจต่อภาพรวมของการจัดงาน";
}

function checkSurveyStatus() {
  const closedPane = document.getElementById("survey-closed-pane");
  const activeHeader = document.getElementById("survey-active-header");
  const form = document.getElementById("evaluation-form");
  
  const now = new Date();
  let isClosed = !currentSettings.isActive;
  let closedMessage = "แบบสอบถามถูกปิดใช้งานชั่วคราวโดยผู้ดูแลระบบ";
  
  // Check Access Token requirement for non-admin users
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  const isAdmin = sessionStorage.getItem("admin_token") !== null;
  
  if (!isAdmin) {
    if (!urlToken) {
      isClosed = true;
      closedMessage = "กรุณาใช้งานผ่านลิงก์แบบสอบถามที่มีรหัสเข้าถึง (Access Token) หรือสแกน QR Code ที่ผู้จัดงานเตรียมไว้ให้";
    } else if (currentSettings.accessToken && urlToken !== currentSettings.accessToken) {
      isClosed = true;
      closedMessage = "รหัสสิทธิ์เข้าถึง (Access Token) ของแบบสอบถามนี้ไม่ถูกต้องหรือไม่ได้รับสิทธิ์ในการประเมินผล";
    }
  }
  
  if (currentSettings.startTime) {
    const start = parseThaiDateTime(currentSettings.startTime);
    if (start && now < start) {
      isClosed = true;
      closedMessage = "แบบสอบถามยังไม่เปิดให้กรอกข้อมูล (จะเปิดให้กรอกตั้งแต่วันที่ " + formatThaiDateTime(start) + ")";
    }
  }
  
  if (currentSettings.endTime) {
    const end = parseThaiDateTime(currentSettings.endTime);
    if (end && now > end) {
      isClosed = true;
      closedMessage = "แบบสอบถามสิ้นสุดระยะเวลาการเก็บข้อมูลแล้ว (ปิดรับคำตอบเมื่อวันที่ " + formatThaiDateTime(end) + ")";
    }
  }
  
  if (!currentSettings.isActive && currentSettings.id !== "not_found" && (!urlToken || urlToken === currentSettings.accessToken)) {
    closedMessage = "แบบสอบถามถูกปิดใช้งานชั่วคราวโดยผู้ดูแลระบบ";
  }
  
  if (currentSettings.id === "not_found") {
    isClosed = true;
    closedMessage = "ไม่พบแบบสอบถามที่ระบุ หรือไม่มีรหัสสิทธิ์เข้าถึงที่ถูกต้อง";
  }

  // ห้ามทำแบบสอบถามซ้ำจากอุปกรณ์เดิม (เปิด/ปิดได้รายแบบสอบถามที่หน้าตั้งค่า)
  let isRepeatBlocked = false;
  if (!isClosed && currentSettings.blockRepeat && localStorage.getItem("survey_completed_" + currentSettings.id)) {
    isClosed = true;
    isRepeatBlocked = true;
    closedMessage = "อุปกรณ์เครื่องนี้ได้ส่งคำตอบแบบสอบถามนี้ไปแล้ว ขอขอบพระคุณที่ร่วมตอบแบบสอบถาม (จำกัดการตอบ 1 ครั้งต่อ 1 อุปกรณ์)";
  }

  if (isClosed) {
    if (closedPane) closedPane.classList.remove("hidden");
    if (activeHeader) activeHeader.classList.add("hidden");
    if (form) form.classList.add("hidden");

    const msgEl = document.getElementById("closed-pane-message");
    if (msgEl) msgEl.innerText = closedMessage;

    // Show/hide back to dashboard on closed screen depending on admin session
    const btnClosedBackDash = document.getElementById("btn-closed-back-dash");
    if (btnClosedBackDash) {
      if (sessionStorage.getItem("admin_token")) {
        btnClosedBackDash.classList.remove("hidden");
      } else {
        btnClosedBackDash.classList.add("hidden");
      }
    }

    // ปุ่มปลดล็อกการทำซ้ำ: แสดงเฉพาะกรณีถูกล็อกจากการทำซ้ำ และผู้ใช้เป็นแอดมิน
    const btnResetRepeat = document.getElementById("btn-reset-repeat");
    if (btnResetRepeat) {
      if (isRepeatBlocked && sessionStorage.getItem("admin_token")) {
        btnResetRepeat.classList.remove("hidden");
      } else {
        btnResetRepeat.classList.add("hidden");
      }
    }
  } else {
    if (closedPane) closedPane.classList.add("hidden");
    if (activeHeader) activeHeader.classList.remove("hidden");
    if (form) form.classList.remove("hidden");
  }
}

function formatThaiDateTime(date) {
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear(); // แสดงปีเป็น ค.ศ. ทั้งระบบ
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} เวลา ${hours}:${minutes} น.`;
}

function parseThaiDateTime(str) {
  if (!str) return null;
  // Clean string and replace 'เวลา' and 'น.' with spaces, then squeeze spaces
  const cleanStr = str.replace(/เวลา/g, ' ').replace(/น\./g, ' ').replace(/\s+/g, ' ').trim();
  
  // รูปแบบอื่นที่ไม่ใช่ "DD/MM/YYYY [HH:mm]" (เช่น ISO หรือ Date string ยาวที่ Google Sheets ส่งกลับ)
  // ให้ JS parse ตรง ๆ — ห้ามเช็คด้วย includes('T') เพราะคำว่า "GMT"/"Time" ก็มีตัว T
  if (!/^\d{1,2}\/\d{1,2}\/\d{4}/.test(cleanStr)) {
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return null;
    // ข้อมูลเก่าที่ชีตเคยตีความปี พ.ศ. เป็น ค.ศ. (ปีเกิน 2400) ให้ลดกลับ 543 ปี
    if (d.getFullYear() > 2400) d.setFullYear(d.getFullYear() - 543);
    return d;
  }
  
  const parts = cleanStr.split(' ');
  const datePart = parts[0]; // "DD/MM/YYYY"
  const timePart = parts[1] || "00:00"; // "HH:mm"
  
  const dateSubparts = datePart.split('/');
  if (dateSubparts.length !== 3) return null;
  
  const day = parseInt(dateSubparts[0], 10);
  const month = parseInt(dateSubparts[1], 10) - 1; // 0-indexed month
  let year = parseInt(dateSubparts[2], 10);
  
  // Convert Buddhist year (>2400) to Christian year
  if (year > 2400) {
    year -= 543;
  }
  
  const timeSubparts = timePart.split(':');
  const hours = parseInt(timeSubparts[0] || 0, 10);
  const minutes = parseInt(timeSubparts[1] || 0, 10);
  
  const parsedDate = new Date(year, month, day, hours, minutes);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function convertToInputFormat(val) {
  if (!val) return "";
  // แปลงทุกรูปแบบ (รวมค่าปี พ.ศ. เดิม) ให้เป็น "DD/MM/YYYY HH:mm" ปี ค.ศ. เสมอ
  const date = parseThaiDateTime(val);
  if (!date) return val;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// CHECK DUPLICATE SUBMISSION STATE
// การบล็อกการทำซ้ำจริงอยู่ใน checkSurveyStatus() — ฟังก์ชันนี้คงไว้ตามจุดเรียกเดิม
function checkIfSurveyCompleted() {
}

// ฝังเครื่องหมาย "อุปกรณ์นี้ส่งคำตอบแล้ว" ลงเครื่องผู้ตอบ (เฉพาะแบบสอบถามที่เปิดใช้ห้ามทำซ้ำ)
function markSurveyCompletedOnDevice() {
  if (currentSettings.blockRepeat && currentSettings.id) {
    localStorage.setItem("survey_completed_" + currentSettings.id, new Date().toISOString());
  }
}

function showView(viewName) {
  const viewDashboard = document.getElementById('view-dashboard');
  const viewSurvey = document.getElementById('view-survey');
  
  if (viewDashboard) viewDashboard.classList.remove('active');
  if (viewSurvey) viewSurvey.classList.remove('active');
  
  checkIfSurveyCompleted();
  checkSurveyStatus();

  if (viewName === 'dashboard') {
    if (viewDashboard) viewDashboard.classList.add('active');
    renderDashboardOverview();
    refreshDashboardData(); // ดึงข้อมูลล่าสุดทันทีเมื่อเข้าหน้าแดชบอร์ด

    if (btnGoSurvey) btnGoSurvey.classList.remove('hidden');
    if (btnBackDashboard) btnBackDashboard.classList.add('hidden');
    if (btnGoAdmin) btnGoAdmin.classList.add('hidden');
    
    // Update URL to ?v=admin
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('v', 'admin');
    urlParams.delete('mode');
    const newSearch = urlParams.toString();
    window.history.pushState(null, '', window.location.pathname + (newSearch ? '?' + newSearch : ''));
  } else if (viewName === 'survey') {
    if (viewSurvey) viewSurvey.classList.add('active');
    
    if (btnGoSurvey) btnGoSurvey.classList.add('hidden');
    
    const token = sessionStorage.getItem("admin_token");
    if (token) {
      if (btnBackDashboard) btnBackDashboard.classList.remove('hidden');
      if (btnGoAdmin) btnGoAdmin.classList.add('hidden');
    } else {
      if (btnBackDashboard) btnBackDashboard.classList.add('hidden');
      if (btnGoAdmin) btnGoAdmin.classList.remove('hidden');
    }
    
    // Update URL to remove v=admin or v=survey (keeping id if any)
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete('v');
    urlParams.delete('mode');
    const newSearch = urlParams.toString();
    window.history.pushState(null, '', window.location.pathname + (newSearch ? '?' + newSearch : ''));
    
    goToWizardStep(0);
  }
}

// WIZARD STEP SYSTEM
function setupFormWizard() {
  const form = document.getElementById('evaluation-form');
  
  form.querySelectorAll('.btn-next-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const currentStepPane = form.querySelector('.form-step-pane.active');
      const currentStep = parseInt(currentStepPane.getAttribute('data-step'));
      
      if (validateStep(currentStep)) {
        goToWizardStep(currentStep + 1);
      }
    });
  });

  form.querySelectorAll('.btn-prev-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const currentStepPane = form.querySelector('.form-step-pane.active');
      const currentStep = parseInt(currentStepPane.getAttribute('data-step'));
      goToWizardStep(currentStep - 1);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const currentStepPane = form.querySelector('.form-step-pane.active');
    const currentStep = parseInt(currentStepPane.getAttribute('data-step'));
    
    if (validateStep(currentStep)) {
      submitFormAnswers();
    }
  });
}

function goToWizardStep(stepNum) {
  document.querySelectorAll('.form-step-pane').forEach(pane => pane.classList.remove('active'));
  document.querySelector(`.form-step-pane[data-step="${stepNum}"]`).classList.add('active');
  
  document.querySelectorAll('.progress-step').forEach((el, idx) => {
    el.classList.remove('active', 'completed');
    if (idx === stepNum) {
      el.classList.add('active');
    } else if (idx < stepNum) {
      el.classList.add('completed');
    }
  });
  
  document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function validateStep(stepNum) {
  let isValid = true;
  const pane = document.querySelector(`.form-step-pane[data-step="${stepNum}"]`);
  
  pane.querySelectorAll('.form-group.has-error').forEach(el => el.classList.remove('has-error'));
  pane.querySelectorAll('.likert-form-card.has-error').forEach(el => el.classList.remove('has-error'));
  pane.querySelectorAll('.sub-rate-item.has-error').forEach(el => el.classList.remove('has-error'));

  // ฟอร์มรวมเป็นขั้นตอนเดียว (step 1) จึงตรวจสอบคำถามทุกข้อ
  const stepQuestions = stepNum === 0 ? [] : currentSchema;
  
  if (stepNum === 0) {
    const consentVal = pane.querySelector('input[name="Consent"]:checked');
    if (!consentVal) {
      pane.querySelector('.consent-options').closest('.form-group').classList.add('has-error');
      isValid = false;
    } else if (consentVal.value === "ไม่ยินยอม") {
      alert("ขอขอบพระคุณท่านสำหรับการเข้าชมระบบ คณะทำงานวิจัยต้องขออภัยที่ไม่สามารถเก็บข้อมูลจากท่านได้หากท่านไม่ประสงค์กดยินยอมเข้าร่วมโครงการ");
      isValid = false;
    }
  } else {
    stepQuestions.forEach(q => {
      if (!q.required) return;
      
      let qValid = true;
      
      if (q.type === "categorical" || q.type === "likert") {
        const checked = pane.querySelector(`input[name="${q.id}"]:checked`);
        if (!checked) qValid = false;
      }
      else if (q.type === "dropdown") {
        const sel = pane.querySelector(`select[name="${q.id}"]`);
        if (!sel || !sel.value) qValid = false;
      }
      else if (q.type === "numeric") {
        const el = pane.querySelector(`input[name="${q.id}"]`);
        const val = el ? el.value : "";
        if (val === "" || isNaN(val)) {
          qValid = false;
        } else {
          const num = Number(val);
          if (q.min !== undefined && num < q.min) qValid = false;
          if (q.max !== undefined && num > q.max) qValid = false;
        }
      }
      else if (q.type === "text") {
        const el = pane.querySelector(`input[name="${q.id}"], textarea[name="${q.id}"]`);
        const val = el ? el.value.trim() : "";
        if (val === "") {
          qValid = false;
        } else if (q.pattern) {
          const regex = new RegExp(q.pattern);
          if (!regex.test(val)) qValid = false;
        }
      }
      else if (q.type === "multi-select") {
        const checked = pane.querySelectorAll(`input[name="${q.id}_List"]:checked`);
        if (checked.length === 0) qValid = false;
      }
      else if (q.type === "facilities") {
        q.subfields.forEach(sub => {
          const checked = pane.querySelector(`input[name="${sub}"]:checked`);
          if (!checked) {
            qValid = false;
            const row = pane.querySelector(`input[name="${sub}"]`);
            if (row) row.closest('.sub-rate-item').classList.add('has-error');
          }
        });
      }
      
      if (!qValid) {
        isValid = false;
        const input = pane.querySelector(`[name="${q.id}"], [name="${q.id}_List"], [name="${q.id}_Item"]`);
        if (input) {
          const container = input.closest('.form-group') || input.closest('.likert-form-card') || input.closest('.facilities-rating-card');
          if (container) container.classList.add('has-error');
        }
      }
    });
  }

  if (!isValid) {
    const firstErr = pane.querySelector('.has-error, .sub-rate-item.has-error');
    if (firstErr) {
      firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return isValid;
}

// DYNAMIC GENERATION OF ELEMENTS IN SURVEY
function renderSurveyForm() {
  const container = document.getElementById("survey-questions-content");
  if (!container) return;

  let html = "";

  // แสดงคำอธิบายสเกล 1-5 เมื่อมีคำถามแบบ Likert
  if (currentSchema.some(q => q.type === "likert")) {
    html += `
      <div class="scale-legend">
        <span class="legend-item"><span class="badge">5</span> มากที่สุด</span>
        <span class="legend-item"><span class="badge">4</span> มาก</span>
        <span class="legend-item"><span class="badge">3</span> ปานกลาง</span>
        <span class="legend-item"><span class="badge">2</span> น้อย</span>
        <span class="legend-item"><span class="badge">1</span> น้อยที่สุด</span>
      </div>
    `;
  }

  currentSchema.forEach(q => {
    if (q.type === "years-checkbox" || q.id === "Attendance_Years") {
      html += `
        <div class="form-group hidden" id="attendance-years-wrapper">
          <label class="form-label">${escapeHtml(q.text)}</label>
          <div class="checkbox-grid"><!-- Populated dynamically --></div>
          <input type="hidden" name="Attendance_Years" id="input-attend-years">
        </div>
      `;
    } else if (q.type === "likert") {
      const sectionName = q.section === "Context" ? "ด้านบริบทเวทีสานพลัง (Context)" :
                          q.section === "Input" ? "ด้านปัจจัยนำเข้า (Input)" :
                          q.section === "Process" ? "ด้านกระบวนการจัดการ (Process)" :
                          q.section === "Output" ? "ด้านผลลัพธ์เวทีฯ (Output/Outcome)" :
                          q.section === "Infographic" ? "ภาพอินโฟกราฟฟิก (Infographic)" : "";
      const imageHtml = q.image ? `<div class="infographic-preview-box" style="margin-bottom:16px;"><img src="${escapeHtml(q.image)}" alt="ภาพประกอบ" style="max-width:100%; height:auto; border-radius:8px; border:1px solid var(--border-color); display:block; margin:0 auto;"></div>` : "";
      html += `
        <div class="likert-form-card" data-qid="${escapeHtml(q.id)}">
          <div class="likert-card-header">
            <span class="likert-q-num">${escapeHtml(q.id)}${sectionName ? " • " + sectionName : ""}</span>
          </div>
          <div class="likert-q-text">${escapeHtml(q.text)}</div>
          ${imageHtml}
          ${buildScoreRadios(q.id, 5)}
          <div class="error-message">กรุณาให้คะแนนข้อคำถามนี้</div>
        </div>
      `;
    } else {
      html += `<div class="form-group" data-qid="${escapeHtml(q.id)}">`;
      html += renderAnswerField(q);
      html += `<div class="error-message">กรุณากรอกข้อมูลในข้อนี้ให้ถูกต้อง</div>`;
      html += `</div>`;
    }
  });

  container.innerHTML = html;
  generateYearsCheckboxes();
  bindAnswerFieldEvents(container, currentSchema);
}

// สร้างปุ่มให้คะแนนแบบเรดิโอ 1..max (ใช้กับ Likert และ facilities)
function buildScoreRadios(name, max) {
  let h = '<div class="radio-grid-row">';
  for (let i = 1; i <= max; i++) {
    h += `<label class="btn-radio-score"><input type="radio" name="${escapeHtml(name)}" value="${i}"><span>${i}</span></label>`;
  }
  h += '</div>';
  return h;
}

// ช่อง "อื่น ๆ โปรดระบุ"
function otherInputDiv(id) {
  return `
    <div class="div-other hidden" id="div-${escapeHtml(id)}-other" style="margin-top:8px;">
      <input type="text" name="${escapeHtml(id)}_Other" class="form-control" placeholder="โปรดระบุรายละเอียด...">
    </div>
  `;
}

// สร้าง HTML (label + ช่องกรอกคำตอบ) ของคำถามหนึ่งข้อตามรูปแบบการตอบ — ใช้ได้ทุกส่วน (step 1/2/3)
function renderAnswerField(q) {
  const star = q.required ? ' <span style="color:var(--danger)">*</span>' : "";
  const label = `<label class="form-label">${escapeHtml(q.text)}${star}</label>`;
  const choices = q.choices || [];

  switch (q.type) {
    case "categorical": {
      let h = label + `<div class="radio-options-grid">`;
      choices.forEach(choice => {
        h += `<label class="custom-radio"><input type="radio" name="${escapeHtml(q.id)}" value="${escapeHtml(choice)}"><span class="radio-label-text">${escapeHtml(choice)}</span></label>`;
      });
      h += `</div>`;
      if (q.hasOther) h += otherInputDiv(q.id);
      return h;
    }
    case "multi-select": {
      let h = label + `<div class="checkbox-grid-channels">`;
      choices.forEach(choice => {
        h += `<label class="custom-checkbox"><input type="checkbox" name="${escapeHtml(q.id)}_List" value="${escapeHtml(choice)}"><span class="checkbox-box"></span><span class="checkbox-text">${escapeHtml(choice)}</span></label>`;
      });
      h += `</div>`;
      if (q.hasOther) h += otherInputDiv(q.id);
      return h;
    }
    case "dropdown": {
      let h = label + `<select name="${escapeHtml(q.id)}" class="form-control"><option value="">-- กรุณาเลือก --</option>`;
      choices.forEach(choice => {
        h += `<option value="${escapeHtml(choice)}">${escapeHtml(choice)}</option>`;
      });
      h += `</select>`;
      if (q.hasOther) h += otherInputDiv(q.id);
      return h;
    }
    case "numeric":
      return label + `<input type="number" name="${escapeHtml(q.id)}" id="input-${escapeHtml(q.id)}" class="form-control" min="${q.min !== undefined ? q.min : ''}" max="${q.max !== undefined ? q.max : ''}" placeholder="${escapeHtml(q.text)}">`;
    case "text":
      if (q.multiline) {
        return label + `<textarea name="${escapeHtml(q.id)}" rows="3" class="form-control" placeholder="พิมพ์คำตอบที่นี่..."></textarea>`;
      }
      return label + `<input type="text" name="${escapeHtml(q.id)}" class="form-control" placeholder="${escapeHtml(q.text)}">`;
    case "likert": {
      let h = label;
      if (q.image) {
        h += `<div class="infographic-preview-box" style="margin-bottom:16px;"><img src="${escapeHtml(q.image)}" alt="ภาพประกอบ" style="max-width:100%; height:auto; border-radius:8px; border:1px solid var(--border-color); display:block; margin:0 auto;"></div>`;
      }
      h += buildScoreRadios(q.id, 5);
      return h;
    }
    case "score10": {
      const valLabel = "val-" + q.id;
      return label + `
        <div class="slider-wrapper">
          <input type="range" name="${escapeHtml(q.id)}" min="1" max="10" value="10" class="custom-slider" data-vallabel="${escapeHtml(valLabel)}">
          <div class="slider-value-display">คะแนนที่ให้: <span id="${escapeHtml(valLabel)}" class="slider-val" style="font-weight:700; color:var(--accent)">10</span> / 10</div>
        </div>
      `;
    }
    case "ranking": {
      let h = label + `<div class="ranking-sort-container"><ul id="sortable-${escapeHtml(q.id)}" class="ranking-list" data-qid="${escapeHtml(q.id)}">`;
      choices.forEach((choice, idx) => {
        h += `<li class="ranking-item" draggable="true" data-id="${escapeHtml(choice)}"><span class="rank-badge">${idx + 1}</span><span class="rank-text">${escapeHtml(choice)}</span><span class="rank-handle">☰</span></li>`;
      });
      h += `</ul></div>`;
      choices.forEach((choice, idx) => {
        h += `<input type="hidden" name="${escapeHtml(q.id)}_Rank${idx + 1}" id="input-${escapeHtml(q.id)}-r${idx + 1}" value="${escapeHtml(choice)}">`;
      });
      return h;
    }
    case "facilities": {
      let h = `<label class="form-label" style="font-weight:600; margin-bottom:12px;">${escapeHtml(q.text)}${star}</label><div class="facilities-rating-card">`;
      (q.subfields || []).forEach((sub, idx) => {
        const sublabel = (q.sublabels && q.sublabels[idx] !== undefined) ? q.sublabels[idx] : sub;
        h += `<div class="sub-rate-item"><span class="sub-rate-title">${escapeHtml(sublabel)} <span style="color:var(--danger)">*</span></span>${buildScoreRadios(sub, 5)}<div class="error-message">กรุณาให้คะแนนส่วนนี้</div></div>`;
      });
      h += `</div>`;
      return h;
    }
    default:
      return label + `<input type="text" name="${escapeHtml(q.id)}" class="form-control" placeholder="${escapeHtml(q.text)}">`;
  }
}

// ผูกอีเวนต์หลัง render: ตัวเลือก "อื่น ๆ", สไลเดอร์คะแนน, การจัดเรียงลำดับ และการเชื่อมจำนวนครั้ง->ปีที่เข้าร่วม
function bindAnswerFieldEvents(scope, questions) {
  questions.forEach(q => {
    if (q.hasOther) {
      if (q.type === "categorical" || q.type === "dropdown") {
        scope.querySelectorAll(`[name="${q.id}"]`).forEach(el => {
          el.addEventListener('change', () => {
            const sel = scope.querySelector(`select[name="${q.id}"]`);
            const checkedVal = sel ? sel.value : (scope.querySelector(`input[name="${q.id}"]:checked`)?.value || "");
            const div = document.getElementById(`div-${q.id}-other`);
            if (div) div.classList.toggle('hidden', checkedVal !== "อื่น ๆ");
          });
        });
      } else if (q.type === "multi-select") {
        scope.querySelectorAll(`input[name="${q.id}_List"]`).forEach(c => {
          c.addEventListener('change', () => {
            const checked = Array.from(scope.querySelectorAll(`input[name="${q.id}_List"]:checked`)).map(el => el.value);
            const div = document.getElementById(`div-${q.id}-other`);
            if (div) div.classList.toggle('hidden', !checked.includes("อื่น ๆ"));
          });
        });
      }
    }

    // เทมเพลต: จำนวนครั้งที่เข้าร่วม > 0 จึงแสดงช่องเลือกปี
    if (q.id === "Attendance_Count") {
      const input = scope.querySelector(`#input-Attendance_Count`);
      if (input) {
        input.addEventListener('input', (e) => {
          const val = parseInt(e.target.value);
          const wrapper = document.getElementById('attendance-years-wrapper');
          if (wrapper) {
            if (val > 0) {
              wrapper.classList.remove('hidden');
            } else {
              wrapper.classList.add('hidden');
              wrapper.querySelectorAll('input:checked').forEach(c => c.checked = false);
              const iy = document.getElementById('input-attend-years');
              if (iy) iy.value = "";
            }
          }
        });
      }
    }
  });

  // สไลเดอร์คะแนน 1-10
  scope.querySelectorAll('.custom-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const valLabel = e.target.getAttribute('data-vallabel');
      const valEl = valLabel ? document.getElementById(valLabel) : null;
      if (valEl) valEl.innerText = e.target.value;
    });
  });

  // การจัดเรียงลำดับ (ranking)
  setupRankingSortable();
}

function generateYearsCheckboxes() {
  const yearsWrapper = document.getElementById('attendance-years-wrapper');
  if (!yearsWrapper) return;
  const container = yearsWrapper.querySelector('.checkbox-grid');
  if (!container) return;
  
  let html = '';
  for (let year = 2554; year <= 2567; year++) {
    if (year === 2564) continue;
    html += `
      <label class="custom-checkbox">
        <input type="checkbox" name="Attend_Year_Item" value="${year}">
        <span class="checkbox-box"></span>
        <span class="checkbox-text">ปี ${year}</span>
      </label>
    `;
  }
  container.innerHTML = html;

  container.querySelectorAll('input').forEach(chk => {
    chk.addEventListener('change', () => {
      const checkedVals = Array.from(container.querySelectorAll('input:checked')).map(el => el.value);
      document.getElementById('input-attend-years').value = checkedVals.join(", ");
    });
  });
}

// DRAG-AND-DROP หรือ CLICK-TO-SORT — รองรับคำถามแบบ ranking ได้หลายข้อพร้อมกัน
function setupRankingSortable() {
  document.querySelectorAll('.ranking-list').forEach(list => {
    if (list.dataset.rankBound === "1") return; // กันผูกอีเวนต์ซ้ำ
    list.dataset.rankBound = "1";
    setupOneRankingList(list);
  });
}

function setupOneRankingList(list) {
  let draggingItem = null;

  list.querySelectorAll('.ranking-item').forEach(item => {
    item.addEventListener('dragstart', () => {
      draggingItem = item;
      item.classList.add('dragging');
    });

    item.addEventListener('dragend', () => {
      draggingItem = null;
      item.classList.remove('dragging');
      updateRankingValuesFor(list);
    });

    item.addEventListener('click', () => {
      const prev = item.previousElementSibling;
      if (prev) {
        list.insertBefore(item, prev);
      } else {
        list.appendChild(item);
      }
      updateRankingValuesFor(list);
    });
  });

  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(list, e.clientY);
    if (afterElement == null) {
      list.appendChild(draggingItem);
    } else {
      list.insertBefore(draggingItem, afterElement);
    }
  });

  updateRankingValuesFor(list);
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.ranking-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateRankingValuesFor(list) {
  const qid = list.getAttribute('data-qid');
  const items = [...list.querySelectorAll('.ranking-item')];
  items.forEach((item, index) => {
    const badge = item.querySelector('.rank-badge');
    if (badge) badge.innerText = index + 1;
    const input = document.getElementById(`input-${qid}-r${index + 1}`);
    if (input) input.value = item.getAttribute('data-id');
  });
}

// ==========================================================
// GOOGLE SIGN-IN & ADMIN AUTHENTICATION LOGIC
// ==========================================================

function initAdminAuth() {
  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    newLogoutBtn.addEventListener("click", handleLogout);
  }

  const token = sessionStorage.getItem("admin_token");
  const email = sessionStorage.getItem("admin_email");
  
  if (token && email) {
    showAdminSession(email);
    fetchDataSecurely(token);
  } else {
    showLoginPane();
  }
}

function showAdminSession(email) {
  const profileHeader = document.getElementById("admin-profile-header");
  const emailEl = document.getElementById("admin-email");
  if (profileHeader && emailEl) {
    emailEl.innerText = email;
    const avatarEl = profileHeader.querySelector(".admin-avatar");
    if (avatarEl) {
      avatarEl.innerText = email.charAt(0).toUpperCase();
    }
    profileHeader.classList.remove("hidden");
  }
}

function showLoginPane() {
  const loginPane = document.getElementById("dashboard-login-pane");
  const dashboardContent = document.getElementById("dashboard-content");
  const profileHeader = document.getElementById("admin-profile-header");
  
  if (loginPane) loginPane.classList.remove("hidden");
  if (dashboardContent) dashboardContent.classList.add("hidden");
  if (profileHeader) profileHeader.classList.add("hidden");
  
  if (!GOOGLE_CLIENT_ID) {
    renderMockLogin();
  } else {
    renderRealGoogleLogin();
  }
}

function renderMockLogin() {
  const container = document.getElementById("google-login-btn");
  if (!container) return;
  
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px; width:100%; max-width:280px; margin:0 auto;">
      <input type="email" id="mock-email-input" class="form-control" placeholder="ระบุอีเมลแอดมินเพื่อเข้าระบบทดสอบ" style="text-align:center;">
      <button type="button" id="btn-mock-login" class="btn-primary" style="justify-content:center; width:100%;">
        เข้าสู่ระบบด้วยบัญชีจำลอง
      </button>
    </div>
  `;
  
  document.getElementById("btn-mock-login").addEventListener("click", () => {
    const emailInput = document.getElementById("mock-email-input").value.trim().toLowerCase();
    const errorMsg = document.getElementById("login-error-msg");
    if (errorMsg) errorMsg.classList.add("hidden");
    
    if (mockAdmins.map(e => e.toLowerCase()).includes(emailInput) || emailInput === "earth.ekka@gmail.com") {
      if (!mockAdmins.includes("earth.ekka@gmail.com")) mockAdmins.push("earth.ekka@gmail.com");
      
      sessionStorage.setItem("admin_token", "mock-token-admin");
      sessionStorage.setItem("admin_email", emailInput);
      showAdminSession(emailInput);
      
      if (document.getElementById("dashboard-login-pane")) {
        document.getElementById("dashboard-login-pane").classList.add("hidden");
      }
      if (document.getElementById("dashboard-content")) {
        document.getElementById("dashboard-content").classList.remove("hidden");
      }
      
      renderDashboardOverview();
      loadAdmins();
    } else if (emailInput === "") {
      alert("กรุณากรอกอีเมลจำลอง");
    } else {
      if (errorMsg) {
        errorMsg.innerText = `บัญชี ${emailInput} ไม่ได้รับสิทธิ์ผู้ดูแลระบบ`;
        errorMsg.classList.remove("hidden");
      }
    }
  });
}

let googleLoginRetryTimer = null;

function renderRealGoogleLogin(attempt = 0) {
  const container = document.getElementById("google-login-btn");
  if (!container) return;

  if (googleLoginRetryTimer) {
    clearTimeout(googleLoginRetryTimer);
    googleLoginRetryTimer = null;
  }

  // SDK โหลดแบบ async defer จึงอาจมาช้ากว่าตอนหน้า login แสดง — ต้องรอจนพร้อมก่อนค่อย render ปุ่ม
  if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
    if (attempt >= 50) {
      console.error("Google Login initialization failed: gsi/client script did not load within 10s");
      container.innerHTML = `<p style="color:var(--danger); font-size:0.85rem;">ไม่สามารถโหลดปุ่ม Google Sign-In ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชหน้าอีกครั้ง</p>`;
      return;
    }
    if (attempt === 0) {
      container.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">กำลังโหลดปุ่มเข้าสู่ระบบ Google...</p>`;
    }
    googleLoginRetryTimer = setTimeout(() => renderRealGoogleLogin(attempt + 1), 200);
    return;
  }

  container.innerHTML = "";

  try {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
      container,
      { theme: "outline", size: "large", width: 280, text: "signin_with" }
    );
  } catch (err) {
    console.error("Google Login initialization failed:", err);
    container.innerHTML = `<p style="color:var(--danger); font-size:0.85rem;">ไม่สามารถโหลดปุ่ม Google Sign-In ได้</p>`;
  }
}

function handleCredentialResponse(response) {
  const token = response.credential;
  sessionStorage.setItem("admin_token", token);
  fetchDataSecurely(token);
}

function fetchDataSecurely(token) {
  const loginPane = document.getElementById("dashboard-login-pane");
  const dashboardContent = document.getElementById("dashboard-content");
  const errorMsg = document.getElementById("login-error-msg");
  
  if (errorMsg) errorMsg.classList.add("hidden");

  if (!APPS_SCRIPT_URL) {
    console.log("ไม่มี APPS_SCRIPT_URL: ปลดล็อกแดชบอร์ดด้วยสถิติจำลอง");
    const email = sessionStorage.getItem("admin_email") || "earth.ekka@gmail.com";
    showAdminSession(email);
    if (loginPane) loginPane.classList.add("hidden");
    if (dashboardContent) dashboardContent.classList.remove("hidden");
    appData = [...MOCK_RESPONSES];
    renderDashboardOverview();
    return;
  }

  if (syncStatusText) {
    syncStatusText.innerText = "กำลังตรวจสอบสิทธิ์...";
  }
  if (syncDot) syncDot.classList.remove('connected');

  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action: "fetch_data",
      idToken: token
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("HTTP error " + res.status);
    return res.json();
  })
  .then(res => {
    if (res.status === "success") {
      sessionStorage.setItem("admin_email", res.email);
      showAdminSession(res.email);
      
      appData = res.data;
      if (loginPane) loginPane.classList.add("hidden");
      if (dashboardContent) dashboardContent.classList.remove("hidden");
      
      if (syncStatusText) {
        syncStatusText.innerText = "เชื่อมต่อฐานข้อมูลเรียบร้อยแล้ว";
        syncStatusText.style.color = "var(--success)";
      }
      if (syncDot) syncDot.classList.add('connected');

      lastDataHash = computeDataHash(appData);
      renderDashboardOverview();
      startDashboardPolling();
    } else if (res.status === "unauthorized") {
      sessionStorage.clear();
      showLoginPane();
      if (errorMsg) {
        errorMsg.innerText = res.message || "บัญชี Google นี้ไม่ได้รับสิทธิ์ผู้ดูแลระบบ";
        errorMsg.classList.remove("hidden");
      }
      if (syncStatusText) {
        syncStatusText.innerText = "ไม่มีสิทธิ์เข้าใช้งาน";
        syncStatusText.style.color = "var(--danger)";
      }
    } else {
      sessionStorage.clear();
      showLoginPane();
      alert("ตรวจสอบสิทธิ์แอดมินล้มเหลว: " + res.message);
    }
  })
  .catch(err => {
    console.error("Auth server connection failed:", err);
    if (syncStatusText) {
      syncStatusText.innerText = "เกิดข้อผิดพลาดในการต่อฐานข้อมูล";
      syncStatusText.style.color = "var(--danger)";
    }
    
    if (token === "mock-token-admin") {
      appData = [...MOCK_RESPONSES];
      if (loginPane) loginPane.classList.add("hidden");
      if (dashboardContent) dashboardContent.classList.remove("hidden");
      renderDashboardOverview();
    } else {
      alert("ไม่สามารถติดต่อกับฐานข้อมูล Google Sheets ได้");
    }
  });
}

// ===== REAL-TIME DASHBOARD REFRESH (รีเฟรชสถิติอัตโนมัติ) =====
let dashboardPollTimer = null;
let lastDataHash = "";

function computeDataHash(arr) {
  if (!Array.isArray(arr)) return "";
  return arr.length + "|" + (arr.length ? JSON.stringify(arr[arr.length - 1]) : "");
}

// ดึงคำตอบล่าสุดจากชีต "Answer" แล้วอัปเดตแดชบอร์ด (re-render เฉพาะเมื่อมีข้อมูลใหม่)
function refreshDashboardData() {
  const token = sessionStorage.getItem("admin_token");
  if (!token) return;

  if (!APPS_SCRIPT_URL) {
    renderDashboardOverview();
    return;
  }

  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "fetch_data", idToken: token })
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === "success" && Array.isArray(res.data)) {
      const hash = computeDataHash(res.data);
      if (hash !== lastDataHash) {
        lastDataHash = hash;
        appData = res.data;
        renderDashboardOverview();
      }
      if (syncStatusText) {
        const t = new Date();
        const p = n => String(n).padStart(2, '0');
        syncStatusText.innerText = `อัปเดตล่าสุด ${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())} น.`;
        syncStatusText.style.color = "var(--success)";
      }
      if (syncDot) syncDot.classList.add('connected');
    }
  })
  .catch(err => { console.warn("Dashboard auto-refresh failed:", err); });
}

function startDashboardPolling() {
  stopDashboardPolling();
  dashboardPollTimer = setInterval(() => {
    const dash = document.getElementById('view-dashboard');
    const isDashActive = dash && dash.classList.contains('active');
    if (isDashActive && sessionStorage.getItem('admin_token')) {
      refreshDashboardData();
    }
  }, 12000); // ทุก 12 วินาที
}

function stopDashboardPolling() {
  if (dashboardPollTimer) {
    clearInterval(dashboardPollTimer);
    dashboardPollTimer = null;
  }
}

function handleLogout() {
  stopDashboardPolling();
  sessionStorage.removeItem("admin_token");
  sessionStorage.removeItem("admin_email");
  showLoginPane();
  
  appData = [];
  if (syncStatusText) {
    syncStatusText.innerText = "ออกจากระบบเรียบร้อยแล้ว";
    syncStatusText.style.color = "var(--text-muted)";
  }
  if (syncDot) syncDot.classList.remove('connected');
  
  if (overviewChartInstance) {
    overviewChartInstance.destroy();
    overviewChartInstance = null;
  }
  if (window.activeCharts) {
    Object.keys(window.activeCharts).forEach(qid => {
      if (window.activeCharts[qid]) {
        window.activeCharts[qid].destroy();
      }
    });
    window.activeCharts = {};
  }
}

// DASHBOARD RENDER LOGIC
function renderDashboardOverview() {
  const appData = getFilteredAppData();
  const total = appData.length;
  document.getElementById('stat-total-responses').innerText = total;

  let sumQ34 = 0; 
  let sumQ32 = 0; 
  let sumQ38 = 0; 
  
  appData.forEach(row => {
    sumQ34 += Number(row.Q34 || 0);
    sumQ32 += Number(row.Q32 || 0);
    sumQ38 += Number(row.Q38 || 0);
  });

  const avgQ34 = total > 0 ? (sumQ34 / total).toFixed(2) : "0.00";
  const avgQ32 = total > 0 ? (sumQ32 / total).toFixed(2) : "0.00";
  const avgQ38 = total > 0 ? (sumQ38 / total).toFixed(2) : "0.00";

  document.getElementById('stat-avg-satisfaction').innerText = avgQ34;
  document.getElementById('stat-avg-participation').innerText = avgQ32;
  document.getElementById('stat-avg-application').innerText = avgQ38;

  // Render question cards dynamically to display averages & mini-charts directly
  renderDashboardQuestionCards();

  // Part 1 Cards text summary updates
  updatePart1Summaries();

  // Render overview chart
  renderOverviewChart();
}

function renderDashboardQuestionCards() {
  const appData = getFilteredAppData();
  const container = document.getElementById("dashboard-questions-container");
  if (!container) return;
  
  container.innerHTML = "";
  
  const categories = [
    { key: "General", name: "ส่วนที่ 1: ข้อมูลทั่วไป (General Information)" },
    { key: "Context", name: "ด้านบริบทเวทีสานพลัง (Context)" },
    { key: "Input", name: "ด้านปัจจัยนำเข้า (Input)" },
    { key: "Process", name: "ด้านกระบวนการจัดการ (Process)" },
    { key: "Output", name: "ด้านผลลัพธ์เวทีฯ (Output/Outcome)" },
    { key: "Satisfaction", name: "ส่วนที่ 3: ระดับความพึงพอใจและส่วนอื่น ๆ" }
  ];
  
  categories.forEach(cat => {
    let catQuestions = [];
    if (cat.key === "General") {
      catQuestions = currentSchema.filter(q => q.step === 1);
    } else if (cat.key === "Satisfaction") {
      catQuestions = currentSchema.filter(q => q.step === 3);
    } else {
      catQuestions = currentSchema.filter(q => q.step === 2 && q.section === cat.key);
    }
    
    if (catQuestions.length === 0) return;
    
    const block = document.createElement("div");
    block.className = "category-block";
    block.style.marginBottom = "32px";
    
    const title = document.createElement("div");
    title.className = "category-title";
    title.innerText = cat.name;
    title.style.fontSize = "1.05rem";
    title.style.fontWeight = "600";
    title.style.marginBottom = "16px";
    block.appendChild(title);
    
    const grid = document.createElement("div");
    grid.className = "dashboard-grid";
    grid.style.marginBottom = "16px";
    
    catQuestions.forEach(q => {
      const card = document.createElement("div");
      card.className = "chart-card";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.justifyContent = "space-between";
      card.style.height = "100%";
      card.style.minHeight = "400px";
      card.style.padding = "20px";
      
      let avgHtml = "";
      if (q.type === "likert") {
        let sum = 0;
        let count = 0;
        appData.forEach(row => {
          const val = Number(row[q.id]);
          if (val >= 1 && val <= 5) {
            sum += val;
            count++;
          }
        });
        const avg = count > 0 ? (sum / count).toFixed(2) : "-";
        avgHtml = `<span class="q-summary-label val-avg" style="font-size:0.8rem; font-weight:700;">เฉลี่ย ${avg}</span>`;
      }
      else if (q.type === "score10") {
        let sum = 0;
        let count = 0;
        appData.forEach(row => {
          const val = Number(row[q.id]);
          if (val >= 1 && val <= 10) {
            sum += val;
            count++;
          }
        });
        const avg = count > 0 ? (sum / count).toFixed(2) : "-";
        avgHtml = `<span class="q-summary-label val-avg-10" style="font-size:0.8rem; font-weight:700;">เฉลี่ย ${avg}</span>`;
      }
      else if (q.type === "facilities") {
        let sum = 0;
        let count = 0;
        appData.forEach(row => {
          q.subfields.forEach(sub => {
            const val = Number(row[sub]);
            if (val >= 1 && val <= 5) {
              sum += val;
              count++;
            }
          });
        });
        const avg = count > 0 ? (sum / count).toFixed(2) : "-";
        avgHtml = `<span class="q-summary-label val-avg" style="font-size:0.8rem; font-weight:700;">เฉลี่ย ${avg}</span>`;
      }
      else if (q.type === "numeric") {
        let sum = 0;
        let count = 0;
        appData.forEach(row => {
          const val = Number(row[q.id]);
          if (row[q.id] !== undefined && !isNaN(val) && row[q.id] !== "") {
            sum += val;
            count++;
          }
        });
        const avg = count > 0 ? (sum / count).toFixed(1) : "-";
        avgHtml = `<span class="q-summary-label val-avg" style="font-size:0.8rem; font-weight:700;">เฉลี่ย ${avg}</span>`;
      }
      else {
        let count = 0;
        appData.forEach(row => {
          if (q.type === "ranking") {
            if (row.Q27_Rank1) count++;
          } else {
            if (row[q.id] !== undefined && String(row[q.id]).trim() !== "") count++;
          }
        });
        avgHtml = `<span class="q-summary-label text-count" style="font-size:0.8rem; font-weight:700;">${count} คน</span>`;
      }
      
      let cardHtml = `
        <div class="chart-header" style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <div style="flex:1;">
              <span class="q-num" style="display:inline-block; margin-bottom:4px; font-size:0.75rem; font-weight:700;">${q.id}</span>
              <h4 style="font-size:0.85rem; font-weight:600; line-height:1.4; color:var(--text-primary); margin:0;">${q.text}</h4>
            </div>
            ${avgHtml}
          </div>
        </div>
        <div class="chart-container" style="flex:1; position:relative; min-height:200px; height:200px; margin-bottom:12px;">
          <canvas id="chart-canvas-${q.id}"></canvas>
        </div>
      `;
      
      if (q.type === "text" || q.id === "Q29" || q.id === "Q31" || q.id === "Q33" || q.id === "Q35" || q.id === "Q36" || q.id === "Q39") {
        let commentCount = 0;
        let commentsRowsHtml = "";
        let commentIdx = 1;
        appData.forEach(row => {
          const comment = row[q.id];
          if (comment && String(comment).trim() !== "") {
            commentCount++;
            commentsRowsHtml += `
              <tr style="border-bottom:1px solid var(--border-color);">
                <td style="width:20px; font-weight:bold; color:var(--text-muted); padding:6px 0; vertical-align:top;">${commentIdx++}</td>
                <td style="padding:6px 0; color:var(--text-primary); line-height:1.4;">${escapeHtml(comment)}</td>
              </tr>
            `;
          }
        });
        if (commentsRowsHtml === "") {
          commentsRowsHtml = `<tr><td style="text-align:center; color:var(--text-muted); padding:8px 0;">ไม่มีข้อคิดเห็น</td></tr>`;
        }
        
        cardHtml += `
          <div class="comments-section-wrapper" style="margin-top:8px;">
            <button class="btn-toggle-comments" data-qid="${q.id}" style="width:100%; text-align:left; background:var(--bg-accent); border:1px solid var(--border-color); padding:8px 12px; border-radius:6px; font-size:0.75rem; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
              <span>💬 ดูข้อคิดเห็นทั้งหมด (${commentCount})</span>
              <span>▼</span>
            </button>
            <div class="comments-list-pane hidden" id="comments-pane-${q.id}" style="max-height:150px; overflow-y:auto; border:1px solid var(--border-color); border-top:none; border-radius:0 0 6px 6px; padding:8px; background:var(--bg-secondary);">
              <table class="minimal-table" style="font-size:0.75rem; width:100%; border-collapse:collapse;">
                <tbody>
                  ${commentsRowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
      
      card.innerHTML = cardHtml;
      grid.appendChild(card);
    });
    
    block.appendChild(grid);
    container.appendChild(block);
  });
  
  // Initialize Chart.js
  currentSchema.forEach(q => {
    createQuestionChart(q, `chart-canvas-${q.id}`);
  });
  
  // Bind toggles for comments
  document.querySelectorAll(".btn-toggle-comments").forEach(btn => {
    btn.addEventListener("click", () => {
      const qid = btn.getAttribute("data-qid");
      const pane = document.getElementById(`comments-pane-${qid}`);
      const arrow = btn.querySelector("span:last-child");
      if (pane) {
        const isHidden = pane.classList.toggle("hidden");
        arrow.innerText = isHidden ? "▼" : "▲";
      }
    });
  });
}

function createQuestionChart(q, canvasId) {
  const appData = getFilteredAppData();
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping chart rendering for " + canvasId);
    return;
  }
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  let chartType = 'bar';
  let dataLabels = [];
  let dataValues = [];
  let colors = 'rgba(15, 118, 110, 0.75)'; 
  let showLegend = false;
  let isHorizontal = false;

  const total = appData.length;

  if (q.type === "likert") {
    const frequencies = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    appData.forEach(row => {
      const val = Number(row[q.id]);
      if (val >= 1 && val <= 5) frequencies[val]++;
    });
    dataLabels = ['1', '2', '3', '4', '5'];
    dataValues = [frequencies[1], frequencies[2], frequencies[3], frequencies[4], frequencies[5]];
    colors = ['#ef4444', '#f59e0b', '#64748b', '#6366f1', '#0f766e'];
  } 
  else if (q.type === "score10") {
    const frequencies = {};
    for (let i = 1; i <= 10; i++) frequencies[i] = 0;
    appData.forEach(row => {
      const val = Number(row[q.id]);
      if (val >= 1 && val <= 10) frequencies[val]++;
    });
    dataLabels = [];
    dataValues = [];
    for (let i = 1; i <= 10; i++) {
      dataLabels.push(String(i));
      dataValues.push(frequencies[i]);
    }
    colors = 'rgba(99, 102, 241, 0.8)';
  }
  else if (q.type === "categorical") {
    chartType = 'doughnut';
    showLegend = true;
    const frequencies = {};
    appData.forEach(row => {
      const val = row[q.id];
      if (val) frequencies[val] = (frequencies[val] || 0) + 1;
    });
    dataLabels = Object.keys(frequencies);
    dataValues = dataLabels.map(l => frequencies[l]);
    colors = ['#0f766e', '#14b8a6', '#6366f1', '#f59e0b', '#ef4444', '#64748b'];
  }
  else if (q.type === "multi-select") {
    chartType = 'bar';
    isHorizontal = true;
    const frequencies = {};
    appData.forEach(row => {
      if (row[q.id]) {
        row[q.id].split(",").forEach(c => {
          const val = c.trim();
          if (val) frequencies[val] = (frequencies[val] || 0) + 1;
        });
      }
    });
    dataLabels = Object.keys(frequencies).sort((a,b) => frequencies[b] - frequencies[a]);
    dataValues = dataLabels.map(l => frequencies[l]);
    colors = 'rgba(16, 185, 129, 0.75)';
  }
  else if (q.type === "numeric") {
    const frequencies = {};
    appData.forEach(row => {
      const val = row[q.id];
      if (val !== undefined && val !== "") {
        frequencies[val] = (frequencies[val] || 0) + 1;
      }
    });
    dataLabels = Object.keys(frequencies).sort((a,b) => Number(a) - Number(b));
    dataValues = dataLabels.map(l => frequencies[l]);
    colors = 'rgba(244, 63, 94, 0.75)';
  }
  else if (q.type === "ranking") {
    chartType = 'bar';
    isHorizontal = true;
    const scores = {};
    appData.forEach(row => {
      if (row[`${q.id}_Rank1`]) scores[row[`${q.id}_Rank1`]] = (scores[row[`${q.id}_Rank1`]] || 0) + 4;
      if (row[`${q.id}_Rank2`]) scores[row[`${q.id}_Rank2`]] = (scores[row[`${q.id}_Rank2`]] || 0) + 3;
      if (row[`${q.id}_Rank3`]) scores[row[`${q.id}_Rank3`]] = (scores[row[`${q.id}_Rank3`]] || 0) + 2;
      if (row[`${q.id}_Rank4`]) scores[row[`${q.id}_Rank4`]] = (scores[row[`${q.id}_Rank4`]] || 0) + 1;
    });
    dataLabels = Object.keys(scores).sort((a,b) => scores[b] - scores[a]);
    dataValues = dataLabels.map(l => scores[l]);
    colors = ['#0f766e', '#14b8a6', '#6366f1', '#a855f7'];
  }
  else if (q.type === "facilities") {
    chartType = 'bar';
    isHorizontal = true;
    const subfields = q.subfields;
    const subnames = q.sublabels || subfields;
    dataLabels = subnames;
    dataValues = [];
    subfields.forEach(field => {
      let sum = 0;
      let count = 0;
      appData.forEach(row => {
        const val = Number(row[field]);
        if (val >= 1 && val <= 5) {
          sum += val;
          count++;
        }
      });
      dataValues.push(count > 0 ? (sum / count) : 0);
    });
    colors = 'rgba(15, 118, 110, 0.75)';
  }
  else if (q.type === "text") {
    chartType = 'doughnut';
    showLegend = true;
    let count = 0;
    appData.forEach(row => {
      if (row[q.id] && String(row[q.id]).trim() !== "") count++;
    });
    dataLabels = ["ระบุข้อคิดเห็น", "ไม่ได้ระบุ"];
    dataValues = [count, total - count];
    colors = ['#0f766e', '#e2e8f0'];
  }

  const chartData = {
    labels: dataLabels,
    datasets: [{
      label: q.type === "ranking" ? "คะแนนถ่วงน้ำหนัก" : (q.type === "facilities" ? "คะแนนเฉลี่ย (เต็ม 5)" : "จำนวนคน (คน)"),
      data: dataValues,
      backgroundColor: colors,
      borderWidth: 0,
      borderRadius: chartType === 'doughnut' ? 0 : 4,
      barThickness: dataLabels.length > 5 ? 12 : 24
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: isHorizontal ? 'y' : 'x',
    plugins: {
      legend: { 
        display: showLegend,
        position: 'bottom',
        labels: { color: textColor, font: { family: 'Sarabun', size: 10 } }
      },
      tooltip: { padding: 8, fontFamily: 'Sarabun' }
    }
  };

  if (chartType !== 'doughnut') {
    options.scales = {
      x: {
        grid: { display: false },
        ticks: { color: textColor, font: { family: 'Sarabun', size: 10 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Sarabun', size: 10 } }
      }
    };
    if (isHorizontal) {
      options.scales.x.beginAtZero = true;
    }
  }

  if (window.activeCharts[q.id]) {
    window.activeCharts[q.id].destroy();
  }
  
  window.activeCharts[q.id] = new Chart(ctx, {
    type: chartType,
    data: chartData,
    options: options
  });
}

function updatePart1Summaries() {
  const appData = getFilteredAppData();
  const total = appData.length;
  if (total === 0) {
    // Clear summaries if total is 0
    const elGender = document.getElementById('card-gender-summary');
    if (elGender) elGender.innerText = "-";
    const elAge = document.getElementById('card-age-summary');
    if (elAge) elAge.innerText = "-";
    const elRole = document.getElementById('card-role-summary');
    if (elRole) elRole.innerText = "-";
    const elAttendance = document.getElementById('card-attendance-summary');
    if (elAttendance) elAttendance.innerText = "-";
    const elPrim = document.getElementById('card-primary-channel-summary');
    if (elPrim) elPrim.innerText = "-";
    return;
  }

  const genderCounts = { "ชาย": 0, "หญิง": 0, "เพศทางเลือก": 0 };
  let sumAge = 0;
  let validAgeCount = 0;
  const roleCounts = {};
  let totalAttendances = 0;

  appData.forEach(row => {
    if (row.Gender && genderCounts[row.Gender] !== undefined) {
      genderCounts[row.Gender]++;
    }
    if (row.Age && !isNaN(row.Age)) {
      sumAge += Number(row.Age);
      validAgeCount++;
    }
    if (row.Respondent_Type) {
      roleCounts[row.Respondent_Type] = (roleCounts[row.Respondent_Type] || 0) + 1;
    }
    if (row.Attendance_Count && !isNaN(row.Attendance_Count)) {
      totalAttendances += Number(row.Attendance_Count);
    }
  });

  let dominantGender = "ชาย";
  if (genderCounts["หญิง"] > genderCounts[dominantGender]) dominantGender = "หญิง";
  if (genderCounts["เพศทางเลือก"] > genderCounts[dominantGender]) dominantGender = "เพศทางเลือก";
  const genderPct = ((genderCounts[dominantGender] / total) * 100).toFixed(0);
  
  const elGender = document.getElementById('card-gender-summary');
  if (elGender) elGender.innerText = `${dominantGender} (${genderPct}%)`;

  const avgAge = validAgeCount > 0 ? (sumAge / validAgeCount).toFixed(1) : "-";
  const elAge = document.getElementById('card-age-summary');
  if (elAge) elAge.innerText = `${avgAge} ปี`;

  const participantCount = roleCounts["กลุ่มเข้าร่วมงาน"] || 0;
  const rolePct = ((participantCount / total) * 100).toFixed(0);
  const elType = document.getElementById('card-type-summary');
  if (elType) elType.innerText = `ผู้ร่วมงาน (${rolePct}%)`;

  const avgAttend = (totalAttendances / total).toFixed(1);
  const elCount = document.getElementById('card-attendance-summary');
  if (elCount) elCount.innerText = `เฉลี่ย ${avgAttend} ครั้ง`;

  const channelCounts = {};
  appData.forEach(row => {
    if (row.Info_Channels) {
      row.Info_Channels.split(",").forEach(c => {
        const key = c.trim();
        if (key) channelCounts[key] = (channelCounts[key] || 0) + 1;
      });
    }
  });
  let topChannel = "-";
  let topCount = 0;
  Object.keys(channelCounts).forEach(k => {
    if (channelCounts[k] > topCount) {
      topChannel = k;
      topCount = channelCounts[k];
    }
  });
  const chanPct = total > 0 ? ((topCount / total) * 100).toFixed(0) : 0;
  const elChan = document.getElementById('card-channels-summary');
  if (elChan) elChan.innerText = `${topChannel} (${chanPct}%)`;

  const primaryCounts = {};
  appData.forEach(row => {
    if (row.Primary_Channel) {
      const key = row.Primary_Channel.trim();
      if (key) primaryCounts[key] = (primaryCounts[key] || 0) + 1;
    }
  });
  let topPrim = "-";
  let topPCount = 0;
  Object.keys(primaryCounts).forEach(k => {
    if (primaryCounts[k] > topPCount) {
      topPrim = k;
      topPCount = primaryCounts[k];
    }
  });
  const primPct = total > 0 ? ((topPCount / total) * 100).toFixed(0) : 0;
  const elPrim = document.getElementById('card-primary-channel-summary');
  if (elPrim) elPrim.innerText = `${topPrim} (${primPct}%)`;
}

// CHART DESIGN (Chart.js Configs)
function renderOverviewChart() {
  const appData = getFilteredAppData();
  if (typeof Chart === 'undefined') {
    console.warn("Chart.js is not loaded. Skipping overview chart rendering.");
    return;
  }
  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  
  const contextQ = currentSchema.filter(q => q.step === 2 && q.section === "Context" && q.type === "likert").map(q => q.id);
  const inputQ = currentSchema.filter(q => q.step === 2 && q.section === "Input" && q.type === "likert").map(q => q.id);
  const processQ = currentSchema.filter(q => q.step === 2 && q.section === "Process" && q.type === "likert").map(q => q.id);
  const outputQ = currentSchema.filter(q => q.step === 2 && q.section === "Output" && q.type === "likert").map(q => q.id);

  function getGroupAvg(qList) {
    let sum = 0;
    let count = 0;
    appData.forEach(row => {
      qList.forEach(q => {
        const val = Number(row[q]);
        if (val >= 1 && val <= 5) {
          sum += val;
          count++;
        }
      });
    });
    return count > 0 ? (sum / count) : 0;
  }

  const dataset = [
    getGroupAvg(contextQ),
    getGroupAvg(inputQ),
    getGroupAvg(processQ),
    getGroupAvg(outputQ)
  ];

  if (overviewChartInstance) {
    overviewChartInstance.destroy();
  }

  const canvas = document.getElementById('chart-dimensions-overview');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  overviewChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [
        'ด้านบริบท (Context)', 
        'ด้านปัจจัยนำเข้า (Input)', 
        'ด้านกระบวนการ (Process)', 
        'ด้านผลสัมฤทธิ์ (Output)'
      ],
      datasets: [{
        label: 'คะแนนความพึงพอใจเฉลี่ย',
        data: dataset,
        backgroundColor: [
          'rgba(15, 118, 110, 0.75)',  
          'rgba(99, 102, 241, 0.75)',  
          'rgba(16, 185, 129, 0.75)',  
          'rgba(244, 63, 94, 0.75)'    
        ],
        borderWidth: 0,
        borderRadius: 6,
        barThickness: 40
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          padding: 12,
          fontFamily: 'Sarabun',
          callbacks: {
            label: function(context) {
              return ` คะแนนเฉลี่ย: ${context.parsed.y.toFixed(2)} / 5.00`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: 'Sarabun', size: 12 } }
        },
        y: {
          min: 0,
          max: 5,
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Sarabun' }, stepSize: 1 }
        }
      }
    }
  });
}

// FORM SUBMISSION LOGIC
function submitFormAnswers() {
  const form = document.getElementById('evaluation-form');
  const overlay = document.getElementById('submitting-overlay');
  if (overlay) overlay.classList.remove('hidden');

  const payload = {};
  
  payload.Timestamp = new Date().toISOString();
  payload.Survey_ID = currentSettings.id || "default";
  // ฝังชื่อชุดแบบสอบถาม (จากชีต Surveys) ลงทุกแถวคำตอบ ให้รู้ว่าแถวไหนมาจากแบบสอบถามชุดใด
  payload.Survey_Name = currentSettings.surveyName || "";
  payload.Consent = form.querySelector('input[name="Consent"]:checked')?.value || "ยินยอม";

  currentSchema.forEach(q => {
    if (q.type === "categorical") {
      const val = form.querySelector(`input[name="${q.id}"]:checked`)?.value || "";
      payload[q.id] = val;
      if (q.hasOther) {
        payload[q.id + "_Other"] = val === "อื่น ๆ" ? (form.querySelector(`input[name="${q.id}_Other"]`)?.value || "") : "";
      }
    }
    else if (q.type === "dropdown") {
      const val = form.querySelector(`select[name="${q.id}"]`)?.value || "";
      payload[q.id] = val;
      if (q.hasOther) {
        payload[q.id + "_Other"] = val === "อื่น ๆ" ? (form.querySelector(`input[name="${q.id}_Other"]`)?.value || "") : "";
      }
    }
    else if (q.type === "multi-select") {
      const selected = Array.from(form.querySelectorAll(`input[name="${q.id}_List"]:checked`)).map(el => el.value);
      // คอลัมน์รวม (คั่นจุลภาค) ต้องคงไว้ เพราะกราฟแดชบอร์ดนับคำตอบจากคอลัมน์นี้
      payload[q.id] = selected.join(", ");
      // แตกแต่ละตัวเลือกเป็นคอลัมน์ของตัวเอง: 1 = ถูกเลือก, ว่าง = ไม่เลือก (รวมคะแนนในชีตได้ทันที)
      (q.choices || []).forEach(choice => {
        payload[`${q.id}_${choice}`] = selected.includes(choice) ? 1 : "";
      });
      if (q.hasOther) {
        payload[q.id + "_Other"] = selected.includes("อื่น ๆ") ? (form.querySelector(`input[name="${q.id}_Other"]`)?.value || "") : "";
      }
    }
    else if (q.type === "numeric" || q.type === "score10" || q.type === "likert") {
      const input = form.querySelector(`[name="${q.id}"]`);
      if (input) {
        if (input.type === "radio") {
          payload[q.id] = Number(form.querySelector(`input[name="${q.id}"]:checked`)?.value || 0);
        } else {
          payload[q.id] = Number(input.value || 0);
        }
      }
    }
    else if (q.type === "text") {
      payload[q.id] = form.querySelector(`input[name="${q.id}"], textarea[name="${q.id}"]`)?.value || "";
    }
    else if (q.type === "years-checkbox") {
      payload.Attendance_Years = document.getElementById("input-attend-years")?.value || "";
    }
    else if (q.type === "ranking") {
      q.choices.forEach((choice, idx) => {
        payload[`${q.id}_Rank${idx + 1}`] = document.getElementById(`input-${q.id}-r${idx + 1}`)?.value || "";
      });
    }
    else if (q.type === "facilities") {
      q.subfields.forEach(sub => {
        payload[sub] = Number(form.querySelector(`input[name="${sub}"]:checked`)?.value || 0);
      });
    }
  });

  console.log("Submitting survey payload:", payload);

  if (!APPS_SCRIPT_URL) {
    setTimeout(() => {
      if (overlay) overlay.classList.add('hidden');
      appData.push(payload);
      markSurveyCompletedOnDevice();

      document.getElementById('thankyou-pane').classList.remove('hidden');
      form.classList.add('hidden');
    }, 1500);
    return;
  }

  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors", 
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  })
  .then(() => {
    if (overlay) overlay.classList.add('hidden');
    appData.push(payload);
    markSurveyCompletedOnDevice();

    document.getElementById('thankyou-pane').classList.remove('hidden');
    form.classList.add('hidden');
  })
  .catch(err => {
    console.error("Submission failed:", err);
    if (overlay) overlay.classList.add('hidden');
    alert("การส่งคำตอบล้มเหลว กรุณาตรวจสอบอินเทอร์เน็ตของท่านและลองส่งอีกครั้งครับ");
  });
}

// Bind close button on Thank you pane
document.getElementById('btn-thankyou-close').addEventListener('click', () => {
  document.getElementById('evaluation-form').reset();
  document.getElementById('evaluation-form').classList.remove('hidden');
  document.getElementById('thankyou-pane').classList.add('hidden');
  showView('survey');
});

// ==========================================================
// ADMIN DASHBOARD TAB CONTROL & SECTIONS LOGIC
// ==========================================================

function setupAdminTabs() {
  const tabs = document.querySelectorAll(".admin-tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".admin-tab-pane").forEach(pane => pane.classList.remove("active"));
      
      tab.classList.add("active");
      const targetId = tab.getAttribute("data-target");
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add("active");
        if (targetId === "admin-tab-users") {
          loadAdmins();
        } else if (targetId === "admin-tab-settings") {
          initSettingsTab();
        }
      }
    });
  });
}

// USER MANAGEMENT (Admins)
function loadAdmins() {
  const tbody = document.getElementById("admin-users-list-tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">กำลังโหลดรายชื่อ...</td></tr>`;

  if (!APPS_SCRIPT_URL) {
    renderAdminsTable(mockAdmins);
    return;
  }

  const token = sessionStorage.getItem("admin_token");
  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "fetch_admins",
      idToken: token
    })
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === "success") {
      renderAdminsTable(res.admins);
    } else {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--danger)">ไม่สามารถโหลดข้อมูลได้: ${res.message}</td></tr>`;
    }
  })
  .catch(err => {
    console.error("Fetch admins error:", err);
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--danger)">เกิดข้อผิดพลาดในการต่อเซิร์ฟเวอร์</td></tr>`;
  });
}

function renderAdminsTable(adminsList) {
  const tbody = document.getElementById("admin-users-list-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  if (adminsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">ไม่มีรายชื่อผู้ดูแลระบบในคลาวด์</td></tr>`;
    return;
  }
  
  const currentEmail = sessionStorage.getItem("admin_email") || "earth.ekka@gmail.com";
  
  adminsList.forEach((email, index) => {
    const tr = document.createElement("tr");
    const isCurrent = email.trim().toLowerCase() === currentEmail.trim().toLowerCase();
    
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(email)} ${isCurrent ? '<span style="font-size:0.75rem; color:var(--accent); font-weight:600;">(คุณ)</span>' : ''}</td>
      <td style="text-align:center;">
        <button type="button" class="btn-delete-admin" data-email="${email}" ${isCurrent ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} style="background:none; border:none; color:var(--danger); cursor:pointer;">
          เพิกถอน
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  tbody.querySelectorAll(".btn-delete-admin").forEach(btn => {
    btn.addEventListener("click", () => {
      const email = btn.getAttribute("data-email");
      if (confirm(`คุณต้องการถอนสิทธิ์ผู้ดูแลระบบของ ${email} ใช่หรือไม่?`)) {
        deleteAdmin(email);
      }
    });
  });
}

function addAdmin(newEmail) {
  if (!newEmail || newEmail.indexOf("@") === -1) {
    alert("กรุณากรอกอีเมลแอดมินในรูปแบบที่ถูกต้อง");
    return;
  }
  
  const token = sessionStorage.getItem("admin_token");
  
  if (!APPS_SCRIPT_URL) {
    if (mockAdmins.map(e => e.toLowerCase()).includes(newEmail.toLowerCase())) {
      alert("อีเมลนี้ได้รับสิทธิ์แอดมินอยู่แล้ว");
    } else {
      mockAdmins.push(newEmail);
      alert("เพิ่มสิทธิ์แอดมินจำลองสำเร็จแล้ว");
      loadAdmins();
    }
    const input = document.getElementById("input-new-admin-email");
    if (input) input.value = "";
    return;
  }
  
  const overlay = document.getElementById("submitting-overlay");
  if (overlay) overlay.classList.remove("hidden");
  
  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "add_admin",
      idToken: token,
      newEmail: newEmail
    })
  })
  .then(res => res.json())
  .then(res => {
    if (overlay) overlay.classList.add("hidden");
    if (res.status === "success") {
      alert("มอบสิทธิ์ผู้ดูแลระบบเรียบร้อยแล้ว");
      const input = document.getElementById("input-new-admin-email");
      if (input) input.value = "";
      loadAdmins();
    } else if (res.status === "exists") {
      alert("อีเมลนี้มีสิทธิ์แอดมินอยู่แล้ว");
    } else {
      alert("เกิดข้อผิดพลาด: " + res.message);
    }
  })
  .catch(err => {
    if (overlay) overlay.classList.add("hidden");
    console.error("Add admin error:", err);
    alert("ไม่สามารถติดต่อฐานข้อมูลเพื่อเพิ่มผู้ดูแลระบบได้");
  });
}

function deleteAdmin(deleteEmail) {
  const token = sessionStorage.getItem("admin_token");
  
  if (!APPS_SCRIPT_URL) {
    mockAdmins = mockAdmins.filter(e => e.toLowerCase() !== deleteEmail.toLowerCase());
    alert("เพิกถอนสิทธิ์สำเร็จ");
    loadAdmins();
    return;
  }
  
  const overlay = document.getElementById("submitting-overlay");
  if (overlay) overlay.classList.remove("hidden");
  
  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "delete_admin",
      idToken: token,
      deleteEmail: deleteEmail
    })
  })
  .then(res => res.json())
  .then(res => {
    if (overlay) overlay.classList.add("hidden");
    if (res.status === "success") {
      alert("ถอนสิทธิ์ผู้ดูแลระบบสำเร็จแล้ว");
      loadAdmins();
    } else {
      alert("เกิดข้อผิดพลาด: " + res.message);
    }
  })
  .catch(err => {
    if (overlay) overlay.classList.add("hidden");
    console.error("Delete admin error:", err);
    alert("ไม่สามารถลบสิทธิ์แอดมินจากหลังบ้านได้");
  });
}

// SETTINGS & QR GENERATOR
function updateSettingsStatusDisplay() {
  const activeChk = document.getElementById("input-set-active");
  const startVal = document.getElementById("input-set-start") ? document.getElementById("input-set-start").value : "";
  const endVal = document.getElementById("input-set-end") ? document.getElementById("input-set-end").value : "";
  
  const badge = document.getElementById("survey-status-badge");
  const detail = document.getElementById("survey-status-detail-text");
  if (!badge || !detail || !activeChk) return;
  
  const now = new Date();
  let isClosed = !activeChk.checked;
  let reason = "แอดมินปิดใช้งาน";
  
  if (activeChk.checked) {
    if (startVal) {
      const start = parseThaiDateTime(startVal);
      if (start && !isNaN(start.getTime()) && now < start) {
        isClosed = true;
        reason = "ยังไม่ถึงเวลาเปิดรับคำตอบ (" + formatThaiDateTime(start) + ")";
      }
    }
    if (endVal) {
      const end = parseThaiDateTime(endVal);
      if (end && !isNaN(end.getTime()) && now > end) {
        isClosed = true;
        reason = "ปิดรับคำตอบเนื่องจากสิ้นสุดเวลา (" + formatThaiDateTime(end) + ")";
      }
    }
  }
  
  if (isClosed) {
    badge.innerText = "ปิด";
    badge.className = "badge-status closed";
    detail.innerText = "สถานะจริง: ปิดรับคำตอบ (" + reason + ")";
  } else {
    badge.innerText = "เปิด";
    badge.className = "badge-status open";
    detail.innerText = "สถานะจริง: กำลังเปิดรับคำตอบ";
  }
}

function saveSettings(isSilent) {
  const surveyName = document.getElementById("input-set-title").value.trim();
  const startTime = document.getElementById("input-set-start").value;
  const endTime = document.getElementById("input-set-end").value;
  const isActive = document.getElementById("input-set-active").checked;
  const blockRepeatChk = document.getElementById("input-set-block-repeat");
  const blockRepeat = blockRepeatChk ? blockRepeatChk.checked : false;
  const tokenInput = document.getElementById("input-set-token");
  const tokenVal = tokenInput ? tokenInput.value.trim() : "";
  const accessToken = tokenVal || ("tk_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10));
  
  if (tokenInput && !tokenInput.value) {
    tokenInput.value = accessToken;
  }
  
  if (!surveyName) {
    alert("กรุณากรอกชื่อแบบสอบถาม");
    return;
  }
  
  // Compile and validate the questionnaire schema
  const updatedSchema = collectBuilderSchema();
  if (!updatedSchema) {
    return; // validation failed, alert already shown
  }
  
  let targetId = selectedSurveyId;
  let isNew = false;
  
  if (!targetId) {
    targetId = "s_" + new Date().getTime();
    isNew = true;
  }
  
  const token = sessionStorage.getItem("admin_token");
  
  if (isNew) {
    surveys.push({
      id: targetId,
      surveyName: surveyName,
      startTime: startTime,
      endTime: endTime,
      isActive: isActive,
      blockRepeat: blockRepeat,
      schema: updatedSchema,
      accessToken: accessToken
    });
  } else {
    const s = surveys.find(item => item.id === targetId);
    if (s) {
      s.surveyName = surveyName;
      s.startTime = startTime;
      s.endTime = endTime;
      s.isActive = isActive;
      s.blockRepeat = blockRepeat;
      s.schema = updatedSchema;
      s.accessToken = accessToken;
    }
  }
  
  if (!APPS_SCRIPT_URL) {
    localStorage.setItem("surveys_list", JSON.stringify(surveys));
    
    const activeSurvey = surveys.find(s => s.id === targetId);
    if (activeSurvey) {
      currentSettings = {
        id: activeSurvey.id,
        surveyName: activeSurvey.surveyName,
        startTime: activeSurvey.startTime,
        endTime: activeSurvey.endTime,
        isActive: activeSurvey.isActive,
        blockRepeat: activeSurvey.blockRepeat === true,
        accessToken: activeSurvey.accessToken
      };
      currentSchema = activeSurvey.schema || DEFAULT_SCHEMA;
      rebuildQuestionsMeta();
      applySettings();
      renderSurveyForm();
      checkSurveyStatus();
      
      const currentUrl = window.location.origin + window.location.pathname + "?token=" + accessToken;
      const linkEl = document.getElementById("qr-url-link");
      if (linkEl) {
        linkEl.href = currentUrl;
        linkEl.innerText = currentUrl;
      }
      const qrImg = document.getElementById("qr-code-img");
      if (qrImg) {
        qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(currentUrl);
      }
    }
    
    selectedSurveyId = targetId;
    renderSurveysTable();
    updateDashboardSurveySelector();
    
    if (!isSilent) {
      alert(isNew ? "สร้างแบบสอบถามใหม่สำเร็จ!" : "แก้ไขรายละเอียดแบบสอบถามเรียบร้อย!");
    }
    return;
  }
  
  const overlay = document.getElementById("submitting-overlay");
  if (overlay && !isSilent) overlay.classList.remove("hidden");
  
  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "save_surveys",
      idToken: token,
      surveys: surveys
    })
  })
  .then(res => res.json())
  .then(res => {
    if (overlay) overlay.classList.add("hidden");
    if (res.status === "success") {
      const activeSurvey = surveys.find(s => s.id === targetId);
      if (activeSurvey) {
        currentSettings = {
          id: activeSurvey.id,
          surveyName: activeSurvey.surveyName,
          startTime: activeSurvey.startTime,
          endTime: activeSurvey.endTime,
          isActive: activeSurvey.isActive,
          blockRepeat: activeSurvey.blockRepeat === true,
          accessToken: activeSurvey.accessToken
        };
        currentSchema = activeSurvey.schema || DEFAULT_SCHEMA;
        rebuildQuestionsMeta();
        applySettings();
        renderSurveyForm();
        checkSurveyStatus();
        
        const currentUrl = window.location.origin + window.location.pathname + "?token=" + accessToken;
        const linkEl = document.getElementById("qr-url-link");
        if (linkEl) {
          linkEl.href = currentUrl;
          linkEl.innerText = currentUrl;
        }
        const qrImg = document.getElementById("qr-code-img");
        if (qrImg) {
          qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(currentUrl);
        }
      }
      
      selectedSurveyId = targetId;
      renderSurveysTable();
      updateDashboardSurveySelector();
      
      if (!isSilent) {
        alert(isNew ? "บันทึกสร้างแบบสอบถามใหม่สำเร็จ!" : "บันทึกการแก้ไขลงชีตสำเร็จ!");
      }
    } else {
      if (!isSilent) {
        alert("ดำเนินการล้มเหลว: " + res.message);
      }
    }
  })
  .catch(err => {
    if (overlay) overlay.classList.add("hidden");
    console.error("Save survey settings error:", err);
    if (!isSilent) {
      alert("ไม่สามารถติดต่อคลาวด์เพื่อบันทึกข้อมูลแบบสอบถามได้");
    }
  });
}

function initSettingsTab() {
  if (!selectedSurveyId && surveys.length > 0) {
    const activeSurvey = surveys.find(s => s.isActive);
    selectedSurveyId = activeSurvey ? activeSurvey.id : surveys[0].id;
  }
  
  renderSurveysTable();
  
  if (selectedSurveyId) {
    selectSurvey(selectedSurveyId);
  } else {
    clearSurveyForm();
  }
}
// MULTI-SURVEY FRONTEND CONTROL LOGIC
function renderSurveysTable() {
  const tbody = document.getElementById("survey-list-tbody");
  if (!tbody) return;
  
  if (surveys.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="padding: 20px; text-align: center; color: var(--text-muted);">ไม่มีรายการแบบสอบถาม คลิกปุ่ม [สร้างแบบสอบถาม] เพื่อเริ่มต้น</td></tr>';
    return;
  }
  
  tbody.innerHTML = "";
  surveys.forEach(s => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-id", s.id);
    if (s.id === selectedSurveyId) {
      tr.classList.add("selected");
    }
    
    // Determine status text
    const now = new Date();
    let statusText = "เปิด";
    let statusClass = "badge-status open";
    if (!s.isActive) {
      statusText = "ปิด";
      statusClass = "badge-status closed";
    } else {
      if (s.startTime) {
        const start = parseThaiDateTime(s.startTime);
        if (start && now < start) {
          statusText = "ยังไม่เปิด";
          statusClass = "badge-status closed";
        }
      }
      if (s.endTime) {
        const end = parseThaiDateTime(s.endTime);
        if (end && now > end) {
          statusText = "หมดเวลา";
          statusClass = "badge-status closed";
        }
      }
    }
    
    const timeText = (s.startTime || s.endTime) ? 
      `${convertToInputFormat(s.startTime) || "-"} ถึง ${convertToInputFormat(s.endTime) || "-"}` : 
      "ไม่ได้กำหนดข้อจำกัดเวลา";

    tr.innerHTML = `
      <td style="text-align: center; padding: 10px;" onclick="event.stopPropagation();">
        <input type="checkbox" class="survey-row-checkbox" value="${s.id}" ${s.id === selectedSurveyId ? "checked" : ""} style="cursor: pointer; transform: scale(1.1);">
      </td>
      <td style="padding: 10px; font-weight: 500; color: var(--text-primary);">${s.surveyName}</td>
      <td style="padding: 10px; color: var(--text-muted);">${timeText}</td>
      <td style="padding: 10px; text-align: center;">
        <span class="${statusClass}">${statusText}</span>
      </td>
    `;
    
    tr.addEventListener("click", () => {
      selectSurvey(s.id);
    });
    
    tbody.appendChild(tr);
  });
  
  const rowCheckboxes = document.querySelectorAll(".survey-row-checkbox");
  rowCheckboxes.forEach(cb => {
    cb.addEventListener("change", (e) => {
      if (e.target.checked) {
        selectSurvey(e.target.value);
      } else {
        if (selectedSurveyId === e.target.value) {
          selectedSurveyId = "";
          clearSurveyForm();
        }
        renderSurveysTable();
      }
    });
  });
}

function selectSurvey(id) {
  selectedSurveyId = id;
  const s = surveys.find(item => item.id === id);
  if (!s) return;
  
  renderSurveysTable();
  
  // (หัวข้อ editor ถูกนำออกแล้วตามคำขอ)
  document.getElementById("btn-save-settings-text").innerText = "บันทึกแบบสอบถาม";
  
  document.getElementById("input-set-title").value = s.surveyName || "";
  
  // Set access token input
  let token = s.accessToken;
  if (!token) {
    token = "tk_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    s.accessToken = token;
  }
  const tokenInput = document.getElementById("input-set-token");
  if (tokenInput) tokenInput.value = token;
  
  const startInput = document.getElementById("input-set-start");
  const endInput = document.getElementById("input-set-end");
  const startVal = convertToInputFormat(s.startTime);
  const endVal = convertToInputFormat(s.endTime);
  
  const fpConfig = {
    enableTime: true,
    time_24hr: true,
    dateFormat: "d/m/Y H:i",
    allowInput: true,
    formatDate: (date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear(); // ปี ค.ศ.
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    },
    parseDate: (datestr) => {
      return parseThaiDateTime(datestr);
    },
    onChange: () => {
      updateSettingsStatusDisplay();
    }
  };

  if (typeof flatpickr !== "undefined") {
    if (startInput) {
      if (startInput._flatpickr) {
        startInput._flatpickr.setDate(parseThaiDateTime(startVal) || "");
      } else {
        flatpickr(startInput, fpConfig);
        if (startVal) startInput._flatpickr.setDate(parseThaiDateTime(startVal) || "");
      }
    }
    if (endInput) {
      if (endInput._flatpickr) {
        endInput._flatpickr.setDate(parseThaiDateTime(endVal) || "");
      } else {
        flatpickr(endInput, fpConfig);
        if (endVal) endInput._flatpickr.setDate(parseThaiDateTime(endVal) || "");
      }
    }
  }
  
  const blockRepeatChk = document.getElementById("input-set-block-repeat");
  if (blockRepeatChk) {
    blockRepeatChk.checked = s.blockRepeat === true;
  }

  const activeChk = document.getElementById("input-set-active");
  if (activeChk) {
    activeChk.checked = s.isActive;
    const newActiveChk = activeChk.cloneNode(true);
    activeChk.parentNode.replaceChild(newActiveChk, activeChk);
    newActiveChk.addEventListener("change", () => {
      updateSettingsStatusDisplay();
      saveSettings(true);
    });
  }
  
  updateSettingsStatusDisplay();
  
  currentSchema = s.schema || DEFAULT_SCHEMA;
  currentSettings = {
    id: s.id,
    surveyName: s.surveyName,
    startTime: s.startTime,
    endTime: s.endTime,
    isActive: s.isActive,
    blockRepeat: s.blockRepeat === true,
    accessToken: token
  };
  rebuildQuestionsMeta();
  renderBuilder();
  
  const currentUrl = window.location.origin + window.location.pathname + "?token=" + token;
  const linkEl = document.getElementById("qr-url-link");
  if (linkEl) {
    linkEl.href = currentUrl;
    linkEl.innerText = currentUrl;
  }
  const qrImg = document.getElementById("qr-code-img");
  if (qrImg) {
    qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(currentUrl);
  }
}

function prepareCreateSurvey() {
  selectedSurveyId = "";
  renderSurveysTable();
  
  // (หัวข้อ editor ถูกนำออกแล้วตามคำขอ)
  document.getElementById("btn-save-settings-text").innerText = "บันทึกแบบสอบถาม";
  
  document.getElementById("input-set-title").value = "";
  
  const tokenInput = document.getElementById("input-set-token");
  if (tokenInput) {
    tokenInput.value = "tk_" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  }
  
  const startInput = document.getElementById("input-set-start");
  const endInput = document.getElementById("input-set-end");
  if (startInput) {
    startInput.value = "";
    if (startInput._flatpickr) startInput._flatpickr.clear();
  }
  if (endInput) {
    endInput.value = "";
    if (endInput._flatpickr) endInput._flatpickr.clear();
  }
  
  const activeChk = document.getElementById("input-set-active");
  if (activeChk) {
    activeChk.checked = true;
  }

  const blockRepeatChk = document.getElementById("input-set-block-repeat");
  if (blockRepeatChk) {
    blockRepeatChk.checked = false;
  }

  // เริ่มจากแบบสอบถามว่างเปล่า: ผู้ดูแลระบบกรอกคำถามทีละข้อและเลือกรูปแบบการตอบเอง
  currentSchema = [];
  rebuildQuestionsMeta();
  renderBuilder();

  updateSettingsStatusDisplay();
}

function clearSurveyForm() {
  // (หัวข้อ editor ถูกนำออกแล้วตามคำขอ)
  document.getElementById("btn-save-settings-text").innerText = "บันทึกแบบสอบถาม";
  document.getElementById("input-set-title").value = "";
  
  const list = document.getElementById("builder-questions-list");
  if (list) list.innerHTML = "";
  const tokenInput = document.getElementById("input-set-token");
  if (tokenInput) tokenInput.value = "";
  const startInput = document.getElementById("input-set-start");
  const endInput = document.getElementById("input-set-end");
  if (startInput) {
    startInput.value = "";
    if (startInput._flatpickr) startInput._flatpickr.clear();
  }
  if (endInput) {
    endInput.value = "";
    if (endInput._flatpickr) endInput._flatpickr.clear();
  }
}

function prepareEditSurvey() {
  const checkedBoxes = document.querySelectorAll(".survey-row-checkbox:checked");
  if (checkedBoxes.length === 0) {
    alert("กรุณาเลือก (ติ๊กถูก) แบบสอบถามที่ต้องการแก้ไขก่อนครับ");
    return;
  }
  selectSurvey(checkedBoxes[0].value);
}

function deleteSelectedSurveys() {
  const checkedBoxes = document.querySelectorAll(".survey-row-checkbox:checked");
  if (checkedBoxes.length === 0) {
    alert("กรุณาเลือก (ติ๊กถูก) แบบสอบถามที่ต้องการลบก่อนครับ");
    return;
  }
  
  const idsToDelete = Array.from(checkedBoxes).map(cb => cb.value);
  const titlesToDelete = surveys.filter(s => idsToDelete.includes(s.id)).map(s => s.surveyName);
  
  if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแบบสอบถามต่อไปนี้?\n\n- ${titlesToDelete.join("\n- ")}`)) {
    return;
  }
  
  surveys = surveys.filter(s => !idsToDelete.includes(s.id));
  saveSurveysListToBackend();
}

function saveSurveysListToBackend() {
  const token = sessionStorage.getItem("admin_token");
  
  if (!APPS_SCRIPT_URL) {
    localStorage.setItem("surveys_list", JSON.stringify(surveys));
    
    if (!surveys.find(s => s.id === selectedSurveyId)) {
      selectedSurveyId = surveys.length > 0 ? surveys[0].id : "";
    }
    
    if (selectedSurveyId) {
      selectSurvey(selectedSurveyId);
    } else {
      clearSurveyForm();
    }
    
    renderSurveysTable();
    updateDashboardSurveySelector();
    alert("ลบแบบสอบถามสำเร็จ (โหมดจำลองแบบท้องถิ่น)");
    return;
  }
  
  const overlay = document.getElementById("submitting-overlay");
  if (overlay) overlay.classList.remove("hidden");
  
  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "save_surveys",
      idToken: token,
      surveys: surveys
    })
  })
  .then(res => res.json())
  .then(res => {
    if (overlay) overlay.classList.add("hidden");
    if (res.status === "success") {
      if (!surveys.find(s => s.id === selectedSurveyId)) {
        selectedSurveyId = surveys.length > 0 ? surveys[0].id : "";
      }
      
      if (selectedSurveyId) {
        selectSurvey(selectedSurveyId);
      } else {
        clearSurveyForm();
      }
      
      renderSurveysTable();
      updateDashboardSurveySelector();
      alert("ปรับปรุงรายการแบบสอบถามและบันทึกสถิติสำเร็จ!");
    } else {
      alert("ดำเนินการล้มเหลว: " + res.message);
    }
  })
  .catch(err => {
    if (overlay) overlay.classList.add("hidden");
    console.error("Save surveys error:", err);
    alert("ไม่สามารถเชื่อมต่อคลาวด์เพื่อเซฟรายการแบบสอบถามได้");
  });
}

function toggleSelectAllSurveys(e) {
  const checked = e.target.checked;
  const rowCheckboxes = document.querySelectorAll(".survey-row-checkbox");
  rowCheckboxes.forEach(cb => {
    cb.checked = checked;
  });
}

function handleSettingsSubmit(e) {
  if (e) e.preventDefault();
  saveSettings(false);
}

function downloadQRCode() {
  const currentUrl = window.location.origin + window.location.pathname;
  const qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=" + encodeURIComponent(currentUrl);
  
  const overlay = document.getElementById("submitting-overlay");
  if (overlay) overlay.classList.remove("hidden");
  
  fetch(qrUrl)
    .then(response => {
      if (!response.ok) throw new Error("QR Load error");
      return response.blob();
    })
    .then(blob => {
      if (overlay) overlay.classList.add("hidden");
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "survey-qrcode.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    })
    .catch(err => {
      if (overlay) overlay.classList.add("hidden");
      console.error("QR download fail:", err);
      alert("ดาวน์โหลดภาพล้มเหลว กรุณาคลิกขวาที่ภาพคิวอาร์โค้ดแล้วกดเลือก Save Image As... ครับ");
    });
}

// FORM BUILDER (Questionnaire Editor)

// รูปแบบการตอบทั้งหมดที่เลือกได้เมื่อเพิ่มคำถามใหม่
const ANSWER_FORMATS = [
  { value: "categorical",  label: "เลือกตอบข้อเดียว (Radio)" },
  { value: "multi-select", label: "เลือกหลายข้อ (Checkbox)" },
  { value: "dropdown",     label: "เลือกจากดรอปดาวน์ (Dropdown)" },
  { value: "text",         label: "ข้อความ / ปลายเปิด (Text)" },
  { value: "numeric",      label: "ตัวเลข (Number)" },
  { value: "likert",       label: "สเกลความเห็น 1-5 (Likert)" },
  { value: "score10",      label: "สเกลคะแนน 1-10 (Slider)" },
  { value: "ranking",      label: "จัดเรียงลำดับ (Ranking)" },
  { value: "facilities",   label: "ให้คะแนนรายหัวข้อย่อย 1-5 (Sub-rating)" }
];

// คำถามหลักของเทมเพลต "เวทีสานพลัง" ที่ล็อกประเภทไว้ (แก้ได้เฉพาะข้อความ/ตัวเลือก)
const CORE_P1_IDS = ["Gender", "Age", "Network_Number", "Respondent_Type", "Attendance_Count", "Attendance_Years", "Info_Channels", "Primary_Channel"];
const CORE_P3_IDS = ["Q27", "Q28", "Q29", "Q30", "Q31", "Q32", "Q33", "Q34", "Q35", "Q36", "Q37", "Q38", "Q39"];

function isCoreQuestion(id) {
  return CORE_P1_IDS.includes(id) || CORE_P3_IDS.includes(id);
}

function renderBuilder() {
  const list = document.getElementById("builder-questions-list");
  if (!list) return;

  list.innerHTML = "";

  let counter = 0;

  currentSchema.forEach(q => {
    const card = document.createElement("div");
    card.className = "builder-question-card";
    card.setAttribute("data-qid", q.id);

    const isCore = isCoreQuestion(q.id);
    counter += 1;
    const qNum = counter;

    let headerHtml = `
      <div class="bq-head">
        <span class="bq-num">ข้อ ${qNum}</span>
        ${isCore ? `<span class="bq-colid" title="ชื่อคอลัมน์ในชีต (แก้ไม่ได้)">${escapeHtml(q.id)}</span>` : ``}
        ${!isCore ? `<button type="button" class="btn-delete-question" data-qid="${escapeHtml(q.id)}" title="ลบคำถามข้อนี้">🗑️ ลบ</button>` : ``}
      </div>
    `;

    let bodyHtml = `
      <div class="form-group">
        <label class="form-label">หัวข้อข้อความคำถาม</label>
        <input type="text" class="form-control builder-input-text" data-prop="text" value="${escapeHtml(q.text)}">
      </div>
    `;

    // รูปแบบการตอบ + ชื่อคอลัมน์ในชีต (เฉพาะคำถามที่ผู้ดูแลระบบเพิ่มเอง)
    if (!isCore) {
      let opts = "";
      ANSWER_FORMATS.forEach(f => {
        opts += `<option value="${f.value}" ${q.type === f.value ? "selected" : ""}>${f.label}</option>`;
      });
      bodyHtml += `
        <div class="bq-row">
          <div class="form-group">
            <label class="form-label">รูปแบบการตอบ</label>
            <select class="form-control builder-input-type" data-prop="type">${opts}</select>
          </div>
          <div class="form-group">
            <label class="form-label">ชื่อคอลัมน์ในชีต (แก้ได้)</label>
            <input type="text" class="form-control builder-input-id" data-prop="id" value="${escapeHtml(q.id)}">
          </div>
        </div>
      `;
    }

    // ช่องกรอกตัวเลือกคำตอบ (radio / checkbox / dropdown / ranking)
    const needsChoices = ["categorical", "multi-select", "dropdown", "ranking"].includes(q.type) || q.id === "Q27" || q.id === "Q37";
    if (needsChoices) {
      const choicesStr = q.choices ? q.choices.join(", ") : "";
      bodyHtml += `
        <div class="form-group mt-2">
          <label class="form-label" style="font-weight:600;">ตัวเลือกคำตอบ (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
          <input type="text" class="form-control builder-input-choices" data-prop="choices" value="${escapeHtml(choicesStr)}">
          <span style="font-size:0.72rem; color:var(--text-muted);">เพิ่มคำว่า "อื่น ๆ" เป็นตัวเลือก เพื่อเปิดช่องให้ผู้ตอบระบุเอง</span>
        </div>
      `;
    }

    // ช่องเลือกด้านการประเมิน (สำหรับ Likert ทุกข้อ)
    if (q.type === "likert") {
      bodyHtml += `
        <div class="form-group mt-2">
          <label class="form-label" style="font-weight:600;">หัวข้อย่อยด้านการประเมิน (Section)</label>
          <select class="form-control builder-input-section" data-prop="section" style="width:100%;">
            <option value="Context" ${q.section === "Context" ? "selected" : ""}>ด้านบริบท (Context)</option>
            <option value="Input" ${q.section === "Input" ? "selected" : ""}>ด้านปัจจัยนำเข้า (Input)</option>
            <option value="Process" ${q.section === "Process" ? "selected" : ""}>ด้านกระบวนการ (Process)</option>
            <option value="Output" ${q.section === "Output" ? "selected" : ""}>ด้านผลสัมฤทธิ์ (Output)</option>
            <option value="Infographic" ${q.section === "Infographic" ? "selected" : ""}>ภาพอินโฟกราฟฟิก (Infographic)</option>
          </select>
        </div>
      `;
    }

    // ช่องกำหนดค่าต่ำสุด/สูงสุด สำหรับคำถามตัวเลข
    if (q.type === "numeric" && !isCore) {
      bodyHtml += `
        <div class="form-group mt-2" style="display:flex; gap:12px;">
          <div style="flex:1;">
            <label class="form-label" style="font-weight:600;">ค่าต่ำสุด (min)</label>
            <input type="number" class="form-control builder-input-min" value="${q.min !== undefined ? q.min : ''}">
          </div>
          <div style="flex:1;">
            <label class="form-label" style="font-weight:600;">ค่าสูงสุด (max)</label>
            <input type="number" class="form-control builder-input-max" value="${q.max !== undefined ? q.max : ''}">
          </div>
        </div>
      `;
    }

    // ตัวเลือกช่องพิมพ์แบบยาว (ปลายเปิด) สำหรับคำถามข้อความ
    if (q.type === "text" && !isCore) {
      bodyHtml += `
        <div class="form-group mt-2">
          <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
            <input type="checkbox" class="builder-input-multiline" ${q.multiline ? "checked" : ""}>
            ช่องพิมพ์แบบยาว (ปลายเปิด)
          </label>
        </div>
      `;
    }

    // ช่องแก้ไขหัวข้อย่อยสำหรับการให้คะแนนรายหัวข้อ (facilities)
    if (q.type === "facilities") {
      const subs = q.subfields || [];
      bodyHtml += `<div class="form-group mt-2"><label class="form-label" style="font-weight:600;">หัวข้อย่อยที่ให้คะแนน (1-5)</label>`;
      subs.forEach((sub, idx) => {
        const sublabel = (q.sublabels && q.sublabels[idx] !== undefined) ? q.sublabels[idx] : sub;
        bodyHtml += `
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
            <span style="font-size:0.8rem; font-weight:600; width:60px;">หัวข้อ ${idx+1}:</span>
            <input type="text" class="form-control builder-input-sublabel" data-subidx="${idx}" value="${escapeHtml(sublabel)}" style="flex:1;">
          </div>
        `;
      });
      if (!isCore) {
        bodyHtml += `<button type="button" class="btn-add-subitem" data-qid="${escapeHtml(q.id)}" style="background:none; border:1px dashed var(--border-color); color:var(--text-secondary); cursor:pointer; font-size:0.75rem; padding:4px 10px; border-radius:6px; margin-top:4px;">+ เพิ่มหัวข้อย่อย</button>`;
      }
      bodyHtml += `</div>`;
    }

    // ตั้งค่าเพิ่มเติมของคำถามที่เพิ่มเอง: ส่วนที่ของแบบฟอร์ม / บังคับตอบ / ภาพประกอบ / pattern
    if (!isCore) {
      bodyHtml += `
        <div class="bq-row mt-2">
          <div class="form-group">
            <label class="form-label" style="font-weight:600;">ส่วนที่ของแบบฟอร์ม (หน้า)</label>
            <select class="form-control builder-input-step">
              <option value="1" ${(!q.step || q.step === 1) ? "selected" : ""}>ส่วนที่ 1</option>
              <option value="2" ${q.step === 2 ? "selected" : ""}>ส่วนที่ 2</option>
              <option value="3" ${q.step === 3 ? "selected" : ""}>ส่วนที่ 3</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" style="font-weight:600;">ภาพประกอบ (URL หรือ path เช่น assets/image1.png)</label>
            <input type="text" class="form-control builder-input-image" value="${escapeHtml(q.image || "")}">
          </div>
        </div>
      `;
      if (q.type === "text") {
        bodyHtml += `
          <div class="form-group mt-2">
            <label class="form-label" style="font-weight:600;">รูปแบบคำตอบที่ยอมรับ (Regex Pattern เช่น ^\\d{7}$ = ตัวเลข 7 หลัก, เว้นว่าง = ไม่ตรวจ)</label>
            <input type="text" class="form-control builder-input-pattern" value="${escapeHtml(q.pattern || "")}">
          </div>
        `;
      }
      bodyHtml += `
        <div class="form-group mt-2">
          <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
            <input type="checkbox" class="builder-input-required" ${q.required !== false ? "checked" : ""}>
            บังคับตอบ (ผู้ตอบต้องตอบข้อนี้ก่อนส่ง)
          </label>
        </div>
      `;
    }

    card.innerHTML = headerHtml + bodyHtml;

    list.appendChild(card);
  });

  // ปุ่มเพิ่มคำถาม (รายการเดียว ไม่แบ่งส่วน)
  list.appendChild(makeAddQuestionButton("+ เพิ่มคำถามใหม่"));

  // เปลี่ยนรูปแบบการตอบ -> เก็บค่าที่กรอกไว้ก่อนแล้ว render ใหม่เพื่อแสดงช่องตั้งค่าให้ตรงประเภท
  document.querySelectorAll(".builder-input-type").forEach(sel => {
    sel.addEventListener("change", () => syncAndRerender());
  });

  // เพิ่มหัวข้อย่อยให้คำถามแบบ facilities
  document.querySelectorAll(".btn-add-subitem").forEach(btn => {
    btn.addEventListener("click", () => {
      const qid = btn.getAttribute("data-qid");
      syncAndRerender(() => {
        const q = currentSchema.find(x => x.id === qid);
        if (q) {
          if (!q.subfields) q.subfields = [];
          if (!q.sublabels) q.sublabels = [];
          const n = q.subfields.length + 1;
          q.subfields.push(`${qid}_Sub${n}`);
          q.sublabels.push(`หัวข้อย่อย ${n}`);
        }
      });
    });
  });

  // Bind Delete buttons
  document.querySelectorAll(".btn-delete-question").forEach(btn => {
    btn.addEventListener("click", () => {
      const qid = btn.getAttribute("data-qid");
      if (confirm(`คุณต้องการลบข้อคำถามรหัส ${qid} ออกใช่หรือไม่?`)) {
        syncAndRerender(() => {
          currentSchema = currentSchema.filter(q => q.id !== qid);
        });
      }
    });
  });
}

function makeAddQuestionButton(label) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-add-question";
  btn.style.marginTop = "12px";
  btn.style.justifyContent = "center";
  btn.style.width = "100%";
  btn.innerText = label;
  btn.addEventListener("click", () => addBuilderQuestion());
  return btn;
}

// หา id แบบ Qn ที่ยังว่าง (อ่านง่าย ไม่ชนของเดิม) — ใช้เป็นชื่อคอลัมน์ตั้งต้น แก้ทีหลังได้
function nextQuestionId() {
  const used = new Set(currentSchema.map(q => q.id));
  let n = 1;
  while (used.has("Q" + n)) n++;
  return "Q" + n;
}

// เพิ่มคำถามใหม่หนึ่งข้อต่อท้ายรายการ (รูปแบบการตอบตั้งต้น = เลือกตอบข้อเดียว)
function addBuilderQuestion() {
  const id = nextQuestionId();
  const q = { id, type: "categorical", text: "คำถามใหม่", choices: ["ตัวเลือก 1", "ตัวเลือก 2"], step: 1, required: true };
  syncAndRerender(() => { currentSchema.push(q); });
}

// อ่านค่าที่กรอกในตัวสร้างแบบสอบถามกลับเข้า currentSchema แล้ว render ใหม่ (กันข้อมูลที่ยังไม่บันทึกหาย)
function syncAndRerender(mutator) {
  const collected = collectBuilderSchema(true);
  if (collected) currentSchema = collected;
  if (typeof mutator === "function") mutator();
  rebuildQuestionsMeta();
  renderBuilder();
}

function handleBuilderReset() {
  if (confirm("คุณยืนยันที่จะคืนค่าคำถามทั้งหมดกลับเป็นเทมเพลต Word ตั้งต้นใช่หรือไม่? (การเปลี่ยนแปลงที่คุณแก้ไขจะถูกลบทั้งหมด)")) {
    currentSchema = JSON.parse(JSON.stringify(DEFAULT_SCHEMA));
    rebuildQuestionsMeta();
    renderBuilder();
    alert("รีเซ็ตสคีมาเป็นแบบฟอร์มตั้งต้นแล้ว กรุณากดปุ่ม บันทึก เพื่ออัปโหลดขึ้นสเปรดชีต");
  }
}

// อ่านโครงสร้างคำถามจากหน้าจอตัวสร้างแบบสอบถาม
// silent = true : ใช้ตอน render ใหม่ภายใน (ไม่ alert และไม่บังคับว่าต้องกรอกข้อความ)
// silent = false: ใช้ตอนกดบันทึก (ตรวจสอบว่าต้องกรอกข้อความครบ)
function collectBuilderSchema(silent) {
  const updatedSchema = [];

  {
    const cards = document.querySelectorAll("#builder-questions-list .builder-question-card");

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const origId = card.getAttribute("data-qid");
      const isCore = isCoreQuestion(origId);
      const orig = currentSchema.find(x => x.id === origId);

      // รหัส/ชื่อคอลัมน์: คำถามที่เพิ่มเองแก้ได้ (ทำให้ปลอดภัยและไม่ซ้ำ), คำถามหลักคงเดิม
      let id = origId;
      if (!isCore) {
        const idInput = card.querySelector('.builder-input-id');
        if (idInput) {
          const cleaned = idInput.value.trim().replace(/\s+/g, "_").replace(/[^\wก-๙]/g, "_");
          if (cleaned) id = cleaned;
        }
      }
      if (updatedSchema.some(x => x.id === id)) {
        const base = id; let k = 2;
        while (updatedSchema.some(x => x.id === (base + "_" + k))) k++;
        id = base + "_" + k;
      }

      const textInput = card.querySelector('.builder-input-text');
      const text = textInput ? textInput.value.trim() : "";

      if (!text && !silent) {
        alert("กรุณากรอกหัวข้อข้อความคำถามให้ครบถ้วนทุกข้อ");
        return null;
      }

      // ส่วนที่ของแบบฟอร์ม: คำถามหลักคงค่าเดิม, คำถามที่เพิ่มเองอ่านจากตัวเลือก
      let step = orig && orig.step ? orig.step : 1;
      const stepSel = card.querySelector('.builder-input-step');
      if (!isCore && stepSel) step = Number(stepSel.value) || 1;

      let required = orig ? (orig.required !== false) : true;
      const reqChk = card.querySelector('.builder-input-required');
      if (!isCore && reqChk) required = reqChk.checked;

      const q = { id, text, step, required };

      if (isCore) {
        // คำถามหลักของเทมเพลต: คงประเภทและคุณสมบัติเดิม แก้ได้เฉพาะข้อความ/ตัวเลือก/หัวข้อย่อย/ด้านการประเมิน
        if (orig) {
          q.type = orig.type;
          if (orig.choices) q.choices = orig.choices.slice();
          if (orig.hasOther) q.hasOther = orig.hasOther;
          if (orig.min !== undefined) q.min = orig.min;
          if (orig.max !== undefined) q.max = orig.max;
          if (orig.pattern !== undefined) q.pattern = orig.pattern;
          if (orig.section) q.section = orig.section;
          if (orig.subfields) q.subfields = orig.subfields.slice();
          if (orig.sublabels) q.sublabels = orig.sublabels.slice();
          if (orig.image) q.image = orig.image;
        } else {
          q.type = "text";
        }
      } else {
        // คำถามที่เพิ่มเอง: อ่านประเภทจากตัวเลือกรูปแบบการตอบ
        const typeSel = card.querySelector('.builder-input-type');
        q.type = typeSel ? typeSel.value : (orig ? orig.type : "text");
      }

      // ----- อ่านค่าตั้งค่าตามประเภท (ใช้ร่วมกันทั้งคำถามหลักและคำถามที่เพิ่มเอง) -----
      const choicesInput = card.querySelector('.builder-input-choices');
      if (choicesInput && ["categorical", "multi-select", "dropdown", "ranking"].includes(q.type)) {
        q.choices = choicesInput.value.split(",").map(c => c.trim()).filter(c => c !== "");
        if (["categorical", "multi-select", "dropdown"].includes(q.type) || id === "Q37") {
          q.hasOther = q.choices.includes("อื่น ๆ");
        }
      }

      const sectionSel = card.querySelector('.builder-input-section');
      if (sectionSel && q.type === "likert") {
        q.section = sectionSel.value;
      }

      if (q.type === "numeric" && !isCore) {
        const minInput = card.querySelector('.builder-input-min');
        const maxInput = card.querySelector('.builder-input-max');
        if (minInput && minInput.value !== "") q.min = Number(minInput.value);
        if (maxInput && maxInput.value !== "") q.max = Number(maxInput.value);
      }

      if (q.type === "text" && !isCore) {
        const ml = card.querySelector('.builder-input-multiline');
        q.multiline = !!(ml && ml.checked);
      }

      if (q.type === "facilities") {
        const subInputs = card.querySelectorAll('.builder-input-sublabel');
        if (subInputs.length) {
          q.subfields = [];
          q.sublabels = [];
          subInputs.forEach((inp, idx) => {
            q.subfields.push(`${id}_Sub${idx + 1}`);
            q.sublabels.push(inp.value.trim() || `หัวข้อย่อย ${idx + 1}`);
          });
        } else if (orig && orig.subfields) {
          q.subfields = orig.subfields.slice();
          q.sublabels = (orig.sublabels || orig.subfields).slice();
        } else {
          q.subfields = [`${id}_Sub1`, `${id}_Sub2`];
          q.sublabels = ["หัวข้อย่อย 1", "หัวข้อย่อย 2"];
        }
      }

      if (!isCore) {
        const imgInput = card.querySelector('.builder-input-image');
        if (imgInput && imgInput.value.trim()) q.image = imgInput.value.trim();

        const patInput = card.querySelector('.builder-input-pattern');
        if (patInput && q.type === "text" && patInput.value.trim()) {
          const pat = patInput.value.trim();
          try {
            new RegExp(pat);
            q.pattern = pat;
          } catch (e) {
            if (!silent) {
              alert(`Pattern ของข้อ "${text}" ไม่ใช่ Regex ที่ถูกต้อง: ${pat}`);
              return null;
            }
          }
        }
      }

      updatedSchema.push(q);
    }
  }

  return updatedSchema;
}

// UTILITIES
function setCookie(cname, cvalue, exdays) {
  const d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  let expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/;SameSite=Lax";
}

function getCookie(cname) {
  let name = cname + "=";
  let decodedCookie = decodeURIComponent(document.cookie);
  let ca = decodedCookie.split(';');
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

// สร้างรหัสคำถาม (id) ที่ไม่ชนกัน ใช้กับคำถามที่เพิ่มใหม่ในตัวสร้างแบบสอบถาม
function generateQuestionId(prefix) {
  const p = prefix || "Q";
  return p + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}
