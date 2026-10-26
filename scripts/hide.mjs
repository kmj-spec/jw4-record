// 앱의 × 버튼으로 받은 기사 제목을 news-hide.json에 적고 news.json에서 바로 뺀다.
import fs from "node:fs";

const title = (process.env.HIDE || "").trim();
if (!title) process.exit(0);
const key = t => t.replace(/\s+/g, "");
const hide = fs.existsSync("news-hide.json") ? JSON.parse(fs.readFileSync("news-hide.json", "utf8")) : { titles: [] };
if (!hide.titles.includes(key(title))) hide.titles.push(key(title));
fs.writeFileSync("news-hide.json", JSON.stringify(hide, null, 1) + "\n");
if (fs.existsSync("news.json")) {
  const news = JSON.parse(fs.readFileSync("news.json", "utf8"));
  news.items = (news.items || []).filter(x => key(x.title) !== key(title));
  fs.writeFileSync("news.json", JSON.stringify(news, null, 1) + "\n");
}
console.log("기사 빼기:", title);
