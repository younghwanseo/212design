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

    var heroImg = $("#hero-image");
    if (heroImg && PROJECTS.length) {
      heroImg.src = PROJECTS[0].cover;
      heroImg.alt = PROJECTS[0].title + " 대표 이미지";
    }
    var count = $("#project-count");
    if (count) count.textContent = String(PROJECTS.length);
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
    initWorkList();
    initTeam();
    initDetail();
    initReveal();
  });
})();
