/* ══════════════════════════════════════════════════════════════
   명함 HTML을 만든다
   ──────────────────────────────────────────────────────────────
   내용을 브라우저에서 채우지 않고 여기서 채워 내려보내는 이유는
   하나다. 명함은 대부분 카카오톡으로 전달되는데, 카톡 스크래퍼는
   JS를 실행하지 않는다. 브라우저에서 그리면 모든 사람의 미리보기가
   똑같이 나온다 — 명함 상품에서는 치명적이다.

   여기서 그리면 사람마다 다른 og:title·og:image가 박힌다.

   현장(card.site)이 붙으면 명함이 아니라 "현장 홈페이지 축소판"이
   된다 — 대표이미지·사업개요·홍보이미지·방문예약이 얹힌다.
   현장이 없으면 예전처럼 담당자 명함만 나온다.

   보이는 모양(CSS)은 /card.css, 눌러야 일어나는 일은 /card.js 로
   따로 두었다. 정적 파일이라 CDN이 캐시하고, 편집할 때도 .css는
   .css로 .js는 .js로 열린다.
   ══════════════════════════════════════════════════════════════ */

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** JSON을 <script> 안에 안전하게 넣는다. </script> 가 섞이면 문서가 깨진다. */
function jsonBlock(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function digits(v) {
  return String(v == null ? '' : v).replace(/[^0-9+]/g, '');
}

/** DB의 jsonb 컬럼이 문자열로 올 때가 있어 한 번 감싼다. */
function arr(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (e) { return []; }
  }
  return [];
}

/** 방문 시간 선택지. 10시~18시 30분 간격. */
function timeOptions() {
  const out = [];
  for (let h = 10; h <= 18; h++) {
    for (const m of ['00', '30']) {
      if (h === 18 && m === '30') continue;
      const v = `${String(h).padStart(2, '0')}:${m}`;
      out.push(`<option value="${v}">${v}</option>`);
    }
  }
  return out.join('');
}

