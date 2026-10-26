// 박정웅 선수 관련 기사 목록(제목·언론사·날짜·링크)을 구글 뉴스 RSS에서 받아 news.json에 저장한다.
// 본문은 가져오지 않는다. 실패하면 기존 news.json을 그대로 둔다.
import fs from "node:fs";

const QUERIES = ["박정웅 정관장", "박정웅 농구", "박정웅 KBL"];
// 동명이인을 거르려고 제목이나 요약에 농구 관련 말이 함께 있는 기사만 남긴다.
const MUST = /박정웅/;
const ALSO = /정관장|농구|KBL|프로농구|안양|가드|드래프트|D리그/;
const KEEP = 20;

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
    if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
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
  .filter(x => MUST.test(x.text) && ALSO.test(x.text) && x.link && !Number.isNaN(Date.parse(x.date)))
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .filter(x => { const k = x.title.replace(/\s+/g, ""); if (seen.has(k)) return false; seen.add(k); return true; })
  .slice(0, KEEP)
  .map(({ title, source, link, date }) => ({ title, source, link, date }));

if (!items.length) { console.log("받은 기사가 없어요. 기존 news.json을 그대로 둡니다."); process.exit(0); }
fs.writeFileSync("news.json", JSON.stringify({ items }, null, 1) + "\n");
console.log(`기사 ${items.length}개`, items.slice(0, 3).map(x => `${x.date.slice(0, 10)} ${x.title}`).join(" / "));
