/* ============================================================
   РУССКИЕ ИНСТРУКЦИИ (код/блоктар): PhysicsTreker прототип
   - Роли: student / teacher
   - Limited Memory: сақтайтын терезе (последние N попыток)
   - Хранилище: localStorage (без сервера)
   ============================================================ */

/* -------------------------
   КОНФИГ
------------------------- */
const CONFIG = {
  studentPassword: "1234",
  teacherPassword: "admin",
  memoryLimit: 50,      // Limited Memory: соңғы 50 әрекет ғана сақталады
  quizSize: 8           // бір тестте қанша сұрақ
};

const TOPICS = [
  { id: "field", name: "Электр өрісі" },
  { id: "potential", name: "Потенциал" },
  { id: "voltage", name: "Кернеу" },
  { id: "work", name: "Өрістің жұмысы" }
];

/* -------------------------
   STORAGE KEYS
------------------------- */
const K = {
  questions: "pt_questions_v1",
  attempts: "pt_attempts_v1",     // массив: {user, ts, qid, topic, correct, chosen}
  users: "pt_users_v1",           // опционал (қазір қолданбаймыз)
  session: "pt_session_v1"
};

/* -------------------------
   DOM
------------------------- */
const $ = (s) => document.querySelector(s);

const screenAuth = $("#screenAuth");
const screenStudent = $("#screenStudent");
const screenTeacher = $("#screenTeacher");
const whoChip = $("#who");
const btnLogout = $("#btnLogout");

const tabs = document.querySelectorAll(".tab");
const authLogin = $("#authLogin");
const authPass = $("#authPass");
const btnLogin = $("#btnLogin");
const authHint = $("#authHint");

const stAttempts = $("#stAttempts");
const stAccuracy = $("#stAccuracy");
const stWeak = $("#stWeak");
const btnStartQuiz = $("#btnStartQuiz");
const btnStudentHistory = $("#btnStudentHistory");
const quizBox = $("#quizBox");
const studentModal = $("#studentModal");

const qTopic = $("#qTopic");
const qText = $("#qText");
const qA = $("#qA");
const qB = $("#qB");
const qC = $("#qC");
const qD = $("#qD");
const qCorrect = $("#qCorrect");
const qExplain = $("#qExplain");
const btnAddQuestion = $("#btnAddQuestion");
const btnResetDemo = $("#btnResetDemo");
const teacherMsg = $("#teacherMsg");

const btnRefreshAnalytics = $("#btnRefreshAnalytics");
const btnExportJSON = $("#btnExportJSON");
const analyticsBox = $("#analyticsBox");

/* -------------------------
   INIT
------------------------- */
init();

/* -------------------------
   FUNCTIONS: INIT
------------------------- */
function init(){
  seedIfEmpty();
  fillTopics();
  bindEvents();
  restoreSession();
}

/* -------------------------
   EVENTS
------------------------- */
function bindEvents(){
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    authHint.textContent = (t.dataset.role === "teacher")
      ? "Мұғалім үшін пароль: admin"
      : "Оқушы үшін пароль: 1234";
  }));

  btnLogin.addEventListener("click", onLogin);
  btnLogout.addEventListener("click", logout);

  btnStartQuiz.addEventListener("click", startQuiz);
  btnStudentHistory.addEventListener("click", showStudentHistory);

  btnAddQuestion.addEventListener("click", addQuestion);
  btnResetDemo.addEventListener("click", resetDemo);

  btnRefreshAnalytics.addEventListener("click", renderAnalytics);
  btnExportJSON.addEventListener("click", exportJSON);
}

/* -------------------------
   SESSION
------------------------- */
function saveSession(session){
  localStorage.setItem(K.session, JSON.stringify(session));
}
function getSession(){
  const raw = localStorage.getItem(K.session);
  return raw ? JSON.parse(raw) : null;
}
function clearSession(){
  localStorage.removeItem(K.session);
}

function restoreSession(){
  const s = getSession();
  if(!s){
    showAuth();
    return;
  }
  if(s.role === "student") showStudent(s.user);
  if(s.role === "teacher") showTeacher(s.user);
}

