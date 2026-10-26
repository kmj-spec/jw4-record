# 정웅이 기록

안양 정관장 박정웅 선수(KBL 선수번호 291746)의 KBL 정규시즌 기록을 보는 개인용 정적 페이지.

- 주소: Vercel 프로젝트 `winningwoong` → https://winningwoong.vercel.app (대학가자·자란다와 같은 Vercel 팀의 별도 프로젝트). `vercel.json`은 설치·빌드 없이 파일을 그대로 내보내는 설정. 예전 GitHub Pages 주소(kmj-spec.github.io/jw4-record)는 사용자 정보(kmj)가 보여 옮김.

## 구조
- `index.html` — 페이지 하나. 순서: 통산 누적 → 이번 시즌 평균 → 최근 기사(5개, '더 보기' → 새 화면 `#news`: 연도별 탭, 한 페이지 10개·페이지 번호) → 경기별 기록(최근 5경기, 더 보기) → 시즌별 성장(접힘) → 시즌별 기록표(접힘, 누적/평균). 펼친 칸은 기기에 기억(localStorage `jwOpen`). 시즌 표의 줄을 누르면 그 시즌 경기별 기록으로 바뀐다.
- `scripts/news.mjs` — 구글 뉴스 RSS에서 '박정웅'+농구 관련 말이 함께 있는 기사의 제목·언론사·날짜·링크만 받아 `news.json`(최근 20개)에 저장. 한 번 게시(ok)한 기사는 검색에서 밀려나도 계속 보관(연도별 모아보기용). 본문은 가져오지 않음. 출처가 `PRESS` 목록(언론사 이름)에 있는 기사만 받음(팬 사이트·블로그 제외). 실패하면 기존 파일 유지. 처음 들어온 시각 `added`를 기록해 화면에서 48시간 동안 빨간 N 표시(단, 발행 후 3일 안에 들어온 기사만). 새로 받은 기사는 `ok:false`(확인 대기)로 들어오고, 열쇠(`jwToken`)가 있는 기기에만 '확인 대기' 상자로 보임. 게시 → 워크플로 `approve` 입력 → `scripts/news-edit.mjs`가 `news-ok.json`에 적고 ok:true. 빼기·× → `hide` 입력 → `news-hide.json`에 적고 news.json에서 뺌(다시 안 들어옴). 두 목록 모두 공백 뺀 제목 기준. 방문자에게는 ok인 기사만 보임.
- `data.json` — `{updatedAt, lastCheck, lastResult, seasons:[시즌별 누적], gamelogs:{시즌명:[경기별]}}`.
- `scripts/fetch.mjs` — KBL 데이터 서버(kbl-api.sports2i.com)에서 기록을 받아 `data.json`을 갱신. 직접 호출이 막히면 Playwright로 kbl.or.kr을 열고 페이지 안에서 호출한다. 안전장치: 기존 시즌이 사라지거나 경기 수가 줄면 저장하지 않고 실패(기존 data.json 유지).
- `.github/workflows/update.yml` — 매일 한국 시간 자정에 `fetch.mjs` 실행 후 바뀐 `data.json`을 커밋. Actions 탭에서 수동 실행도 가능.
- 수동 업데이트: 주소 끝에 `#key`를 붙여 열면 GitHub 토큰(이 저장소 Actions 읽기/쓰기만)을 그 기기 localStorage(`jwToken`)에 저장. 토큰이 있는 기기에만 맨 위 ↻ 버튼이 보이고, 누르면 워크플로를 실행한 뒤 data.json이 바뀔 때까지 10초마다 다시 읽는다.
- 방문자 수: 무료 공개 카운터 abacus(`https://abacus.jasoncameron.dev`, 네임스페이스 `winningwoong-v2`, 키 `total`·`d-YYYY-MM-DD`(한국 날짜))에 숫자만 센다. 한 기기 하루 1번(localStorage `jwSeen`), 열쇠 있는 기기·winningwoong.vercel.app 이외 주소(Vercel 배포 미리보기 로봇)·navigator.webdriver는 세지 않음. (v1 `winningwoong-jw4`는 로봇이 세어져 버림) 열쇠 있는 기기에만 맨 아래에 오늘·어제·누적과 최근 7일 막대.
- 앱 설치 안내: 휴대폰에서 앱으로 열지 않았을 때 팝업(아이폰·안드로이드·카카오톡 등 앱 속 브라우저별 안내). 맨 아래 '앱으로 설치'로 다시 열 수 있다. 하루/일주일 보지 않기(localStorage `jwInstallUntil`). 주소 끝 `#popup`이면 앱 안·PC에서도 미리 보기. `sw.js`는 설치용(캐시 안 함).

## 데이터 서버 메모
- 시즌 목록: `GET https://kbl-api.sports2i.com/api/v1/Common/recent-seasons?seriesCd=1`
- 경기별 기록: `GET .../players/categories/game/{시즌코드}/{시즌코드-1}/291746` → `RegularGameRecords`
- 시즌별 기록(선수 페이지 '시즌별' 탭): `GET .../players/categories/season/291746` → `RegularSeasonRecords`, `DLeageSeasonRecords`, `RegularSeasonPlayoffRecords`(플레이오프), `RegularSeasonChampionRecords`(챔프전) 등 (각각 Avgs·Sums 함께). 2026-10-26 기준 플레이오프·챔프전은 0건 → 사용자 요청: 실제로 플레이오프 기록이 생기면 그때 정규시즌과 따로 보여 주는 기능을 만든다. 경기별 주소(`categories/game`)에는 플레이오프 칸이 없음. D리그 경기별은 `DLeageGameRecords`(2025-26 D리그 8경기).
- 시즌 코드: 2024-2025=45, 2025-2026=47, 2026-2027=49 (D리그는 짝수)
- 필드: fg/fgA=2점 성공/시도, threep/threepA=3점, ft/ftA=자유투, oR/dR/aS/sT/bS/tO=공리/수리/어시/스틸/블록/턴오버, foulTot=파울, playSec=출전 초, margin=+/-, awayTeam=상대 팀코드
- 팀코드: 06 수원 KT, 10 울산 현대모비스, 16 원주 DB, 35 서울 삼성, 50 창원 LG, 55 서울 SK, 60 부산 KCC, 64 대구 한국가스공사, 66 고양 소노, 70 안양 정관장
- 2026-10-26 기준 확인값: 통산 77경기 284점, 2026-27 9경기 31점 / 2025-26 49경기 224점 / 2024-25 19경기 29점

## 사용자
- **선수 본인(박정웅)에게 공유된 앱.** 화면에 보이는 변경은 바로 main에 올리지 말 것: 먼저 다른 브랜치에 올려 Vercel 미리보기(또는 캡처)로 사용자 확인 → 사용자가 "반영해 줘" 하면 main에 합친다. 화면에 영향 없는 메모·시험용 파일도 올리기 전에 사용자에게 묻는다.
- 한국어로 설명, 화면 문구도 한국어. 영어 약어는 괄호로 한글 병기.
- 누적(통산) 기록을 가장 중요하게 봄.
