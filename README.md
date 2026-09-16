# 랩코트 키우기 — 실험복에서 노벨상까지

프린세스 메이커식 월간 일정 육성 시뮬레이션. 학부 인턴으로 랩에 들어와 교수, 석좌교수를 거쳐 노벨상을 받는 것이 유일한 목표다.
프레임워크 없이 HTML + CSS + JS 3개 파일로 되어 있고, PWA(홈 화면 설치형 웹앱)로 동작한다.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 화면 구조 (시작·게임·엔딩 3화면) |
| `style.css` | 디자인 토큰, 라이트/다크 테마, 반응형 레이아웃 |
| `game.js` | 게임 규칙 전부 (상태, 행동, 이벤트, 승급, 노벨상 판정, 저장) |
| `manifest.webmanifest`, `sw.js`, `icons/` | 앱 설치·오프라인 지원 |

## 1. 로컬에서 실행

서비스 워커 때문에 파일을 더블클릭해 열면 일부 기능이 꺼진다. 로컬 서버로 연다.

```bash
cd labcoat-app && python3 -m http.server 5173
```

브라우저에서 http://localhost:5173 접속. Claude Code에서는 `.claude/launch.json`의 `labcoat` 구성으로 미리보기를 열 수 있다.

## 2. 설치형 앱으로 쓰기 (가장 빠른 길)

인터넷에 올려두면 스토어 없이 앱처럼 설치된다.

1. 정적 호스팅에 폴더를 그대로 올린다. GitHub Pages, Netlify, Vercel, Cloudflare Pages 모두 드래그 앤 드롭으로 끝난다. HTTPS가 필수인데 이 서비스들은 기본 제공한다.
2. Mac/Windows Chrome·Edge: 주소창 오른쪽 "앱 설치" 아이콘 클릭. 독/작업표시줄에 아이콘이 생기고 별도 창으로 뜬다.
3. iPhone Safari: 공유 버튼 → "홈 화면에 추가". 아이콘은 `icons/icon-180.png`가 쓰인다.
4. Android Chrome: 메뉴 → "홈 화면에 추가" 또는 자동 설치 배너.

## 3. 앱스토어용 네이티브 앱으로 감싸기 (Capacitor)

iOS/Android 스토어에 올리려면 Capacitor로 이 웹앱을 네이티브 셸에 넣는다. Node.js와 Xcode(iOS) 또는 Android Studio가 필요하다.

```bash
cd labcoat-app && npm init -y && npm i @capacitor/core @capacitor/cli && npx cap init "랩코트 키우기" ai.hits.labcoat --web-dir .
```

```bash
cd labcoat-app && npm i @capacitor/ios && npx cap add ios && npx cap open ios
```

Xcode가 열리면 시뮬레이터나 실기기에서 실행 버튼을 누르면 된다. Android는 `@capacitor/android`와 `npx cap add android`로 동일하다.
웹 파일을 수정한 뒤에는 `npx cap sync`로 네이티브 프로젝트에 복사한다.

주의: 네이티브 앱 안에서는 Google Fonts를 불러올 수 없을 수 있으니, 스토어 출시 전에 폰트 파일(Do Hyeon, IBM Plex Sans KR)을 내려받아 `fonts/` 폴더에 넣고 `style.css`의 `@font-face`로 바꾸는 것이 안전하다.

## 4. Mac 데스크톱 앱 (Tauri)

메뉴바 앱처럼 만들고 싶다면 Tauri가 가볍다. Rust 툴체인 설치 후:

```bash
cd labcoat-app && npm create tauri-app@latest -- --template vanilla
```

생성된 프로젝트의 `src/`를 이 폴더 내용으로 바꾸고 `npm run tauri dev`로 실행한다.

## 게임 규칙 요약

- 한 턴에 일정 슬롯 3개를 채운다. 대학원 시절은 한 달(상순·중순·하순), 교수 임용 뒤에는 한 분기(3개월).
- 능력치: 지식, 실험력, 글쓰기, 인맥, 명성, 체력, 멘탈. 자원: 연구비, 데이터, 논문, 인용, 학생, 발견 조각, 돌파구.
- 승급: 학부 인턴 → 석사(1년) → 박사(석사 2년) → 박사후연구원(박사 4년) → 조교수(임용 지원) → 부교수(5년) → 정교수(5년) → 석좌교수(3년).
- 명성 상한 = 25 + 논문 수/2 + 돌파구×15 + 수상×3 (+정교수 5). 기조연설로 명성을 올려도 업적이 없으면 상한에 막힌다.
- 노벨상: 돌파구 1편 이상, 명성 85 이상, 인용 3000 이상이면 매년 10월 판정. 확률은 명성, 돌파구 수, 후보 연차에 따라 4~35%.
- 번아웃(멘탈 0)은 휴직으로 처리되고 게임은 계속된다. 65세에 은퇴하면 노벨상 없이 종료.

## 밸런스 조정 포인트

`game.js`에서 숫자 하나로 바뀌는 것들:

- 노벨상 난이도: `checkNobel()`의 `eligible` 조건과 확률식 `p`.
- 발견 조각 확률: `actExperiment()`의 `0.008+S.knowledge/6000`, `actDirect()`의 `0.01+...`.
- 명성 상한: `fameCap()`.
- 승급 조건: `checkPromotion()`.

브라우저 콘솔에서 `LABCOAT.newGame()` 후 `LABCOAT.autoplay(100)`을 실행하면 단순 전략 봇이 100턴을 자동 진행하고 요약 상태를 돌려준다. 밸런스를 바꾼 뒤 확인용으로 쓴다.