function renderCard(card, opts) {
  const o = opts || {};
  const origin = o.origin || 'https://bunyang-card.vercel.app';
  const url = origin + '/' + card.slug;
  const site = card.site || null;

  const phone = card.mobile || card.tel || '';
  const telHref = 'tel:' + digits(phone);
  const smsHref = 'sms:' + digits(phone);

  const facts = arr(card.facts);
  const sites = arr(card.sites);
  const creds = arr(card.creds);
  const specs = site ? arr(site.specs) : [];
  const images = site ? arr(site.images).filter(u => typeof u === 'string' && u) : [];

  const role = card.role || '분양상담사';

  // 현장이 있으면 제목 앞에 현장을 세운다. 카톡에서 "무슨 현장인지"가
  // 먼저 보여야 열어볼 이유가 생긴다.
  const title = site
    ? `${site.name} · ${card.name} ${role}`
    : `${card.name} ${role}${card.org ? ' | ' + card.org : ''}`;

  const desc = (
    (site && (site.subhead || site.headline)) ||
    card.tagline || card.about ||
    `${card.name} ${role}입니다.`
  ).replace(/\s+/g, ' ').slice(0, 150);

  // 사진이 없으면 og:image를 아예 빼는 게 낫다. 없는 파일을 가리키면
  // 카톡 미리보기에 깨진 이미지가 뜨는데, 제목·설명만 나오는 편이 낫다.
  const ogImage = (site && site.hero_url) || card.photo_url || o.defaultOgImage || '';

  // 눌러야 일어나는 일에만 필요한 값. 개인정보를 여기 더 넣지 않는다.
  const clientData = {
    slug: card.slug,
    name: card.name,
    role: role,
    org: card.org || '',
    tel: card.tel || '',
    mobile: card.mobile || '',
    sbUrl: o.sbUrl,
    sbAnon: o.sbAnon,
  };

  const initial = esc(String(card.name || '').slice(0, 1));

  // ── 상단 ──
  // 현장 대표이미지가 있으면 그걸 머리로 세우고 담당자는 그 아래 띠로
  // 붙인다. 없으면 예전처럼 담당자 자체가 머리가 된다.
  const head = site && site.hero_url ? `
  <header class="site-hero">
    <img src="${esc(site.hero_url)}" alt="${esc(site.name)}" fetchpriority="high">
    <div class="site-hero-txt">
      ${site.headline ? `<p class="hl">${esc(site.headline)}</p>` : ''}
      <h1>${esc(site.name)}</h1>
      ${site.subhead ? `<p class="sub">${esc(site.subhead)}</p>` : ''}
    </div>
  </header>

  <div class="agent-bar">
    <div class="ab-photo">${card.photo_url
      ? `<img src="${esc(card.photo_url)}" alt="${esc(card.name)} ${esc(role)}">`
      : `<span class="ph-fallback">${initial}</span>`}</div>
    <div class="ab-txt">
      <div class="ab-name">${esc(card.name)} <span>${esc(role)}</span></div>
      ${card.org ? `<div class="ab-org">${esc(card.org)}</div>` : ''}
    </div>
  </div>` : `
  <header class="hero">
    <div class="org">${esc(card.org_en || card.org || '')}</div>
    <div class="photo">${card.photo_url
      ? `<img src="${esc(card.photo_url)}" alt="${esc(card.name)} ${esc(role)}">`
      : `<span class="ph-fallback">${initial}</span>`}</div>
    <h1>
      <span>${esc(card.name)}</span>
      <span class="role">${esc(role)}</span>
    </h1>
    <p class="tagline">${esc(card.tagline || '')}</p>
  </header>`;

  const factsHtml = facts.map(f =>
    `<div class="fact"><div class="n">${esc(f.n)}</div><div class="l">${esc(f.l)}</div></div>`
  ).join('');

  const sitesHtml = sites.map(s => `
      <li>
        <a class="site" href="${esc(s.url)}" target="_blank" rel="noopener">
          <span class="body">
            <span class="nm">${esc(s.nm)}</span>
            <span class="ds">${esc(s.ds)}</span>
          </span>
          <span class="go" aria-hidden="true">→</span>
        </a>
      </li>`).join('');

  const specsHtml = specs.map(s =>
    `<tr><th>${esc(s.k)}</th><td>${esc(s.v)}</td></tr>`).join('');

  // 첫 장만 즉시, 나머지는 지연 로딩. 15장씩 들어가면 그냥 다 받으면
  // 모바일에서 첫 화면이 늦게 뜬다.
  const imagesHtml = images.map((u, i) =>
    `<img class="site-img" src="${esc(u)}" alt="${esc(site.name)} 홍보 이미지 ${i + 1}"${i === 0 ? '' : ' loading="lazy"'} decoding="async">`
  ).join('');

  // 카카오 링크가 없으면 꺼진 버튼을 두지 않고 그 자리를 상담 폼으로 돌린다.
  const kko = card.kakao_url
    ? `<a class="kko" href="${esc(card.kakao_url)}" target="_blank" rel="noopener">카카오톡 상담</a>`
    : `<a class="ask" href="#contact">상담 문의하기</a>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="${esc(card.org || card.name)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${esc(url)}">

<meta property="og:type" content="profile">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">${ogImage ? `
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:alt" content="${esc(site ? site.name : card.name)}">` : ''}
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="${esc(card.org || '분양 상담')}">

<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">${ogImage ? `
<meta name="twitter:image" content="${esc(ogImage)}">` : ''}

<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet">
<link rel="stylesheet" href="/card.css">

<script type="application/ld+json">
${jsonBlock({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: card.name,
  jobTitle: role,
  url: url,
  telephone: phone || undefined,
  image: card.photo_url || undefined,
  worksFor: card.org ? { '@type': 'Organization', name: card.org } : undefined,
  knowsAbout: ['아파트 분양', '오피스텔 분양', '청약 상담'],
})}
</script>
</head>
<body>

<main class="card">
${head}

  <nav class="quick" aria-label="빠른 연락">
    <a href="${esc(telHref)}">
      <span class="ic" aria-hidden="true">📞</span>
      <span class="lb">전화</span>
    </a>
    <a href="${esc(smsHref)}">
      <span class="ic" aria-hidden="true">💬</span>
      <span class="lb">문자</span>
    </a>
    <button id="q-save" type="button">
      <span class="ic" aria-hidden="true">🪪</span>
      <span class="lb">연락처 저장</span>
    </button>
  </nav>

  ${site && site.notice ? `<p class="site-notice">${esc(site.notice)}</p>` : ''}

  ${specs.length ? `<section>
    <h2>Overview<span class="ko">사업개요</span></h2>
    <table class="specs"><tbody>${specsHtml}</tbody></table>
    ${site.address ? `<p class="site-addr"><strong>홍보관</strong> <address>${esc(site.address)}</address></p>` : ''}
    ${site.site_url ? `<p style="margin:12px 0 0"><a class="site-more" href="${esc(site.site_url)}" target="_blank" rel="noopener">현장 홈페이지에서 더 보기 →</a></p>` : ''}
  </section>` : ''}

  ${images.length ? `<section class="tinted flush">
    <h2 style="padding:0 28px">Gallery<span class="ko">현장 안내</span></h2>
    <div class="site-imgs">${imagesHtml}</div>
  </section>` : ''}

  ${card.about ? `<section>
    <h2>About<span class="ko">이런 일을 합니다</span></h2>
    <p class="lead">${esc(card.about)}</p>
    ${facts.length ? `<div class="facts">${factsHtml}</div>` : ''}
  </section>` : ''}

  ${sites.length ? `<section class="tinted">
    <h2>Projects<span class="ko">담당 현장</span></h2>
    <ul class="sites">${sitesHtml}</ul>
  </section>` : ''}

  ${creds.length ? `<section>
    <h2>Career<span class="ko">경력 · 이력</span></h2>
    <ul class="creds">${creds.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
  </section>` : ''}

  <section class="tinted" id="book">
    <h2>Visit<span class="ko">방문예약</span></h2>
    <p class="lead" style="font-size:13.5px;color:var(--text-dim);margin-bottom:16px;">
      원하시는 날짜와 시간을 남겨주시면 확인 후 연락드립니다.
    </p>
    <form id="book-form" novalidate>
      <div class="field-row">
        <div class="field">
          <label for="b-date">방문 날짜</label>
          <input id="b-date" name="date" type="date" required>
        </div>
        <div class="field">
          <label for="b-time">시간</label>
          <select id="b-time" name="time">${timeOptions()}</select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="b-name">성함</label>
          <input id="b-name" type="text" autocomplete="name" placeholder="홍길동" required>
        </div>
        <div class="field">
          <label for="b-phone">연락처</label>
          <input id="b-phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000" required>
        </div>
      </div>
      <button class="submit" id="b-submit" type="submit">방문 예약하기</button>
    </form>
  </section>

  <section id="contact">
    <h2>Contact<span class="ko">상담 문의</span></h2>
    <p class="lead" style="font-size:13.5px;color:var(--text-dim);margin-bottom:16px;">
      연락처를 남겨주시면 직접 전화드립니다. 통화가 어려우시면 문자로 안내드립니다.
    </p>
    <form id="lead-form" novalidate>
      <div class="field">
        <label for="f-name">성함</label>
        <input id="f-name" name="name" type="text" autocomplete="name" placeholder="홍길동" required>
      </div>
      <div class="field">
        <label for="f-phone">연락처</label>
        <input id="f-phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000" required>
      </div>
      <div class="field">
        <label for="f-msg">궁금하신 점 <span style="color:var(--text-dim)">(선택)</span></label>
        <textarea id="f-msg" name="message" placeholder="관심 있는 평형이나 예산 등을 적어주시면 더 정확히 안내드립니다."></textarea>
      </div>
      <button class="submit" id="f-submit" type="submit">상담 요청하기</button>
      <p class="privacy">
        남겨주신 정보는 상담 목적으로만 사용하며, 상담 종료 후 파기합니다.
      </p>
    </form>
  </section>

  <footer>
    ${card.org ? `<strong>${esc(card.org)}</strong><br>` : ''}
    ${o.footerNote || ''}
    <span style="display:block;margin-top:10px;">
      ${site ? '본 페이지의 사진·투시도는 이해를 돕기 위한 것으로 실제와 다를 수 있으며, 공급 조건은 입주자모집공고문을 따릅니다.'
             : '본 페이지는 분양 상담 안내를 위한 것으로, 개별 현장의 공급 조건은 각 현장의 입주자모집공고문을 따릅니다.'}
    </span>
  </footer>
</main>

<div class="dock">
  <a class="call" href="${esc(telHref)}">전화 상담</a>
  ${kko}
</div>

<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script id="card-data" type="application/json">${jsonBlock(clientData)}</script>
<script src="/card.js" defer></script>
</body>
</html>`;
}

module.exports = { renderCard, esc };
