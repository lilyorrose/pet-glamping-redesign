/* ==========================================================================
   사장님 통제실 — 체험단 승인 · 후기/검색 확인 · 채널 점검 · 손님 페이지 관리
   static HTML 데모: 저장은 이 브라우저(localStorage), 실제 발송/지수 조회는 서버 필요
   ========================================================================== */
(function () {
  'use strict';

  var STORE_KEY = 'pg_site_data_v2';
  var UNLOCK_KEY = 'pg_admin_unlocked';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  var D = function () { return window.SITE_DATA; };
  var krw = function (n) { return Number(n || 0).toLocaleString('ko-KR'); };

  var tab = 'creators';
  var pinBuf = '';

  /* ---------------- 날짜 계산 ---------------- */
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function parseDate(s) {
    if (!s) return null;
    var p = String(s).split('-');
    if (p.length < 3) return null;
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function dday(s) {
    var t = parseDate(s);
    if (!t) return null;
    return Math.round((t - today()) / 86400000);
  }
  function ddayText(s) {
    var n = dday(s);
    if (n === null) return '';
    if (n === 0) return '오늘';
    if (n > 0) return 'D-' + n;
    return 'D+' + Math.abs(n);
  }
  function fmtDate(s) {
    var t = parseDate(s);
    if (!t) return s || '';
    var w = ['일', '월', '화', '수', '목', '금', '토'][t.getDay()];
    return (t.getMonth() + 1) + '월 ' + t.getDate() + '일 (' + w + ')';
  }
  function nowText() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ---------------- 저장 ---------------- */
  function save(silent) {
    try {
      var copy = {};
      Object.keys(D()).forEach(function (k) { if (k !== '__savedAt') copy[k] = D()[k]; });
      copy.__savedAt = new Date().toISOString();
      localStorage.setItem(STORE_KEY, JSON.stringify(copy));
      if (!silent) toast('저장했습니다. 손님 페이지에 바로 보입니다.');
    } catch (e) {
      toast('저장 공간이 부족합니다. 파일로 내려받아 주세요.');
    }
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }

  /* ---------------- 상태 계산 ---------------- */
  function creatorState(c) {
    if (c.status === '신청') return { cls: 'warn', text: '확인 필요 · 아직 승인 안 함' };
    if (c.status === '승인') return { cls: 'info', text: '승인됨 · 손님께 안내만 남음' };
    if (c.status === '방문완료') {
      if (c.reviewStatus === '등록') return { cls: 'ok', text: '방문 완료 · 후기 등록됨' };
      var d = dday(c.reviewDue);
      if (d !== null && d < 0) return { cls: 'bad', text: '후기 기한 지남 · 아직 미등록' };
      return { cls: 'warn', text: '방문 완료 · 후기 기다리는 중' };
    }
    return { cls: 'gray', text: c.status || '' };
  }

  function stats() {
    var cs = D().creators || [];
    var waiting = cs.filter(function (c) { return c.status === '신청'; }).length;
    var reviewLate = cs.filter(function (c) {
      return c.status === '방문완료' && c.reviewStatus !== '등록' && (dday(c.reviewDue) || 0) < 0;
    }).length;
    var reviewWait = cs.filter(function (c) { return c.status === '방문완료' && c.reviewStatus !== '등록'; }).length;
    var unchecked = (D().searchKeywords || []).filter(function (k) { return !k.checkedAt; }).length;
    return { waiting: waiting, reviewLate: reviewLate, reviewWait: reviewWait, unchecked: unchecked };
  }

  /* ---------------- 잠금 ---------------- */
  function unlocked() {
    try { return sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) { return false; }
  }
  function showApp() {
    $('#lockScreen').classList.add('hidden');
    $('#app').classList.remove('hidden');
    $('#saveBar').classList.remove('hidden');
    render();
  }
  function lock() {
    try { sessionStorage.removeItem(UNLOCK_KEY); } catch (e) {}
    pinBuf = '';
    paintPin();
    $('#app').classList.add('hidden');
    $('#saveBar').classList.add('hidden');
    $('#lockScreen').classList.remove('hidden');
    $('#pinMsg').textContent = '';
  }
  function paintPin() {
    $$('#pinDots i').forEach(function (el, i) { el.classList.toggle('on', i < pinBuf.length); });
  }
  function pressPin(k) {
    if (k === 'clear') pinBuf = '';
    else if (k === 'back') pinBuf = pinBuf.slice(0, -1);
    else if (pinBuf.length < 4) pinBuf += k;
    paintPin();
    if (pinBuf.length === 4) {
      setTimeout(function () {
        var want = String((D().admin || {}).pin || '2580');
        if (pinBuf === want) {
          try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (e) {}
          pinBuf = '';
          paintPin();
          showApp();
        } else {
          $('#pinMsg').textContent = '비밀번호가 맞지 않습니다. 다시 눌러 주세요.';
          $('#lockCard').classList.add('shake');
          setTimeout(function () { $('#lockCard').classList.remove('shake'); }, 400);
          pinBuf = '';
          paintPin();
        }
      }, 120);
    }
  }

  /* ---------------- 알림 문자 만들기 ---------------- */
  function messageFor(c) {
    var room = (D().rooms || []).filter(function (r) { return r.code === c.room; })[0];
    var roomName = room ? (c.room + ' · ' + room.subtitle) : c.room;
    return '[풀글램핑&펫글램핑] ' + c.name + '님, 체험단 예약이 확정되었습니다.\n'
      + '· 일정: ' + fmtDate(c.date) + ' ' + c.time + '\n'
      + '· 객실: ' + roomName + '\n'
      + '· 인원: ' + c.people + '명 / 반려견 ' + (c.dogs || 0) + '마리\n'
      + '· 주소: ' + D().contact.address + '\n'
      + '· 입실: ' + D().contact.checkin + ' / 퇴실: ' + D().contact.checkout + '\n'
      + '방문 전에 반려견 몸무게를 알려 주세요. 감사합니다.';
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (res) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      res();
    });
  }

  /* ---------------- 화면 그리기 ---------------- */
  function render() {
    $('#todayLabel').textContent = nowText() + ' 기준';
    var s = stats();
    $('#sumGrid').innerHTML =
      '<div class="sum warn"><b>' + s.waiting + '</b><span>승인 기다리는 체험단</span></div>' +
      '<div class="sum bad"><b>' + s.reviewLate + '</b><span>후기 기한 지난 체험단</span></div>' +
      '<div class="sum info"><b>' + s.reviewWait + '</b><span>후기 기다리는 체험단</span></div>' +
      '<div class="sum warn"><b>' + s.unchecked + '</b><span>아직 확인 안 한 검색어</span></div>';

    if (tab === 'creators') $('#panel').innerHTML = panelCreators();
    else if (tab === 'reviews') $('#panel').innerHTML = panelReviews();
    else if (tab === 'channels') $('#panel').innerHTML = panelChannels();
    else if (tab === 'site') $('#panel').innerHTML = panelSite();
    else if (tab === 'reviewsPick') $('#panel').innerHTML = panelReviewsPick();
    else $('#panel').innerHTML = panelSave();
    $$('#tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
  }

  /* ---- 체험단 ---- */
  function panelCreators() {
    var cs = (D().creators || []).slice();
    // 아직 승인 안 한 체험단을 먼저, 그다음 날짜 순
    cs.sort(function (a, b) {
      var rank = function (c) { return c.status === '신청' ? 0 : (c.status === '승인' ? 1 : 2); };
      return (rank(a) - rank(b)) || String(a.date).localeCompare(String(b.date));
    });
    if (!cs.length) return '<div class="card">아직 신청한 체험단이 없습니다.</div>';

    var h = '<div class="section-head"><h2>체험단 일정</h2><span class="hint">승인은 버튼 한 번</span></div>';
    cs.forEach(function (c, idx) {
      var st = creatorState(c);
      var room = (D().rooms || []).filter(function (r) { return r.code === c.room; })[0];
      var approved = c.status === '승인' || c.status === '방문완료';
      h += '<div class="card creator">' +
        '<div class="top">' +
          '<div><div class="when">' + esc(fmtDate(c.date)) + ' <small>' + esc(c.time) + ' 입실</small></div>' +
          '<div class="who">' + esc(c.name) + ' <span class="pill gray">' + esc(c.channel) + '</span></div>' +
          '<div class="meta">' + esc(c.room) + (room ? ' · ' + esc(room.subtitle) : '') + ' · ' + c.people + '명 · 반려견 ' + (c.dogs || 0) + '마리</div></div>' +
          '<span class="pill ' + st.cls + '" style="margin-left:auto">' + esc(st.text) + '</span>' +
        '</div>' +
        '<div class="kv"><span>연락처</span><strong>' + esc(c.phone) + '</strong></div>' +
        '<div class="kv"><span>후기 마감</span><strong>' + esc(fmtDate(c.reviewDue)) + ' · ' + esc(ddayText(c.reviewDue)) + '</strong></div>' +
        (c.memo ? '<div class="kv"><span>메モ</span><strong class="small">' + esc(c.memo) + '</strong></div>' : '') +
        '<div class="actions">' +
          (c.status === '신청'
            ? '<button class="btn btn-ok btn-lg" data-act="approve" data-i="' + idx + '">오케이 · 승인하기</button>'
            : '<button class="btn btn-soft" data-act="approve" data-i="' + idx + '"' + (approved ? '' : '') + '>승인 다시 보내기</button>') +
          '<button class="btn btn-primary" data-act="copy" data-i="' + idx + '">안내문 복사</button>' +
          '<button class="btn btn-ghost" data-act="share" data-i="' + idx + '">카톡으로 보내기</button>' +
        '</div>' +
        '<div class="actions">' +
          '<button class="btn btn-ghost btn-sm" data-act="call" data-i="' + idx + '">전화 걸기</button>' +
          '<button class="btn btn-ghost btn-sm" data-act="visit" data-i="' + idx + '">방문 완료로 바꾸기</button>' +
          '<button class="btn btn-ghost btn-sm" data-act="cancel" data-i="' + idx + '">취소</button>' +
        '</div>' +
      '</div>';
    });
    h += '<div class="notice-box" style="margin-top:.8rem"><b>무료로 알리는 방법</b><br>' +
      '‘안내문 복사’를 누르면 확정 안내가 복사됩니다. 카카오톡을 열어 붙여넣으면 문자 요금 없이 보낼 수 있어요.<br>' +
      '휴대폰에서는 ‘카톡으로 보내기’가 카카오톡 공유 창을 바로 엽니다. (PC에서는 복사 후 붙여넣기)</div>';
    return h;
  }

  /* ---- 후기 · 검색 노출 ---- */
  function panelReviews() {
    var cs = (D().creators || []).filter(function (c) { return c.status === '방문완료' || c.status === '승인'; });
    var h = '<div class="section-head"><h2>후기 등록 · 검색 노출</h2><span class="hint">확인한 날짜가 기록됩니다</span></div>';
    if (!cs.length) h += '<div class="card">아직 후기를 기다리는 체험단이 없습니다.</div>';
    cs.forEach(function (c) {
      var idx = D().creators.indexOf(c);
      var dd = dday(c.reviewDue);
      var late = c.reviewStatus !== '등록' && dd !== null && dd < 0;
      var kw = (c.keywords && c.keywords[0]) || '';
      var expo = (c.exposure || {})[kw];
      h += '<div class="card creator">' +
        '<div class="between"><div class="who">' + esc(c.name) + ' · ' + esc(c.room) + ' <span class="pill gray">' + esc(c.channel) + '</span></div>' +
        '<span class="pill ' + (c.reviewStatus === '등록' ? 'ok' : (late ? 'bad' : 'warn')) + '">' +
          (c.reviewStatus === '등록' ? '후기 등록 완료' : (late ? '기한 지남' : '후기 기다리는 중')) + '</span></div>' +
        '<div class="kv"><span>후기 마감</span><strong>' + esc(fmtDate(c.reviewDue)) + ' · ' + esc(ddayText(c.reviewDue)) + '</strong></div>' +
        '<div class="actions">' +
          '<button class="btn ' + (c.reviewStatus === '등록' ? 'btn-soft' : 'btn-ok') + '" data-act="review" data-i="' + idx + '">' +
            (c.reviewStatus === '등록' ? '등록 취소' : '후기 등록 확인') + '</button>' +
          (c.postUrl ? '<a class="btn btn-ghost" href="' + esc(c.postUrl) + '" target="_blank" rel="noopener">글 열어 보기</a>' : '') +
        '</div>';
      if (kw) {
        h += '<div class="divider"></div><div class="kw">' +
          '<span class="kw-name">‘' + esc(kw) + '’ 검색해서 우리 가게 나오는지 보기</span>' +
          '<a class="btn btn-ghost btn-sm" href="' + naverSearch(kw) + '" target="_blank" rel="noopener" data-act="opened-kw" data-i="' + idx + '">네이버에서 검색</a>' +
          '<button class="btn ' + (expo ? 'btn-ok' : 'btn-soft') + ' btn-sm" data-act="expo" data-i="' + idx + '" data-kw="' + esc(kw) + '">' +
            (expo ? '노출 확인됨' : '노출 안 됨 → 노출됨으로') + '</button></div>';
      }
      h += '</div>';
    });

    h += '<div class="section-head" style="margin-top:1.4rem"><h2>우리 가게 검색어</h2><span class="hint">검색 후 체크</span></div>';
    h += '<div class="card">';
    (D().searchKeywords || []).forEach(function (k, i) {
      var st = k.checkedAt ? (k.found ? 'ok' : 'bad') : 'warn';
      var label = k.checkedAt ? (k.found ? '노출됨' : '안 나옴') : '아직 확인 안 함';
      h += '<div class="kw"><span class="kw-name">' + esc(k.label) + '</span>' +
        '<span class="pill ' + st + '">' + label + (k.checkedAt ? ' · ' + esc(k.checkedAt) : '') + '</span>' +
        '<a class="btn btn-ghost btn-sm" href="' + naverSearch(k.label) + '" target="_blank" rel="noopener">검색</a>' +
        '<button class="btn ' + (k.found ? 'btn-ok' : 'btn-soft') + ' btn-sm" data-act="kfound" data-i="' + i + '">' + (k.found ? '노출됨 ✓' : '노출됨으로 표시') + '</button>' +
        '</div>';
    });
    h += '</div>';
    h += '<div class="warn-box" style="margin-top:.8rem">네이버 검색 결과는 네이버 화면에서 직접 눈으로 확인하고 체크합니다. ' +
      '자동으로 확인하는 기능은 서버(네이버 검색 API) 연결이 필요합니다.</div>';
    return h;
  }

  function naverSearch(q) {
    return 'https://search.naver.com/search.naver?query=' + encodeURIComponent(q);
  }

  /* ---- 채널 ---- */
  function panelChannels() {
    var h = '<div class="section-head"><h2>우리 채널 상태</h2><span class="hint">한 번씩 눌러 확인</span></div>';
    (D().channels || []).forEach(function (ch, i) {
      var checked = ch.checkedAt || '';
      h += '<div class="card">' +
        '<div class="between"><h3 style="font-size:1.05rem">' + esc(ch.label) + '</h3>' +
        '<span class="pill ' + (checked ? 'ok' : 'warn') + '">' + (checked ? '확인함 · ' + esc(checked) : '아직 확인 안 함') + '</span></div>' +
        '<div class="kv"><span>설명</span><strong>' + esc(ch.desc) + '</strong></div>' +
        '<div class="actions">' +
          '<a class="btn btn-primary" href="' + esc(ch.actionUrl) + '" target="_blank" rel="noopener">' + esc(ch.actionLabel) + '</a>' +
          (ch.writeUrl ? '<a class="btn btn-ghost" href="' + esc(ch.writeUrl) + '" target="_blank" rel="noopener">' + esc(ch.writeLabel) + '</a>' : '') +
          '<button class="btn btn-soft" data-act="chk" data-i="' + i + '">확인했어요</button>' +
        '</div></div>';
    });
    h += '<div class="notice-box" style="margin-top:.8rem"><b>지금 바로 되는 것</b> — 채널 열기, 새 글 쓰기, 예약 달력 열기는 버튼 한 번으로 됩니다.<br>' +
      '<b>서버가 있어야 되는 것</b> — 블로그 지수 자동 측정, 예약 알림 자동 발송(알림톡), 인스타 새 글 자동 확인.</div>';
    return h;
  }

  /* ---- 손님 페이지 관리 ---- */
  function panelSite() {
    var h = '';
    // 이벤트 배너
    h += '<div class="section-head"><h2>이벤트 배너 켜고 끄기</h2><span class="hint">손님 페이지 위쪽에 바로 보입니다</span></div><div class="card">';
    (D().events || []).forEach(function (e, i) {
      h += '<div class="between" style="padding:.5rem 0;border-bottom:1px solid var(--line)">' +
        '<div><b>' + esc(e.title) + '</b><div class="small muted">' + esc(e.period) + '</div></div>' +
        '<label class="switch"><input type="checkbox" data-act="evt" data-i="' + i + '"' + (e.show !== false ? ' checked' : '') + '>' +
        '<span class="track"></span><span>' + (e.show !== false ? '보임' : '숨김') + '</span></label></div>';
    });
    h += '</div>';

    // 공지 문구
    h += '<div class="section-head" style="margin-top:1.2rem"><h2>맨 위 공지 문구</h2><span class="hint">손님 화면 맨 위 띠</span></div><div class="card">';
    (D().notices || []).forEach(function (n, i) {
      h += '<div class="field"><label>공지 ' + (i + 1) + ' · ' + esc(n.badge) + '</label>' +
        '<input type="text" data-act="notice" data-i="' + i + '" value="' + esc(n.text) + '">' +
        '<label class="switch" style="margin-top:.5rem"><input type="checkbox" data-act="notice-show" data-i="' + i + '"' + (n.show !== false ? ' checked' : '') + '>' +
        '<span class="track"></span><span>' + (n.show !== false ? '보임' : '숨김') + '</span></label></div>';
    });
    h += '</div>';

    // 객실 마감
    h += '<div class="section-head" style="margin-top:1.2rem"><h2>객실 예약 받기 / 마감</h2><span class="hint">손들어 올리면 마감</span></div>';
    h += '<div class="room-grid">';
    (D().rooms || []).forEach(function (r, i) {
      var open = (r.status || '예약가능') === '예약가능';
      h += '<div class="room-item' + (open ? '' : ' closed') + '">' +
        '<div><b>' + esc(r.name) + '</b><div class="rname">' + esc(r.subtitle) + '</div></div>' +
        '<button class="btn ' + (open ? 'btn-ok' : 'btn-bad') + ' btn-sm" data-act="room" data-i="' + i + '">' +
          (open ? '예약 받는 중' : '마감됨') + '</button></div>';
    });
    h += '</div>';
    h += '<div class="notice-box" style="margin-top:.8rem">마감으로 바꾸면 손님 페이지 카드에 ‘마감’ 표시가 붙습니다. ' +
      '네이버 예약·떠나요 달력은 따로 닫아 주세요. (자동 연동은 서버가 필요합니다)</div>';
    return h;
  }

  /* ---- 홈페이지 후기 고르기 ---- */
  function panelReviewsPick() {
    var h = '<div class="section-head"><h2>홈페이지에 띄울 후기 고르기</h2><span class="hint">켜면 손님 페이지 맨 아래에 보입니다</span></div>';
    (D().reviews || []).forEach(function (r, i) {
      h += '<div class="card">' +
        '<div class="between"><div><b>' + esc(r.title) + '</b><div class="small muted">' + esc(r.type === 'clip' ? '클립 영상' : (r.type === 'blog' ? '블로그' : '인스타그램')) + ' · ' + esc(r.author || '') + '</div></div>' +
        '<label class="switch"><input type="checkbox" data-act="rev" data-i="' + i + '"' + (r.show !== false ? ' checked' : '') + '>' +
        '<span class="track"></span><span>' + (r.show !== false ? '보임' : '숨김') + '</span></label></div>' +
        '<div class="kv"><span>한 줄 소개</span><strong class="small">' + esc(r.summary) + '</strong></div>' +
        '<div class="actions"><a class="btn btn-ghost btn-sm" href="' + esc(r.url) + '" target="_blank" rel="noopener">링크 열어 보기</a>' +
        '<button class="btn btn-soft btn-sm" data-act="rev-del" data-i="' + i + '">목록에서 빼기</button></div></div>';
    });

    h += '<div class="section-head" style="margin-top:1.2rem"><h2>새 후기 링크 넣기</h2><span class="hint">클립·블로그·인스타</span></div>' +
      '<div class="card">' +
      '<div class="field"><label>어디에 올라온 글인가요?</label><select id="newType" style="width:100%;padding:.7rem .8rem;border:1px solid var(--line);border-radius:.7rem;font:inherit;font-size:1rem">' +
      '<option value="clip">클립 영상 (가장 먼저 보임)</option><option value="blog">블로그 후기</option><option value="insta">인스타그램</option></select></div>' +
      '<div class="field"><label>제목</label><input type="text" id="newTitle" placeholder="예: G5 오션뷰 욕조 후기"></div>' +
      '<div class="field"><label>한 줄 소개</label><input type="text" id="newSummary" placeholder="예: 욕조에서 일출을 봤다는 후기"></div>' +
      '<div class="field"><label>링크 주소 (붙여넣기)</label><input type="text" id="newUrl" placeholder="https://..."></div>' +
      '<div class="field"><label>사진 주소 (없으면 비워 두세요)</label><input type="text" id="newThumb" placeholder="assets/img/... 또는 https://..."></div>' +
      '<button class="btn btn-primary btn-block" type="button" id="addReview" style="margin-top:.8rem">후기 목록에 추가</button></div>';
    return h;
  }

  /* ---- 저장·설정 ---- */
  function panelSave() {
    return '<div class="section-head"><h2>저장과 설정</h2></div>' +
      '<div class="card"><div class="kv"><span>오늘 바꾼 내용</span><strong id="savedAt">' + (D().__savedAt ? '저장됨' : '아직 저장 안 함') + '</strong></div>' +
      '<div class="actions"><button class="btn btn-primary" data-act="save">저장하기</button>' +
      '<button class="btn btn-ghost" data-act="download">site-data.js 내려받기</button></div>' +
      '<div class="notice-box" style="margin-top:.8rem">지금은 <b>이 휴대폰(브라우저)</b>에 저장됩니다. 모든 손님에게 똑같이 보이게 하려면 ' +
      '‘내려받기’한 파일을 홈페이지 서버에 올려 주세요. (호스팅 업체에 파일 하나만 바꾸면 됩니다)</div></div>' +

      '<div class="section-head" style="margin-top:1.2rem"><h2>비밀번호 바꾸기</h2></div>' +
      '<div class="card"><div class="field"><label>새 비밀번호 4자리</label><input type="text" inputmode="numeric" maxlength="4" id="newPin" placeholder="예: 1234"></div>' +
      '<button class="btn btn-primary btn-block" type="button" data-act="pin">비밀번호 바꾸기</button>' +
      '<div class="warn-box" style="margin-top:.8rem">이 잠금은 손님이 실수로 들어오는 것을 막는 정도입니다. ' +
      '실제 보안(주소 노출·자료 보호)은 서버 로그인이 필요합니다.</div></div>' +

      '<div class="section-head" style="margin-top:1.2rem"><h2>이렇게 연결됩니다 (정직 안내)</h2></div>' +
      '<div class="card"><div class="kv"><span>지금 바로 되는 것</span><strong>승인 기록 · 안내문 복사 · 채널 열기</strong></div>' +
      '<div class="kv"><span>휴대폰에서 되는 것</span><strong>카카오톡 공유 창 열기</strong></div>' +
      '<div class="kv"><span>서버가 있어야 되는 것</span><strong>알림톡 자동 발송 · 블로그 지수 자동 확인</strong></div>' +
      '<p class="small muted" style="margin-top:.6rem">서버를 붙이면 위 ‘자동’ 항목이 버튼 없이도 채워집니다. 지금 화면은 그 자리를 미리 만들어 둔 것입니다.</p></div>';
  }

  /* ---------------- 동작 ---------------- */
  function onAction(e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act');
    var i = Number(el.getAttribute('data-i'));
    var c = (D().creators || [])[i];

    if (act === 'approve') {
      c.status = '승인';
      save(true);
      render();
      toast('승인했습니다. 이제 [카톡으로 보내기]로 안내하세요.');
    } else if (act === 'copy') {
      copyText(messageFor(c)).then(function () { toast('안내문을 복사했습니다. 카카오톡에 붙여넣으세요.'); });
    } else if (act === 'share') {
      var text = messageFor(c);
      if (navigator.share) {
        navigator.share({ title: '체험단 예약 확정 안내', text: text }).catch(function () {});
      } else {
        copyText(text).then(function () {
          toast('복사했습니다. 카카오톡을 열어 붙여넣으세요.');
          window.open('https://accounts.kakao.com/', '_blank');
        });
      }
    } else if (act === 'call') {
      window.location.href = 'tel:' + String(c.phone).replace(/[^0-9]/g, '');
    } else if (act === 'visit') {
      c.status = '방문완료';
      save(true); render(); toast('방문 완료로 바꿨습니다.');
    } else if (act === 'cancel') {
      c.status = '취소';
      save(true); render(); toast('취소로 바꿨습니다.');
    } else if (act === 'review') {
      c.reviewStatus = c.reviewStatus === '등록' ? '대기' : '등록';
      save(true); render();
      toast(c.reviewStatus === '등록' ? '후기 등록으로 표시했습니다.' : '다시 기다리는 중으로 바꿨습니다.');
    } else if (act === 'expo') {
      var kw = el.getAttribute('data-kw');
      c.exposure = c.exposure || {};
      c.exposure[kw] = !c.exposure[kw];
      c.exposureAt = nowText();
      save(true); render();
      toast(c.exposure[kw] ? '노출 확인으로 기록했습니다.' : '노출 안 됨으로 바꿨습니다.');
    } else if (act === 'kfound') {
      var k = D().searchKeywords[i];
      k.found = !k.found;
      k.checkedAt = nowText().slice(0, 10);
      save(true); render();
    } else if (act === 'opened-kw') {
      c.exposureAt = nowText();
      save(true);
    } else if (act === 'chk') {
      D().channels[i].checkedAt = nowText().slice(0, 10);
      save(true); render(); toast('오늘 확인한 것으로 기록했습니다.');
    } else if (act === 'evt') {
      D().events[i].show = el.checked;
      save(true); toast(el.checked ? '손님 페이지에 다시 보입니다.' : '손님 페이지에서 숨겼습니다.');
      render();
    } else if (act === 'notice-show') {
      D().notices[i].show = el.checked;
      save(true); render();
    } else if (act === 'notice') {
      D().notices[i].text = el.value;
      save(true);
    } else if (act === 'room') {
      var r = D().rooms[i];
      r.status = (r.status === '예약가능') ? '마감' : '예약가능';
      save(true); render();
      toast(r.status === '마감' ? r.name + ' 마감으로 바꿨습니다.' : r.name + ' 예약 받습니다.');
    } else if (act === 'rev') {
      D().reviews[i].show = el.checked;
      save(true); render();
      toast(el.checked ? '손님 페이지에 보이게 했습니다.' : '손님 페이지에서 숨겼습니다.');
    } else if (act === 'rev-del') {
      if (confirm('이 후기를 목록에서 뺄까요?')) {
        D().reviews.splice(i, 1);
        save(true); render();
      }
    } else if (act === 'save') {
      save();
      var s = $('#savedAt'); if (s) s.textContent = nowText() + ' 저장됨';
    } else if (act === 'download') {
      var copy = {};
      Object.keys(D()).forEach(function (k) { if (k !== '__savedAt') copy[k] = D()[k]; });
      var blob = new Blob(['/* 사이트 설정 파일 */\nwindow.SITE_DATA = ' + JSON.stringify(copy, null, 1) + ';\n'],
        { type: 'text/javascript;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'site-data.js';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      toast('site-data.js 파일을 내려받았습니다.');
    } else if (act === 'pin') {
      var v = ($('#newPin').value || '').replace(/[^0-9]/g, '');
      if (v.length !== 4) { toast('숫자 4자리로 입력해 주세요.'); return; }
      D().admin.pin = v;
      save(true);
      toast('비밀번호를 바꿨습니다. 다음부터 ' + v + '를 눌러 주세요.');
    }
  }

  /* ---------------- 시작 ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    // 저장본 불러오기
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        Object.keys(saved).forEach(function (k) {
          if (k !== '__savedAt') window.SITE_DATA[k] = saved[k];
        });
        window.SITE_DATA.__savedAt = saved.__savedAt;
      }
    } catch (e) {}

    $('#pinTip').textContent = (String((D().admin || {}).pin || '2580') === '2580')
      ? ((D().admin || {}).pinHint || '')
      : '비밀번호를 잊으면 site-data.js 파일의 admin.pin 값을 바꾸면 다시 들어올 수 있습니다.';

    $('#pinPad').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      pressPin(b.getAttribute('data-k'));
    });
    document.addEventListener('keydown', function (e) {
      if ($('#lockScreen').classList.contains('hidden')) return;
      if (/^[0-9]$/.test(e.key)) pressPin(e.key);
      if (e.key === 'Backspace') pressPin('back');
    });
    $('#lockBtn').addEventListener('click', function () {
      if (!confirm('잠글까요? 다시 들어올 때 비밀번호가 필요합니다.')) return;
      lock();
    });

    $('#tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-tab]'); if (!b) return;
      tab = b.getAttribute('data-tab');
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('#panel').addEventListener('click', function (e) {
      if (e.target.closest('#addReview')) { addReview(); return; }
      var tag = e.target.closest('[data-act]');
      if (!tag) return;
      if (tag.tagName === 'INPUT') return;
      if (tag.tagName === 'A' && tag.getAttribute('data-act') === 'opened-kw') {
        // 링크 이동은 그대로 두고 기록만
        setTimeout(function () { onAction(e); }, 0);
        return;
      }
      onAction(e);
    });
    $('#panel').addEventListener('change', function (e) {
      if (e.target.matches('[data-act]') && (e.target.type === 'checkbox' || e.target.tagName === 'INPUT')) onAction(e);
    });
    $('#saveBtn').addEventListener('click', function () { save(); });

    function addReview() {
      var type = $('#newType').value;
      var title = ($('#newTitle').value || '').trim();
      var summary = ($('#newSummary').value || '').trim();
      var url = ($('#newUrl').value || '').trim();
      var thumb = ($('#newThumb').value || '').trim() || 'assets/img/hero/hero-window.jpg';
      if (!title || !url) { toast('제목과 링크 주소를 넣어 주세요.'); return; }
      D().reviews.unshift({
        id: 'r' + Date.now(), type: type, show: true, title: title, summary: summary || '사장님이 고른 후기',
        thumb: thumb, url: url, author: type === 'clip' ? '네이버 클립' : (type === 'blog' ? '네이버 블로그' : '인스타그램'), date: nowText().slice(0, 7)
      });
      save(true);
      render();
      toast('후기를 넣었습니다. 손님 페이지 맨 아래에 보입니다.');
    }

    if (unlocked()) showApp(); else { paintPin(); }
  });
})();
