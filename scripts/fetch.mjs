// 박정웅(KBL 291746) 정규시즌 경기별 기록을 받아 data.json을 갱신한다.
// 1순위: KBL 데이터 서버를 직접 호출. 막히면 2순위: Playwright로 kbl.or.kr을 열고 그 페이지 안에서 호출.
import fs from "node:fs";

const PLAYER = "291746";
const API = "https://kbl-api.sports2i.com/api/v1/";
const PAGE = `https://www.kbl.or.kr/player/player/${PLAYER}`;
const TEAMS = {"10":"울산 현대모비스","16":"원주 DB","35":"서울 삼성","50":"창원 LG","55":"서울 SK","60":"부산 KCC","64":"대구 한국가스공사","66":"고양 소노","06":"수원 KT","70":"안양 정관장"};
// 데뷔 이후 알려진 1군 시즌 코드. 새 시즌은 recent-seasons에서 자동으로 추가된다.
const KNOWN = [[45,"2024-2025"],[47,"2025-2026"],[49,"2026-2027"]];
const HEADERS = { "Accept":"application/json", "Origin":"https://www.kbl.or.kr", "Referer":"https://www.kbl.or.kr/", "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" };

// 브라우저 안에서도 그대로 돌릴 수 있게 fetch 함수를 인자로 받는다.
async function collect(get, API, KNOWN) {
  const rs = (await get(API + "Common/recent-seasons?seriesCd=1")).data || [];
  const list = [...KNOWN];
  for (const x of rs) if (x.seasonName2 === "1군시즌" && !list.some(([c]) => c === x.seasonCode)) list.push([x.seasonCode, x.seasonName1]);
  const out = {};
  for (const [code, name] of list) {
    const g = await get(API + `players/categories/game/${code}/${code - 1}/291746`);
    const rows = g.RegularGameRecords || [];
    if (rows.length) out[name] = rows;
  }
  return out;
}

async function direct() {
  const get = async (u) => { const r = await fetch(u, { headers: HEADERS }); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
  return collect(get, API, KNOWN);
}

async function viaBrowser() {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ locale: "ko-KR" });
    await page.goto(PAGE, { waitUntil: "networkidle", timeout: 60000 });
    return await page.evaluate(async ({ API, KNOWN, src }) => {
      const collect = eval("(" + src + ")");
      const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(r.status + " " + u); return r.json(); };
      return collect(get, API, KNOWN);
    }, { API, KNOWN, src: collect.toString() });
  } finally { await browser.close(); }
}

function shape(raw) {
  const gamelogs = {}, seasons = [];
  for (const [name, rows] of Object.entries(raw)) {
    const games = rows.map(x => ({
      date: x.gameDate.replace(/(\d{4})(\d\d)(\d\d)/, "$1.$2.$3"),
      opp: TEAMS[x.awayTeam] || x.awayTeamName || x.awayTeam,
      wl: x.win ? "W" : "L", score: x.score, oppScore: x.awayScore, sec: x.playSec,
      pts: x.pts, m2: x.fg, a2: x.fgA, m3: x.threep, a3: x.threepA, ftm: x.ft, fta: x.ftA,
      oreb: x.oR, dreb: x.dR, ast: x.aS, stl: x.sT, blk: x.bS, gd: x.gd, dk: x.dk, dka: x.dkA,
      to: x.tO, pf: x.foulTot, pp: x.pp, ppa: x.ppA, pm: x.margin,
    })).sort((a, b) => (a.date < b.date ? 1 : -1));
    gamelogs[name] = games;
    const s = { season: name, g: games.length, w: 0, l: 0, sec: 0 };
    const F = ["pts","m2","a2","m3","a3","ftm","fta","oreb","dreb","ast","stl","blk","gd","dk","dka","to","pf","pp","ppa","pm"];
    F.forEach(f => (s[f] = 0));
    for (const g of games) { g.wl === "W" ? s.w++ : s.l++; s.sec += g.sec; F.forEach(f => (s[f] += Number(g[f]) || 0)); }
    s.min = `${Math.floor(s.sec / 60)}:${String(s.sec % 60).padStart(2, "0")}`; delete s.sec;
    seasons.push(s);
  }
  seasons.sort((a, b) => (a.season < b.season ? -1 : 1));
  return { seasons, gamelogs };
}

const kst = new Date(Date.now() + 9 * 3600e3).toISOString();
const today = kst.slice(0, 10).replace(/-/g, ".");
const now = today + " " + kst.slice(11, 16);

let raw;
try { raw = await direct(); console.log("직접 호출 성공"); }
catch (e) { console.log("직접 호출 실패 → 브라우저 방식:", e.message); raw = await viaBrowser(); }

const next = shape(raw);
if (!next.seasons.length) throw new Error("받은 기록이 비어 있어요. 기존 data.json을 그대로 둡니다.");

const prev = fs.existsSync("data.json") ? JSON.parse(fs.readFileSync("data.json", "utf8")) : {};
// 안전장치: 이미 있던 시즌이 사라지거나 경기 수가 줄었으면 KBL 쪽 데이터가 잘못 온 것으로 보고 저장하지 않는다.
for (const s of prev.seasons || []) {
  const n = next.seasons.find(x => x.season === s.season);
  if (!n || n.g < s.g) throw new Error(`${s.season} 기록이 ${s.g}경기 → ${n ? n.g : 0}경기로 줄었어요. 잘못 받은 것 같아 기존 data.json을 그대로 둡니다.`);
}
const changed = JSON.stringify({ s: prev.seasons, g: prev.gamelogs }) !== JSON.stringify({ s: next.seasons, g: next.gamelogs });
const data = { updatedAt: changed ? today : (prev.updatedAt || today), lastCheck: now, lastResult: changed ? "새 기록 반영" : "변동 없음", ...next };
fs.writeFileSync("data.json", JSON.stringify(data, null, 1) + "\n");
console.log(changed ? "새 기록 반영" : "변동 없음", next.seasons.map(s => `${s.season} ${s.g}경기 ${s.pts}점`).join(" / "));
