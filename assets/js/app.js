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

  var state = { cat: 'all', room: null, slide: 0, notice: 0, lb: { list: [], i: 0 } };

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

  /* ---------- 히어로 ---------- */
  var heroTimer = null;

  function renderHero() {
    var h = data().hero || {};
    $('#heroTitle').innerHTML = esc(h.title || '').replace(/\n/g, '<br>');
    $('#heroSub').textContent = h.sub || '';
    $('#heroEyebrow').textContent = h.eyebrow || '';
    var slides = h.slides || [];
    $('#heroSlides').innerHTML = slides.map(function (src, i) {
      return '<img src="' + esc(src) + '" alt="" class="' + (i === 0 ? 'is-on' : '') + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '">';
    }).join('');
    $('#heroTotal').textContent = pad2(slides.length);
    $('#heroDots').innerHTML = slides.map(function (_, i) {
      return '<button type="button" aria-label="' + (i + 1) + '번째 사진" aria-current="' + (i === 0) + '" data-i="' + i + '"></button>';
    }).join('');
    $('#heroDots').onclick = function (e) {
      var b = e.target.closest('button');
      if (b) goSlide(Number(b.dataset.i));
    };
    var hl = document.querySelector('.hero-link');
    if (hl) { hl.href = (data().links && data().links.realtimeBooking) || '#booking'; hl.target = '_blank'; hl.rel = 'noopener'; }
    if (heroTimer) clearInterval(heroTimer);
    if (slides.length > 1) {
      heroTimer = setInterval(function () {
        if (!document.hidden) goSlide((state.slide + 1) % slides.length);
      }, 6500);
    }
  }

  function goSlide(i) {
    var imgs = $$('#heroSlides img');
    state.slide = i;
    imgs.forEach(function (img, k) { img.classList.toggle('is-on', k === i); });
    $$('#heroDots button').forEach(function (b, k) { b.setAttribute('aria-current', String(k === i)); });
    var idx = $('#heroIdx'); if (idx) idx.textContent = pad2(i + 1);
  }

  /* ---------- 공지 ---------- */
  var noticeTimer = null;

  function noticeList() {
    return (data().notices || []).filter(function (n) { return n.show !== false; });
  }

  function renderNotices() {
    var list = noticeList();
    var bar = $('#noticebar');
    if (!list.length) { bar.classList.add('hidden'); return; }
    $('#nbView').innerHTML = list.map(function (n, i) {
      return '<div class="nb-item' + (i === 0 ? ' is-on' : '') + '" data-i="' + i + '">' +
        '<strong>' + esc(n.badge || '') + '</strong><span>' + esc(n.text || '') + '</span>' +
        (n.link ? '<a class="nb-link" href="' + esc(n.link) + '">' + esc(n.linkText || '보기') + '</a>' : '') +
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
        if (!document.hidden) showNotice((state.notice + 1) % noticeList().length);
      }, 5600);
    }
  }

  function showNotice(i) {
    $$('#nbView .nb-item').forEach(function (el, k) { el.classList.toggle('is-on', k === i); });
    $$('#nbDots button').forEach(function (el, k) { el.setAttribute('aria-current', String(k === i)); });
    state.notice = i;
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
    var cover = photoUrl(r.code, r.photos.cover || 1, false);
    var meta = [];
    meta.push('기준 ' + r.base + '인 · 최대 ' + r.max + '인');
    meta.push(r.pyeong + '평');
    if (r.tub) meta.push('오션뷰 욕조');
    if (r.pool) meta.push('개별 풀');
    return '<button class="card" type="button" data-room="' + esc(r.code) + '" aria-label="' + esc(r.name + ' ' + r.subtitle) + ' 자세히 보기">' +
      '<div class="card-media"><img src="' + cover + '" alt="' + esc(r.name + ' 객실') + '" loading="lazy"></div>' +
      '<div class="card-body">' +
        '<div class="card-row">' +
          '<span class="card-name"><em>' + esc(r.name) + '</em>' + esc(r.subtitle.replace(/\s*·.*/, '')) + '</span>' +
          '<span class="card-price"><small>주중</small>' + krw(r.price.weekday) + '원~</span>' +
        '</div>' +
        '<p class="card-meta">' + meta.map(esc).join('<i>·</i>') + '</p>' +
        '<span class="card-line">사진 · 요금 보기 <span aria-hidden="true">→</span></span>' +
      '</div></button>';
  }

  function renderRooms() {
    var list = data().rooms.filter(matches);
    var order = { P: 0, G: 1, C: 2 };
    list.sort(function (a, b) { return (order[a.group] - order[b.group]) || a.name.localeCompare(b.name); });
    $('#resultCount').textContent = list.length + '개의 객실';
    $('#roomGrid').innerHTML = list.length ? list.map(roomCard).join('') :
      '<div class="empty-state">조건에 맞는 객실이 없습니다.</div>';
  }

  /* ---------- 객실 상세 ---------- */
  function openRoom(code) {
    var r = data().rooms.filter(function (x) { return x.code === code; })[0];
    if (!r) return;
    state.room = r;
    $('#modalTitle').textContent = r.name;
    $('#modalSub').textContent = r.subtitle;
    $('#photoGrid').innerHTML = (r.photos.all || []).map(function (n, i) {
      return '<button type="button" data-photo="' + n + '" aria-label="사진 ' + (i + 1) + ' 크게 보기">' +
        '<img src="' + photoUrl(r.code, n, false) + '" alt="' + esc(r.name + ' 사진 ' + (i + 1)) + '" loading="lazy"></button>';
    }).join('');
    renderSummary(r);
    $('#modalBook').href = data().links.naverBooking;
    $('#modalCall').href = data().contact.phoneHref;
    $('#modalCall').textContent = '전화 ' + data().contact.phone;
    $('#roomModal').classList.add('is-open');
    $('#modalBack').classList.add('is-open');
    lockScroll();
    $('#roomModal').querySelector('.rv-body').scrollTop = 0;
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
    var html = '<h4>객실 정보</h4><table class="spec-table"><tbody>' +
      '<tr><th>구조</th><td>' + esc(r.beds) + '</td></tr>' +
      '<tr><th>넓이</th><td>' + r.pyeong + '평 · 약 ' + r.sqm + '㎡</td></tr>' +
      '<tr><th>인원</th><td>기준 ' + r.base + '인 · 최대 ' + r.max + '인 (초과 1인 ' + krw(r.extra) + '원)</td></tr>' +
      '<tr><th>전용</th><td>바베큐장 · 주방 · 욕실' + (r.tub ? ' · 오션뷰 욕조' : '') + (r.pool ? ' · 개별 풀' : '') + '</td></tr>' +
      '</tbody></table>';

    html += '<h4>1박 요금</h4><div class="price-rows">' +
      '<div><span>주중 (일~목)</span><b>' + krw(p.weekday) + '원</b></div>' +
      '<div><span>금요일</span><b>' + krw(p.friday) + '원</b></div>' +
      '<div><span>토·공휴일</span><b>' + krw(p.saturday) + '원</b></div>' +
      '</div><p class="price-note">2026년 11월 실시간 예약 기준 할인가입니다. 성수기·연휴 요금은 예약 달력에서 확인해 주세요.</p>';

    if (fees.length) {
      html += '<h4>추가 요금</h4><div class="price-rows">' + fees.map(function (f) {
        return '<div><span>' + esc(f.label) + '</span><b style="font-family:var(--sans);font-size:12px">' + esc(f.value) + '</b></div>';
      }).join('') + '</div>';
    }

    html += '<h4>구비시설</h4><div class="fac-chips">' + String(r.facilities || '').split(',').map(function (s) {
      var t = s.trim(); return t ? '<span>' + esc(t) + '</span>' : '';
    }).join('') + '</div>';

    if (r.note) html += '<h4>이 동의 특징</h4><p class="mnote">' + esc(r.note) + '</p>';
    html += '<h4>반려견</h4><p class="mnote">' + (r.pet ? '반려견 동반 가능 (최대 2견, 2견 이상은 사전 문의)' : '이 동은 반려견 동반 표기가 없습니다. 예약 전 문의해 주세요.') + '</p>';
    $('#roomSummary').innerHTML = html;
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
    $('#clipGrid').innerHTML = clips.map(function (c) {
      return '<a class="clip-card" href="' + esc(c.url) + '" target="_blank" rel="noopener">' +
        '<img src="' + esc(c.thumb) + '" alt="" loading="lazy">' +
        '<span class="cp-play" aria-hidden="true">▶</span>' +
        '<span class="cp-cap"><strong>' + esc(c.title) + '</strong>' +
        '<span>' + esc(c.author || '') + (c.date ? ' · ' + esc(c.date) : '') + '</span></span></a>';
    }).join('') + '<div class="clip-note"><p>네이버 클립에서 실제 방문객이 올린 짧은 영상입니다. 누르면 그 영상이 바로 열립니다.</p></div>';

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
      if (noticeTimer) clearInterval(noticeTimer);
    });

    $('#catChips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      state.cat = b.dataset.cat;
      $$('#catChips button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.cat === state.cat)); });
      renderRooms();
    });

    $('#roomGrid').addEventListener('click', function (e) {
      var card = e.target.closest('[data-room]');
      if (card) openRoom(card.dataset.room);
    });
    $('#modalClose').addEventListener('click', closeRoom);
    $('#modalBack').addEventListener('click', closeRoom);

    $('#photoGrid').addEventListener('click', function (e) {
      var b = e.target.closest('[data-photo]');
      if (!b || !state.room) return;
      var list = state.room.photos.all;
      var urls = list.map(function (n) { return photoUrl(state.room.code, n, true); });
      openLightbox(urls, list.indexOf(Number(b.dataset.photo)), state.room.name);
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
