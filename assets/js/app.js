/* ==========================================================================
   풀글램핑&펫글램핑 — 화면 렌더링
   모든 내용은 assets/js/site-data.js 한 파일에서 읽어옵니다.
   ========================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'pg_site_data_v1';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var krw = function (n) { return Number(n || 0).toLocaleString('ko-KR'); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };

  var state = { cat: 'all', feats: [], sort: 'recommend', room: null, tab: 'all', expanded: false, slide: 0, notice: 0 };

  /* ---------- 배경 스크롤 잠금 (아이폰에서도 안전한 방식) ---------- */
  var lockCount = 0;
  function lockScroll() {
    lockCount++;
    if (lockCount > 1) return;
    var y = window.scrollY || 0;
    document.body.dataset.scrollY = String(y);
    document.body.style.position = 'fixed';
    document.body.style.top = (-y) + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  function unlockScroll() {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount > 0) return;
    var y = Number(document.body.dataset.scrollY || 0);
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, y);
  }

  /* ---------- 데이터 ---------- */
  function data() { return window.SITE_DATA; }

  function savedData() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  /* 사진 경로 */
  function photoUrl(code, n, thumb) {
    var nn = (n < 10 ? '0' : '') + n;
    return 'assets/img/rooms/' + code + (thumb ? '/th/' : '/') + nn + '.jpg';
  }

  var TAG_LABEL = {
    all: '전체 사진', tub: '오션뷰 욕조', room: '침실·거실', kitchen: '주방·다이닝',
    bbq: '바베큐·테라스', view: '일출·야경', pool: '개별 풀', bath: '욕실'
  };
  var TAG_ORDER = ['tub', 'room', 'view', 'pool', 'kitchen', 'bbq', 'bath'];

  function photosOf(room, tag) {
    if (tag === 'all' || !room.photos[tag]) return room.photos.all.slice();
    return room.photos[tag].slice();
  }

  /* ---------- 공통 아이콘 ---------- */
  var ICON = {
    home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    bath: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-2Z" stroke="currentColor" stroke-width="1.7"/><path d="M6 12V6.5A2.5 2.5 0 0 1 8.5 4c1.2 0 2 .7 2.3 1.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    pool: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 16c2 0 2-1.4 4-1.4S9 16 11 16s2-1.4 4-1.4S17 16 19 16s2-1.4 2-1.4M3 10c2 0 2-1.4 4-1.4S9 10 11 10s2-1.4 4-1.4S17 10 19 10s2-1.4 2-1.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    dog: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 9c0-2 1.3-4 3-4h4c1.7 0 3 2 3 4v4c0 3.3-2.7 6-6 6h-1a3 3 0 0 1-3-3V9Z" stroke="currentColor" stroke-width="1.7"/><path d="M7 8 5 5M17 8l2-3M9.5 12h.01M14.5 12h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6.6 3h2.6l1.6 4-2 1.4a12 12 0 0 0 6.8 6.8l1.4-2 4 1.6v2.6A2.6 2.6 0 0 1 18.4 20C10.4 19.6 4.4 13.6 4 5.6A2.6 2.6 0 0 1 6.6 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    cal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 10h17M8 3.5V6M16 3.5V6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    nav: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" stroke-width="1.7"/></svg>',
    naver: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4h4.6l5 7.4V4H19v16h-4.6l-5-7.4V20H5V4Z" fill="currentColor"/></svg>',
    clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.7"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  };

  /* ======================================================================
     공지 바
     ====================================================================== */
  var noticeTimer = null;

  function renderNotices() {
    var bar = $('#noticebar'), view = $('#nbView'), dots = $('#nbDots');
    var list = (data().notices || []).filter(function (n) { return n.show !== false; });
    if (!list.length) { bar.classList.add('hidden'); document.body.classList.remove('has-noticebar'); return; }
    bar.classList.remove('hidden');
    document.body.classList.add('has-noticebar');

    view.innerHTML = list.map(function (n, i) {
      return '<div class="nb-item' + (i === 0 ? ' is-on' : '') + '" data-i="' + i + '">' +
        '<span><strong>' + esc(n.badge) + '</strong> · ' + esc(n.text) + '</span>' +
        (n.link ? ' <a class="nb-link" href="' + esc(n.link) + '">' + esc(n.linkText || '자세히') + ' ›</a>' : '') +
        '</div>';
    }).join('');
    dots.innerHTML = list.map(function (n, i) {
      return '<button type="button" aria-label="' + i + '번째 공지" aria-current="' + (i === 0) + '" data-i="' + i + '"></button>';
    }).join('');
    $('#nbBadge').textContent = list[0].badge;
    state.notice = 0;
    startNoticeRotation(list.length);

    dots.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      showNotice(Number(b.dataset.i), list.length);
    };
  }

  function showNotice(i, len) {
    state.notice = i;
    $$('#nbView .nb-item').forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
    $$('#nbDots button').forEach(function (el, k) { el.setAttribute('aria-current', String(k === i)); });
    var list = (data().notices || []).filter(function (n) { return n.show !== false; });
    if (list[i]) $('#nbBadge').textContent = list[i].badge;
    if (len) startNoticeRotation(len);
  }

  function startNoticeRotation(len) {
    if (noticeTimer) clearInterval(noticeTimer);
    if (len < 2) return;
    noticeTimer = setInterval(function () {
      if (document.hidden) return;
      showNotice((state.notice + 1) % len, 0);
    }, 5200);
  }

  /* ======================================================================
     히어로
     ====================================================================== */
  var heroTimer = null;

  function renderHero() {
    var h = data().hero;
    $('#heroTitle').innerHTML = esc(h.title).replace(/\n/g, '<br>');
    $('#heroSub').innerHTML = esc(h.sub).replace(/\n/g, '<br>');
    $('#heroEyebrow').textContent = h.eyebrow || 'POHANG · HOMIGOT · PET GLAMPING';
    $('#heroBadges').innerHTML = (h.badges || []).map(function (b) { return '<span>' + esc(b) + '</span>'; }).join('');

    var slides = $('#heroSlides');
    slides.innerHTML = (h.slides || []).map(function (src, i) {
      return '<img src="' + esc(src) + '" alt="" class="' + (i === 0 ? 'is-on' : '') + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '">';
    }).join('');
    $('#heroDots').innerHTML = (h.slides || []).map(function (_, i) {
      return '<button type="button" aria-label="' + (i + 1) + '번째 배경" aria-current="' + (i === 0) + '" data-i="' + i + '"></button>';
    }).join('');
    $('#heroDots').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      goSlide(Number(b.dataset.i), h.slides.length);
    };
    if (heroTimer) clearInterval(heroTimer);
    if ((h.slides || []).length > 1) {
      heroTimer = setInterval(function () {
        if (document.hidden) return;
        goSlide((state.slide + 1) % h.slides.length, 0);
      }, 7000);
    }
  }

  function goSlide(i, len) {
    state.slide = i;
    $$('#heroSlides img').forEach(function (img, k) { img.classList.toggle('is-on', k === i); });
    $$('#heroDots button').forEach(function (b, k) { b.setAttribute('aria-current', String(k === i)); });
    if (len) {
      if (heroTimer) clearInterval(heroTimer);
      heroTimer = setInterval(function () {
        if (document.hidden) return;
        goSlide((state.slide + 1) % len, 0);
      }, 7000);
    }
  }

  /* ======================================================================
     핵심 특징
     ====================================================================== */
  function renderQuickfacts() {
    $('#quickfacts').innerHTML = (data().quickfacts || []).map(function (q) {
      return '<div class="qf"><i>' + (ICON[q.icon] || ICON.home) + '</i>' +
        '<div><strong>' + esc(q.title) + '</strong><p>' + esc(q.desc) + '</p></div></div>';
    }).join('');
  }

  /* ======================================================================
     객실 필터 + 카드
     ====================================================================== */
  function renderFilters() {
    var f = data().filters;
    $('#catChips').innerHTML = f.categories.map(function (c) {
      return '<button class="chip" type="button" data-cat="' + esc(c.id) + '" aria-pressed="' + (state.cat === c.id) + '">' +
        esc(c.label) + (c.desc ? ' <em>' + esc(c.desc) + '</em>' : '') + '</button>';
    }).join('');
    $('#featChips').innerHTML = f.features.map(function (x) {
      return '<button class="chip feature" type="button" data-feat="' + esc(x.id) + '" aria-pressed="false">' + esc(x.label) + '</button>';
    }).join('');
  }

  function roomMatches(r) {
    if (state.cat === 'family' && !(r.base >= 4)) return false;
    if (state.cat !== 'all' && state.cat !== 'family' && r.group !== state.cat) return false;
    for (var i = 0; i < state.feats.length; i++) {
      var f = state.feats[i];
      if (f === 'pet' && !r.pet) return false;
      if (f === 'pool' && !r.pool) return false;
      if (f === 'tub' && !r.tub) return false;
      if (f === 'kitchen' && !r.kitchen) return false;
    }
    return true;
  }

  function peekPhotos(r) {
    var picks = [];
    var want = [['tub', '욕조'], ['pool', '개별 풀'], ['room', '침실'], ['view', '바다'], ['bbq', '바베큐'], ['bath', '욕실']];
    want.forEach(function (w) {
      if (picks.length >= 3) return;
      var arr = r.photos[w[0]];
      if (arr && arr.length) picks.push({ n: arr[0], label: w[1] });
    });
    return picks;
  }

  function roomCard(r) {
    var badges = [];
    if (r.tub) badges.push('<span class="badge tub">오션뷰 욕조</span>');
    if (r.pool) badges.push('<span class="badge pool">개별 풀</span>');
    if (r.base >= 4) badges.push('<span class="badge family">패밀리</span>');
    if (r.status && r.status !== '예약가능') badges.push('<span class="badge">' + esc(r.status) + '</span>');

    var tags = [];
    if (r.pet) tags.push('<span class="tagchip pet">반려견 동반</span>');
    if (r.kitchen) tags.push('<span class="tagchip">주방·바베큐</span>');
    if (r.kids) tags.push('<span class="tagchip">아이용 식기</span>');
    if (r.pool) tags.push('<span class="tagchip">미온수 풀</span>');

    var peek = peekPhotos(r).map(function (p) {
      return '<figure><img src="' + photoUrl(r.code, p.n, true) + '" alt="" loading="lazy"><figcaption>' + esc(p.label) + '</figcaption></figure>';
    }).join('');

    var cover = photoUrl(r.code, r.photos.cover || r.photos.all[0], false);
    var thumb = photoUrl(r.code, r.photos.cover || r.photos.all[0], true);

    return '<button class="card" type="button" data-room="' + esc(r.code) + '" aria-label="' + esc(r.name + ' ' + r.subtitle + ' 자세히 보기') + '">' +
      '<div class="card-media">' +
        '<img src="' + thumb + '" data-full="' + cover + '" alt="' + esc(r.name + ' 객실 사진') + '" loading="lazy">' +
        '<div class="badges">' + badges.join('') + '</div>' +
        '<span class="badge photo">사진 ' + r.photos.count + '장</span>' +
        '<div class="card-peek">' + peek + '</div>' +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-title"><strong>' + esc(r.name) + '</strong><span>' + esc(r.subtitle) + '</span></div>' +
        '<div class="card-spec">' +
          '<span><b>' + r.pyeong + '평</b> (' + r.sqm + '㎡)</span>' +
          '<span>기준 <b>' + r.base + '인</b> · 최대 ' + r.max + '인</span>' +
          '<span>' + esc(r.beds) + '</span>' +
        '</div>' +
        '<div class="card-tags">' + tags.join('') + '</div>' +
        '<div class="card-price">' +
          '<span class="price-main"><small>비수기 주중(일~목)</small>' +
            '<strong>' + krw(r.price.weekday) + '<span>원~</span></strong>' +
            '<del>정가 ' + krw(r.price.listWeekday) + '원</del>' +
          '</span>' +
          '<span class="card-cta">사진·요금 보기 ›</span>' +
        '</div>' +
      '</div>' +
    '</button>';
  }

  function renderRooms() {
    var list = data().rooms.filter(roomMatches);
    if (state.sort === 'price') list.sort(function (a, b) { return a.price.weekday - b.price.weekday; });
    else if (state.sort === 'size') list.sort(function (a, b) { return b.pyeong - a.pyeong; });
    else if (state.sort === 'people') list.sort(function (a, b) { return b.max - a.max; });
    else {
      var order = { P: 0, G: 1, C: 2 };
      list.sort(function (a, b) { return (order[a.group] - order[b.group]) || a.name.localeCompare(b.name); });
    }
    $('#resultCount').innerHTML = '<strong>' + list.length + '개</strong> 객실이 조건에 맞습니다' +
      (state.cat === 'all' && !state.feats.length ? ' · 기본은 P동→G동→C동 순서입니다' : '');
    $('#roomGrid').innerHTML = list.length ? list.map(roomCard).join('')
      : '<div class="empty-state"><strong>조건에 맞는 객실이 없습니다.</strong><br>조건을 하나 줄이거나 ‘초기화’를 눌러 보세요.</div>';

    // 원본 사진으로 교체(썸네일 먼저 → 큰 이미지)
    $$('#roomGrid .card-media img[data-full]').forEach(function (img) {
      var full = new Image();
      full.onload = function () { img.src = full.src; };
      full.src = img.getAttribute('data-full');
    });
  }

  /* ======================================================================
     객실 상세 모달
     ====================================================================== */
  function openRoom(code) {
    var r = data().rooms.filter(function (x) { return x.code === code; })[0];
    if (!r) return;
    state.room = r; state.tab = r.tub ? 'tub' : 'all'; state.expanded = false;

    $('#modalTitle').textContent = r.name;
    $('#modalSub').textContent = r.subtitle;
    var badges = [];
    if (r.tub) badges.push('<span class="badge tub">오션뷰 욕조</span>');
    if (r.pool) badges.push('<span class="badge pool">개별 풀</span>');
    if (r.pet) badges.push('<span class="badge">반려견 동반</span>');
    $('#modalBadges').innerHTML = badges.join('');

    renderQuickPeek(r);
    renderTabs(r);
    renderPhotos(r);
    renderSummary(r);
    $('#modalBook').href = data().links.naverBooking;
    $('#modalCall').href = data().contact.phoneHref;
    $('#modalCall').textContent = data().contact.phone;

    $('#modalBack').classList.add('is-open');
    $('#roomModal').classList.add('is-open');
    lockScroll();
    setTimeout(function () { $('#modalClose').focus(); }, 60);
  }

  function closeRoom() {
    $('#modalBack').classList.remove('is-open');
    $('#roomModal').classList.remove('is-open');
    unlockScroll();
  }

  function renderQuickPeek(r) {
    var picks = [];
    if (r.photos.tub && r.photos.tub.length) picks.push({ tag: 'tub', label: '오션뷰 욕조', n: r.photos.tub[0], hot: true });
    if (r.photos.pool && r.photos.pool.length) picks.push({ tag: 'pool', label: '개별 풀', n: r.photos.pool[0] });
    if (r.photos.room && r.photos.room.length) picks.push({ tag: 'room', label: '침실', n: r.photos.room[0] });
    if (r.photos.view && r.photos.view.length) picks.push({ tag: 'view', label: '바다', n: r.photos.view[0] });
    if (!picks.length) { $('#quickPeek').innerHTML = ''; return; }
    $('#quickPeek').innerHTML = '<span class="qp-label">바로 보기</span>' + picks.map(function (p) {
      return '<button class="qp-btn' + (p.hot ? ' tub' : '') + '" type="button" data-tab="' + p.tag + '">' +
        '<img src="' + photoUrl(r.code, p.n, true) + '" alt="">' + esc(p.label) + '</button>';
    }).join('');
  }

  function renderTabs(r) {
    var tabs = [{ id: 'all', label: '전체', n: r.photos.all.length }];
    TAG_ORDER.forEach(function (t) {
      if (r.photos[t] && r.photos[t].length) tabs.push({ id: t, label: TAG_LABEL[t], n: r.photos[t].length });
    });
    $('#photoTabs').innerHTML = tabs.map(function (t) {
      return '<button class="tab' + (t.id === 'tub' ? ' tub' : '') + '" type="button" role="tab" data-tab="' + t.id + '" aria-selected="' + (state.tab === t.id) + '">' +
        esc(t.label) + ' <em>' + t.n + '</em></button>';
    }).join('');
  }

  function renderPhotos(r) {
    var nums = photosOf(r, state.tab);
    var limit = state.expanded ? nums.length : Math.min(12, nums.length);
    var grid = $('#photoGrid');
    grid.className = 'photo-grid' + (nums.length === 1 ? ' one' : (nums.length === 2 ? ' two' : ''));
    grid.innerHTML = nums.slice(0, limit).map(function (n, i) {
      var wide = (i === 0 && nums.length > 2);
      return '<button type="button" class="' + (wide ? 'wide' : '') + '" data-photo="' + n + '" aria-label="사진 ' + (i + 1) + ' 크게 보기">' +
        '<img src="' + photoUrl(r.code, n, true) + '" data-full="' + photoUrl(r.code, n, false) + '" alt="' + esc(r.name + ' 사진 ' + (i + 1)) + '" loading="lazy">' +
        '</button>';
    }).join('');
    var noteEl = $('#photoNote');
    if (state.tab === 'tub' && nums.length) {
      noteEl.textContent = '이 동의 욕조 사진 ' + nums.length + '장입니다. 사진을 누르면 크게 볼 수 있어요.';
    } else if (state.tab === 'all') {
      noteEl.textContent = '사진 ' + nums.length + '장 · 분류 탭에서 욕조·침실·바다 사진만 골라 볼 수 있습니다.';
    } else {
      noteEl.textContent = '';
    }
    var more = nums.length > 12;
    $('#moreWrap').classList.toggle('hidden', !more || state.expanded);
    $('#moreBtn').textContent = '사진 더 보기 (' + (nums.length - 12) + '장)';

    $$('#photoGrid img[data-full]').forEach(function (img) {
      var full = new Image();
      full.onload = function () { if (img.isConnected) img.src = full.src; };
      full.src = img.getAttribute('data-full');
    });
  }

  function renderSummary(r) {
    var p = r.price;
    var fees = data().booking.fees || [];
    var extraRelevant = fees.filter(function (f) {
      if (/개별 풀/.test(f.label)) return !!r.pool;
      if (/반려견/.test(f.label)) return !!r.pet;
      return /인원|바베큐/.test(f.label);
    });

    var html = '';
    html += '<h4>객실 정보</h4><table class="spec-table"><tbody>' +
      '<tr><th>구조</th><td>' + esc(r.beds) + '</td></tr>' +
      '<tr><th>넓이</th><td>' + r.pyeong + '평 (약 ' + r.sqm + '㎡)</td></tr>' +
      '<tr><th>인원</th><td>기준 ' + r.base + '인 · 최대 ' + r.max + '인 · 초과 1인 ' + krw(r.extra) + '원</td></tr>' +
      '<tr><th>전용</th><td>바베큐장 · 주방 · 화장실 · 샤워실' + (r.tub ? ' · 오션뷰 욕실' : '') + (r.pool ? ' · 개별 풀' : '') + '</td></tr>' +
      '</tbody></table>';

    html += '<h4>1박 요금 <span style="font-weight:600;color:#a9a29a">(정가 · 예약가)</span></h4>' +
      '<div class="price-cards">' +
        '<div class="pcard"><span class="pl">주중 (일~목)</span><b>' + krw(p.weekday) + '원</b><del>정가 ' + krw(p.listWeekday) + '원</del></div>' +
        '<div class="pcard"><span class="pl">금요일</span><b>' + krw(p.friday) + '원</b><del>정가 ' + krw(p.listFriday) + '원</del></div>' +
        '<div class="pcard hl"><span class="pl">토·공휴일</span><b>' + krw(p.saturday) + '원</b><del>정가 ' + krw(p.listSaturday) + '원</del></div>' +
      '</div>' +
      '<p class="price-note">2026년 11월 22일~28일 실시간 예약 기준 할인가입니다. 성수기·연휴·연박 요금은 실시간 예약 달력에서 확인해 주세요.</p>';

    html += '<h4>추가 요금</h4><div class="fee-list">' + extraRelevant.map(function (f) {
      return '<div><span>' + esc(f.label) + '</span><strong>' + esc(f.value) + '</strong></div>';
    }).join('') + '</div>';

    html += '<h4>구비시설</h4><div class="fac-chips">' + String(r.facilities || '').split(',').map(function (s) {
      var t = s.trim(); return t ? '<span>' + esc(t) + '</span>' : '';
    }).join('') + '</div>';

    if (r.note) html += '<h4>특이사항</h4><p class="mnote">' + esc(r.note) + '</p>';

    $('#roomSummary').innerHTML = html;
  }

  /* ======================================================================
     라이트박스
     ====================================================================== */
  var lb = { list: [], i: 0 };

  function openLightbox(list, i) {
    lb.list = list; lb.i = i;
    paintLightbox();
    $('#lightbox').classList.add('is-open');
    lockScroll();
  }

  function paintLightbox() {
    var r = state.room; if (!r) return;
    var n = lb.list[lb.i];
    $('#lbImg').src = photoUrl(r.code, n, false);
    $('#lbImg').alt = r.name + ' 사진';
    $('#lbCap').textContent = r.name + ' · ' + (TAG_LABEL[state.tab] || '전체') + ' (' + (lb.i + 1) + '/' + lb.list.length + ')';
  }

  function stepLightbox(d) {
    if (!lb.list.length) return;
    lb.i = (lb.i + d + lb.list.length) % lb.list.length;
    paintLightbox();
  }

  function closeLightbox() {
    $('#lightbox').classList.remove('is-open');
    unlockScroll();
  }

  /* ======================================================================
     후기 (클립 먼저)
     ====================================================================== */
  var reviewFilter = 'clip';
  var REV_META = {
    clip: { label: '클립 영상', badge: '클립', cls: 'clip' },
    blog: { label: '블로그 후기', badge: '블로그', cls: 'blog' },
    insta: { label: '인스타그램', badge: '인스타', cls: 'insta' }
  };

  function renderReviews() {
    var all = (data().reviews || []).filter(function (r) { return r.show !== false; });
    var noteEl = $('#reviewNote');
    if (noteEl) noteEl.textContent = data().reviewNote || '';
    if (!all.length) {
      $('#reviewGrid').innerHTML = '<div class="empty-state">아직 보여드리는 후기가 없습니다.</div>';
      $('#reviewTabs').innerHTML = '';
      return;
    }
    var count = { clip: 0, blog: 0, insta: 0 };
    all.forEach(function (r) { count[r.type] = (count[r.type] || 0) + 1; });
    var tabs = [{ id: 'clip', label: '클립 영상', n: count.clip }];
    Object.keys(REV_META).forEach(function (k) {
      if (k === 'clip') return;
      if (count[k]) tabs.push({ id: k, label: REV_META[k].label, n: count[k] });
    });
    if (all.length !== count.clip) tabs.push({ id: 'all', label: '전체 보기', n: all.length });

    if (!count[reviewFilter] && reviewFilter !== 'all') reviewFilter = all[0].type;
    $('#reviewTabs').innerHTML = tabs.map(function (t) {
      return '<button type="button" role="tab" data-rev="' + t.id + '" aria-selected="' + (reviewFilter === t.id) + '">' +
        esc(t.label) + ' <em>' + t.n + '</em></button>';
    }).join('');

    var list = reviewFilter === 'all' ? all : all.filter(function (r) { return r.type === reviewFilter; });
    // 클립은 항상 먼저
    list.sort(function (a, b) { return (a.type === 'clip' ? -1 : 1) - (b.type === 'clip' ? -1 : 1); });
    $('#reviewGrid').innerHTML = list.map(function (r) {
      var meta = REV_META[r.type] || { badge: '후기', cls: '' };
      return '<a class="review-card ' + meta.cls + '" href="' + esc(r.url) + '" target="_blank" rel="noopener">' +
        '<div class="rv-media"><img src="' + esc(r.thumb) + '" alt="" loading="lazy">' +
          (r.type === 'clip' ? '<span class="rv-play" aria-hidden="true">▶</span>' : '') +
          '<span class="rv-badge">' + esc(meta.badge) + '</span>' +
        '</div>' +
        '<div class="rv-body"><strong>' + esc(r.title) + '</strong>' +
        '<p>' + esc(r.summary) + '</p>' +
        '<span class="rv-meta">' + esc(r.author || '') + (r.date ? ' · ' + esc(r.date) : '') + ' ›</span></div></a>';
    }).join('');

    var l = data().links;
    $('#reviewLinks').innerHTML =
      '<a class="btn btn-sea btn-sm" href="' + esc(l.naverPlace) + '" target="_blank" rel="noopener">네이버 리뷰 1,260건 보기</a>' +
      '<a class="btn btn-ghost btn-sm" href="' + esc(l.blog) + '" target="_blank" rel="noopener">블로그 후기</a>' +
      '<a class="btn btn-ghost btn-sm" href="' + esc(l.instagram) + '" target="_blank" rel="noopener">인스타그램</a>';
  }

  /* ======================================================================
     이벤트 / 부대시설 / 애견 / 예약 / 위치
     ====================================================================== */
  function renderEvents() {
    var list = (data().events || []).filter(function (e) { return e.show !== false; });
    var box = $('#eventGrid');
    if (!list.length) { box.innerHTML = '<div class="empty-state">진행 중인 이벤트가 없습니다.</div>'; return; }
    box.innerHTML = list.map(function (e) {
      return '<article class="event-card">' +
        '<div class="ev-media"><img src="' + esc(e.image) + '" alt="" loading="lazy"></div>' +
        '<div class="ev-body"><span class="ev-period">' + esc(e.period) + '</span>' +
        '<h3>' + esc(e.title) + '</h3><p>' + esc(e.desc) + '</p></div></article>';
    }).join('');
  }

  function renderFacilities() {
    $('#facGrid').innerHTML = (data().facilities || []).map(function (f, i) {
      return '<button class="fac" type="button" data-fac="' + i + '" aria-label="' + esc(f.title) + ' 사진 보기">' +
        '<img src="' + esc(f.images[0]) + '" alt="' + esc(f.title) + '" loading="lazy">' +
        '<div class="fac-body"><span class="fac-tag">' + esc(f.tag || '') + '</span>' +
        '<h3>' + esc(f.title) + '</h3><em>' + esc(f.sub || '') + '</em>' +
        '<span class="fac-more">사진·설명 보기 ›</span></div></button>';
    }).join('');
    var a = data().amenities || {};
    $('#amenityTitle').textContent = a.title || '';
    $('#amenityDesc').textContent = a.desc || '';
    $('#amenityItems').innerHTML = (a.items || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
  }

  function renderPet() {
    var p = data().petPolicy || {};
    $('#petTitle').textContent = p.title || '반려견 동반 안내';
    $('#petIntro').textContent = p.intro || '';
    $('#petFees').innerHTML = (p.fees || []).map(function (f) {
      return '<div class="fee-row"><span>' + esc(f.label) + '</span><strong>' + esc(f.value) + '</strong></div>';
    }).join('');
    $('#petRules').innerHTML = (p.rules || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('#petNotice').textContent = p.notice || '';
  }

  function renderBooking() {
    var b = data().booking || {};
    var links = data().links || {};
    $('#bookingIntro').textContent = b.intro || '';
    $('#bookingChannels').innerHTML = (b.channels || []).map(function (c) {
      var href = c.linkKey === 'phoneHref' ? data().contact.phoneHref : (links[c.linkKey] || '#');
      var ext = href.indexOf('tel:') !== 0;
      var icon = c.id === 'naver' ? ICON.naver : (c.id === 'realtime' ? ICON.cal : ICON.phone);
      return '<a class="chan" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
        '<i>' + icon + '</i><span><strong>' + esc(c.label) + '</strong><span>' + esc(c.desc) + '</span></span>' +
        '<span class="arrow">›</span></a>';
    }).join('');
    $('#feeList').innerHTML = (b.fees || []).map(function (f) {
      return '<div><span>' + esc(f.label) + '</span><strong>' + esc(f.value) + '</strong></div>';
    }).join('');
    $('#refundList').innerHTML = (b.refund || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    $('#checkin').textContent = data().contact.checkin;
    $('#checkout').textContent = data().contact.checkout;
    $('#bankInfo').textContent = data().contact.bank;
    $('#counselHours').textContent = data().contact.counselHours;
  }

  function renderLocation() {
    var c = data().contact, l = data().links;
    $('#addr').textContent = c.address;
    var lat = (c.coords || [])[0], lon = (c.coords || [])[1];
    var bbox = [lon - 0.012, lat - 0.008, lon + 0.012, lat + 0.008].join('%2C');
    $('#mapVisual').innerHTML = lat
      ? '<iframe title="위치 지도" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=' + bbox + '&layer=mapnik&marker=' + lat + '%2C' + lon + '"></iframe>'
      : '';
    $('#mapBtns').innerHTML =
      '<a class="btn btn-sea btn-sm" href="' + esc(l.naverPlace) + '" target="_blank" rel="noopener">' + ICON.naver + ' 네이버 지도</a>' +
      '<a class="btn btn-primary btn-sm" href="' + esc(l.navi) + '" target="_blank" rel="noopener">' + ICON.nav + ' 내비 길안내</a>' +
      '<a class="btn btn-ghost btn-sm" href="' + esc(c.phoneHref) + '">' + ICON.phone + ' 전화</a>';

    $('#nearbyList').innerHTML = (data().nearby || []).map(function (p) {
      return '<div class="nb"><img src="' + esc(p.image) + '" alt="" loading="lazy"><div>' +
        '<strong>' + esc(p.title) + '</strong><span>' + esc(p.time) + '</span><p>' + esc(p.desc) + '</p></div></div>';
    }).join('');

    $('#galleryStrip').innerHTML = (data().gallery || []).map(function (src, i) {
      return '<img src="' + esc(src) + '" alt="숙소 풍경 ' + (i + 1) + '" data-gal="' + i + '" loading="lazy">';
    }).join('');

    $('#footBiz').textContent = c.biz;
    $('#footAddr').textContent = c.address;
    $('#footBank').textContent = '입금 계좌 ' + c.bank;
    var fp = $('#footPhone'); fp.textContent = c.phone; fp.href = c.phoneHref;
    $('#headerPhone').href = c.phoneHref;
    $('#heroCall').href = c.phoneHref;
    $('#heroCall').textContent = '전화 상담 ' + c.phone;
    $('#mobCall').href = c.phoneHref;
    var mb = $('#mobBook'); if (mb) mb.href = l.naverBooking;
    var mn = $('#mobNavi'); if (mn) mn.href = l.navi;
    $('#footNavi').href = l.navi;
    $('#footBlog').href = l.blog;
    $('#footInsta').href = l.instagram;

    // 예약 시트
    $('#sheetList').innerHTML = (data().booking.channels || []).map(function (ch) {
      var href = ch.linkKey === 'phoneHref' ? c.phoneHref : (l[ch.linkKey] || '#');
      var ext = href.indexOf('tel:') !== 0;
      var icon = ch.id === 'naver' ? ICON.naver : (ch.id === 'realtime' ? ICON.cal : ICON.phone);
      return '<a class="sheet-item" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
        '<i>' + icon + '</i><span><strong>' + esc(ch.label) + '</strong><span>' + esc(ch.desc) + '</span></span></a>';
    }).join('');
  }

  /* ======================================================================
     이벤트 연결
     ====================================================================== */
  function bind() {
    // 헤더 스크롤
    var hdr = $('#siteHeader');
    var onScroll = function () { hdr.classList.toggle('is-stuck', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

    // 모바일 메뉴
    var nav = $('#nav'), toggle = $('#navToggle');
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    });

    // 공지 바 닫기
    $('#nbClose').addEventListener('click', function () {
      $('#noticebar').classList.add('hidden');
      document.body.classList.remove('has-noticebar');
      if (noticeTimer) clearInterval(noticeTimer);
    });

    // 필터
    $('#catChips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]'); if (!b) return;
      state.cat = b.dataset.cat;
      $$('#catChips .chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.cat === state.cat)); });
      renderRooms();
    });
    $('#featChips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-feat]'); if (!b) return;
      var f = b.dataset.feat, i = state.feats.indexOf(f);
      if (i >= 0) state.feats.splice(i, 1); else state.feats.push(f);
      b.setAttribute('aria-pressed', String(state.feats.indexOf(f) >= 0));
      renderRooms();
    });
    $('#sortSel').addEventListener('change', function (e) { state.sort = e.target.value; renderRooms(); });
    $('#resetFilter').addEventListener('click', function () {
      state.cat = 'all'; state.feats = []; state.sort = 'recommend'; $('#sortSel').value = 'recommend';
      $$('#catChips .chip').forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.cat === 'all')); });
      $$('#featChips .chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      renderRooms();
    });

    // 객실 카드 → 모달
    $('#roomGrid').addEventListener('click', function (e) {
      var card = e.target.closest('[data-room]'); if (!card) return;
      openRoom(card.dataset.room);
    });
    $('#modalClose').addEventListener('click', closeRoom);
    $('#modalBack').addEventListener('click', closeRoom);
    $('#photoTabs').addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]'); if (!t) return;
      state.tab = t.dataset.tab; state.expanded = false;
      $$('#photoTabs .tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)); });
      renderPhotos(state.room);
    });
    $('#quickPeek').addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]'); if (!t) return;
      state.tab = t.dataset.tab; state.expanded = false;
      $$('#photoTabs .tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)); });
      renderPhotos(state.room);
      $('#photoTabs').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    $('#moreBtn').addEventListener('click', function () { state.expanded = true; renderPhotos(state.room); });

    // 사진 → 라이트박스
    $('#photoGrid').addEventListener('click', function (e) {
      var b = e.target.closest('[data-photo]'); if (!b) return;
      var nums = photosOf(state.room, state.tab);
      var k = nums.indexOf(Number(b.dataset.photo));
      openLightbox(nums, k < 0 ? 0 : k);
    });
    $('#lbClose').addEventListener('click', closeLightbox);
    $('#lbPrev').addEventListener('click', function () { stepLightbox(-1); });
    $('#lbNext').addEventListener('click', function () { stepLightbox(1); });
    $('#lightbox').addEventListener('click', function (e) {
      if (e.target.id === 'lightbox') closeLightbox();
    });

    // 부대시설 → 라이트박스(시설 사진)
    $('#facGrid').addEventListener('click', function (e) {
      var b = e.target.closest('[data-fac]'); if (!b) return;
      var f = data().facilities[Number(b.dataset.fac)];
      openFacility(f);
    });

    // 후기 탭
    $('#reviewTabs').addEventListener('click', function (e) {
      var t = e.target.closest('[data-rev]'); if (!t) return;
      reviewFilter = t.dataset.rev;
      renderReviews();
    });

    // 갤러리 스트립
    $('#galleryStrip').addEventListener('click', function (e) {
      var img = e.target.closest('[data-gal]'); if (!img) return;
      var list = data().gallery;
      openGallery(list, Number(img.dataset.gal));
    });

    // 예약 시트
    $$('[data-open-book]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        $('#bookSheet').classList.add('is-open');
        $('#sheetBack').classList.add('is-open');
        lockScroll();
      });
    });
    var closeSheet = function () {
      $('#bookSheet').classList.remove('is-open');
      $('#sheetBack').classList.remove('is-open');
      unlockScroll();
    };
    $('#sheetClose').addEventListener('click', closeSheet);
    $('#sheetBack').addEventListener('click', closeSheet);

    // ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if ($('#lightbox').classList.contains('is-open')) closeLightbox();
        else if ($('#bookSheet').classList.contains('is-open')) closeSheet();
        else if ($('#roomModal').classList.contains('is-open')) closeRoom();
        else if (nav.classList.contains('is-open')) { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
      }
      if ($('#lightbox').classList.contains('is-open')) {
        if (e.key === 'ArrowLeft') stepLightbox(-1);
        if (e.key === 'ArrowRight') stepLightbox(1);
      }
    });
  }

  /* 시설 상세(간단 라이트박스) */
  var facLb = { list: [], i: 0, title: '' };
  function openFacility(f) {
    facLb = { list: f.images, i: 0, title: f.title };
    $('#lbImg').src = f.images[0];
    $('#lbImg').alt = f.title;
    $('#lbCap').textContent = f.title + ' — ' + (f.desc || '');
    $('#lightbox').classList.add('is-open');
    lockScroll();
    $('#lbPrev').dataset.mode = 'fac';
  }
  function openGallery(list, i) {
    facLb = { list: list, i: i, title: '숙소 풍경' };
    $('#lbImg').src = list[i];
    $('#lbImg').alt = '숙소 풍경';
    $('#lbCap').textContent = '숙소 풍경 (' + (i + 1) + '/' + list.length + ')';
    $('#lightbox').classList.add('is-open');
    lockScroll();
    $('#lbPrev').dataset.mode = 'fac';
  }
  // 시설/갤러리 모드에서도 이전·다음이 동작하도록 후킹
  document.addEventListener('click', function (e) {
    var t = e.target.closest('#lbPrev, #lbNext');
    if (!t) return;
    if ($('#lbPrev').dataset.mode !== 'fac') return;
    var d = t.id === 'lbNext' ? 1 : -1;
    facLb.i = (facLb.i + d + facLb.list.length) % facLb.list.length;
    $('#lbImg').src = facLb.list[facLb.i];
    $('#lbCap').textContent = facLb.title + ' (' + (facLb.i + 1) + '/' + facLb.list.length + ')';
  }, true);

  /* ======================================================================
     전체 렌더
     ====================================================================== */
  function renderAll() {
    renderNotices();
    renderHero();
    renderQuickfacts();
    renderFilters();
    renderRooms();
    renderEvents();
    renderFacilities();
    renderPet();
    renderBooking();
    renderReviews();
    renderLocation();
  }

  window.PickleSite = {
    renderAll: renderAll,
    data: data,
    state: state,
    openRoom: openRoom,
    lockScroll: lockScroll,
    unlockScroll: unlockScroll,
    krw: krw,
    esc: esc,
    photoUrl: photoUrl,
    TAG_LABEL: TAG_LABEL
  };

  document.addEventListener('DOMContentLoaded', function () {
    var saved = savedData();
    if (saved && saved.__savedAt) {
      // 저장본이 있으면 병합 (배열은 통째로 교체)
      Object.keys(saved).forEach(function (k) {
        if (k === '__savedAt') return;
        window.SITE_DATA[k] = saved[k];
      });
    }
    renderAll();
    bind();
  });
})();