function onLogin(){
  const role = document.querySelector(".tab.active").dataset.role;
  const login = (authLogin.value || "").trim();
  const pass = (authPass.value || "").trim();

  if(!login){
    authHint.textContent = "Логин енгіз.";
    return;
  }

  if(role === "student" && pass !== CONFIG.studentPassword){
    authHint.textContent = "Оқушы паролі қате.";
    return;
  }
  if(role === "teacher" && pass !== CONFIG.teacherPassword){
    authHint.textContent = "Мұғалім паролі қате.";
    return;
  }

  const session = { role, user: login, ts: Date.now() };
  saveSession(session);

  if(role === "student") showStudent(login);
  else showTeacher(login);

  authPass.value = "";
  authHint.textContent = "";
}

function logout(){
  clearSession();
  showAuth();
}

/* -------------------------
   UI SWITCH
------------------------- */
function showAuth(){
  screenAuth.classList.remove("hidden");
  screenStudent.classList.add("hidden");
  screenTeacher.classList.add("hidden");
  whoChip.classList.add("hidden");
  btnLogout.classList.add("hidden");
}

function showStudent(user){
  screenAuth.classList.add("hidden");
  screenStudent.classList.remove("hidden");
  screenTeacher.classList.add("hidden");

  whoChip.textContent = `Оқушы: ${user}`;
  whoChip.classList.remove("hidden");
  btnLogout.classList.remove("hidden");

  quizBox.classList.add("hidden");
  studentModal.classList.add("hidden");

  renderStudentStats(user);
}

function showTeacher(user){
  screenAuth.classList.add("hidden");
  screenStudent.classList.add("hidden");
  screenTeacher.classList.remove("hidden");

  whoChip.textContent = `Мұғалім: ${user}`;
  whoChip.classList.remove("hidden");
  btnLogout.classList.remove("hidden");

  teacherMsg.textContent = "";
  renderAnalytics();
}

/* -------------------------
   DATA: QUESTIONS
------------------------- */
function getQuestions(){
  return JSON.parse(localStorage.getItem(K.questions) || "[]");
}
function setQuestions(arr){
  localStorage.setItem(K.questions, JSON.stringify(arr));
}

/* -------------------------
   DATA: ATTEMPTS (Limited Memory)
------------------------- */
function getAttempts(){
  return JSON.parse(localStorage.getItem(K.attempts) || "[]");
}
function setAttempts(arr){
  localStorage.setItem(K.attempts, JSON.stringify(arr));
}

/* Limited Memory: только последние N попыток */
function pushAttempt(attempt){
  const arr = getAttempts();
  arr.push(attempt);
  const sliced = arr.slice(-CONFIG.memoryLimit);
  setAttempts(sliced);
}

/* -------------------------
   SEED DEMO DATA
------------------------- */
function seedIfEmpty(){
  const q = getQuestions();
  if(q.length > 0) return;

  const demo = [
    {
      id:"q1", topic:"field",
      text:"Электр өрісінің кернеулігі (E) қандай шамамен анықталады?",
      options:{A:"Күш/заряд", B:"Жұмыс/заряд", C:"Күш*заряд", D:"Заряд/күш"},
      correct:"A",
      explain:"Кернеулік анықтамасы: E = F / q. Мұнда F — өрістің зарядқа әсер ететін күші, q — сынақ заряды."
    },
    {
      id:"q2", topic:"potential",
      text:"Электрлік потенциал (φ) нені сипаттайды?",
      options:{A:"Өріс сызықтарының саны", B:"Бірлік зарядтың энергиясы", C:"Зарядтың массасы", D:"Ток күші"},
      correct:"B",
      explain:"Потенциал — бірлік оң зарядқа келетін потенциалдық энергия: φ = W_p / q."
    },
    {
      id:"q3", topic:"voltage",
      text:"Кернеу (U) қандай қатынаспен табылады?",
      options:{A:"U = I/R", B:"U = A/q", C:"U = q/A", D:"U = R/I"},
      correct:"B",
      explain:"Кернеу — өрістің жұмысының зарядқа қатынасы: U = A / q."
    },
    {
      id:"q4", topic:"work",
      text:"Өрістің жұмысы (A) мен кернеудің байланысы қандай?",
      options:{A:"A = U/q", B:"A = U*q", C:"A = q/U", D:"A = U + q"},
      correct:"B",
      explain:"A = U·q. Заряд q кернеу U айырмасынан өткенде өріс A жұмыс атқарады."
    }
  ];

  setQuestions(demo);
  setAttempts([]);
}

