/* ==========================================================================
   풀글램핑 & 펫글램핑 — 화면
   내용은 assets/js/site-data.js 한 파일에서 읽습니다.
   ========================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'pg_site_data_v2';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var krw = function (n) { return Number(n || 0).toLocaleString('ko-KR'); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };

  var state = { cat: 'all', room: null, slide: 0, heroDrag: false, notice: 0, lb: { list: [], i: 0 } };

  /* ---------- 데이터 ---------- */
  function data() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return window.SITE_DATA;
  }

  function photoUrl(code, n, big) {
    return 'assets/img/r/' + code + '/' + (big ? '' : 'th/') + pad2(n) + '.jpg';
  }

  /* ---------- 스크롤 잠금 ---------- */
  var locks = 0;
  function lockScroll() {
    locks++;
    if (locks > 1) return;
    var y = window.scrollY;
    document.body.dataset.y = String(y);
    document.body.style.position = 'fixed';
    document.body.style.top = (-y) + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  function unlockScroll() {
    locks = Math.max(0, locks - 1);
    if (locks) return;
    var y = Number(document.body.dataset.y || 0);
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, y);
  }

  /* ---------- 히어로 (자동 슬라이드 + 손가락 스와이프) ---------- */
  var HERO_MS = 6000;
  var heroTimer = null;
  var hero = { pos: 0, n: 0, w: 0, drag: null };

  function heroTrack() { return $('#heroSlides'); }
  function heroSlides() { return $$('#heroSlides .hero-slide'); }

  /* 지금 위치(pos)를 화면 폭 기준 픽셀로 옮겨 놓는다. dx는 손가락으로 끌고 있는 거리 */
  function heroApply(dx, instant) {
    var track = heroTrack();
    if (!track) return;
    var w = hero.w || track.clientWidth || window.innerWidth || 1;
    var x = -(hero.pos * w) + (dx || 0);
    if (instant) track.classList.add('is-jump');
    track.style.transform = 'translate3d(' + x + 'px,0,0)';
    if (instant) { void track.offsetWidth; track.classList.remove('is-jump'); }
  }

  function heroMeasure() {
    var track = heroTrack();
    if (!track) return;
    hero.w = track.clientWidth || window.innerWidth || 1;
  }

  function heroSyncUI() {
    var n = hero.n;
    if (!n) return;
    var i = ((hero.pos % n) + n) % n;
    heroSlides().forEach(function (s, k) { s.classList.toggle('is-on', k === hero.pos); });
    $$('#heroDots button').forEach(function (b, k) { b.setAttribute('aria-current', String(k === i)); });
    var idx = $('#heroIdx');
    if (idx) idx.textContent = pad2(i + 1);
  }

  function heroGo(pos, manual, instant) {
    if (!hero.n) return;
    hero.pos = Math.max(0, Math.min(hero.n, pos));
    heroApply(0, !!instant);
    heroSyncUI();
    if (manual) heroStartTimer();
  }

  /* 이전 사진으로 갈 때 첫 장이면 마지막 장으로 이어 붙인다 */
  function heroStep(d) {
    if (!hero.n) return;
    if (d < 0 && hero.pos === 0) { hero.pos = hero.n; heroApply(0, true); }
    heroGo(hero.pos + d, true);
  }

  function heroStopTimer() {
    if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
    var dots = $('#heroDots');
    if (dots) dots.classList.remove('is-ticking', 'is-paused');
  }

  function heroStartTimer() {
    heroStopTimer();
    if (hero.n < 2) return;
    var dots = $('#heroDots');
    if (dots) {
      dots.style.setProperty('--hero-ms', HERO_MS + 'ms');
      void dots.offsetWidth;
      dots.classList.add('is-ticking');
    }
    heroTimer = setInterval(function () {
      if (document.hidden || hero.drag) return;
      heroStep(1);
    }, HERO_MS);
  }

  /* 손가락을 대고 있는 동안은 자동 넘김과 진행 표시를 멈춘다 */
  function heroPause() {
    if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
    var dots = $('#heroDots');
    if (dots) dots.classList.add('is-paused');
  }

  function renderHero() {
    var h = data().hero || {};
    $('#heroTitle').innerHTML = esc(h.title || '').replace(/\n/g, '<br>');
    $('#heroSub').textContent = h.sub || '';
    $('#heroEyebrow').textContent = h.eyebrow || '';
    var slides = h.slides || [];
    var n = slides.length;
    hero.n = n;
    hero.pos = 0;

    function slideTag(src, i, clone) {
      return '<figure class="hero-slide' + (i === 0 && !clone ? ' is-on' : '') + '" data-i="' + i + '"' +
        (clone ? ' aria-hidden="true"' : '') + '>' +
        '<img src="' + esc(src) + '" alt="" draggable="false"' +
        (i === 0 && !clone ? ' fetchpriority="high"' : ' loading="lazy"') + '>' +
        '</figure>';
    }

    var html = slides.map(function (src, i) { return slideTag(src, i, false); });
    if (n > 1) html.push(slideTag(slides[0], n, true)); // 마지막 사진 다음에 첫 사진 복제본을 붙여 끊김 없이 이어 준다
    heroTrack().innerHTML = html.join('');

    $('#heroTotal').textContent = pad2(n);
    $('#heroDots').innerHTML = slides.map(function (_, i) {
      return '<button type="button" aria-label="' + (i + 1) + '번째 사진" aria-current="' + (i === 0) + '" data-i="' + i + '"></button>';
    }).join('');

    var hl = document.querySelector('.hero-link');
    if (hl) {
      hl.href = (data().links && data().links.realtimeBooking) || '#booking';
      hl.target = '_blank';
      hl.rel = 'noopener';
    }

    heroMeasure();
    heroApply(0, true);
    heroSyncUI();
    heroStartTimer();
  }

  /* 화살표·점과 손가락 드래그 */
  function bindHeroControls() {
    var heroEl = document.querySelector('.hero');
    var track = heroTrack();
    if (!heroEl || !track) return;

    var dots = $('#heroDots');
    if (dots) {
      dots.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        heroGo(Number(b.dataset.i), true);
      });
    }
    var prevBtn = $('#heroPrev'), nextBtn = $('#heroNext');
    if (prevBtn) prevBtn.addEventListener('click', function () { heroStep(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { heroStep(1); });

    /* 복제본과 실제 첫 장은 같은 그림이라, 위치만 바꿔 끊김 없이 양쪽으로 이어 넘긴다 */
    function fixEdge(dx) {
      if (hero.pos >= hero.n && dx < 0) hero.pos = 0;
      else if (hero.pos === 0 && dx > 0) hero.pos = hero.n;
    }

    heroEl.addEventListener('pointerdown', function (e) {
      if (hero.n < 2) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('a, button')) return;
      hero.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, axis: '', t0: Date.now() };
      heroPause();
    });

    heroEl.addEventListener('pointermove', function (e) {
      var d = hero.drag;
      if (!d || e.pointerId !== d.id) return;
      var dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      if (!d.axis) {
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;
        if (Math.abs(dy) >= Math.abs(dx)) { // 세로로 움직이면 화면 스크롤에 맡긴다
          hero.drag = null;
          track.classList.remove('is-dragging');
          heroStartTimer();
          return;
        }
        d.axis = 'x';
        track.classList.add('is-dragging');
        try { heroEl.setPointerCapture(e.pointerId); } catch (err) {}
      }
      d.dx = dx;
      d.dy = dy;
      fixEdge(dx);
      heroApply(dx);
    }, { passive: true });

    function endDrag(e) {
      var d = hero.drag;
      if (!d || (e && e.pointerId !== d.id)) return;
      hero.drag = null;
      track.classList.remove('is-dragging');
      try { if (heroEl.hasPointerCapture(d.id)) heroEl.releasePointerCapture(d.id); } catch (err) {}
      if (!d.axis) { heroStartTimer(); return; }

      var w = hero.w || track.clientWidth || 1;
      var v = d.dx / Math.max(1, Date.now() - d.t0); // px/ms
      var far = Math.abs(d.dx) > Math.min(w * 0.18, 96);
      var fast = Math.abs(v) > 0.45 && Math.abs(d.dx) > 20;
      var target = hero.pos;
      if (far || fast) target = hero.pos + (d.dx < 0 ? 1 : -1);
      heroGo(target, true);
    }

    heroEl.addEventListener('pointerup', endDrag);
    heroEl.addEventListener('pointercancel', function (e) {
      var d = hero.drag;
      if (!d) return;
      hero.drag = null;
      track.classList.remove('is-dragging');
      heroGo(d.axis ? hero.pos : hero.pos, true);
    });
    window.addEventListener('pointerup', endDrag);      // 화면 밖에서 손을 떼도 멈춰 있지 않도록
    window.addEventListener('blur', function () {
      if (!hero.drag) return;
      hero.drag = null;
      track.classList.remove('is-dragging');
      heroGo(hero.pos, true);
    });

    /* 복제본 위치에 도착하면 조용히 첫 장으로 되돌린다 */
    track.addEventListener('transitionend', function (e) {
      if (e.target !== track || e.propertyName !== 'transform') return;
      if (hero.pos >= hero.n) {
        hero.pos = 0;
        heroApply(0, true);
        heroSyncUI();
      }
    });

    /* 화면 폭이 바뀌면 한 장 폭도 다시 잰다 */
    var rzT = 0;
    function remeasure() {
      heroMeasure();
      heroApply(hero.drag ? hero.drag.dx : 0, true);
    }
    window.addEventListener('resize', function () {
      clearTimeout(rzT);
      rzT = setTimeout(remeasure, 120);
    });
    window.addEventListener('orientationchange', function () { setTimeout(remeasure, 260); });
    window.addEventListener('load', remeasure);

    /* 다른 탭에 다녀오면 자동 넘김을 새로 시작한다 */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) heroPause();
      else if (!hero.drag) heroStartTimer();
    });
  }

  /* ---------- 공지 ---------- */
  var noticeTimer = null;
  var noticeOpen = false;
  var noticeReturnFocus = null;

  function noticeList() {
    return (data().notices || []).filter(function (n) { return n.show !== false; });
  }

  function renderNotices() {
    var list = noticeList();
    var bar = $('#noticebar');
    if (!list.length) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    $('#nbView').innerHTML = list.map(function (n, i) {
      var on = i === 0;
      return '<div class="nb-item' + (on ? ' is-on' : ' is-off') + '" data-i="' + i + '" aria-hidden="' + (on ? 'false' : 'true') + '">' +
        '<strong>' + esc(n.badge || '') + '</strong>' +
        '<span class="nb-text">' + esc(n.text || '') + '</span>' +
        '<span class="nb-more" aria-hidden="true">자세히<i>→</i></span>' +
        '</div>';
    }).join('');
    $('#nbDots').innerHTML = list.length > 1 ? list.map(function (_, i) {
      return '<button type="button" aria-label="' + (i + 1) + '번째 공지" aria-current="' + (i === 0) + '" data-i="' + i + '"></button>';
    }).join('') : '';
    $('#nbDots').onclick = function (e) {
      var b = e.target.closest('button');
      if (b) showNotice(Number(b.dataset.i));
    };
    state.notice = 0;
    if (noticeTimer) clearInterval(noticeTimer);
    if (list.length > 1) {
      noticeTimer = setInterval(function () {
        if (!document.hidden && !noticeOpen) showNotice((state.notice + 1) % noticeList().length);
      }, 5600);
    }
    showNotice(0);
  }

  function showNotice(i) {
    $$('#nbView .nb-item').forEach(function (el, k) {
      var on = k === i;
      el.classList.toggle('is-on', on);
      el.classList.toggle('is-off', !on);
      el.setAttribute('aria-hidden', String(!on));
    });
    $$('#nbDots button').forEach(function (el, k) { el.setAttribute('aria-current', String(k === i)); });
    var cur = $('#nbView .nb-item.is-on .nb-text');
    var view = $('#nbView');
    if (view) view.setAttribute('aria-label', '공지: ' + (cur ? cur.textContent : '') + ' — 전체 보기');
    state.notice = i;
  }

  function openNotices() {
    if (noticeOpen) return;
    var list = noticeList();
    if (!list.length) return;
    var body = $('#noticeBody');
    body.innerHTML = list.map(function (n) {
      return '<article class="nm-item">' +
        (n.badge ? '<span class="nm-badge">' + esc(n.badge) + '</span>' : '') +
        '<strong class="nm-text">' + esc(n.text || '') + '</strong>' +
        (n.detail ? '<p class="nm-detail">' + esc(n.detail) + '</p>' : '') +
        (n.link ? '<a class="nm-link" href="' + esc(n.link) + '">' + esc(n.linkText || '자세히 보기') + '<span aria-hidden="true">→</span></a>' : '') +
        '</article>';
    }).join('');
    noticeReturnFocus = document.activeElement;
    noticeOpen = true;
    $('#noticeBack').classList.add('is-open');
    $('#noticeModal').classList.add('is-open');
    $('#noticeModal').setAttribute('aria-hidden', 'false');
    $('#nbView').setAttribute('aria-expanded', 'true');
    lockScroll();
    body.scrollTop = 0;
    $('#noticeClose').focus({ preventScroll: true });
  }

  function closeNotices() {
    if (!noticeOpen) return;
    noticeOpen = false;
    $('#noticeBack').classList.remove('is-open');
    $('#noticeModal').classList.remove('is-open');
    $('#noticeModal').setAttribute('aria-hidden', 'true');
    $('#nbView').setAttribute('aria-expanded', 'false');
    unlockScroll();
    if (noticeReturnFocus && noticeReturnFocus.focus) {
      try { noticeReturnFocus.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  /* ---------- 프롤로그 ---------- */
  function renderIntro() {
    var it = data().intro || {};
    $('#introLabel').textContent = it.label || 'PROLOGUE';
    $('#introStatement').textContent = it.statement || '';
    $('#introBody').textContent = it.body || '';
    $('#introStats').innerHTML = (it.stats || []).map(function (s) {
      return '<li><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></li>';
    }).join('');
  }

  /* ---------- 객실 ---------- */
  var TABS = [
    { id: 'all', label: '전체' }, { id: 'P', label: 'P동 · 풀글램핑' }, { id: 'G', label: 'G동 · 펫글램핑' },
    { id: 'C', label: 'C1 · 카라반' }, { id: 'family', label: '패밀리 4인' }, { id: 'tub', label: '오션뷰 욕조' }, { id: 'pool', label: '개별 풀' }
  ];

  function renderTabs() {
    $('#catChips').innerHTML = TABS.map(function (t) {
      return '<button type="button" data-cat="' + t.id + '" aria-pressed="' + (state.cat === t.id) + '">' + esc(t.label) + '</button>';
    }).join('');
  }

  function matches(r) {
    if (state.cat === 'all') return true;
    if (state.cat === 'family') return r.base >= 4;
    if (state.cat === 'tub') return !!r.tub;
    if (state.cat === 'pool') return !!r.pool;
    return r.group === state.cat;
  }

  function roomCard(r) {
    var photos = (r.photos.all || [r.photos.cover || 1]).slice(0, 6);
    var cover = photoUrl(r.code, photos[0], false);
    var meta = [];
    meta.push('기준 ' + r.base + '인 · 최대 ' + r.max + '인');
    meta.push(r.pyeong + '평');
    if (r.tub) meta.push('오션뷰 욕조');
    if (r.pool) meta.push('개별 풀');
    var label = r.name + ' ' + r.subtitle;
    return '<article class="card" data-room="' + esc(r.code) + '">' +
      '<div class="card-media" data-media>' +
        '<div class="card-track" data-track data-i="0">' +
          photos.map(function (n, i) {
            return '<img class="card-slide" src="' + photoUrl(r.code, n, false) + '" alt="' + esc(r.name + ' 객실 사진 ' + (i + 1)) + '"' +
              ' loading="lazy" draggable="false"' + (i === 0 ? '' : ' aria-hidden="true"') + '>';
          }).join('') +
        '</div>' +
        (photos.length > 1 ?
          '<div class="card-dots" role="group" aria-label="' + esc(r.name) + ' 사진 넘기기">' +
            photos.map(function (_, i) {
              return '<button class="card-dot" type="button" data-dot="' + i + '" aria-label="' + esc(r.name + ' 사진 ' + (i + 1)) + '"' +
                ' aria-current="' + (i === 0) + '"' + (i === 0 ? '' : ' tabindex="-1"') + '></button>';
            }).join('') +
          '</div>' : '') +
      '</div>' +
      '<div class="card-body">' +
        '<button class="card-open" type="button" data-open="' + esc(r.code) + '" aria-label="' + esc(label) + ' 자세히 보기">' +
          '<span class="card-row">' +
            '<span class="card-name"><em>' + esc(r.name) + '</em>' + esc(r.subtitle.replace(/\s*·.*/, '')) + '</span>' +
            '<span class="card-price"><small>주중</small>' + krw(r.price.weekday) + '원~</span>' +
          '</span>' +
          '<span class="card-meta">' + meta.map(esc).join('<i>·</i>') + '</span>' +
          '<span class="card-line">사진 · 요금 보기 <span aria-hidden="true">→</span></span>' +
        '</button>' +
      '</div></article>';
  }

  // 카드 안 사진 넘기기
  function goCardPhoto(media, i) {
    var track = media.querySelector('[data-track]');
    if (!track) return;
    var slides = $$('.card-slide', track);
    if (!slides.length) return;
    i = ((Number(i) % slides.length) + slides.length) % slides.length;
    track.dataset.i = String(i);
    track.style.transform = 'translate3d(' + (-i * 100) + '%,0,0)';
    slides.forEach(function (s, k) { s.setAttribute('aria-hidden', String(k !== i)); });
    $$('[data-dot]', media).forEach(function (d, k) {
      d.setAttribute('aria-current', String(k === i));
      d.tabIndex = k === i ? 0 : -1;
    });
  }

  function renderRooms() {
    var list = data().rooms.filter(matches);
    var order = { P: 0, G: 1, C: 2 };
    list.sort(function (a, b) { return (order[a.group] - order[b.group]) || a.name.localeCompare(b.name); });
    $('#resultCount').textContent = list.length + '개의 객실';
    $('#roomGrid').innerHTML = list.length ? list.map(roomCard).join('') :
      '<div class="empty-state">조건에 맞는 객실이 없습니다.</div>';
  }

  /* 손가락으로 카드 사진 넘기기 (상세 모달과 충돌하지 않게) */
  var suppressCardClick = 0;

  function initCardGallery() {
    var grid = $('#roomGrid');
    if (!grid) return;
    var drag = null;

    grid.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('[data-dot]')) return;
      var media = e.target.closest('[data-media]');
      if (!media) return;
      var track = media.querySelector('[data-track]');
      if (!track || track.children.length < 2) return;
      drag = {
        media: media, track: track, id: e.pointerId,
        x0: e.clientX, y0: e.clientY, dx: 0,
        idx: Number(track.dataset.i || 0), moved: false
      };
      try { track.setPointerCapture(e.pointerId); } catch (err) {}
    });

    grid.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        if (Math.abs(dx) < 8) return;
        drag.moved = true;
        drag.track.classList.add('is-dragging');
      }
      drag.dx = dx;
      var w = drag.media.clientWidth || 1;
      drag.track.style.transform = 'translate3d(' + (-drag.idx * 100 + (dx / w) * 100) + '%,0,0)';
    });

    function finish(e) {
      if (!drag) return;
      var d = drag; drag = null;
      var next = d.idx;
      if (d.moved) {
        var w = d.media.clientWidth || 1;
        if (d.dx < -w * 0.12) next = d.idx + 1;
        else if (d.dx > w * 0.12) next = d.idx - 1;
        suppressCardClick = Date.now() + 400;
      }
      d.track.classList.remove('is-dragging');
      goCardPhoto(d.media, next);
    }
    grid.addEventListener('pointerup', finish);
    grid.addEventListener('pointercancel', function () {
      if (!drag) return;
      var d = drag; drag = null;
      d.track.classList.remove('is-dragging');
      goCardPhoto(d.media, d.idx);
    });

    // 점에서 좌우 방향키
    grid.addEventListener('keydown', function (e) {
      var dot = e.target.closest('[data-dot]');
      if (!dot) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var media = dot.closest('[data-media]');
      var dots = $$('[data-dot]', media);
      var next = (Number(dot.dataset.dot) + (e.key === 'ArrowRight' ? 1 : -1) + dots.length) % dots.length;
      goCardPhoto(media, next);
      if (dots[next]) dots[next].focus();
    });
  }

  /* ---------- 객실 상세 (풀폭 화보) ---------- */
  var stage = { i: 0, n: 0, drag: null, suppressClick: 0, hintOff: false };

  function photoCap(r, n) {
    var caps = (r && r.photos && r.photos.caps) || {};
    return caps[String(n)] || '';
  }

  function openStageLightbox() {
    if (!state.room) return;
    openLightboxByIndex(stage.i);
  }

  function openLightboxByIndex(i) {
    if (!state.room) return;
    var r = state.room;
    var list = r.photos.all || [];
    var urls = list.map(function (n) { return photoUrl(r.code, n, true); });
    var cap = photoCap(r, list[i]);
    openLightbox(urls, i, r.name + (cap ? ' · ' + cap : ''));
  }

  function setStage(i, instant) {
    var track = $('#roomTrack');
    if (!track || !stage.n) return;
    i = Math.max(0, Math.min(stage.n - 1, i));
    stage.i = i;
    if (instant) track.style.transition = 'none';
    track.style.transform = 'translate3d(' + (-i * 100) + '%,0,0)';
    if (instant) { void track.offsetWidth; track.style.transition = ''; }
    $$('#stageDots .rv-dot').forEach(function (d, k) {
      d.setAttribute('aria-current', String(k === i));
      d.tabIndex = k === i ? 0 : -1;
    });
    $('#stageIdx').textContent = pad2(i + 1);
    var r = state.room;
    $('#stageCap').textContent = r ? photoCap(r, r.photos.all[i]) : '';
    var prev = $('#stagePrev'), next = $('#stageNext');
    if (prev) prev.classList.toggle('is-edge', i === 0);
    if (next) next.classList.toggle('is-edge', i === stage.n - 1);
  }

  function hideStageHint() {
    if (stage.hintOff) return;
    stage.hintOff = true;
    var h = $('#stageHint');
    if (h) h.classList.add('is-off');
  }

  function openRoom(code) {
    var r = data().rooms.filter(function (x) { return x.code === code; })[0];
    if (!r) return;
    state.room = r;
    var list = r.photos.all || [];
    var caps = r.photos.caps || {};
    $('#modalTitle').textContent = r.name;
    $('#modalSub').textContent = r.subtitle;
    $('#infoTitle').textContent = r.name + ' · ' + (r.subtitle || '');
    var line = ['기준 ' + r.base + '인 · 최대 ' + r.max + '인', r.pyeong + '평'];
    if (r.tub) line.push('오션뷰 욕조');
    if (r.pool) line.push('개별 미온수 풀');
    $('#infoLine').textContent = line.join('  ·  ');
    $('#stageTotal').textContent = pad2(list.length);
    $('#photoCount').textContent = list.length;

    $('#roomTrack').innerHTML = list.map(function (n, i) {
      var cap = caps[String(n)] || '';
      return '<figure class="rv-slide" data-i="' + i + '">' +
        '<img src="' + photoUrl(r.code, n, true) + '" alt="' + esc(r.name + ' ' + (cap || '사진') + ' ' + (i + 1)) + '"' +
        (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + ' draggable="false">' +
        '</figure>';
    }).join('');

    $('#stageDots').innerHTML = list.map(function (n, i) {
      var cap = caps[String(n)] || '';
      return '<button class="rv-dot" type="button" data-stage="' + i + '"' +
        ' aria-label="' + esc(r.name + ' 사진 ' + (i + 1) + (cap ? ' ' + cap : '')) + '"' +
        ' aria-current="' + (i === 0) + '"' + (i === 0 ? '' : ' tabindex="-1"') + '></button>';
    }).join('');

    $('#photoGrid').innerHTML = list.map(function (n, i) {
      var cap = caps[String(n)] || '';
      return '<figure class="rv-photo" data-photo="' + n + '" data-i="' + i + '" role="button" tabindex="0"' +
        ' aria-label="' + esc(r.name + ' ' + (cap || '사진') + ' 크게 보기') + '">' +
        '<img src="' + photoUrl(r.code, n, true) + '" alt="' + esc(r.name + ' ' + (cap || '사진')) + '" loading="lazy">' +
        '<figcaption><span class="rv-photo-no">' + pad2(i + 1) + '</span>' +
        '<span class="rv-photo-cap">' + esc(cap) + '</span></figcaption>' +
        '</figure>';
    }).join('');

    stage.n = list.length;
    stage.hintOff = false;
    var hint = $('#stageHint');
    if (hint) hint.classList.remove('is-off');
    if (stage.n) setStage(0, true);
    renderSummary(r);

    $('#modalBook').href = data().links.naverBooking;
    $('#modalBookEnd').href = data().links.naverBooking;
    $('#modalCall').href = data().contact.phoneHref;
    $('#modalCall').textContent = '전화 ' + data().contact.phone;
    $('#endLine').textContent = r.name + ' ' + (r.subtitle || '') + ' — 주중 ' + krw(r.price.weekday) + '원부터. 실시간 예약 달력에서 날짜별 요금을 확인하세요.';
    $('#roomModal').classList.add('is-open');
    $('#roomModal').classList.remove('is-scrolled');
    $('#modalBack').classList.add('is-open');
    lockScroll();
    $('#modalBody').scrollTop = 0;
    setTimeout(function () { $('#modalClose').focus(); }, 80);
  }

  function closeRoom() {
    $('#roomModal').classList.remove('is-open');
    $('#modalBack').classList.remove('is-open');
    unlockScroll();
  }

  function renderSummary(r) {
    var p = r.price;
    var fees = (data().booking.fees || []).filter(function (f) {
      if (/개별 풀/.test(f.label)) return !!r.pool;
      if (/반려견/.test(f.label)) return !!r.pet;
      return /인원|바베큐/.test(f.label);
    });

    var left = '<div class="rv-col">' +
      '<h4>객실 정보</h4><table class="spec-table"><tbody>' +
      '<tr><th>구조</th><td>' + esc(r.beds) + '</td></tr>' +
      '<tr><th>넓이</th><td>' + r.pyeong + '평 · 약 ' + r.sqm + '㎡</td></tr>' +
      '<tr><th>인원</th><td>기준 ' + r.base + '인 · 최대 ' + r.max + '인 (초과 1인 ' + krw(r.extra) + '원)</td></tr>' +
      '<tr><th>전용</th><td>바베큐장 · 주방 · 욕실' + (r.tub ? ' · 오션뷰 욕조' : '') + (r.pool ? ' · 개별 풀' : '') + '</td></tr>' +
      '</tbody></table>' +
      '<h4>구비시설</h4><div class="fac-chips">' + String(r.facilities || '').split(',').map(function (s) {
        var t = s.trim(); return t ? '<span>' + esc(t) + '</span>' : '';
      }).join('') + '</div>' +
      (r.note ? '<h4>이 동의 특징</h4><p class="mnote">' + esc(r.note) + '</p>' : '') +
      '<h4>반려견</h4><p class="mnote">' + (r.pet ? '반려견 동반 가능 (최대 2견, 2견 이상은 사전 문의)' : '이 동은 반려견 동반 표기가 없습니다. 예약 전 문의해 주세요.') + '</p>' +
      '</div>';

    var right = '<div class="rv-col">' +
      '<h4>1박 요금</h4><div class="price-rows">' +
      '<div><span>주중 (일~목)</span><b>' + krw(p.weekday) + '원</b></div>' +
      '<div><span>금요일</span><b>' + krw(p.friday) + '원</b></div>' +
      '<div><span>토·공휴일</span><b>' + krw(p.saturday) + '원</b></div>' +
      '</div><p class="price-note">2026년 11월 실시간 예약 기준 할인가입니다. 성수기·연휴 요금은 예약 달력에서 확인해 주세요.</p>' +
      (fees.length ? '<h4>추가 요금</h4><div class="price-rows">' + fees.map(function (f) {
        return '<div><span>' + esc(f.label) + '</span><b style="font-family:var(--sans);font-size:12px">' + esc(f.value) + '</b></div>';
      }).join('') + '</div>' : '') +
      '<h4>사진</h4><p class="mnote">이 방의 사진 ' + (r.photos.all || []).length + '장. 아래로 내리면 한 장씩 크게 이어집니다.</p>' +
      '</div>';

    $('#roomSummary').innerHTML = left + right;
  }

  /* ---------- 라이트박스 ---------- */
  function openLightbox(urls, i, cap) {
    state.lb.urls = urls; state.lb.i = i; state.lb.cap = cap || '';
    paintLightbox();
    $('#lightbox').classList.add('is-open');
    lockScroll();
  }

  function paintLightbox() {
    var urls = state.lb.urls || [];
    if (!urls.length) return;
    $('#lbImg').src = urls[state.lb.i];
    $('#lbImg').alt = state.lb.cap || '사진';
    $('#lbCap').textContent = (state.lb.cap ? state.lb.cap + '  ·  ' : '') + (state.lb.i + 1) + ' / ' + urls.length;
  }

  function stepLightbox(d) {
    var n = (state.lb.urls || []).length;
    if (!n) return;
    state.lb.i = (state.lb.i + d + n) % n;
    paintLightbox();
  }

  function closeLightbox() {
    $('#lightbox').classList.remove('is-open');
    unlockScroll();
  }

  /* ---------- 부대시설 ---------- */
  function renderFacilities() {
    $('#facGrid').innerHTML = (data().facilities || []).map(function (f, i) {
      return '<button class="fac" type="button" data-fac="' + i + '" aria-label="' + esc(f.title) + ' 사진 보기">' +
        '<span class="fac-media"><img src="' + esc(f.images[0]) + '" alt="' + esc(f.title) + '" loading="lazy"></span>' +
        '<span class="fac-body"><em>' + esc(f.sub || '') + '</em><h3>' + esc(f.title) + '</h3>' +
        '<p>' + esc(f.desc || '') + '</p></span></button>';
    }).join('');
    var a = data().amenities || {};
    $('#amenityTitle').textContent = a.title || '';
    $('#amenityDesc').textContent = a.desc || '';
    $('#amenityItems').innerHTML = (a.items || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
  }

  /* ---------- 반려견 ---------- */
  function renderPet() {
    var p = data().petPolicy || {};
    $('#petTitle').textContent = p.title || '반려견 동반 안내';
    $('#petIntro').textContent = p.intro || '';
    $('#petFees').innerHTML = (p.fees || []).map(function (f) {
      return '<div><span>' + esc(f.label) + '</span><strong>' + esc(f.value) + '</strong></div>';
    }).join('');
    $('#petRules').innerHTML = (p.rules || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('#petNotice').textContent = p.notice || '';
  }

  /* ---------- 후기 ---------- */
  function renderReviews() {
    var all = (data().reviews || []).filter(function (r) { return r.show !== false; });
    $('#reviewNote').textContent = data().reviewNote || '';

    var clips = all.filter(function (r) { return r.type === 'clip'; });
    $('#clipGrid').innerHTML = '<div class="clip-row">' + clips.map(function (c) {
      var meta = [];
      if (c.author && (!c.summary || c.summary.indexOf(c.author) < 0)) meta.push(c.author);
      if (c.date) meta.push(c.date);
      return '<a class="clip-card" href="' + esc(c.url) + '" target="_blank" rel="noopener">' +
        '<img src="' + esc(c.thumb) + '" alt="" loading="lazy">' +
        '<span class="cp-play" aria-hidden="true">▶</span>' +
        '<span class="cp-cap"><strong>' + esc(c.title) + '</strong>' +
        (c.summary ? '<span class="cp-sum">' + esc(c.summary) + '</span>' : '') +
        '<span class="cp-meta">' + esc(meta.join(' · ')) + '</span></span></a>';
    }).join('') + '</div>' +
      '<div class="clip-note"><p>네이버 클립에서 실제 방문객이 올린 짧은 영상입니다. 누르면 그 영상이 바로 열립니다.</p></div>';

    var blogs = all.filter(function (r) { return r.type !== 'clip'; });
    $('#blogGrid').innerHTML = blogs.map(function (b) {
      return '<a class="rev-card" href="' + esc(b.url) + '" target="_blank" rel="noopener">' +
        '<span class="rev-thumb"><img src="' + esc(b.thumb) + '" alt="" loading="lazy"></span>' +
        '<span class="rev-body"><strong>' + esc(b.title) + '</strong>' +
        '<p>' + esc(b.summary) + '</p>' +
        '<span class="rev-meta">' + esc(b.author || '') + (b.date ? ' · ' + esc(b.date) : '') + ' →</span></span></a>';
    }).join('');

    var l = data().links || {};
    $('#reviewLinks').innerHTML =
      '<a href="' + esc(l.clips || '#') + '" target="_blank" rel="noopener"><span><b>네이버 클립</b><span>구룡포 펫글램핑 영상 모아보기</span></span><i>→</i></a>' +
      '<a href="' + esc(l.blogSearch || '#') + '" target="_blank" rel="noopener"><span><b>네이버 블로그</b><span>구룡포 펫글램핑 후기 검색</span></span><i>→</i></a>' +
      '<a href="' + esc(l.instaTag || l.instagram || '#') + '" target="_blank" rel="noopener"><span><b>인스타그램</b><span>#포항펫글램핑 태그</span></span><i>→</i></a>';
  }

  /* ---------- 예약·위치 ---------- */
  function renderBooking() {
    var b = data().booking || {}, links = data().links || {};
    $('#bookingIntro').textContent = b.intro || '';
    $('#bookingChannels').innerHTML = (b.channels || []).map(function (c) {
      var href = c.linkKey === 'phoneHref' ? data().contact.phoneHref : (links[c.linkKey] || '#');
      var ext = href.indexOf('tel:') !== 0;
      return '<a href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
        '<span><strong>' + esc(c.label) + '</strong><span>' + esc(c.desc) + '</span></span><i>→</i></a>';
    }).join('');
    $('#feeList').innerHTML = (b.fees || []).map(function (f) {
      return '<div><span>' + esc(f.label) + '</span><strong>' + esc(f.value) + '</strong></div>';
    }).join('');
    $('#refundList').innerHTML = (b.refund || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('#checkin').textContent = data().contact.checkin;
    $('#checkout').textContent = data().contact.checkout;
    $('#counselHours').textContent = data().contact.counselHours;
    $('#bankInfo').textContent = '입금 계좌 · ' + data().contact.bank;
  }

  function renderLocation() {
    var c = data().contact, l = data().links;
    $('#addr').textContent = c.address;
    var lat = (c.coords || [])[0], lon = (c.coords || [])[1];
    var bbox = [lon - 0.012, lat - 0.008, lon + 0.012, lat + 0.008].join('%2C');
    $('#mapVisual').innerHTML = lat ?
      '<iframe title="위치 지도" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=' + bbox + '&layer=mapnik&marker=' + lat + '%2C' + lon + '"></iframe>' : '';
    $('#mapBtns').innerHTML =
      '<a href="' + esc(l.naverPlace) + '" target="_blank" rel="noopener">네이버 지도</a>' +
      '<a href="' + esc(l.navi) + '" target="_blank" rel="noopener">내비 길안내</a>' +
      '<a href="' + esc(c.phoneHref) + '">전화</a>';
    $('#nearbyList').innerHTML = (data().nearby || []).map(function (p) {
      return '<div class="nb"><strong>' + esc(p.title) + '</strong><span>' + esc(p.time) + '</span></div>';
    }).join('');
    $('#galleryStrip').innerHTML = (data().gallery || []).map(function (src, i) {
      return '<img src="' + esc(src) + '" alt="숙소 풍경 ' + (i + 1) + '" loading="lazy">';
    }).join('');

    $('#footBiz').textContent = c.biz;
    $('#footAddr').textContent = c.address;
    $('#footBank').textContent = c.bank;
    var fp = $('#footPhone'); fp.textContent = c.phone; fp.href = c.phoneHref;
    $('#headerPhone').href = c.phoneHref;
    $('#mobCall').href = c.phoneHref;
    $('#mobBook').href = l.realtimeBooking || l.naverBooking;
    $('#footNavi').href = l.navi;
    $('#footBlog').href = l.blog;
    $('#footInsta').href = l.instagram;

    $('#sheetList').innerHTML = (data().booking.channels || []).map(function (ch) {
      var href = ch.linkKey === 'phoneHref' ? c.phoneHref : (l[ch.linkKey] || '#');
      var ext = href.indexOf('tel:') !== 0;
      return '<a class="sheet-item" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
        '<span><strong>' + esc(ch.label) + '</strong><span>' + esc(ch.desc) + '</span></span><span>→</span></a>';
    }).join('');
  }

  function openSheet() {
    $('#sheetBack').classList.add('is-open');
    $('#bookSheet').classList.add('is-open');
    lockScroll();
  }
  function closeSheet() {
    $('#sheetBack').classList.remove('is-open');
    $('#bookSheet').classList.remove('is-open');
    unlockScroll();
  }

  /* ---------- 이벤트 ---------- */
  function bind() {
    var hdr = $('#siteHeader');
    var onScroll = function () { hdr.classList.toggle('is-stuck', window.scrollY > 40); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var menu = $('#menu'), toggle = $('#navToggle');
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      menu.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-locked', open);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        menu.classList.remove('is-open');
        menu.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('is-locked');
      }
    });

    $('#nbClose').addEventListener('click', function () {
      $('#noticebar').classList.add('hidden');
      if (noticeTimer) { clearInterval(noticeTimer); noticeTimer = null; }
    });

    // 공지 바 → 전체 공지 보기
    $('#nbView').addEventListener('click', openNotices);
    $('#nbView').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        openNotices();
      }
    });
    $('#noticeBack').addEventListener('click', closeNotices);
    $('#noticeClose').addEventListener('click', closeNotices);
    $('#noticeFootClose').addEventListener('click', closeNotices);
    $('#noticeBody').addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNotices();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && noticeOpen) closeNotices();
    });

    bindHeroControls();

    $('#catChips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      state.cat = b.dataset.cat;
      $$('#catChips button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.cat === state.cat)); });
      renderRooms();
    });

    $('#roomGrid').addEventListener('click', function (e) {
      var dot = e.target.closest('[data-dot]');
      if (dot) {
        e.preventDefault();
        goCardPhoto(dot.closest('[data-media]'), Number(dot.dataset.dot));
        return;
      }
      if (Date.now() < suppressCardClick) return;
      var card = e.target.closest('[data-room]');
      if (card) openRoom(card.dataset.room);
    });
    initCardGallery();
    $('#modalClose').addEventListener('click', closeRoom);
    $('#modalBack').addEventListener('click', closeRoom);

    /* 객실 상세 — 대표 사진 스테이지 */
    $('#stagePrev').addEventListener('click', function () { setStage(stage.i - 1); hideStageHint(); });
    $('#stageNext').addEventListener('click', function () { setStage(stage.i + 1); hideStageHint(); });
    $('#stageDots').addEventListener('click', function (e) {
      var b = e.target.closest('[data-stage]');
      if (!b) return;
      setStage(Number(b.dataset.stage));
      hideStageHint();
    });
    $('#stageZoom').addEventListener('click', openStageLightbox);
    $('#roomStage').addEventListener('click', function (e) {
      if (e.target.closest('.rv-arrow') || e.target.closest('.rv-dot') ||
          e.target.closest('.rv-zoom') || e.target.closest('.rv-bar')) return;
      if (Date.now() < stage.suppressClick) return;
      openStageLightbox();
    });

    /* 손가락으로 스테이지 넘기기 */
    (function initStageSwipe() {
      var el = $('#roomStage'), track = $('#roomTrack');
      el.addEventListener('pointerdown', function (e) {
        if (stage.n < 2) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.target.closest('.rv-arrow') || e.target.closest('.rv-dot') ||
            e.target.closest('.rv-zoom') || e.target.closest('.rv-bar')) return;
        stage.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, moved: false, i: stage.i, w: el.clientWidth || 1 };
        try { track.setPointerCapture(e.pointerId); } catch (err) {}
      });
      el.addEventListener('pointermove', function (e) {
        var d = stage.drag;
        if (!d || e.pointerId !== d.id) return;
        var dx = e.clientX - d.x0, dy = e.clientY - d.y0;
        if (!d.moved) {
          if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { stage.drag = null; return; }
          if (Math.abs(dx) < 8) return;
          d.moved = true;
          track.classList.add('is-dragging');
        }
        d.dx = dx;
        track.style.transform = 'translate3d(' + (-d.i * 100 + (dx / d.w) * 100) + '%,0,0)';
      });
      function end(e) {
        var d = stage.drag;
        if (!d) return;
        stage.drag = null;
        track.classList.remove('is-dragging');
        var next = d.i;
        if (d.moved) {
          if (d.dx < -d.w * 0.1) next = d.i + 1;
          else if (d.dx > d.w * 0.1) next = d.i - 1;
          stage.suppressClick = Date.now() + 450;
          hideStageHint();
        }
        setStage(next);
      }
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', function () {
        var d = stage.drag;
        stage.drag = null;
        track.classList.remove('is-dragging');
        if (d) setStage(d.i);
      });
    })();

    /* 스크롤하면 상단 바를 종이색으로, 화보 구간에서는 지금 보이는 사진 번호를 보여줍니다 */
    var scrollRaf = 0;
    function syncBar() {
      var body = $('#modalBody');
      var y = body.scrollTop;
      $('#roomModal').classList.toggle('is-scrolled', y > 48);
      if (y > 60) hideStageHint();
      var stageH = $('#roomStage') ? $('#roomStage').offsetHeight : 0;
      if (y > stageH) {
        var mid = window.innerHeight * 0.42;
        var photos = $$('#photoGrid .rv-photo');
        for (var i = 0; i < photos.length; i++) {
          var r = photos[i].getBoundingClientRect();
          if (r.top <= mid && r.bottom > mid) {
            $('#stageIdx').textContent = pad2(i + 1);
            break;
          }
        }
      } else {
        $('#stageIdx').textContent = pad2(stage.i + 1);
      }
    }
    $('#modalBody').addEventListener('scroll', function () {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(function () { scrollRaf = 0; syncBar(); });
    });

    $('#photoGrid').addEventListener('click', function (e) {
      var b = e.target.closest('[data-photo]');
      if (!b || !state.room) return;
      openLightboxByIndex(Number(b.dataset.i));
    });
    $('#photoGrid').addEventListener('keydown', function (e) {
      var b = e.target.closest('[data-photo]');
      if (!b) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        openLightboxByIndex(Number(b.dataset.i));
      }
    });
    $('#lbClose').addEventListener('click', closeLightbox);
    $('#lightbox').addEventListener('click', function (e) {
      if (e.target.id === 'lightbox' || e.target.tagName === 'FIGURE') closeLightbox();
    });
    $('#lbPrev').addEventListener('click', function () { stepLightbox(-1); });
    $('#lbNext').addEventListener('click', function () { stepLightbox(1); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if ($('#lightbox').classList.contains('is-open')) closeLightbox();
        else if ($('#roomModal').classList.contains('is-open')) closeRoom();
        else if ($('#bookSheet').classList.contains('is-open')) closeSheet();
        else if (menu.classList.contains('is-open')) toggle.click();
      }
      if ($('#lightbox').classList.contains('is-open')) {
        if (e.key === 'ArrowLeft') stepLightbox(-1);
        if (e.key === 'ArrowRight') stepLightbox(1);
      } else if ($('#roomModal').classList.contains('is-open')) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); setStage(stage.i - 1); hideStageHint(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); setStage(stage.i + 1); hideStageHint(); }
      }
    });

    // 부대시설 사진 → 라이트박스 (시설 사진 경로 사용)
    $('#facGrid').addEventListener('click', function (e) {
      var b = e.target.closest('[data-fac]');
      if (!b) return;
      var f = (data().facilities || [])[Number(b.dataset.fac)];
      if (!f) return;
      openLightbox(f.images.slice(), 0, f.title);
    });

    $('#sheetBack').addEventListener('click', closeSheet);
    $('#sheetClose').addEventListener('click', closeSheet);
    var openers = $$('[data-open-book]');
    openers.forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); openSheet(); });
    });

    // 모바일 메뉴 열린 채 데스크톱 폭으로 바뀌면 닫기
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1100 && menu.classList.contains('is-open')) toggle.click();
    });
  }

  /* ---------- 시작 ---------- */
  function start() {
    renderHero();
    renderNotices();
    renderIntro();
    renderTabs();
    renderRooms();
    renderFacilities();
    renderPet();
    renderReviews();
    renderBooking();
    renderLocation();
    bind();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
