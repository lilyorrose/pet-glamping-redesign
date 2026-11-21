/* 글씨 크기 조절 — 보통 / 크게 / 아주 크게 (이 브라우저에 기억됩니다) */
(function () {
  'use strict';
  var KEY = 'pg_font';
  var LEVELS = ['normal', 'lg', 'xl'];

  function apply(level) {
    if (LEVELS.indexOf(level) < 0) level = 'normal';
    if (level === 'normal') document.documentElement.removeAttribute('data-font');
    else document.documentElement.setAttribute('data-font', level);
    try { localStorage.setItem(KEY, level); } catch (e) {}
    document.querySelectorAll('[data-font-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-font-set') === level));
    });
  }

  function current() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) {}
    return LEVELS.indexOf(v) >= 0 ? v : 'normal';
  }

  // 깜빡임 방지: 화면을 그리기 전에 먼저 적용
  apply(current());

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-font-set]').forEach(function (b) {
      b.addEventListener('click', function () { apply(b.getAttribute('data-font-set')); });
    });
    apply(current());
  });

  window.PickleFont = { apply: apply, current: current };
})();
