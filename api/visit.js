// 방문 1번 세기: POST /api/visit  {visit:true|false, app:true|false}
// 하루 1번·내 기기 제외·로봇 제외는 화면(index.html) 쪽에서 거른다.
import { ready, run, kst } from "./_store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 받아요" });
  if (!ready()) return res.status(503).json({ error: "저장소가 연결되지 않았어요" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const day = kst();
  const cmds = [];
  if (!body || body.visit !== false) cmds.push(["INCR", "v:total"], ["INCR", `v:d:${day}`]); // 그날 첫 방문
  if (body && body.app === true) cmds.push(["INCR", `v:a:${day}`]); // 그날 앱으로 처음 연 것
  if (!cmds.length) return res.status(204).end();
  try { await run(cmds); res.status(204).end(); }
  catch (e) { res.status(502).json({ error: e.message }); }
}
