/* ==========================================================================
   212 DESIGN — site.js
   데이터(data/projects.js, data/team.js)를 읽어 화면을 그립니다.
   file:// 로 열어도 동작하도록 fetch 대신 전역 변수를 사용합니다.
   ========================================================================== */
(function () {
  "use strict";

  var PROJECTS = window.PROJECTS || [];
  var TEAM = window.TEAM || [];
  var SITE = window.SITE || {};

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  /* ---------- 모바일 내비게이션 ---------- */
  function initNav() {
    var btn = $(".nav-toggle"), nav = $("#site-nav");
    if (!btn || !nav) return;
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- 현재 페이지 메뉴 표시 ---------- */
  function markCurrent() {
    var here = location.pathname.split("/").pop() || "index.html";
    $$("#site-nav a").forEach(function (a) {
      var target = a.getAttribute("href");
      if (target === here || (here === "project.html" && target === "work.html")) {
        a.setAttribute("aria-current", "page");
      }
    });
  }

  /* ---------- 스크롤 등장 ---------- */
  function initReveal() {
    var items = $$(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var delay = parseInt(el.getAttribute("data-delay") || "0", 10);
        setTimeout(function () { el.classList.add("is-in"); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 작업물 카드 ---------- */
  function cardHTML(p, i) {
    return '' +
      '<a class="card reveal" data-delay="' + ((i % 3) * 70) + '" href="project.html?id=' + esc(p.id) + '">' +
        '<div class="card__media">' +
          '<img src="' + esc(p.cover) + '" alt="' + esc(p.title) + ' 대표 이미지" loading="lazy">' +
        '</div>' +
        '<div class="card__meta">' +
          '<div>' +
            '<div class="card__title">' + esc(p.title) + '</div>' +
            '<div class="card__sub">' + esc(p.categoryKo) + ' · ' + esc(p.client) + ' · ' + esc(p.year) + '</div>' +
          '</div>' +
          '<div class="card__code">' + esc(p.code) + '</div>' +
        '</div>' +
      '</a>';
  }

  function renderCards(container, list) {
    container.innerHTML = list.length
      ? list.map(cardHTML).join("")
      : '<p class="empty">해당 분야의 작업물이 아직 없습니다.</p>';
    initReveal();
  }

  /* ---------- 홈: 주요 작업물 ---------- */
  function initHome() {
    var wrap = $("#featured-work");
    if (!wrap) return;
    var featured = PROJECTS.filter(function (p) { return p.featured; });
    renderCards(wrap, (featured.length ? featured : PROJECTS).slice(0, 3));

    var count = $("#project-count");
    if (count) count.textContent = String(PROJECTS.length);
  }

  /* ---------- 홈: 히어로 작업물 슬라이더 ----------
     기본은 자동 재생이고, 좌·우 화살표(키보드 \u2190\u2192, 모바일 스와이프)로도 넘깁니다.
     두 장의 이미지 레이어를 번갈아 쓰며 페이드로 교체합니다. */
  var HERO_AUTOPLAY_MS = 5000;

  function initHeroSlider() {
    var root = $("#hero-slider");
    if (!root || !PROJECTS.length) return;

    var list = PROJECTS;
    var total = list.length;
    var idx = 0;      // 현재 보이는 작업물
    var front = 0;    // 지금 화면에 떠 있는 레이어
    var token = 0;    // 빠르게 연타했을 때 지난 로딩을 무시하려는 표식

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    root.style.setProperty("--hero-autoplay", (HERO_AUTOPLAY_MS / 1000) + "s");
    root.innerHTML = '' +
      '<div class="hero-slider__stage">' +
        '<img class="hero-slide is-active" alt="">' +
        '<img class="hero-slide" alt="" aria-hidden="true">' +
      '</div>' +
      (total > 1
        ? '<button class="hero-arrow hero-arrow--prev" type="button" aria-label="이전 작업물">\u2190</button>' +
          '<button class="hero-arrow hero-arrow--next" type="button" aria-label="다음 작업물">\u2192</button>'
        : '') +
      '<div class="hero-cap">' +
        (total > 1 ? '<div class="hero-progress"><span></span></div>' : '') +
        '<a class="hero-cap__link" href="#">' +
          '<div class="hero-cap__title"></div>' +
          '<div class="hero-cap__sub"></div>' +
        '</a>' +
        '<div class="hero-cap__aside">' +
          (total > 1 ? '<button class="hero-play" type="button"></button>' : '') +
          '<span class="hero-cap__count"></span>' +
        '</div>' +
      '</div>';

    var layers = $$(".hero-slide", root);
    var link   = $(".hero-cap__link", root);
    var elTit  = $(".hero-cap__title", root);
    var elSub  = $(".hero-cap__sub", root);
    var elCnt  = $(".hero-cap__count", root);
    var elPlay = $(".hero-play", root);
    var elBar  = $(".hero-progress", root);

    function pad(n) { return (n < 10 ? "0" : "") + n; }

    function paintCaption(p, n) {
      link.href = "project.html?id=" + encodeURIComponent(p.id);
      link.setAttribute("aria-label", p.title + " 자세히 보기");
      elTit.textContent = p.title;
      elSub.textContent = p.categoryKo + " \u00b7 " + p.client + " \u00b7 " + p.year;
      elCnt.textContent = pad(n + 1) + " / " + pad(total);
    }

    function show(n) {
      n = ((n % total) + total) % total;
      if (n === idx) return;
      var my = ++token;
      var p = list[n];
      var back = layers[1 - front];

      back.src = p.cover;
      back.alt = p.title + " \ub300\ud45c \uc774\ubbf8\uc9c0";

      function swap() {
        if (my !== token) return;          // 더 최근 클릭이 있으면 버립니다
        layers[front].classList.remove("is-active");
        back.classList.add("is-active");
        front = 1 - front;
        idx = n;
        paintCaption(p, n);
      }

      if (back.complete) {
        swap();
      } else {
        back.addEventListener("load", swap, { once: true });
        back.addEventListener("error", swap, { once: true });
      }
    }

    /* 첫 화면 */
    layers[0].src = list[0].cover;
    layers[0].alt = list[0].title + " \ub300\ud45c \uc774\ubbf8\uc9c0";
    paintCaption(list[0], 0);

    if (total < 2) return;

    /* ----- 자동 재생 -----
       wants  : 사용자가 켜 둔 상태 (PAUSE/PLAY 버튼)
       holds  : 잠시 멈춰야 할 사정들 — 하나라도 켜져 있으면 타이머를 돌리지 않습니다 */
    var timer = null;
    var wants = !reduce;                                    // 모션을 줄이는 설정이면 처음부터 꺼둡니다
    var holds = { hover: false, hidden: false, out: false };

    function held() { return holds.hover || holds.hidden || holds.out; }

    function sync() {
      if (timer) { clearInterval(timer); timer = null; }

      var running = wants && !held();
      if (running) timer = setInterval(function () { go(idx + 1); }, HERO_AUTOPLAY_MS);

      elPlay.textContent = wants ? "PAUSE" : "PLAY";
      elPlay.setAttribute("aria-label", wants ? "작업물 자동 넘김 멈춤" : "작업물 자동 넘김 시작");

      /* 진행 선 다시 그리기 — 클래스를 뗐다 붙이며 리플로우로 애니메이션을 되감습니다 */
      elBar.classList.remove("is-running");
      if (running) {
        void elBar.offsetWidth;
        elBar.classList.add("is-running");
      }
    }

    /* 넘길 때마다 sync() 로 타이머와 진행 선을 처음부터 다시 셉니다.
       자동 넘김도 이 함수를 거치므로 매 장마다 진행 선이 되감깁니다. */
    function go(n) { show(n); sync(); }

    elPlay.addEventListener("click", function () {
      wants = !wants;
      /* 직접 켰는데 버튼 위에 올라간 마우스·포커스 때문에 그대로 멈춰 있으면 안 되므로 잠금을 풉니다.
         마우스가 밖으로 나갔다 다시 들어오면 평소처럼 다시 멈춥니다. */
      if (wants) holds.hover = false;
      sync();
    });

    root.addEventListener("click", function (e) {
      var btn = e.target.closest(".hero-arrow");
      if (!btn) return;
      go(idx + (btn.classList.contains("hero-arrow--next") ? 1 : -1));
    });

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { go(idx + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft")  { go(idx - 1); e.preventDefault(); }
    });

    /* 읽는 동안에는 멈춥니다 — 마우스를 올렸을 때, 키보드 포커스가 안에 있을 때 */
    ["mouseenter", "focusin"].forEach(function (ev) {
      root.addEventListener(ev, function () { holds.hover = true; sync(); });
    });
    ["mouseleave", "focusout"].forEach(function (ev) {
      root.addEventListener(ev, function () { holds.hover = false; sync(); });
    });

    /* 다른 탭을 보고 있거나 히어로가 화면 밖이면 멈춥니다 */
    document.addEventListener("visibilitychange", function () {
      holds.hidden = document.hidden; sync();
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        holds.out = !entries[0].isIntersecting;
        sync();
      }, { threshold: 0.25 }).observe(root);
    }

    /* 모바일 스와이프 */
    var x0 = null, y0 = null;
    root.addEventListener("touchstart", function (e) {
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    root.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      x0 = y0 = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;  // 세로 스크롤은 그대로
      go(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });

    sync();
  }

  /* ---------- 작업물 목록 + 필터 ---------- */
  function initWorkList() {
    var wrap = $("#work-grid");
    if (!wrap) return;

    var cats = [];
    PROJECTS.forEach(function (p) {
      if (!cats.some(function (c) { return c.en === p.category; })) {
        cats.push({ en: p.category, ko: p.categoryKo });
      }
    });

    var bar = $("#work-filters");
    if (bar) {
      bar.innerHTML = '<button class="filter" data-cat="all" aria-pressed="true">전체 <span class="card__code">' + PROJECTS.length + '</span></button>' +
        cats.map(function (c) {
          var n = PROJECTS.filter(function (p) { return p.category === c.en; }).length;
          return '<button class="filter" data-cat="' + esc(c.en) + '" aria-pressed="false">' +
                 esc(c.ko) + ' <span class="card__code">' + n + '</span></button>';
        }).join("");

      bar.addEventListener("click", function (e) {
        var btn = e.target.closest(".filter");
        if (!btn) return;
        $$(".filter", bar).forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        var cat = btn.getAttribute("data-cat");
        renderCards(wrap, cat === "all" ? PROJECTS : PROJECTS.filter(function (p) { return p.category === cat; }));
      });
    }
    renderCards(wrap, PROJECTS);
  }

  /* ---------- 팀 ---------- */
  function initTeam() {
    var wrap = $("#team-grid");
    if (!wrap) return;
    wrap.innerHTML = TEAM.map(function (m, i) {
      return '' +
        '<article class="member reveal" data-delay="' + ((i % 4) * 70) + '">' +
          '<div class="member__photo"><img src="' + esc(m.photo) + '" alt="' + esc(m.name) + '" loading="lazy"></div>' +
          '<div class="member__name">' + esc(m.name) + ' <span class="card__code">' + esc(m.nameEn) + '</span></div>' +
          '<div class="member__role">' + esc(m.role) + '</div>' +
          '<p class="member__bio">' + esc(m.bio) + '</p>' +
          (m.email ? '<a class="card__code" href="mailto:' + esc(m.email) + '" style="display:inline-block;margin-top:10px">' + esc(m.email) + '</a>' : '') +
        '</article>';
    }).join("");
    initReveal();
  }

  /* ---------- 작업물 상세 ---------- */
  function initDetail() {
    var root = $("#detail");
    if (!root) return;

    var id = new URLSearchParams(location.search).get("id");
    var idx = PROJECTS.findIndex(function (p) { return p.id === id; });
    if (idx < 0) {
      root.innerHTML = '<div class="container section"><p class="empty">요청하신 작업물을 찾을 수 없습니다.</p>' +
        '<a class="link-line" href="work.html">작업물 목록으로 <span class="link-line__arrow">→</span></a></div>';
      return;
    }
    var p = PROJECTS[idx];
    var prev = PROJECTS[(idx - 1 + PROJECTS.length) % PROJECTS.length];
    var next = PROJECTS[(idx + 1) % PROJECTS.length];

    document.title = p.title + " — 212 DESIGN";

    root.innerHTML = '' +
      '<div class="container page-head">' +
        '<div class="label">' + esc(p.code) + ' / ' + esc(p.categoryKo) + '</div>' +
        '<h1 class="display">' + esc(p.title) + '</h1>' +
        '<p class="lead">' + esc(p.summary) + '</p>' +
      '</div>' +

      '<div class="container"><div class="detail__hero">' +
        '<img src="' + esc(p.cover) + '" alt="' + esc(p.title) + ' 대표 이미지">' +
      '</div></div>' +

      '<div class="container section">' +
        '<div class="split">' +
          '<div>' +
            '<div class="meta-list">' +
              metaRow("클라이언트", p.client) + metaRow("연도", p.year) +
              metaRow("분야", p.categoryKo + " / " + p.category) + metaRow("역할", p.role) +
            '</div>' +
          '</div>' +
          '<div>' + p.description.map(function (t) { return '<p class="prose muted">' + esc(t) + '</p>'; }).join("") +
            '<div class="dl" style="margin-top:56px">' +
              p.credits.map(function (c) { return creditRow(c[0], c[1]); }).join("") +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="container detail__figures">' +
        p.images.filter(function (src) { return src !== p.cover; }).map(function (src, i) {
          return '<figure class="reveal"><img src="' + esc(src) + '" alt="' + esc(p.title) + ' 이미지 ' + (i + 1) + '" loading="lazy"></figure>';
        }).join("") +
      '</div>' +

      '<div class="container"><nav class="pager">' +
        '<a class="link-line" href="project.html?id=' + esc(prev.id) + '"><span class="link-line__arrow">←</span> ' + esc(prev.title) + '</a>' +
        '<a class="link-line" href="project.html?id=' + esc(next.id) + '">' + esc(next.title) + ' <span class="link-line__arrow">→</span></a>' +
      '</nav></div>';

    initReveal();

    function metaRow(k, v) {
      return '<div class="meta-list__row"><div class="dl__key">' + esc(k) + '</div>' +
             '<p class="meta-list__val">' + esc(v) + '</p></div>';
    }
    function creditRow(k, v) {
      return '<div class="dl__row dl__row--credit"><div class="dl__key">' + esc(k) + '</div>' +
             '<div class="dl__val"><p style="color:var(--ink)">' + esc(v) + '</p></div></div>';
    }
  }

  /* ---------- 회사 정보 채우기 (푸터 등) ---------- */
  function fillSiteInfo() {
    $$("[data-site]").forEach(function (el) {
      var key = el.getAttribute("data-site");
      if (!SITE[key]) return;
      if (el.tagName === "A" && (key === "email")) { el.href = "mailto:" + SITE[key]; }
      if (el.tagName === "A" && (key === "instagram")) { el.href = SITE[key]; return; }
      el.textContent = SITE[key];
    });
    var y = $("#year");
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- 시작 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    markCurrent();
    fillSiteInfo();
    initHome();
    initHeroSlider();
    initWorkList();
    initTeam();
    initDetail();
    initReveal();
  });
})();
