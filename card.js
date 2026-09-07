/* ══════════════════════════════════════════════════════════════
   명함 페이지의 클라이언트 동작
   ──────────────────────────────────────────────────────────────
   이름·사진·현장 같은 내용은 서버(api/card.js)가 이미 HTML에 박아
   보낸다. 여기서 화면을 그리지 않는다. 그래야 카카오톡 미리보기에
   사람마다 다른 이름과 사진이 뜬다.

   여기는 눌러야 일어나는 것만 맡는다:
     연락처 저장(vCard) · 상담 접수 · 토스트 · 열람 집계

   카드 정보는 서버가 <script id="card-data"> 에 넣어둔 것을 읽는다.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DATA = {};
  try {
    DATA = JSON.parse(document.getElementById('card-data').textContent);
  } catch (e) {
    return;   // 데이터가 없으면 아무것도 하지 않는다
  }

  var SB_URL = DATA.sbUrl;
  var SB_ANON = DATA.sbAnon;
  var SOURCE = '명함-' + DATA.slug;
  var PHONE = DATA.mobile || DATA.tel || '';

  var $ = function (id) { return document.getElementById(id); };

  // ── 토스트 ────────────────────────────────────────────────
  var toastTimer = null;
  function toast(msg, isErr) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('err', !!isErr);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3200);
  }

  // ── 연락처 저장 (vCard) ───────────────────────────────────
  // 인앱 브라우저에서는 다운로드가 막히기도 한다. 그때는 번호를
  // 클립보드에 넣는 것으로 물러선다.
  function saveContact() {
    var vcf = [
      'BEGIN:VCARD', 'VERSION:3.0',
      'N:' + DATA.name + ';;;;',
      'FN:' + DATA.name,
      'ORG:' + (DATA.org || ''),
      'TITLE:' + (DATA.role || ''),
      'TEL;TYPE=CELL:' + PHONE,
      'URL:' + location.origin + location.pathname,
      'END:VCARD'
    ].join('\r\n');

    try {
      var url = URL.createObjectURL(new Blob([vcf], { type: 'text/vcard;charset=utf-8' }));
      var a = document.createElement('a');
      a.href = url;
      a.download = DATA.slug + '.vcf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast('연락처를 저장했습니다.');
    } catch (e) {
      if (navigator.clipboard) navigator.clipboard.writeText(PHONE);
      toast('번호를 복사했습니다: ' + PHONE);
    }
  }

  // ── 상담 접수 ─────────────────────────────────────────────
  // consultations 테이블에 바로 넣는다. source 로 어느 명함인지,
  // assignee 로 누가 받을 상담인지 같이 남긴다 — 관리자 표에서
  // 담당자가 바로 보인다.
  function submitLead(e) {
    e.preventDefault();
    var btn = $('f-submit');
    var name = $('f-name').value.trim();
    var phone = $('f-phone').value.trim();
    var msg = $('f-msg').value.trim();

    if (!name) { toast('성함을 입력해 주세요.', true); $('f-name').focus(); return; }
    // 하이픈·공백을 빼고 숫자만 센다. 형식을 깐깐하게 보면 진짜 고객을 놓친다.
    if (phone.replace(/\D/g, '').length < 9) {
      toast('연락처를 정확히 입력해 주세요.', true); $('f-phone').focus(); return;
    }

    btn.disabled = true;
    btn.textContent = '접수 중…';

    fetch(SB_URL + '/rest/v1/consultations', {
      method: 'POST',
      headers: {
        'apikey': SB_ANON,
        'Authorization': 'Bearer ' + SB_ANON,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        name: name,
        phone: phone,
        message: msg || null,
        source: SOURCE,
        assignee: DATA.name
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('save failed');
      e.target.reset();
      toast('접수되었습니다. 곧 연락드리겠습니다.');
    }).catch(function () {
      // 저장이 안 됐는데 됐다고 하면 고객은 기다리다 만다. 사실대로 알린다.
      toast('접수에 실패했습니다. 전화로 연락 주세요: ' + PHONE, true);
    }).then(function () {
      btn.disabled = false;
      btn.textContent = '상담 요청하기';
    });
  }

  // ── 열람 집계 ─────────────────────────────────────────────
  // 현장 사이트의 adguard.js를 쓰지 않는다. 그 스크립트는 접속이
  // 몰리면 document.body를 비우고 차단 화면을 띄우는데, 명함에선
  // 사고다 — 단톡방에 뿌리면 같은 공용 IP로 여러 명이 들어오고
  // 그때 진짜 고객이 빈 화면을 본다.
  //
  // 그래서 기록만 한다. check_site_visit이 돌려주는 상태를 아예
  // 읽지 않는다. 검색봇은 그 함수가 알아서 걸러낸다.
  function logView() {
    fetch(SB_URL + '/rest/v1/rpc/check_site_visit', {
      method: 'POST',
      headers: {
        'apikey': SB_ANON,
        'Authorization': 'Bearer ' + SB_ANON,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_site: SOURCE }),
      keepalive: true
    }).catch(function () { /* 집계 실패가 명함을 막으면 안 된다 */ });
  }

  // ── 카카오톡 버튼 ─────────────────────────────────────────
  // 링크를 아직 못 받은 경우. 서버가 aria-disabled를 달아 보낸다.
  var kko = $('d-kko');
  if (kko && kko.getAttribute('aria-disabled') === 'true') {
    kko.addEventListener('click', function (ev) {
      ev.preventDefault();
      toast('카카오톡 상담 링크가 아직 연결되지 않았습니다.', true);
    });
  }

  var save = $('q-save');
  if (save) save.addEventListener('click', saveContact);

  var form = $('lead-form');
  if (form) form.addEventListener('submit', submitLead);

  logView();
})();
