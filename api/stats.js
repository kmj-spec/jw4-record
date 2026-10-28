// 방문 통계 보기: GET /api/stats  (헤더 Authorization: Bearer <열쇠>)
// 열쇠(GitHub 토큰)로 이 저장소의 Actions를 읽을 수 있을 때만 숫자를 준다 → 숫자는 비공개.
import { ready, run, kst } from "./_store.js";

async function allowed(req) {
  const auth = req.headers.authorization || "";
  if (!/^Bearer \S+$/.test(auth)) return false;
  const r = await fetch("https://api.github.com/repos/kmj-spec/jw4-record/actions/workflows", {
    headers: { Authorization: auth, Accept: "application/vnd.github+json", "User-Agent": "winningwoong" },
  });
  return r.ok;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!ready()) return res.status(503).json({ error: "저장소가 연결되지 않았어요" });
  if (!(await allowed(req).catch(() => false))) return res.status(401).json({ error: "열쇠가 필요해요" });
  const days = [6, 5, 4, 3, 2, 1, 0].map(kst);
  try {
    const vals = await run([...days.map(d => ["GET", `v:d:${d}`]), ["GET", `v:a:${kst()}`]]);
    res.status(200).json({ days: days.map((d, i) => ({ date: d, visits: Number(vals[i]) || 0 })), appToday: Number(vals[7]) || 0 });
  } catch (e) { res.status(502).json({ error: e.message }); }
}
