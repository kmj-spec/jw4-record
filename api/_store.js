// 방문 수 저장소: Vercel에 연결한 Upstash Redis(REST)를 쓴다. 따로 설치할 것은 없다.
// Vercel이 넣어 주는 환경 변수 이름이 연결 방식에 따라 달라서 둘 다 받는다.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const ready = () => Boolean(URL_ && TOKEN);

// 여러 명령을 한 번에 보낸다. 예: [["INCR","v:d:2026-10-28"], ["GET","v:a:2026-10-28"]]
export async function run(cmds) {
  const r = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`저장소 응답 ${r.status}`);
  return (await r.json()).map(x => x.result);
}

// 한국 날짜(YYYY-MM-DD). off일 전.
export const kst = (off = 0) => new Date(Date.now() + 9 * 3600e3 - off * 864e5).toISOString().slice(0, 10);
