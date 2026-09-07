/* ══════════════════════════════════════════════════════════════
   명함 HTML을 만든다
   ──────────────────────────────────────────────────────────────
   내용을 브라우저에서 채우지 않고 여기서 채워 내려보내는 이유는
   하나다. 명함은 대부분 카카오톡으로 전달되는데, 카톡 스크래퍼는
   JS를 실행하지 않는다. 브라우저에서 그리면 모든 사람의 미리보기가
   똑같이 나온다 — 명함 상품에서는 치명적이다.

   여기서 그리면 사람마다 다른 og:title·og:image가 박힌다.

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

function renderCard(card, opts) {
  const o = opts || {};
  const origin = o.origin || 'https://bunyang-card.vercel.app';
  const url = origin + '/' + card.slug;

  const phone = card.mobile || card.tel || '';
  const telHref = 'tel:' + digits(phone);
  const smsHref = 'sms:' + digits(phone);

  const facts = arr(card.facts);
  const sites = arr(card.sites);
  const creds = arr(card.creds);

  const title = `${card.name} ${card.role || '분양상담사'}${card.org ? ' | ' + card.org : ''}`;
  // 소개 글이 길면 미리보기에서 잘리므로 한 줄 소개를 먼저 쓴다.
  const desc = (card.tagline || card.about || `${card.name} ${card.role || '분양상담사'}입니다.`)
    .replace(/\s+/g, ' ').slice(0, 150);
  // 사진이 없으면 og:image를 아예 빼는 게 낫다. 없는 파일을 가리키면
  // 카톡 미리보기에 깨진 이미지가 뜨는데, 제목·설명만 나오는 편이 낫다.
  const ogImage = card.photo_url || o.defaultOgImage || '';

  // 눌러야 일어나는 일에만 필요한 값. 개인정보를 여기 더 넣지 않는다.
  const clientData = {
    slug: card.slug,
    name: card.name,
    role: card.role || '',
    org: card.org || '',
    tel: card.tel || '',
    mobile: card.mobile || '',
    sbUrl: o.sbUrl,
    sbAnon: o.sbAnon,
  };

  const photoBlock = card.photo_url
    ? `<img src="${esc(card.photo_url)}" alt="${esc(card.name)} ${esc(card.role || '')}">`
    : `<span class="ph-fallback">${esc(String(card.name || '').slice(0, 1))}</span>`;

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

  // 카카오 링크를 아직 못 받았으면 눌리는 것처럼 두지 않는다.
  const kko = card.kakao_url
    ? `<a class="kko" id="d-kko" href="${esc(card.kakao_url)}" target="_blank" rel="noopener">카카오톡 상담</a>`
    : `<a class="kko" id="d-kko" role="button" aria-disabled="true" style="opacity:.45;cursor:not-allowed;">카카오톡 상담</a>`;

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
<meta property="og:image:alt" content="${esc(card.name)} ${esc(card.role || '')}">` : ''}
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
  jobTitle: card.role || '분양상담사',
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

  <header class="hero">
    <div class="org">${esc(card.org_en || card.org || '')}</div>
    <div class="photo">${photoBlock}</div>
    <h1>
      <span>${esc(card.name)}</span>
      <span class="role">${esc(card.role || '분양상담사')}</span>
    </h1>
    <p class="tagline">${esc(card.tagline || '')}</p>
  </header>

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

  <section class="tinted" id="contact">
    <h2>Contact<span class="ko">상담 남기기</span></h2>
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
        <textarea id="f-msg" name="message" placeholder="관심 있는 현장이나 평형, 예산 등을 적어주시면 더 정확히 안내드립니다."></textarea>
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
      본 페이지는 분양 상담 안내를 위한 것으로, 개별 현장의 공급 조건은
      각 현장의 입주자모집공고문을 따릅니다.
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
