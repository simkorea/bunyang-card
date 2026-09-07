/* ══════════════════════════════════════════════════════════════
   /{슬러그} → 명함 한 장
   ──────────────────────────────────────────────────────────────
   vercel.json 이 /{슬러그} 를 이리로 넘긴다.
   Supabase에서 카드를 읽어 _template.js 로 그려 내려준다.

   ⚠️ service_role 키를 쓰지 않는다. 그 키는 RLS를 전부 우회하므로
      명함 하나 그리자고 환경변수에 둘 물건이 아니다. 대신 anon 키로
      get_agent_card() 만 부른다 — 그 함수는 SECURITY DEFINER 라
      published=true 인 카드 한 장만 돌려주고, 표를 훑거나 목록을
      받아갈 방법이 없다. (홈페이지\supabase\agent-cards.sql 참고)

   두산위브더제니스부천\api\consult.js 와 같은 형식이다.
   의존성 없음, 빌드 없음.
   ══════════════════════════════════════════════════════════════ */

const { renderCard, esc } = require('./_template');

const SB_URL = 'https://tctilpuhknxucrlnhlky.supabase.co';
const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjdGlscHVoa254dWNybG5obGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzE3NjQsImV4cCI6MjA5MTcwNzc2NH0._mS10zf3ayR7nbdFxQJHfZS57_tzOakGm-WkyQB8bxU';

// 슬러그는 주소에 그대로 들어간다. DB의 check 제약과 같은 모양만 받는다.
const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

const FOOTER_NOTE =
  '<address>서울특별시 마포구 양화로 56, 7층 709호</address>' +
  '운영 · 더 타임즈 플레이스 (사업자등록번호 807-62-00976)<br>';

function notFound(res, msg) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // 오타로 잘못 들어온 링크를 CDN이 오래 물고 있으면 곤란하다. 짧게만 캐시한다.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30');
  return res.status(404).end(`<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>명함을 찾을 수 없습니다</title>
<meta name="robots" content="noindex">
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet">
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;
       font-family:'Pretendard Variable',Pretendard,system-ui,sans-serif;
       background:#f5f1ea;color:#2a2620;text-align:center;padding:24px;}
  h1{font-size:19px;font-weight:700;margin:0 0 10px;}
  p{font-size:14px;color:#8a8478;margin:0;line-height:1.75;}
</style></head>
<body><div>
  <h1>명함을 찾을 수 없습니다</h1>
  <p>${esc(msg || '주소를 다시 확인해 주세요.')}</p>
</div></body></html>`);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).end();
  }

  const raw = String((req.query && req.query.slug) || '').trim().toLowerCase();
  if (!SLUG.test(raw)) return notFound(res, '주소 형식이 올바르지 않습니다.');

  let card;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/rpc/get_agent_card`, {
      method: 'POST',
      headers: {
        'apikey': SB_ANON,
        'Authorization': `Bearer ${SB_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_slug: raw }),
    });
    if (!r.ok) {
      console.error('get_agent_card 실패', r.status, await r.text());
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).end('일시적인 오류입니다. 잠시 후 다시 시도해 주세요.');
    }
    card = await r.json();
  } catch (e) {
    console.error('get_agent_card 예외', e);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).end('일시적인 오류입니다. 잠시 후 다시 시도해 주세요.');
  }

  // 없는 슬러그거나 아직 공개하지 않은 카드
  if (!card || !card.slug) return notFound(res, '아직 공개되지 않았거나 없는 명함입니다.');

  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'bunyang-card.vercel.app';

  const html = renderCard(card, {
    origin: `${proto}://${host}`,
    sbUrl: SB_URL,
    sbAnon: SB_ANON,
    footerNote: FOOTER_NOTE,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // CDN이 1분 물고 있다가 뒤에서 새로 받아온다. 조회는 빠르고,
  // 관리자에서 고친 내용은 1분 안에 반영된다.
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).end(html);
};