/* -------------------------
   TOPICS UI
------------------------- */
function fillTopics(){
  qTopic.innerHTML = TOPICS.map(t => `<option value="${t.id}">${t.name}</option>`).join("");
}

/* -------------------------
   STUDENT: STATS + WEAK TOPIC
------------------------- */
function renderStudentStats(user){
  const attempts = getAttempts().filter(a => a.user === user);
  const total = attempts.length;
  const correct = attempts.filter(a => a.correct).length;
  const acc = total ? Math.round((correct/total)*100) : 0;

  const weak = calcWeakTopic(user);

  stAttempts.textContent = String(total);
  stAccuracy.textContent = `${acc}%`;
  stWeak.textContent = weak ? topicName(weak) : "—";
}

function calcWeakTopic(user){
  const attempts = getAttempts().filter(a => a.user === user);
  if(attempts.length === 0) return null;

  // считаем ошибки по темам
  const wrongByTopic = {};
  attempts.forEach(a => {
    if(!a.correct){
      wrongByTopic[a.topic] = (wrongByTopic[a.topic] || 0) + 1;
    }
  });

  let bestTopic = null;
  let maxWrong = 0;
  for(const [topic, cnt] of Object.entries(wrongByTopic)){
    if(cnt > maxWrong){
      maxWrong = cnt;
      bestTopic = topic;
    }
  }
  return bestTopic;
}

function topicName(id){
  const t = TOPICS.find(x => x.id === id);
  return t ? t.name : id;
}

/* -------------------------
   STUDENT: QUIZ (Adaptive)
------------------------- */
function startQuiz(){
  const s = getSession();
  if(!s) return;

  const user = s.user;
  const questions = getQuestions();

  if(questions.length === 0){
    quizBox.classList.remove("hidden");
    quizBox.innerHTML = `<p>Сұрақ жоқ. Мұғалім панелінен сұрақ қосыңыз.</p>`;
    return;
  }

  const weak = calcWeakTopic(user);
  const selected = pickQuestionsAdaptive(questions, weak, CONFIG.quizSize);

  runQuizFlow(user, selected);
}

function pickQuestionsAdaptive(all, weakTopic, n){
  // 1) Егер әлсіз тақырып бар болса — соның сұрақтарын көбірек
  let poolWeak = weakTopic ? all.filter(q => q.topic === weakTopic) : [];
  let poolOther = all.filter(q => !weakTopic || q.topic !== weakTopic);

  shuffle(poolWeak);
  shuffle(poolOther);

  const res = [];
  const weakCount = weakTopic ? Math.min(Math.ceil(n * 0.6), poolWeak.length) : 0;

  res.push(...poolWeak.slice(0, weakCount));
  res.push(...poolOther.slice(0, n - res.length));

  // Егер бәрібір жетпесе — қайтадан толтыру
  if(res.length < n){
    const rest = all.filter(q => !res.some(x => x.id === q.id));
    shuffle(rest);
    res.push(...rest.slice(0, n - res.length));
  }

  return res;
}

