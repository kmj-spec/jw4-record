// 앱의 버튼으로 받은 기사 제목을 처리한다.
// HIDE: news-hide.json에 적고 news.json에서 뺀다(다시 받아와도 넣지 않음).
// APPROVE: news-ok.json에 적고 news.json에서 게시(ok) 상태로 바꾼다.
import fs from "node:fs";

const key = t => t.replace(/\s+/g, "");
const read = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : d);
const write = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 1) + "\n");
const news = read("news.json", { items: [] });

const hide = (process.env.HIDE || "").trim();
if (hide) {
  const h = read("news-hide.json", { titles: [] });
  if (!h.titles.includes(key(hide))) h.titles.push(key(hide));
  write("news-hide.json", h);
  news.items = news.items.filter(x => key(x.title) !== key(hide));
  console.log("기사 빼기:", hide);
}

const approve = (process.env.APPROVE || "").trim();
if (approve) {
  const o = read("news-ok.json", { titles: [] });
  if (!o.titles.includes(key(approve))) o.titles.push(key(approve));
  write("news-ok.json", o);
  news.items.forEach(x => { if (key(x.title) === key(approve)) x.ok = true; });
  console.log("기사 게시:", approve);
}

if (fs.existsSync("news.json")) write("news.json", news);
