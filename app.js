// FizQateLab — Limited Memory AI prototype (localStorage)

const $ = (id) => document.getElementById(id);

const screenLogin   = $("screenLogin");
const screenStudent = $("screenStudent");
const screenTeacher = $("screenTeacher");

const who = $("who");
const btnLogout = $("btnLogout");

const loginId = $("loginId");
const loginPass = $("loginPass");
const btnLogin = $("btnLogin");

const tabs = Array.from(document.querySelectorAll(".tab"));

const topic = $("topic");
const errType = $("errType");
const errText = $("errText");
const btnSaveError = $("btnSaveError");
const studentList = $("studentList");
const advice = $("advice");

const teacherLast = $("teacherLast");
const teacherStats = $("teacherStats");

let role = "student"; // default

const LS_KEY = "fizqatelab_memory_v1";

function loadMemory(){
  try{
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  }catch(e){
    return [];
  }
}
function saveMemory(items){
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function nowStr(){
  const d = new Date();
  return d.toLocaleString();
}

function setRole(r){
  role = r;
  tabs.forEach(t => t.classList.toggle("active", t.dataset.role === r));
}

tabs.forEach(t => {
  t.addEventListener("click", () => setRole(t.dataset.role));
});

function showScreen(which){
  screenLogin.classList.add("hidden");
  screenStudent.classList.add("hidden");
  screenTeacher.classList.add("hidden");

  which.classList.remove("hidden");

  who.classList.remove("hidden");
  btnLogout.classList.remove("hidden");
}

function logout(){
  who.classList.add("hidden");
  btnLogout.classList.add("hidden");

  screenLogin.classList.remove("hidden");
  screenStudent.classList.add("hidden");
  screenTeacher.classList.add("hidden");

  loginPass.value = "";
}
btnLogout.addEventListener("click", logout);

function renderStudent(){
  const mem = loadMemory();
  const myLogin = (loginId.value || "student").trim();

  const filtered = mem.filter(x => x.user === myLogin).slice(-10).reverse();

  studentList.innerHTML = "";
  if(filtered.length === 0){
    studentList.innerHTML = `<div class="item"><div class="k">Әзірге жазба жоқ</div></div>`;
  }else{
    filtered.forEach(x => {
      studentList.innerHTML += `
        <div class="item">
          <div class="top">
            <div class="v">${x.text || "—"}</div>
            <span class="pill">${x.typeLabel}</span>
          </div>
          <div class="k">${x.topicLabel} • ${x.time}</div>
        </div>
      `;
    });
  }

  // Limited Memory advice: last frequent error type in last N
  const lastN = mem.filter(x => x.user === myLogin).slice(-15);
  if(lastN.length === 0){
    advice.textContent = "Әзірге қате жоқ. Бір қателік сақта да, жүйе саған кеңес береді.";
    return;
  }

  const counts = {};
  lastN.forEach(x => { counts[x.type] = (counts[x.type]||0)+1; });

  const topType = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];

  const tips = {
    formula: "Кеңес: формуланы қолданбас бұрын шамалардың мағынасын жазып ал. Формуладағы әр таңбаны бірлікпен тексер.",
    units: "Кеңес: өлшем бірлікті міндетті түрде SI жүйесіне келтір. кВ→В, мА→А сияқты ауыстыруды бөлек жаз.",
    sign: "Кеңес: таңба қателігін азайту үшін бағытты алдын ала анықта: ось таңда, +/− белгіле, содан кейін ғана есепте.",
    logic: "Кеңес: шешімді 3 қадамға бөл: берілгені→қатынас→қорытынды. Әр қадамнан кейін өзіңе 'неге?' деп сұра."
  };

  advice.textContent = tips[topType] || "Кеңес: қателерді қайталап қара, жүйе үлгіні көрсетеді.";
}

function renderTeacher(){
  const mem = loadMemory().slice(-10).reverse();
  teacherLast.innerHTML = "";

  if(mem.length === 0){
    teacherLast.innerHTML = `<div class="item"><div class="k">Әзірге дерек жоқ</div></div>`;
  }else{
    mem.forEach(x => {
      teacherLast.innerHTML += `
        <div class="item">
          <div class="top">
            <div class="v">${x.text || "—"}</div>
            <span class="pill">${x.typeLabel}</span>
          </div>
          <div class="k">${x.user} • ${x.topicLabel} • ${x.time}</div>
        </div>
      `;
    });
  }

  // stats
  const all = loadMemory().slice(-50);
  const types = ["formula","units","sign","logic"];
  const labels = {
    formula:"Формула",
    units:"Бірлік",
    sign:"Таңба",
    logic:"Логика"
  };
  const counts = {};
  types.forEach(t => counts[t]=0);
  all.forEach(x => { if(counts[x.type] !== undefined) counts[x.type]++; });

  const max = Math.max(1, ...Object.values(counts));

  teacherStats.innerHTML = "";
  types.forEach(t => {
    const pct = Math.round((counts[t]/max)*100);
    teacherStats.innerHTML += `
      <div class="bar">
        <div class="label">
          <span>${labels[t]}</span>
          <span>${counts[t]}</span>
        </div>
        <div class="line" style="width:${pct}%"></div>
      </div>
    `;
  });
}

btnLogin.addEventListener("click", () => {
  const pass = (loginPass.value || "").trim();
  const id = (loginId.value || "").trim();

  if(!id){
    alert("Логин енгіз.");
    return;
  }

  if(role === "student"){
    if(pass !== "1234"){
      alert("Оқушы паролі қате. Демо: 1234");
      return;
    }
    who.textContent = `Оқушы: ${id}`;
    showScreen(screenStudent);
    renderStudent();
  }else{
    if(pass !== "admin"){
      alert("Мұғалім паролі қате. Демо: admin");
      return;
    }
    who.textContent = `Мұғалім: ${id}`;
    showScreen(screenTeacher);
    renderTeacher();
  }
});

btnSaveError.addEventListener("click", () => {
  const id = (loginId.value || "student").trim();
  const t = (errText.value || "").trim();
  if(!t){
    alert("Қысқа сипаттама жаз.");
    return;
  }

  const typeVal = errType.value;
  const typeLabel = {
    formula:"Формула қателігі",
    units:"Өлшем бірлік қателігі",
    sign:"Белгі/таңба қателігі",
    logic:"Логикалық қателік"
  }[typeVal] || typeVal;

  const topicVal = topic.value;
  const topicLabel = {
    electric_field:"Электр өрісі",
    potential:"Потенциал",
    voltage:"Кернеу",
    work_energy:"Жұмыс және энергия"
  }[topicVal] || topicVal;

  const mem = loadMemory();
  mem.push({
    user: id,
    time: nowStr(),
    type: typeVal,
    typeLabel,
    topic: topicVal,
    topicLabel,
    text: t
  });
  saveMemory(mem);

  errText.value = "";
  renderStudent();
});
