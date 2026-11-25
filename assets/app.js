(() => {
  'use strict';
  const root = document.getElementById('main');
  if (!window.FATMA_DATA || !Array.isArray(window.FATMA_DATA.courses)) {
    root.innerHTML = '<div class="container not-found"><h1>ملفات الصفحة غير مكتملة</h1><p>فك ضغط المجلد بالكامل، ثم افتح index.html مع بقاء مجلد assets بجانبه.</p></div>';
    return;
  }
  const { courses, quiz } = window.FATMA_DATA;
  const STORAGE_KEY = 'zad_fatma_courses_preview_v2';
  const courseById = id => courses.find(course => course.id === id);
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const normalize = value => String(value).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[\u064B-\u065F\u0670]/g, '').trim();
  const iconPaths = {
    book:'<path d="M12 5v15m0-14C8 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-6-1-10 2Z"/>',
    play:'<path d="m9 6 9 6-9 6V6Z"/><circle cx="12" cy="12" r="10"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    circleCheck:'<circle cx="12" cy="12" r="9.5"/><path d="m7.5 12 3 3 6-6"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    message:'<path d="M21 11a8 8 0 0 1-8 8H7l-5 3V11a9 9 0 0 1 19 0Z"/><path d="M7 10h9m-9 4h6"/>',
    star:'<path d="m12 3 2.7 5.7 6.3.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.3-.9L12 3Z"/>',
    spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    file:'<path d="M14 2H5v20h14V7l-5-5Z"/><path d="M14 2v6h5M8 12h8m-8 4h6"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    leaf:'<path d="M20 3C9 1 2 6 4 14c1 4 6 6 10 3 5-4 6-10 6-14ZM4 21 16 7"/>',
    bulb:'<path d="M8 17v-2a7 7 0 1 1 8 0v2H8Zm1 4h6m-5-4v4m4-4v4"/>',
    clock:'<circle cx="12" cy="12" r="9.5"/><path d="M12 6v6l4 2"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    down:'<path d="m6 9 6 6 6-6"/>',
    layers:'<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 10 10 5 10-5M2 18l10 5 10-5"/>',
    x:'<path d="m6 6 12 12M6 18 18 6"/>',
    chart:'<path d="M4 3v18h17M9 16v-5m5 5V7m5 9V4"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.book}</svg>`;
  const emptyState = () => ({ version:2, enrolled:[], completed:{}, lastLesson:{}, lastQuiz:null, draftQuiz:null });
  let storageAvailable = true;
  let state = emptyState();
  const validAnswers = answers => Array.isArray(answers) && answers.length === quiz.length && answers.every((answer,index) => answer === null || (Number.isInteger(answer) && answer >= 0 && answer < quiz[index].options.length));
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && saved.version === 2) {
      state.enrolled = [...new Set((Array.isArray(saved.enrolled) ? saved.enrolled : []).filter(id => courseById(id)))];
      for (const id of state.enrolled) {
        const c = courseById(id);
        state.completed[id] = [...new Set((Array.isArray(saved.completed?.[id]) ? saved.completed[id] : []).filter(lid => c.lessons.some(l => l.id === lid)))];
        if (c.lessons.some(l => l.id === saved.lastLesson?.[id])) state.lastLesson[id] = saved.lastLesson[id];
      }
      if (saved.lastQuiz && validAnswers(saved.lastQuiz.answers) && saved.lastQuiz.answers.every(a => a !== null)) state.lastQuiz = { answers:saved.lastQuiz.answers };
      if (saved.draftQuiz && validAnswers(saved.draftQuiz.answers)) state.draftQuiz = { answers:saved.draftQuiz.answers, index:Math.max(0,Math.min(quiz.length-1, Number.isInteger(saved.draftQuiz.index) ? saved.draftQuiz.index : 0)) };
    }
    const checkKey = `${STORAGE_KEY}_check`;
    localStorage.setItem(checkKey,'1');
    localStorage.removeItem(checkKey);
  } catch { storageAvailable = false; }
  const save = () => {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
    catch { storageAvailable = false; }
    document.getElementById('storage-notice').hidden = storageAvailable;
  };
  document.getElementById('storage-notice').hidden = storageAvailable;
  let search = '';
  let category = 'all';
  let quizMode = 'intro';
  const practiceAnswers = new Map();
  let toastTimer;
  function toast(message) {
    const node = document.getElementById('toast');
    node.textContent = message;
    node.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('visible'), 3500);
  }
  const isEnrolled = id => state.enrolled.includes(id);
  const completedIds = id => state.completed[id] || [];
  const percent = c => Math.round(completedIds(c.id).length / c.lessons.length * 100);
  function nextLesson(c) {
    const last = c.lessons.find(l => l.id === state.lastLesson[c.id]);
    if (last && !completedIds(c.id).includes(last.id)) return last;
    return c.lessons.find(l => !completedIds(c.id).includes(l.id)) || last || c.lessons[0];
  }
  const lessonUrl = (c,lesson) => `#/learn/${c.id}/${lesson.id}`;
  const score = result => result.answers.reduce((sum,answer,index) => sum + Number(answer === quiz[index].correct),0);
  const priceHTML = c => `<div><span class="price"><bdi>${c.price}</bdi> <small>ج.م</small></span><span class="price-label">سعر توضيحي للمعاينة</span></div>`;
  const progress = c => `<div class="progress-label"><span>${completedIds(c.id).length} من ${c.lessons.length} دروس مكتملة</span><strong><bdi>${percent(c)}%</bdi></strong></div><div class="progress-track" role="progressbar" aria-label="تقدمك في ${escapeHTML(c.title)}" aria-valuenow="${percent(c)}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${percent(c)}%"></div></div>`;
  function cover(c,extra='') {
    const symbol = {foundations:'book',grammar:'file',conversation:'message',phonics:'spark',vocabulary:'leaf'}[c.id];
    return `<div class="course-cover theme-${c.theme} ${extra}"><div class="cover-top"><span class="cover-label" lang="en">ENGLISH WITH MISS FATMA</span><span class="cover-icon">${icon(symbol)}</span></div><div class="cover-word" lang="en">${escapeHTML(c.coverWord)}</div><svg class="cover-art" viewBox="0 0 180 160" fill="none" aria-hidden="true"><path d="M90 28C66 7 40 8 14 13v113c28-4 50 1 76 19 24-18 48-23 76-19V13c-27-5-51-6-76 15ZM90 28v117" stroke="currentColor" stroke-width="3"/><path d="m31 37 40 7m-40 17 40 7m-40 17 40 7m38-48 40-7m-40 31 40-7m-40 31 40-7" stroke="currentColor" stroke-width="3"/></svg></div>`;
  }
  function courseCard(c) {
    return `<article class="course-card">${cover(c)}<div class="course-content"><div class="course-tags"><span class="tag">${escapeHTML(c.level)}</span><span class="tag tag-secondary">${escapeHTML(c.categoryLabel)}</span>${isEnrolled(c.id) ? '<span class="tag tag-enrolled">مضاف لكورساتك</span>' : ''}</div><h3>${escapeHTML(c.title)}</h3><p class="course-description">${escapeHTML(c.description)}</p><div class="course-meta"><span>${icon('book')} ${c.lessons.length} دروس تجريبية</span><span>${icon('file')} تدريب مع كل درس</span></div><div class="course-bottom">${priceHTML(c)}<a href="#/course/${c.id}" class="button button-small button-primary" aria-label="تفاصيل ${escapeHTML(c.title)}">تفاصيل الكورس</a></div></div></article>`;
  }
  const heroIllustration = () => `<svg viewBox="0 0 470 410" role="img" aria-label="رسم تعليمي لكتاب مفتوح وبطاقات كلمات إنجليزية"><defs><pattern id="dots" width="21" height="21" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#8bad92" opacity=".4"/></pattern></defs><circle cx="240" cy="206" r="168" fill="#24513f"/><circle cx="240" cy="206" r="191" stroke="#6a8a6b" stroke-dasharray="3 10" opacity=".5" fill="none"/><rect x="315" y="20" width="135" height="105" fill="url(#dots)"/><path d="m90 65 4-12 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" fill="#f2d49c"/><path d="m410 290 3-10 4 10 10 4-10 3-4 10-3-10-10-3 10-4Z" fill="#edc582"/><g transform="translate(20 82) rotate(-7)"><rect width="162" height="81" rx="18" fill="#f2d49c"/><path d="m27 78-6 17 25-15" fill="#f2d49c"/><text x="81" y="54" font-family="Arial,sans-serif" font-size="36" font-weight="700" text-anchor="middle" fill="#244d37">Hello!</text></g><g transform="translate(163 58) rotate(7 123 150)"><rect x="5" y="8" width="240" height="285" rx="19" fill="#0d3025" opacity=".45"/><rect width="240" height="285" rx="18" fill="#f9fbf4"/><rect x="0" y="0" width="240" height="48" rx="18" fill="#dde8d4"/><path d="M0 28h240v21H0Z" fill="#dde8d4"/><circle cx="24" cy="24" r="5" fill="#507653"/><circle cx="42" cy="24" r="5" fill="#a9bea0"/><circle cx="60" cy="24" r="5" fill="#c3d2b9"/><text x="24" y="87" fill="#4d6950" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="2">A LITTLE EVERY DAY.</text><text x="24" y="138" fill="#254b35" font-family="Arial,sans-serif" font-size="38" font-weight="700">Learn.</text><text x="24" y="184" fill="#254b35" font-family="Arial,sans-serif" font-size="38" font-weight="700">Practice.</text><text x="24" y="230" fill="#254b35" font-family="Arial,sans-serif" font-size="38" font-weight="700">Grow.</text><path d="M25 251h116" stroke="#c59c58" stroke-width="4" stroke-linecap="round"/><circle cx="192" cy="244" r="22" fill="#e8efdf"/><path d="m182 244 7 7 13-15" stroke="#4a7350" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g><g transform="translate(20 324) rotate(-7)"><rect width="183" height="91" rx="16" fill="#cee0c5"/><text x="23" y="32" fill="#3a5f40" font-family="Arial,sans-serif" font-size="12" letter-spacing="1.5">ONE STEP CLOSER</text><text x="23" y="65" fill="#204c32" font-family="Arial,sans-serif" font-size="24" font-weight="700">You can do it.</text></g><g transform="translate(343 300) rotate(14)"><rect width="60" height="62" rx="16" fill="#f3d49a"/><path d="m16 32 10 10 20-23" fill="none" stroke="#31583c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
  function quizBanner() {
    return `<aside class="quiz-banner"><div class="quiz-banner-icon">${icon('target')}</div><div><h2>مش عارف تبدأ منين؟</h2><p>جرّب ٨ أسئلة قصيرة، وخُد اقتراح مناسب لبداية رحلتك.</p></div><a class="button button-primary" href="#/quiz">جرّب اختبار المستوى</a></aside>`;
  }
  function homePage() {
    return `<div class="container"><section class="hero-wrap"><div class="hero"><div class="hero-copy"><div class="eyebrow">${icon('spark')} اللغة الإنجليزية مع الأستاذة فاطمة</div><h1>كل كلمة جديدة،<br><span>فرصة أكبر.</span></h1><p>من أول كلمة لحد ما تتكلم بثقة. اختار الكورس المناسب ليك، واتعلّم بخطوات بسيطة وتدريبات واضحة.</p><div class="hero-actions"><a class="button button-gold" href="#/courses">استكشف الكورسات ${icon('book')}</a><a class="button hero-secondary" href="#/quiz">اختبر مستواك</a></div><div class="hero-hint">${icon('circleCheck')} جرّب درسًا، واكتشف أسلوب التعلّم.</div></div><div class="hero-art">${heroIllustration()}</div></div></section><div class="path-strip"><div class="path-item"><div class="path-icon">${icon('book')}</div><div><strong>تعلّم خطوة بخطوة</strong><p>دروس مرتبة وبداية واضحة</p></div></div><div class="path-item"><div class="path-icon">${icon('file')}</div><div><strong>طبّق اللي اتعلمته</strong><p>أمثلة وتدريبات تفاعلية</p></div></div><div class="path-item"><div class="path-icon">${icon('chart')}</div><div><strong>شوف تقدمك بنفسك</strong><p>كمّل من آخر درس وصلت له</p></div></div></div><section class="section"><div class="section-head"><div><span class="section-kicker">بداية جديدة، على قدّ مستواك</span><h2>اختار خطوتك الجاية</h2><p>تأسيس، قواعد، أو محادثة… البداية عندك.</p></div><a class="text-link" href="#/courses">كل الكورسات</a></div><div class="course-grid">${courses.slice(0,3).map(courseCard).join('')}</div></section>${quizBanner()}<section class="section-compact"><div class="section-head"><div><span class="section-kicker">رحلة بسيطة وواضحة</span><h2>من الفهم… للتطبيق</h2></div></div><div class="method-grid"><article class="method-item">${icon('target')}<h3>اختار اللي يناسبك</h3><p>شوف أهداف الكورس ومحتواه، وجرّب الدرس الأول قبل ما تبدأ.</p></article><article class="method-item">${icon('message')}<h3>افهم واستخدم اللغة</h3><p>أمثلة بالإنجليزي، معناها بالعربي، وتدريب يساعدك تثبّت المعلومة.</p></article><article class="method-item">${icon('leaf')}<h3>كمّل على راحتك</h3><p>علّم على دروسك المكتملة، وارجع لها في أي وقت من «كورساتي».</p></article></div></section></div>`;
  }
  const filters = [{id:'all',label:'كل الكورسات'},...courses.map(c => ({id:c.category,label:c.categoryLabel}))];
  function matchedCourses() {
    const value = normalize(search);
    return courses.filter(c => (category === 'all' || c.category === category) && (!value || normalize([c.title,c.englishTitle,c.description,c.categoryLabel,c.level,...c.lessons.flatMap(l=>[l.title,l.arabicTitle])].join(' ')).includes(value)));
  }
  function resultsHTML() {
    const results = matchedCourses();
    return results.length ? `<div class="course-grid">${results.map(courseCard).join('')}</div>` : `<div class="empty-state">${icon('search')}<h2>مفيش كورسات مطابقة للبحث</h2><p>جرّب كلمة تانية أو اختار «كل الكورسات».</p><button type="button" class="button button-primary" data-action="clear-search">اعرض كل الكورسات</button></div>`;
  }
  function catalogPage() {
    return `<div class="container"><div class="page-heading"><span class="section-kicker">مساحتك لتعلّم الإنجليزي</span><h1>الكورسات</h1><p>خمس بدايات مختلفة، وهدف واحد: إنجليزي أوضح وثقة أكبر. اعرف محتوى كل كورس وجرّب أول درس.</p></div><div class="catalog-toolbar"><div class="search-row"><div class="search-group"><label class="search-label" for="course-search">بتدور على إيه؟</label><div class="search-box">${icon('search')}<input id="course-search" type="search" autocomplete="off" placeholder="ابحث عن كورس أو موضوع…" value="${escapeHTML(search)}"></div></div><span id="course-count" class="course-count" aria-live="polite" aria-atomic="true">الكورسات المعروضة: ${matchedCourses().length} من ${courses.length}</span></div><div class="filter-group" role="group" aria-label="تصفية الكورسات حسب المجال">${filters.map(f=>`<button type="button" class="filter-button" data-action="filter" data-category="${f.id}" aria-pressed="${category===f.id}">${escapeHTML(f.label)}</button>`).join('')}</div></div><div id="catalog-results" class="catalog-results">${resultsHTML()}</div><p class="catalog-note">الكورسات والمحتوى والأسعار المعروضة للتجربة فقط. تقدر تضيف أي كورس لكورساتك من غير دفع.</p>${quizBanner()}</div>`;
  }
  const breadcrumb = items => `<nav class="breadcrumb" aria-label="مسار الصفحة"><a href="#/courses">الكورسات</a>${items.map(item=>`${icon('chevron')}${item.href ? `<a href="${item.href}">${escapeHTML(item.text)}</a>` : `<span aria-current="page">${escapeHTML(item.text)}</span>`}`).join('')}</nav>`;
  function detailPage(c) {
    const enrolled = isEnrolled(c.id);
    return `<div class="container">${breadcrumb([{text:c.title}])}<div class="detail-layout"><div class="detail-main"><section class="detail-intro"><div class="course-tags"><span class="tag">${escapeHTML(c.level)}</span><span class="tag tag-secondary">${escapeHTML(c.categoryLabel)}</span></div><h1>${escapeHTML(c.title)}</h1><div class="detail-english" lang="en" dir="ltr">${escapeHTML(c.englishTitle)}</div><p>${escapeHTML(c.description)}</p><div class="course-meta" style="margin:20px 0 0"><span>${icon('book')} ${c.lessons.length} دروس قصيرة</span><span>${icon('file')} أمثلة + تدريبات</span></div></section><section class="panel"><h2>هتتعلّم إيه؟</h2><ul class="outcomes">${c.outcomes.map(o=>`<li>${icon('circleCheck')}<span>${escapeHTML(o)}</span></li>`).join('')}</ul></section><section class="panel"><h2>محتوى الكورس</h2><ol class="curriculum-list">${c.lessons.map((l,i)=>`<li class="curriculum-item"><div class="curriculum-row"><div class="lesson-heading"><span class="lesson-number">${completedIds(c.id).includes(l.id)?icon('check'):i+1}</span><span><strong>${escapeHTML(l.arabicTitle)}</strong><small lang="en" dir="ltr">${escapeHTML(l.title)}</small></span></div>${enrolled||i===0 ? `<a class="button button-small button-ghost" href="${lessonUrl(c,l)}">${i===0&&!enrolled?'جرّب الدرس':'افتح الدرس'}</a>` : `<span class="locked-status">${icon('lock')} بعد إضافة الكورس</span>`}</div></li>`).join('')}</ol></section></div><aside class="detail-aside" aria-label="ابدأ تجربة الكورس">${cover(c,'detail-cover')}<div class="enroll-body"><div class="enroll-price">${priceHTML(c)}</div>${enrolled ? `<a class="button button-primary button-block" href="${lessonUrl(c,nextLesson(c))}">${percent(c)===100?'راجع الكورس':'كمّل التعلّم'} ${icon('play')}</a>` : `<button type="button" class="button button-primary button-block" data-action="enroll" data-course="${c.id}">ابدأ تجربة الكورس ${icon('play')}</button>`}<a class="button button-outline button-block" href="${lessonUrl(c,c.lessons[0])}">معاينة الدرس الأول</a><p class="small-note">الإضافة هنا تجريبية ومجانية. لا توجد عملية دفع أو اشتراك فعلي.</p><ul class="enroll-facts"><li>${icon('book')} ${c.lessons.length} دروس بأمثلة مترجمة</li><li>${icon('file')} تدريب وتصحيح فوري</li><li>${icon('chart')} متابعة تقدمك في نفس المتصفح</li></ul></div></aside></div></div>`;
  }
  function lessonPage(c,l) {
    const index = c.lessons.findIndex(item=>item.id===l.id);
    const enrolled = isEnrolled(c.id);
    if (index > 0 && !enrolled) return `<div class="container">${breadcrumb([{text:c.title,href:`#/course/${c.id}`},{text:'ابدأ الكورس'}])}<section class="empty-state">${icon('lock')}<h1>أضف الكورس علشان تكمّل</h1><p>إضافة الكورس في النسخة دي مجانية وتجريبية، وبتفتح باقي الدروس وتحفظ تقدمك.</p><button type="button" class="button button-primary" data-action="enroll" data-course="${c.id}">ابدأ تجربة الكورس</button></section></div>`;
    if (enrolled) { state.lastLesson[c.id] = l.id; save(); }
    const answer = practiceAnswers.get(l.id);
    const next = c.lessons[index+1];
    return `<div class="container">${breadcrumb([{text:c.title,href:`#/course/${c.id}`},{text:l.arabicTitle}])}<div class="lesson-layout"><aside class="lesson-sidebar"><div class="sidebar-top"><h2 class="sidebar-course">${escapeHTML(c.title)}</h2><div class="sidebar-progress">${progress(c)}</div></div><details class="curriculum-disclosure" ${window.matchMedia('(min-width:801px)').matches?'open':''}><summary>محتوى الكورس ${icon('down')}</summary><ol class="sidebar-lessons">${c.lessons.map((item,i)=>`<li><a class="sidebar-lesson ${item.id===l.id?'active':''}" ${item.id===l.id?'aria-current="step"':''} href="${lessonUrl(c,item)}">${icon(completedIds(c.id).includes(item.id)?'circleCheck':enrolled||i===0?'play':'lock')}<span><strong>${escapeHTML(item.arabicTitle)}</strong><small lang="en" dir="ltr">${escapeHTML(item.title)}</small></span></a></li>`).join('')}</ol></details></aside><article class="lesson-content"><header class="lesson-title"><span class="eyebrow">درس توضيحي · ${index+1} من ${c.lessons.length}</span><h1>${escapeHTML(l.arabicTitle)}</h1><p class="en" lang="en" dir="ltr">${escapeHTML(l.title)}</p></header><div class="panel"><p class="lesson-intro">${escapeHTML(l.intro)}</p>${l.sections.map(s=>`<section class="teaching-section"><h2>${escapeHTML(s.heading)}</h2><p>${escapeHTML(s.body)}</p><div class="example-list">${s.examples.map(ex=>`<div class="example"><p class="en" lang="en" dir="ltr">${escapeHTML(ex.en)}</p><p class="translation">${escapeHTML(ex.ar)}</p></div>`).join('')}</div></section>`).join('')}<aside class="lesson-tip">${icon('bulb')}<span>${escapeHTML(l.tip)}</span></aside></div><section class="panel practice-card"><span class="section-kicker">جرّب بنفسك</span><h2 lang="en" dir="ltr">${escapeHTML(l.practice.question)}</h2><div class="choice-list">${l.practice.options.map((o,i)=>`<button type="button" class="choice ${answer!==undefined?(i===l.practice.correct?'correct':i===answer?'incorrect':''):''}" data-action="practice" data-course="${c.id}" data-lesson="${l.id}" data-answer="${i}" ${answer!==undefined?'disabled':''}><span class="choice-letter">${String.fromCharCode(65+i)}</span><span lang="en">${escapeHTML(o)}</span>${answer!==undefined&&i===l.practice.correct?'<span class="choice-verdict" lang="ar" dir="rtl">الصحيح</span>':''}${answer!==undefined&&i===answer&&i!==l.practice.correct?'<span class="choice-verdict" lang="ar" dir="rtl">اختيارك</span>':''}</button>`).join('')}</div>${answer!==undefined?`<div id="practice-feedback" class="feedback ${answer!==l.practice.correct?'incorrect-feedback':''}" tabindex="-1"><strong>${answer===l.practice.correct?'إجابة صحيحة، أحسنت!':'راجع المثال وجرب تاني.'}</strong><p>${escapeHTML(l.practice.explanation)}</p><button type="button" class="text-link reset-button" data-action="retry-practice" data-lesson="${l.id}">إعادة التدريب</button></div>`:''}</section><div class="panel lesson-complete-row">${enrolled?(completedIds(c.id).includes(l.id)?`<span class="completed-status">${icon('circleCheck')} الدرس مكتمل</span>`:`<button type="button" class="button button-primary" data-action="complete" data-course="${c.id}" data-lesson="${l.id}">${icon('check')} علّم الدرس كمكتمل</button>`):`<button type="button" class="button button-primary" data-action="enroll" data-course="${c.id}">أضف الكورس واحفظ تقدمك</button>`}${next&&enrolled?`<a class="button button-outline" href="${lessonUrl(c,next)}">الدرس التالي</a>`:enrolled?'<a class="button button-outline" href="#/student">ارجع لكورساتي</a>':''}</div></article></div></div>`;
  }
  function studentPage() {
    const myCourses = state.enrolled.map(courseById);
    const completedTotal = myCourses.reduce((sum,c)=>sum+completedIds(c.id).length,0);
    return `<div class="container"><div class="page-heading"><span class="section-kicker">كل خطوة بتفرق</span><h1>كورساتي</h1><p>كمّل من آخر درس وصلت له، وخلي تقدمك قدام عينك.</p></div><div class="student-summary"><div class="summary-card">${icon('book')}<strong class="summary-value">${myCourses.length}</strong><span>كورسات مضافة</span></div><div class="summary-card">${icon('circleCheck')}<strong class="summary-value">${completedTotal}</strong><span>دروس مكتملة</span></div><div class="summary-card">${icon('target')}<strong class="summary-value">${state.lastQuiz ? `<bdi dir="ltr">${score(state.lastQuiz)} / ${quiz.length}</bdi>` : '—'}</strong><span>آخر نتيجة للاختبار</span></div></div>${myCourses.length?`<div class="student-list">${myCourses.map(c=>`<article class="student-course">${cover(c,'student-cover')}<div class="student-course-content"><div class="course-tags"><span class="tag">${escapeHTML(c.level)}</span>${percent(c)===100?'<span class="tag tag-enrolled">الكورس مكتمل</span>':''}</div><h2>${escapeHTML(c.title)}</h2><div class="student-course-progress">${progress(c)}</div><div class="student-course-bottom"><span class="muted" style="font-size:.875rem">${percent(c)===100?'خطوة جميلة! تقدر تراجع الدروس في أي وقت.':`درسك القادم: ${escapeHTML(nextLesson(c).arabicTitle)}`}</span><a class="button button-primary button-small" href="${lessonUrl(c,nextLesson(c))}">${percent(c)===100?'راجع الدروس':'كمّل التعلّم'}</a></div></div></article>`).join('')}</div>`:`<section class="empty-state">${icon('book')}<h2>رحلتك لسه هتبدأ</h2><p>اختار أول كورس وابدأ تجربته. هتلاقي هنا دروسك ونسبة تقدمك.</p><a class="button button-primary" href="#/courses">اختار أول كورس</a></section>`}<div class="student-tools"><p>التقدم في هذه النسخة مرتبط بنفس المتصفح والجهاز.${state.lastQuiz?' <button class="text-link reset-button" type="button" data-action="view-result">راجع نتيجة الاختبار</button>':''}</p><button type="button" class="reset-button" data-action="reset">مسح التقدم التجريبي</button></div><section class="section">${quizBanner()}</section></div>`;
  }
  function quizIntro() {
    return `<section class="quiz-intro"><div class="quiz-banner-icon">${icon('target')}</div><span class="section-kicker">ابدأ من مكان يناسبك</span><h1>اختبار سريع، بداية أوضح</h1><p>جاوب على ٨ أسئلة في القواعد والمفردات وفهم الجمل. في النهاية هتشوف الإجابات وشرحها، واقتراح للكورس اللي تبدأ به.</p><div class="quiz-specs"><span>${icon('file')} ٨ أسئلة</span><span>${icon('clock')} من غير مؤقت</span><span>${icon('circleCheck')} نتيجة وشرح فوري</span></div><p class="notice">ده تقييم مبدئي قصير للتجربة، وليس تحديدًا معتمدًا لمستوى CEFR، ولا يقيس الاستماع أو التحدث.</p><div class="quiz-actions"><button type="button" class="button button-primary" data-action="start-quiz">${state.draftQuiz?'كمّل الاختبار':'ابدأ الاختبار'}</button>${state.lastQuiz?'<button type="button" class="button button-outline" data-action="view-result">راجع آخر نتيجة</button>':''}</div></section>`;
  }
  function quizQuestion() {
    const draft = state.draftQuiz;
    if (!draft) { quizMode='intro'; return quizIntro(); }
    const index = draft.index;
    const q = quiz[index];
    const answered = draft.answers.filter(a=>a!==null).length;
    return `<section class="quiz-card"><div class="quiz-top"><strong>السؤال ${index+1} من ${quiz.length}</strong><span class="muted">${answered} إجابات مسجلة</span></div><div class="progress-track" role="progressbar" aria-label="الأسئلة المجاب عنها" aria-valuemin="0" aria-valuemax="${quiz.length}" aria-valuenow="${answered}"><div class="progress-fill" style="width:${answered/quiz.length*100}%"></div></div><h1 id="quiz-question" class="quiz-question" dir="ltr" lang="en">${escapeHTML(q.question)}</h1><div class="choice-list" role="group" aria-labelledby="quiz-question">${q.options.map((option,i)=>`<button type="button" class="choice ${draft.answers[index]===i?'selected':''}" data-action="quiz-answer" data-answer="${i}" aria-pressed="${draft.answers[index]===i}"><span class="choice-letter">${String.fromCharCode(65+i)}</span><span lang="en">${escapeHTML(option)}</span></button>`).join('')}</div><p class="validation-error" id="quiz-error" role="alert"></p><div class="quiz-controls"><button type="button" class="button button-primary" data-action="quiz-next">${index===quiz.length-1?'شوف النتيجة':'السؤال التالي'}</button><button type="button" class="button button-outline" data-action="quiz-prev" ${index===0?'disabled':''}>السابق</button></div><p class="small-note">تقدر ترجع لأي سؤال وتعدّل إجابتك قبل عرض النتيجة.</p></section>`;
  }
  function quizResults() {
    if (!state.lastQuiz) { quizMode='intro'; return quizIntro(); }
    const result = state.lastQuiz;
    const value = score(result);
    const recommendation = value<=3 ? courses[0] : value<=6 ? courses[1] : courses[2];
    const title = value<=3 ? 'بداية كويسة… نبني عليها' : value<=6 ? 'أساسك موجود، خلّينا نقوّيه' : 'أداء جميل، كمّل بالممارسة';
    const description = value<=3 ? 'كورس التأسيس اختيار مناسب لمراجعة الكلمات والجمل الأساسية خطوة بخطوة.' : value<=6 ? 'مراجعة القواعد هتساعدك تفهم بناء الجملة وتستخدمها بثقة أكبر.' : 'جرّب المحادثة علشان تطبّق الجمل والمفردات في مواقف يومية.';
    return `<section class="result-header"><span class="eyebrow">${icon('circleCheck')} خلّصت الاختبار</span><span class="result-score">${value} <small>/ ${quiz.length}</small></span><h1>${title}</h1><p>${description}</p></section><section class="panel"><h2>اقتراح لبدايتك</h2><p>${escapeHTML(recommendation.title)}</p><div class="quiz-actions"><a href="#/course/${recommendation.id}" class="button button-primary">شوف الكورس المقترح</a><button type="button" class="button button-outline" data-action="restart-quiz">جرّب الاختبار مرة تانية</button></div><p class="small-note">الاقتراح مبني على الأسئلة الثمانية فقط. النتيجة ليست شهادة أو تقييم CEFR معتمدًا.</p></section><section class="panel result-review"><h2>راجع إجاباتك</h2>${quiz.map((q,i)=>`<article class="result-item"><span class="result-status ${result.answers[i]!==q.correct?'bad':''}">${icon(result.answers[i]===q.correct?'circleCheck':'x')} السؤال ${i+1} · ${result.answers[i]===q.correct?'إجابة صحيحة':'يحتاج مراجعة'}</span><h3 lang="en">${escapeHTML(q.question)}</h3><p class="result-answer"><span>إجابتك:</span><bdi class="en" lang="en">${escapeHTML(q.options[result.answers[i]])}</bdi></p>${result.answers[i]!==q.correct?`<p class="result-answer"><span>الإجابة الصحيحة:</span><bdi class="en" lang="en">${escapeHTML(q.options[q.correct])}</bdi></p>`:''}<p>${escapeHTML(q.explanation)}</p></article>`).join('')}</section>`;
  }
  function quizPage() {
    return `<div class="container"><div class="quiz-shell">${quizMode==='questions'?quizQuestion():quizMode==='result'?quizResults():quizIntro()}</div></div>`;
  }
  function notFound() {
    return `<div class="container not-found"><section class="empty-state">${icon('search')}<h1>الصفحة دي مش موجودة</h1><p>تقدر ترجع للكورسات وتختار بداية جديدة.</p><a class="button button-primary" href="#/courses">تصفح الكورسات</a></section></div>`;
  }
  function route() {
    try { return decodeURIComponent(location.hash.slice(1) || '/home').split('/').filter(Boolean); }
    catch { return ['invalid']; }
  }
  function render(focus=false) {
    const [page,id,lid] = route();
    const c = courseById(id);
    let title = 'English with Miss Fatma';
    if (page==='home') root.innerHTML = homePage();
    else if (page==='courses') { root.innerHTML=catalogPage(); title='الكورسات'; }
    else if (page==='student') { root.innerHTML=studentPage(); title='كورساتي'; }
    else if (page==='course' && c) { root.innerHTML=detailPage(c); title=c.title; }
    else if (page==='learn' && c && c.lessons.some(l=>l.id===lid)) { const l=c.lessons.find(l=>l.id===lid); root.innerHTML=lessonPage(c,l); title=l.arabicTitle; }
    else if (page==='quiz') { root.innerHTML=quizPage(); title='اختبار المستوى'; }
    else root.innerHTML=notFound();
    document.title = `${title} | زاد المعرفة`;
    document.querySelectorAll('[data-nav]').forEach(link => {
      const active=link.dataset.nav === (page==='course'||page==='learn'?'courses':page);
      link.classList.toggle('active',active);
      if(active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    });
    const count=document.getElementById('enrollment-count');
    count.hidden=state.enrolled.length===0;
    count.textContent=state.enrolled.length;
    if(focus) { window.scrollTo({top:0,behavior:'instant'}); root.focus({preventScroll:true}); }
  }
  function go(path) {
    if(location.hash===`#${path}`) render(true);
    else location.hash=path;
  }
  function updateCatalog() {
    document.getElementById('catalog-results').innerHTML=resultsHTML();
    document.getElementById('course-count').textContent=`الكورسات المعروضة: ${matchedCourses().length} من ${courses.length}`;
    root.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.category===category)));
  }
  root.addEventListener('input',event=>{
    if(event.target.id==='course-search') { search=event.target.value; updateCatalog(); }
  });
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');
    if(!button || button.disabled) return;
    const action=button.dataset.action;
    const c=courseById(button.dataset.course);
    if(action==='filter') { category=button.dataset.category; updateCatalog(); }
    else if(action==='clear-search') { category='all'; search=''; document.getElementById('course-search').value=''; updateCatalog(); document.getElementById('course-search').focus(); }
    else if(action==='enroll' && c) {
      if(!isEnrolled(c.id)) { state.enrolled.push(c.id); state.completed[c.id]=[]; save(); toast('اتضاف الكورس لكورساتك. بداية موفقة!'); }
      go(`/learn/${c.id}/${nextLesson(c).id}`);
    }
    else if(action==='complete' && c && isEnrolled(c.id) && c.lessons.some(l=>l.id===button.dataset.lesson)) {
      if(!state.completed[c.id]) state.completed[c.id]=[];
      if(!state.completed[c.id].includes(button.dataset.lesson)) state.completed[c.id].push(button.dataset.lesson);
      save(); render(false); toast(percent(c)===100?'أحسنت! كمّلت كل دروس الكورس التجريبي.':'اتحفظ الدرس كمكتمل. خطوة حلوة!');
      root.querySelector('.lesson-complete-row a')?.focus({preventScroll:true});
    }
    else if(action==='practice' && c) {
      const lesson=c.lessons.find(l=>l.id===button.dataset.lesson);
      const answer=Number(button.dataset.answer);
      if(lesson && Number.isInteger(answer) && lesson.practice.options[answer]!==undefined && !practiceAnswers.has(lesson.id)) {
        practiceAnswers.set(lesson.id,answer); render(false);
        document.getElementById('practice-feedback')?.focus({preventScroll:true});
      }
    }
    else if(action==='retry-practice') { practiceAnswers.delete(button.dataset.lesson); render(false); root.querySelector('[data-action="practice"]')?.focus({preventScroll:true}); }
    else if(action==='start-quiz' || action==='restart-quiz') {
      if(!state.draftQuiz || action==='restart-quiz') state.draftQuiz={index:0,answers:Array(quiz.length).fill(null)};
      quizMode='questions'; save(); render(true);
    }
    else if(action==='quiz-answer' && state.draftQuiz) {
      const answer=Number(button.dataset.answer);
      const current=quiz[state.draftQuiz.index];
      if(!Number.isInteger(answer) || !current.options[answer]) return;
      state.draftQuiz.answers[state.draftQuiz.index]=answer; save();
      root.querySelectorAll('[data-action="quiz-answer"]').forEach(node=>{ const selected=Number(node.dataset.answer)===answer; node.classList.toggle('selected',selected); node.setAttribute('aria-pressed',String(selected)); });
      document.getElementById('quiz-error').textContent='';
      const count=state.draftQuiz.answers.filter(a=>a!==null).length;
      root.querySelector('.quiz-top .muted').textContent=`${count} إجابات مسجلة`;
      root.querySelector('.progress-fill').style.width=`${count/quiz.length*100}%`;
      root.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',String(count));
    }
    else if(action==='quiz-next' && state.draftQuiz) {
      if(state.draftQuiz.answers[state.draftQuiz.index]===null) { document.getElementById('quiz-error').textContent='اختار إجابة علشان تكمل للسؤال التالي.'; return; }
      if(state.draftQuiz.index===quiz.length-1) {
        const missing=state.draftQuiz.answers.indexOf(null);
        if(missing!==-1) { state.draftQuiz.index=missing; save(); render(true); return; }
        state.lastQuiz={answers:[...state.draftQuiz.answers]}; state.draftQuiz=null; quizMode='result';
      } else state.draftQuiz.index++;
      save(); render(true);
    }
    else if(action==='quiz-prev' && state.draftQuiz && state.draftQuiz.index>0) { state.draftQuiz.index--; save(); render(true); }
    else if(action==='view-result') { quizMode='result'; go('/quiz'); }
    else if(action==='reset') document.getElementById('reset-dialog').showModal();
  });
  const menuButton=document.querySelector('.menu-toggle');
  const menu=document.getElementById('main-nav');
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    root.focus({preventScroll:true});
    root.scrollIntoView({block:'start',behavior:'instant'});
  });
  function closeMenu() { menu.classList.remove('is-open'); menuButton.setAttribute('aria-expanded','false'); menuButton.setAttribute('aria-label','افتح القائمة'); }
  menuButton.addEventListener('click',()=>{ const open=menu.classList.toggle('is-open'); menuButton.setAttribute('aria-expanded',String(open)); menuButton.setAttribute('aria-label',open?'اقفل القائمة':'افتح القائمة'); });
  document.addEventListener('keydown',event=>{ if(event.key==='Escape' && menu.classList.contains('is-open')) { closeMenu(); menuButton.focus(); } });
  document.addEventListener('click',event=>{ if(event.target.closest('a[href^="#/"]')) closeMenu(); });
  document.getElementById('cancel-reset').addEventListener('click',()=>document.getElementById('reset-dialog').close());
  document.getElementById('confirm-reset').addEventListener('click',()=>{
    state=emptyState(); quizMode='intro'; practiceAnswers.clear(); save();
    document.getElementById('reset-dialog').close(); render(true); toast('اتمسح التقدم التجريبي. تقدر تبدأ من جديد.');
  });
  window.addEventListener('hashchange',()=>render(true));
  render(false);
})();