function runQuizFlow(user, list){
  let i = 0;
  let score = 0;

  quizBox.classList.remove("hidden");

  const renderQ = () => {
    const q = list[i];
    quizBox.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <div class="chip">Сұрақ ${i+1} / ${list.length}</div>
        <div class="chip">Тақырып: ${topicName(q.topic)}</div>
      </div>
      <div class="quizQ">${q.text}</div>
      <div id="opts"></div>
      <div id="after" class="hidden"></div>
    `;

    const opts = $("#opts");
    const letters = ["A","B","C","D"];
    letters.forEach(L => {
      const text = q.options[L];
      if(!text) return;
      const div = document.createElement("div");
      div.className = "option";
      div.textContent = `${L}) ${text}`;
      div.addEventListener("click", () => choose(L, div, q));
      opts.appendChild(div);
    });
  };

  const choose = (L, div, q) => {
    // disable all
    document.querySelectorAll(".option").forEach(x => x.style.pointerEvents = "none");

    const correct = (L.toUpperCase() === q.correct.toUpperCase());
    if(correct){
      div.classList.add("correct");
      score++;
    }else{
      div.classList.add("wrong");
      // подсветим правильный
      document.querySelectorAll(".option").forEach(x => {
        if(x.textContent.trim().startsWith(q.correct.toUpperCase()+")")) x.classList.add("correct");
      });
    }

    // save attempt (Limited Memory)
    pushAttempt({
      user,
      ts: Date.now(),
      qid: q.id,
      topic: q.topic,
      correct,
      chosen: L.toUpperCase()
    });

    const after = $("#after");
    after.classList.remove("hidden");
    after.innerHTML = `
      <div class="explain">
        <b>Түсіндірме:</b> ${q.explain}
      </div>
      <div class="row">
        <button class="btn primary" id="btnNext">${i === list.length-1 ? "Нәтиже" : "Келесі"}</button>
      </div>
    `;
    $("#btnNext").addEventListener("click", () => {
      i++;
      if(i >= list.length){
        finish();
      }else{
        renderQ();
      }
    });
  };

  const finish = () => {
    const percent = Math.round((score / list.length) * 100);
    quizBox.innerHTML = `
      <h3>Нәтиже</h3>
      <p>Дұрыс жауап: <b>${score}</b> / ${list.length}  (${percent}%)</p>
      <div class="row">
        <button class="btn primary" id="btnAgain">Қайта тест</button>
        <button class="btn ghost" id="btnClose">Жабу</button>
      </div>
      <p class="muted">Ескерту: жүйе тек соңғы ${CONFIG.memoryLimit} әрекетті есте сақтайды (Limited Memory).</p>
    `;
    renderStudentStats(user);

    $("#btnAgain").addEventListener("click", startQuiz);
    $("#btnClose").addEventListener("click", () => quizBox.classList.add("hidden"));
  };

  renderQ();
};

function showStudentHistory(){
  const s = getSession();
  if(!s) return;
  const user = s.user;

  const attempts = getAttempts().filter(a => a.user === user).slice().reverse();
  if(attempts.length === 0){
    openModal(`<h3>Қателерім</h3><p class="muted">Әзірше әрекет жоқ.</p>`);
    return;
  }

  // топ темаларды санаймыз
  const wrong = attempts.filter(a => !a.correct);
  const byTopic = {};
  wrong.forEach(a => byTopic[a.topic] = (byTopic[a.topic]||0)+1);

  const topicLines = Object.entries(byTopic)
    .sort((a,b)=>b[1]-a[1])
    .map(([t,c]) => `<li><b>${topicName(t)}</b> — ${c} қате</li>`)
    .join("");

  const last = attempts.slice(0, 12).map(a => `
    <li>
      ${new Date(a.ts).toLocaleString()} —
      <b>${topicName(a.topic)}</b> —
      ${a.correct ? `<span style="color:var(--ok)">дұрыс</span>` : `<span style="color:var(--danger)">қате</span>`}
    </li>
  `).join("");

  openModal(`
    <h3>Қателерім (Limited Memory)</h3>
    <p class="muted">Соңғы ${CONFIG.memoryLimit} әрекет сақталады.</p>
    <div class="aCard">
      <b>Әлсіз тақырыптар:</b>
      <ul>${topicLines || "<li>Қате жоқ 👌</li>"}</ul>
    </div>
    <div class="aCard">
      <b>Соңғы әрекеттер:</b>
      <ul>${last}</ul>
    </div>
  `);
}

function openModal(html){
  studentModal.classList.remove("hidden");
  studentModal.innerHTML = `
    <div class="card">
      ${html}
      <div class="row">
        <button class="btn primary" id="btnCloseModal">Жабу</button>
      </div>
    </div>
  `;
  $("#btnCloseModal").addEventListener("click", () => studentModal.classList.add("hidden"));
}

/* -------------------------
   TEACHER: ADD QUESTION
------------------------- */
function addQuestion(){
  const text = (qText.value||"").trim();
  const correct = (qCorrect.value||"").trim().toUpperCase();

  if(!text){
    teacherMsg.textContent = "Сұрақ мәтінін енгіз.";
    return;
  }
  if(!["A","B","C","D"].includes(correct)){
    teacherMsg.textContent = "Дұрыс жауап A/B/C/D болуы керек.";
    return;
  }

  const q = {
    id: "q" + Math.random().toString(16).slice(2,10),
    topic: qTopic.value,
    text,
    options:{
      A: (qA.value||"").trim(),
      B: (qB.value||"").trim(),
      C: (qC.value||"").trim(),
      D: (qD.value||"").trim()
    },
    correct,
    explain: (qExplain.value||"").trim() || "Түсіндірме қосылмаған."
  };

  const all = getQuestions();
  all.push(q);
  setQuestions(all);

  teacherMsg.textContent = "Сұрақ қосылды ✅";
  qText.value = ""; qA.value=""; qB.value=""; qC.value=""; qD.value=""; qCorrect.value=""; qExplain.value="";

  renderAnalytics();
}

function resetDemo(){
  if(!confirm("Демо деректерді қалпына келтіреміз бе? Сұрақтар/әрекеттер тазарады.")) return;
  localStorage.removeItem(K.questions);
  localStorage.removeItem(K.attempts);
  seedIfEmpty();
  teacherMsg.textContent = "Қалпына келді ✅";
  renderAnalytics();
}

/* -------------------------
   TEACHER: ANALYTICS
------------------------- */
function renderAnalytics(){
  const attempts = getAttempts();
  const questions = getQuestions();

  if(attempts.length === 0){
    analyticsBox.innerHTML = `<p class="muted">Әзірше дерек жоқ. Оқушылар тест тапсырсын.</p>`;
    return;
  }

  // Оқушы бойынша
  const byUser = {};
  attempts.forEach(a => {
    if(!byUser[a.user]) byUser[a.user] = {total:0, correct:0, wrongByTopic:{}};
    byUser[a.user].total++;
    if(a.correct) byUser[a.user].correct++;
    else byUser[a.user].wrongByTopic[a.topic] = (byUser[a.user].wrongByTopic[a.topic]||0)+1;
  });

  const userCards = Object.entries(byUser).map(([user, s]) => {
    const acc = Math.round((s.correct/s.total)*100);
    const weak = Object.entries(s.wrongByTopic).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—";
    const weakTxt = weak === "—" ? "—" : topicName(weak);

    const wrongLines = Object.entries(s.wrongByTopic)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,4)
      .map(([t,c]) => `<li>${topicName(t)} — ${c}</li>`)
      .join("") || "<li>Қате жоқ</li>";

    return `
      <div class="aCard">
        <div class="row" style="justify-content:space-between">
          <b>${user}</b>
          <span class="chip">${acc}% (${s.correct}/${s.total})</span>
        </div>
        <div class="muted">Әлсіз тақырып: <b>${weakTxt}</b></div>
        <div class="muted" style="margin-top:8px">Қате саны (TOP):</div>
        <ul>${wrongLines}</ul>
      </div>
    `;
  }).join("");

  // Жалпы тақырып бойынша қателер
  const wrongByTopicAll = {};
  attempts.filter(a=>!a.correct).forEach(a=>{
    wrongByTopicAll[a.topic] = (wrongByTopicAll[a.topic]||0)+1;
  });

  const topicBlock = Object.entries(wrongByTopicAll)
    .sort((a,b)=>b[1]-a[1])
    .map(([t,c]) => `<li><b>${topicName(t)}</b> — ${c}</li>`)
    .join("") || "<li>Қате жоқ</li>";

  analyticsBox.innerHTML = `
    <div class="aCard">
      <b>Жалпы:</b>
      <div class="muted">Сұрақтар саны: <b>${questions.length}</b> • Әрекеттер: <b>${attempts.length}</b> (Limited Memory: соңғы ${CONFIG.memoryLimit})</div>
    </div>
    <div class="aCard">
      <b>Тақырып бойынша қателер:</b>
      <ul>${topicBlock}</ul>
    </div>
    <div>
      <h3 style="margin:14px 0 6px 0">Оқушы бойынша</h3>
      ${userCards}
    </div>
  `;
}

function exportJSON(){
  const data = {
    questions: getQuestions(),
    attempts: getAttempts(),
    config: CONFIG,
    topics: TOPICS
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "physicsTreker_export.json";
  a.click();
  URL.revokeObjectURL(url);
}

/* -------------------------
   UTILS
------------------------- */
function shuffle(arr){
  for(let i = arr.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
