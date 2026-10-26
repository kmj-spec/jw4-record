// 박정웅 선수 관련 기사 목록(제목·언론사·날짜·링크)을 구글 뉴스 RSS에서 받아 news.json에 저장한다.
// 본문은 가져오지 않는다. 실패하면 기존 news.json을 그대로 둔다.
import fs from "node:fs";

const QUERIES = ["박정웅 정관장", "박정웅 농구", "박정웅 KBL"];
// 동명이인을 거르려고 제목이나 요약에 농구 관련 말이 함께 있는 기사만 남긴다.
const MUST = /박정웅/;
const ALSO = /정관장|농구|KBL|프로농구|안양|가드|드래프트|D리그/;
const KEEP = 20;
// 팬 사이트·블로그·커뮤니티 글은 받지 않는다. 아래 언론사 이름이 들어간 출처만 남긴다.
// 새 언론사를 추가하려면 이 목록에 이름을 넣으면 된다.
const PRESS = [
  "점프볼", "루키", "바스켓코리아", "연합뉴스", "뉴시스", "뉴스1", "스포츠조선", "스포츠서울", "스포츠동아", "스포츠경향",
  "스포츠월드", "스포츠한국", "스포탈코리아", "스포티비", "SPOTV", "엑스포츠", "OSEN", "마이데일리", "일간스포츠", "STN",
  "MK스포츠", "매일경제", "한국경제", "머니투데이", "스타뉴스", "조이뉴스", "더게이트", "인터풋볼", "베스트일레븐", "데일리안",
  "조선일보", "중앙일보", "동아일보", "한겨레", "경향신문", "국민일보", "서울신문", "세계일보", "한국일보", "문화일보",
  "헤럴드경제", "아시아경제", "이데일리", "파이낸셜뉴스", "서울경제", "노컷뉴스", "뉴스핌", "아이뉴스24", "서울Pn",
  "KBS", "MBC", "SBS", "JTBC", "YTN", "MBN", "경기일보", "인천일보", "경인일보", "중부일보", "기호일보",
];
const isPress = s => PRESS.some(p => s.toLowerCase().includes(p.toLowerCase()));
const key = t => t.replace(/\s+/g, "");
// 사용자가 앱에서 × 로 뺀 기사(제목 기준). 다시 받아와도 넣지 않는다.
const hidden = new Set(fs.existsSync("news-hide.json") ? JSON.parse(fs.readFileSync("news-hide.json", "utf8")).titles || [] : []);
// 처음 들어온 시각(added)을 기억해 두었다가 화면에서 48시간 동안 N 표시를 한다.
const prev = new Map((fs.existsSync("news.json") ? JSON.parse(fs.readFileSync("news.json", "utf8")).items || [] : []).map(x => [key(x.title), x]));
const now = new Date().toISOString();

const unescape = s => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? unescape(m[1]).trim() : ""; };

async function search(q) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`;
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const xml = await r.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const source = tag(it, "source");
    let title = tag(it, "title");
    while (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
    const desc = tag(it, "description").replace(/<[^>]+>/g, " ");
    return { title, source, link: tag(it, "link"), date: new Date(tag(it, "pubDate")).toISOString(), text: title + " " + desc };
  });
}

const all = [];
for (const q of QUERIES) {
  try { all.push(...await search(q)); }
  catch (e) { console.log("검색 실패:", q, e.message); }
}
const seen = new Set();
const items = all
  .filter(x => MUST.test(x.text) && ALSO.test(x.text) && isPress(x.source) && x.link && !Number.isNaN(Date.parse(x.date)))
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .filter(x => { const k = key(x.title); if (seen.has(k) || hidden.has(k)) return false; seen.add(k); return true; })
  .slice(0, KEEP)
  .map(({ title, source, link, date }) => {
    const old = prev.get(key(title));
    return { title, source, link, date, added: old ? (old.added || old.date) : (prev.size ? now : date) };
  });

if (!items.length) { console.log("받은 기사가 없어요. 기존 news.json을 그대로 둡니다."); process.exit(0); }
fs.writeFileSync("news.json", JSON.stringify({ items }, null, 1) + "\n");
console.log(`기사 ${items.length}개`, items.slice(0, 3).map(x => `${x.date.slice(0, 10)} ${x.title}`).join(" / "));
