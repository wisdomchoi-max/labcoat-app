/* 랩코트 키우기 — 실험복에서 노벨상까지
   프린세스 메이커식 월간 일정 육성 시뮬레이션 */
(function(){
'use strict';
const $ = s => document.querySelector(s);
const rnd = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const chance = p => Math.random()<p;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];

/* ---------------- 상수 ---------------- */
const START_AGE=22, RETIRE_AGE=65;
const MAJORS = [
  {id:'bio',   name:'분자생물학', desc:'실험력 +10, 체력 +5. 셀 컨탐과 친해진다.',          bonus:{hands:10,stamina:5}},
  {id:'chem',  name:'유기화학',   desc:'실험력 +6, 지식 +6. 컬럼은 인생이다.',             bonus:{hands:6,knowledge:6}},
  {id:'comp',  name:'계산과학',   desc:'지식 +10, 글쓰기 +5. 실험복은 사실 장식이다.',      bonus:{knowledge:10,writing:5}},
  {id:'pharm', name:'약리학',     desc:'인맥 +8, 멘탈 +5. 제약사 세미나에 자주 불려간다.',  bonus:{network:8,mental:5}},
];
const COATS = ['#3B74D9','#D95C3B','#5A9E4B','#8C5AC8','#E0A52A','#3F3F46'];
const STATS = [
  {k:'knowledge',l:'지식'},{k:'hands',l:'실험력'},{k:'writing',l:'글쓰기'},{k:'network',l:'인맥'},
  {k:'fame',l:'명성',fame:true},
  {k:'stamina',l:'체력',vital:true},{k:'mental',l:'멘탈',vital:true},
];
const STAGES = ['학부 인턴','석사과정','박사과정','박사후연구원','조교수','부교수','정교수','석좌교수'];
const TIER = ['','하위','중위','상위','최상위'];
const LABELS={knowledge:'지식',hands:'실험력',writing:'글쓰기',network:'인맥',fame:'명성',stamina:'체력',mental:'멘탈',funding:'연구비',data:'데이터',papers:'논문',citations:'인용',students:'학생',pieces:'발견 조각',breakthroughs:'돌파구'};

let S=null;          // 게임 상태
let plan=[null,null,null]; // 이번 턴 일정
let lastPlan=null;

/* ---------------- 상태 ---------------- */
function newState(name, majorId, shirt){
  const m = MAJORS.find(x=>x.id===majorId)||MAJORS[0];
  const s = {
    name, major:m.id, shirt,
    month:1, stage:0, stageSince:1,
    knowledge:10, hands:10, writing:8, network:6, fame:0, stamina:80, mental:75,
    funding:60, data:0, papers:0, citations:0, students:0, pieces:0, breakthroughs:0, alumni:0,
    experiments:0, fails:0, burnouts:0, submissions:[], stains:[], awards:[], lastNobelYear:-1, nobelYears:0,
    log:[], ended:false,
    report:{when:'입성', title:'첫 출근', rows:[{slot:'', title:'', body:'교수님이 실험복 한 장을 건네주셨다. "일단 피펫부터 잡아봐." 이번 달 일정을 세 칸 채우고 진행을 눌러보자.'}], delta:[]},
  };
  for(const k in m.bonus) s[k]+=m.bonus[k];
  return s;
}
const isProf = ()=>S.stage>=4;
const fameCap = ()=>Math.min(100, 25 + Math.floor(S.papers/2) + S.breakthroughs*15 + S.awards.length*3 + (S.stage>=6?5:0));
function gainFame(n){ if(S.fame>=fameCap()) return false; S.fame=Math.min(fameCap(), S.fame+n); return true; }
const turnLen = ()=>isProf()?3:1;
const age = ()=>START_AGE+Math.floor((S.month-1)/12);
const yearOf = m=>Math.floor((m-1)/12);
const monOf = m=>((m-1)%12)+1;
function slotLabels(){
  if(isProf()) return [0,1,2].map(i=>monOf(S.month+i)+'월');
  return ['상순','중순','하순'];
}
function whenText(m){ return `${yearOf(m)+1}년차 ${monOf(m)}월`; }

/* ---------------- 아바타 ---------------- */
const GRID = [
"....HHHH....","...HHHHHH...","...HSSSSH...","...HSESES...","...HSSSSH...","....SSSS....",
"..CCCWWCCC..",".CCCCWWCCCC.",".CCCCWWCCCC.",".CCCCWWCCCC.",".SCCCWWCCCS.","..CCCWWCCC..",
"..CCCCCCCC..","..PP....PP..","..PP....PP..","..BB....BB..",
];
function hairColor(s){
  const a = START_AGE+Math.floor((s.month-1)/12);
  if(a>=60) return '#C9C9C9'; if(a>=50) return '#8A8A8A'; if(a>=40) return '#4A3C33'; return '#2B2118';
}
function drawAvatar(canvas, s, medal){
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,12,16);
  const col = {H:hairColor(s),S:'#F1C9A5',E:'#1B1B1B',C:'#F7F7F2',W:s.shirt,P:'#3A4756',B:'#22252A'};
  const goggles = s.hands>=40 && s.stage<4;
  const glasses = s.stage>=4;
  for(let y=0;y<16;y++) for(let x=0;x<12;x++){
    const c = GRID[y][x]; if(c==='.') continue;
    if(y===3 && c!=='H'){
      if(goggles){ ctx.fillStyle='#4FB8D0'; ctx.fillRect(x,y,1,1); continue; }
      if(glasses && (x===4||x===7)){ ctx.fillStyle='#3A3A3A'; ctx.fillRect(x,y,1,1); continue; }
    }
    ctx.fillStyle = col[c]; ctx.fillRect(x,y,1,1);
  }
  for(const st of s.stains){ ctx.fillStyle = st.c; ctx.fillRect(st.x, st.y, 1, 1); }
  for(let i=0;i<Math.min(s.papers,3);i++){ ctx.fillStyle='#E0B83A'; ctx.fillRect(2, 7+i, 1, 1); }
  if(s.stage>=4){ ctx.fillStyle='#1F2A36'; ctx.fillRect(5,6,2,3); }           // 넥타이
  if(s.stage>=3 && s.stage<4){ ctx.fillStyle='#2F6FDB'; ctx.fillRect(8,7,2,1); } // 포닥 명찰
  if(s.breakthroughs>0){ ctx.fillStyle='#E8483B'; ctx.fillRect(8,7,1,1); }    // 돌파구 리본
  if(s.stamina<30){ ctx.fillStyle='#8A5A3B'; ctx.fillRect(10,9,1,1); ctx.fillStyle='#FFFFFF'; ctx.fillRect(10,8,1,1); }
  if(s.mental<30){ ctx.fillStyle='#B7A2B4'; ctx.fillRect(5,4,1,1); ctx.fillRect(7,4,1,1); }
  if(medal){ ctx.fillStyle='#F2C230'; ctx.fillRect(8,8,2,2); ctx.fillStyle='#2F6FDB'; ctx.fillRect(8,7,2,1); }
}
function addStain(s){
  const spots=[[2,7],[3,8],[8,8],[9,9],[3,10],[7,11],[4,12],[7,12],[2,9],[9,7]];
  const free = spots.filter(([x,y])=>!s.stains.some(st=>st.x===x&&st.y===y));
  if(!free.length) return;
  const [x,y]=pick(free);
  s.stains.push({x,y,c:pick(['#E8D36B','#D98BB0','#9FCBE8','#C9A66B'])});
}

/* ---------------- 행동 정의 ---------------- */
/* phase: 'grad'(인턴~포닥) / 'prof'(교수) / 'both'. need(S)는 일정에 넣을 수 있는지(현재 상태 기준) */
const ACTIONS = [
  {id:'exp',   phase:'grad', ic:'🧪', name:'실험하기',   hint:'데이터 획득, 실험력 상승. 체력 -9'},
  {id:'read',  phase:'grad', ic:'📚', name:'논문 읽기',  hint:'지식 상승. 체력 -3, 멘탈 -2'},
  {id:'write', phase:'both', ic:'✍️', name:'논문 쓰기',  hint:s=>`데이터 ${isProf()?20:15}개 소모, 투고. 발견 조각 3개면 돌파구 논문`},
  {id:'conf',  phase:'grad', ic:'✈️', name:'학회 참석',  hint:'인맥 상승, 협업 기회. 연구비 -30', need:s=>s.funding<30?'연구비 부족':null},
  {id:'pi',    phase:'grad', ic:'👨‍🏫', name:s=>s.stage===3?'PI 미팅':'교수님 미팅', hint:'조언… 혹은 갈굼. 결과 랜덤'},
  {id:'grant', phase:'both', ic:'📝', name:'과제 제안서', hint:'연구비 확보 시도. 글쓰기 소폭 상승'},
  {id:'ta',    phase:'grad', ic:'🧑‍🏫', name:'조교 근무',  hint:'연구비 +25. 체력 -8'},
  {id:'apply', phase:'grad', ic:'🏛️', name:'교수 임용 지원', hint:'논문 6편·인맥 40·포닥 2년 이상. 성공하면 조교수', only:s=>s.stage===3,
     need:s=>s.papers<6?`논문 부족 (${s.papers}/6)`:s.network<40?`인맥 부족 (${s.network}/40)`:(s.month-s.stageSince)<24?`포닥 ${Math.floor((s.month-s.stageSince)/12)}년차 (2년 필요)`:null},
  {id:'rest',  phase:'both', ic:'☕', name:s=>isProf()?'휴가·안식':'휴식', hint:s=>isProf()?'체력 +25, 멘탈 +15, 지식 +2':'체력 +20, 멘탈 +10'},
  // 교수 전용
  {id:'direct',phase:'prof', ic:'🔬', name:'연구 지휘',   hint:'학생 수에 비례해 데이터 획득. 발견 조각 확률'},
  {id:'recruit',phase:'prof',ic:'🧑‍🎓', name:'대학원생 모집', hint:'학생 +1 (최대 8). 연구비 100 필요. 인건비 분기 15/명', need:s=>s.funding<100?'연구비 부족':s.students>=8?'랩이 꽉 찼다':null},
  {id:'lecture',phase:'prof',ic:'🧑‍🏫', name:'강의',       hint:'연구비 +50, 명성 +1. 체력 -5'},
  {id:'keynote',phase:'prof',ic:'🎤', name:'기조연설',   hint:s=>`명성 +1~3 (상한 ${fameCap()}: 논문·돌파구·수상이 올린다). 연구비 -40`, need:s=>s.fame<15?`명성 부족 (${s.fame}/15)`:s.funding<40?'연구비 부족':null},
  {id:'editor',phase:'prof', ic:'📋', name:'저널 편집위원', hint:'명성 +1, 인맥 +2. 멘탈 -4. 명성 10 이상', need:s=>s.fame<10?`명성 부족 (${s.fame}/10)`:null},
];
const actName = a => typeof a.name==='function'?a.name(S):a.name;
const actHint = a => typeof a.hint==='function'?a.hint(S):a.hint;
function availableActions(){
  const ph = isProf()?'prof':'grad';
  return ACTIONS.filter(a=>(a.phase===ph||a.phase==='both') && (!a.only||a.only(S)));
}

/* ---------------- 슬롯 실행 ---------------- */
/* 각 함수는 {title, body} 반환. 체력이 부족하면 강제 휴식 */
function runSlot(id){
  if(S.stamina<8 && id!=='rest'){
    S.stamina+=15; S.mental+=4;
    return {title:'강제 휴식', body:'몸이 먼저 파업했다. 계획은 계획일 뿐, 침대에서 하루를 보냈다.'};
  }
  switch(id){
    case 'exp': return actExperiment();
    case 'read': return actRead();
    case 'write': return actWrite();
    case 'conf': return actConf();
    case 'pi': return actPI();
    case 'grant': return actGrant();
    case 'ta': return actTA();
    case 'apply': return actApply();
    case 'rest': return actRest();
    case 'direct': return actDirect();
    case 'recruit': return actRecruit();
    case 'lecture': return actLecture();
    case 'keynote': return actKeynote();
    case 'editor': return actEditor();
  }
  return {title:'?', body:''};
}

function actExperiment(){
  S.experiments++; S.stamina-=9; S.hands+= S.hands<60?rnd(1,2):(chance(0.5)?1:0);
  const failP = clamp(0.32 - S.hands/250, 0.06, 0.32);
  if(chance(failP)){
    S.fails++; S.mental-=6; addStain(S);
    return {title:'실험 실패', body:pick([
      '겔에 밴드가 하나도 안 나왔다. 로딩 다이 색만 예쁘다.',
      '컨트롤이 양성으로 나왔다. 무엇을 믿어야 하는가.',
      '원심분리기 균형을 안 맞춰서 랩 전체가 흔들렸다. 선배의 눈빛이 아직도 생생하다.',
      '시약을 잘못 넣었다. 3일 치 실험이 증발했다.',
      '세포가 죄다 컨탐됐다. 배지가 노랗다.'])};
  }
  let d = Math.floor(S.hands/45)+rnd(0,1);
  let title='실험 성공', body=pick([
    '밴드가 딱 예상한 위치에 떴다. 겔 사진을 세 번 찍었다.',
    '적정 곡선이 교과서처럼 나왔다. 오늘은 퇴근이 빠르다.',
    '용량-반응 곡선이 S자로 깔끔하게 그려졌다. 결과를 노트에 정성껏 붙였다.',
    'IC50이 재현됐다. 비로소 데이터를 믿을 수 있게 됐다.']);
  if(S.stage>=2 && chance(0.008+S.knowledge/6000)){ d+=2; S.pieces++; S.mental+=5; title='뜻밖의 발견'; body='예상과 정반대 결과가 나왔는데, 그게 더 재미있다. 발견 조각 +1.'; }
  if(chance(0.3)) addStain(S);
  S.data+=d;
  return {title, body: body+` 데이터 +${d}.`};
}
function actRead(){
  S.stamina-=3; S.mental-=2; S.knowledge+= S.knowledge<60?rnd(2,3):(chance(0.6)?1:0);
  if(chance(0.15)){ S.writing+=2; return {title:'논문 정독', body:'좋은 논문 한 편을 통독했다. 서론 구조가 머리에 박혔다. 글쓰기 +2.'}; }
  return {title:'논문 읽기', body:pick([
    '리뷰 논문 세 편. 아는 것이 늘어난 만큼 모르는 것도 늘었다.',
    '경쟁 그룹 논문을 읽었다. 우리랑 비슷한데 한 발 빠르다. 조급하다.',
    '30년 전 고전 논문. 그때는 이걸 손으로 다 했다니.',
    '저널 클럽 준비로 논문을 뜯어 읽었다. 그림 4b가 수상하다.'])};
}
function actWrite(){
  const need = isProf()?20:15;
  if(S.data<need) return {title:'집필 보류', body:`데이터가 ${S.data}개뿐이라 (${need}개 필요) 원고를 열지 못했다. 대신 그림 틀만 잡아뒀다.`};
  S.stamina-=6; S.mental-=4; S.data-=need; S.writing+= S.writing<60?rnd(1,2):(chance(0.5)?1:0);
  const quality = isProf() ? (S.knowledge+S.writing+S.fame)/3 : (S.knowledge+S.writing+S.hands)/3;
  let tier = quality>=70?3:quality>=45?2:1;
  let bt=false;
  if(S.pieces>=3){ S.pieces-=3; tier=4; bt=true; }
  S.submissions.push({left:isProf()?rnd(1,2):rnd(2,4), tier, revised:false, bt});
  if(bt) return {title:'돌파구 논문 투고', body:`발견 조각 셋을 하나의 이야기로 엮었다. 원고를 읽은 ${isProf()?'학생들':'교수님'}이 한동안 말이 없었다. 최상위 저널에 투고.`};
  return {title:'논문 투고', body:pick([
    '새벽 세 시, 커버레터 마지막 줄을 고쳤다. 제출 버튼을 눌렀다.',
    '그림 하나를 열여섯 번 고쳤다. 폰트가 미묘하게 달랐다. 어쨌든 투고했다.',
    '빨간 펜으로 뒤덮인 원고를 다 고치고 투고했다.'])+` ${TIER[tier]} 저널.`};
}
function actConf(){
  S.funding-=30; S.stamina-=5; S.mental+=3; S.network+=rnd(4,7);
  let body = pick([
    '포스터 앞에 세 시간. 다섯 명이 질문했고 두 명은 진짜 관심이 있었다.',
    '커피 브레이크에서 교과서 저자를 만났다. 사진은 못 찍었다.',
    '질문 시간에 손을 들었다. 목소리가 떨렸지만 좋은 질문이었다.']);
  if(chance(0.3)){ const f=rnd(30,60); S.funding+=f; body+=` 공동연구 이야기가 됐다. 연구비 +${f}.`; }
  else if(chance(0.3)){ const d=rnd(3,6); S.data+=d; body+=` 공동연구자가 샘플을 보내줬다. 데이터 +${d}.`; }
  if(S.stage===3 && chance(0.25)){ S.fame+=2; body+=' 발표를 본 교수 몇이 이름을 기억했다. 명성 +2.'; }
  return {title:'학회 참석', body};
}
function actPI(){
  const who = S.stage===3?'PI':'교수님';
  const r=Math.random();
  if(r<0.35){ S.knowledge+=2; S.mental+=5; return {title:`${who} 미팅`, body:'"이 방향이 맞아. 여기서 두 가지만 더 확인해봐." 안개가 걷혔다.'}; }
  if(r<0.65){ S.mental-=8; S.hands+=2; return {title:`${who} 미팅`, body:'"이걸 데이터라고 가져온 거야?" 40분간 랩 미팅 자료가 해부됐다. 배운 건 있다.'}; }
  if(r<0.85){ const f=rnd(30,50); S.funding+=f; return {title:`${who} 미팅`, body:`"과제 하나 붙었어. 인건비 좀 올려줄게." 연구비 +${f}.`}; }
  S.network+=4; return {title:`${who} 미팅`, body:'"다음 주 손님한테 네 결과 좀 설명해줘." 소개받은 사람이 생각보다 거물이었다.'};
}
function actGrant(){
  S.stamina-=6; S.mental-=3; S.writing+=1;
  const p = 0.25 + S.writing/300 + S.network/300 + S.fame/300;
  if(chance(p)){
    const f = isProf()? Math.round(rnd(150,300)*(1+S.students*0.08)) : rnd(100,150);
    S.funding+=f;
    return {title:'과제 선정', body:`제안서가 붙었다. 연구비 +${f}. ${isProf()?'학생들 월급 걱정이 잠시 사라졌다.':'교수님이 처음으로 밥을 사주셨다.'}`};
  }
  return {title:'과제 탈락', body:'"연구의 독창성이 불분명함." 심사의견 한 줄이 온몸을 훑었다. 다음엔 붙인다.'};
}
function actTA(){
  S.funding+=25; S.stamina-=8; S.mental-=2; S.network+=1;
  return {title:'조교 근무', body:pick([
    '학부생 실험 조교. 피펫 잡는 법을 스무 번 설명했다.',
    '채점 80장. 답안에 "교수님 사랑해요"가 세 장 있었다. 점수는 안 줬다.',
    '학부생이 에탄올을 쏟았다. 다행히 불은 안 났다.'])+' 연구비 +25.'};
}
function actApply(){
  S.stamina-=6; S.mental-=4;
  const p = clamp(0.08 + S.papers*0.03 + S.network/250 + S.fame/150, 0.08, 0.6);
  if(chance(p)){
    S.stage=4; S.stageSince=S.month; S.fame+=5; S.mental+=15; S.funding+=200;
    pushLog('조교수 임용');
    return {title:'교수 임용!', body:'임용 통보 메일을 세 번 읽었다. 내 이름이 박힌 연구실 문패, 정착 연구비 200. 이제부터 한 턴은 한 분기다. 학생을 뽑아 랩을 꾸리자.'};
  }
  S.network+=2;
  return {title:'임용 탈락', body:pick(['최종 면접까지 갔다. "내부 사정"이라는 말을 들었다.','발표는 좋았는데 학과 방향과 안 맞는다고 했다. 위원 한 명이 명함을 줬다.'])+' 인맥 +2.'};
}
function actRest(){
  if(isProf()){
    S.stamina+=25; S.mental+=15; S.knowledge+=2;
    return {title:'휴가·안식', body:pick(['메일을 안 봤다. 3일째에 손이 떨렸지만 참았다.','오래 미룬 책을 읽었다. 다음 과제 아이디어가 떠올랐다.','가족 여행. 아이가 "아빠/엄마는 왜 흰 옷만 입어?"라고 물었다.'])};
  }
  S.stamina+=20; S.mental+=10;
  if(chance(0.12)){ S.mental-=5; return {title:'휴식 (실패)', body:'쉬는 날 교수님 카톡. "잠깐 랩 좀 들어와볼 수 있어?" 잠깐이 아니었다.'}; }
  return {title:'휴식', body:pick([
    '하루 종일 잤다. 꿈에서도 피펫을 잡았지만 그래도 쉬었다.',
    '동기들과 치맥. 연구 얘기는 30분만 하기로 했는데 두 시간 했다.',
    '집에 다녀왔다. "그래서 졸업은 언제 하니." 그래도 밥이 맛있었다.',
    '실험복을 세탁했다. 얼룩은 몇 개 안 지워졌다. 훈장이라 치자.'])};
}
/* 교수 전용 */
function actDirect(){
  S.stamina-=6;
  if(S.students===0){ S.hands+=2; const d=rnd(2,4); S.data+=d; return {title:'혼자 실험', body:`학생이 없어 직접 피펫을 잡았다. 손은 아직 기억한다. 데이터 +${d}.`}; }
  let d = Math.ceil(S.students*0.8) + Math.floor(S.hands/40) + rnd(0,2);
  let title='연구 지휘', body=pick([
    '랩 미팅에서 학생 셋의 데이터를 한 줄로 엮었다. 그림이 보인다.',
    '학생이 밤새 돌린 실험 결과를 아침에 함께 봤다. 잘 나왔다.',
    '학생 원고에 빨간 펜. 나도 예전에 이런 걸 받았지.']);
  if(chance(0.01 + S.knowledge/4000 + S.students*0.003)){ d+=3; S.pieces++; S.mental+=5; title='학생의 뜻밖의 발견'; body='학생이 조심스럽게 이상한 결과를 보여줬다. 이상한 게 아니라 새로운 것이었다. 발견 조각 +1.'; }
  if(chance(0.12)){ S.fails++; S.mental-=4; d=Math.max(1,Math.floor(d/2)); body+=' 다만 다른 학생 하나가 시약 로트를 잘못 써서 절반이 날아갔다.'; }
  S.data+=d;
  return {title, body: body+` 데이터 +${d}.`};
}
function actRecruit(){
  S.funding-=100; S.students++; S.mental+=3; S.stamina-=3;
  return {title:'대학원생 모집', body:pick([
    '면접에서 "왜 이 랩인가요"에 "실험복 얼룩이 멋있어서요"라고 답한 학생을 뽑았다.',
    '학회에서 눈여겨본 학부생이 지원했다. 첫날부터 피펫을 잡았다.',
    '타 대학 석사 출신. 손이 빠르다. 랩이 조금 더 시끄러워졐다.'])+` 학생 ${S.students}명.`};
}
function actLecture(){
  S.funding+=50; if(chance(0.4)) gainFame(1); S.stamina-=5; S.mental-=2;
  if(chance(0.2)){ S.mental+=5; return {title:'강의', body:'강의 평가에 "인생 강의"가 세 줄. 그중 하나는 진심 같았다. 연구비 +50.'}; }
  return {title:'강의', body:pick(['출석 부르는 데 5분, 질문 받는 데 40분. 좋은 학기다.','수업 중 실험복 소매에 보드마카가 묻었다. 얼룩 컬렉션 확장.','기말 채점 120장. 대학원생을 시키고 싶었지만 참았다.'])+' 연구비 +50.'};
}
function actKeynote(){
  S.funding-=40; S.stamina-=5; S.mental+=3; S.network+=2;
  if(!gainFame(rnd(1,3))) return {title:'기조연설', body:'박수는 따뜻했지만 새로운 이야기가 없었다. 명성은 업적 위에서만 자란다. (상한 '+fameCap()+')'};
  return {title:'기조연설', body:pick([
    '큰 홀, 첫 슬라이드에 20년 전 겔 사진을 띄웠다. 웃음과 박수.',
    '연설 뒤 질문 줄이 길었다. 한 명은 옛 지도교수였다.',
    '동시통역 부스가 있는 학회였다. 농담이 통역되는지는 확인 못 했다.'])};
}
function actEditor(){
  gainFame(1); S.network+=2; S.mental-=4; S.stamina-=4;
  return {title:'저널 편집위원', body:pick([
    '리뷰어 2번 성향의 심사자에게 "건설적으로 써주세요"라고 회신했다. 업보를 갚는 중이다.',
    '한 달에 원고 열두 편. 좋은 논문은 첫 문단에서 티가 난다.',
    '리젓 메일에 격려 한 줄을 덧붙였다. 예전의 나에게 쓰는 편지였다.'])};
}

/* ---------------- 턴 처리 ---------------- */
function passive(rows){
  S.stamina -= isProf()?4:3;
  if(isProf()){
    const cost=S.students*15;
    S.funding-=cost;
    if(S.funding<0 && S.students>0){ S.students--; S.alumni++; S.funding=0; rows.push({slot:'운영', title:'인건비 부족', body:'월급을 못 줘 학생 하나가 다른 랩으로 옮겼다. 과제를 따야 한다.'}); }
    else if(cost>0) rows.push({slot:'운영', title:'랩 운영', body:`학생 ${S.students}명 인건비 -${cost}.`});
    S.mental-=2; const c = Math.round(S.papers*(0.3+S.fame/80));
    if(c>0) S.citations+=c;
    if(S.students>0){ const d=Math.floor(S.students*S.hands/100); if(d>0) S.data+=d; }
    if(S.students>=3 && chance(0.12)){ S.students--; S.alumni++; S.papers+=1; S.citations+=rnd(5,15); S.fame+=1; rows.push({slot:'졸업', title:'제자 졸업', body:'학생 하나가 박사 학위를 받고 떠났다. 마지막 논문이 함께 나왔다. 논문 +1.'}); }
  } else {
    S.mental-=1; const c=Math.round(S.papers*0.3); if(c>0) S.citations+=c;
  }
}
function resolveSubmissions(rows){
  const remain=[];
  for(const sub of S.submissions){
    sub.left--;
    if(sub.left>0){ remain.push(sub); continue; }
    let p = clamp(0.28 + (S.knowledge+S.writing)/400 + S.network/500 + S.fame/400 + (sub.revised?0.2:0) - (sub.tier-1)*0.07, 0.1, 0.9);
    if(sub.bt) p = Math.max(p*0.9, 0.4);
    if(chance(p)){
      S.papers++;
      if(sub.bt){
        const c=rnd(250,500); S.citations+=c; S.breakthroughs++; S.fame+=12; S.mental+=20; S.network+=6;
        rows.push({slot:'심사', title:'돌파구 논문 게재!', body:`최상위 저널 표지 후보. 학계가 이 결과를 이야기하기 시작했다. 인용 +${c}, 명성 +12.`, special:true});
        pushLog('돌파구 논문 게재 (최상위 저널)');
      } else {
        const c=[0,rnd(3,10),rnd(10,30),rnd(30,70)][sub.tier]; S.citations+=c; S.mental+=10; S.network+=2; S.fame+= sub.tier>=3?1:0;
        rows.push({slot:'심사', title:'논문 억셉', body:`${TIER[sub.tier]} 저널에 게재됐다. 인용 +${c}.`});
        pushLog(`논문 게재 (${TIER[sub.tier]} 저널)`);
      }
    } else if(!sub.revised && chance(0.55)){
      sub.revised=true; sub.left=isProf()?1:rnd(1,2); S.mental-=6; S.knowledge+=2; remain.push(sub);
      rows.push({slot:'심사', title:'메이저 리비전', body:'리뷰어 2번: "실험 여섯 개를 추가하라." 다시 심사에 들어간다.'});
      pushLog('리뷰어 2번 등장');
    } else {
      S.mental-=10; S.data+= sub.bt?8:5; if(sub.bt) S.pieces+=2;
      rows.push({slot:'심사', title:'논문 리젓', body: sub.bt?'"주장이 데이터를 앞선다." 돌파구 원고가 반려됐다. 조각 둘과 데이터는 남았다. 다시 쓰자.':'데이터는 남았으니 살을 붙여 다시 쓰자.'});
      pushLog('논문 리젓');
    }
  }
  S.submissions=remain;
}
function randomEvent(rows){
  const grad = [
    ()=>{ S.data=Math.max(0,S.data-6); S.mental-=5; return ['냉동고 고장','-80도 냉동고가 밤새 꺼졌다. 샘플 일부를 잃었다.']; },
    ()=>{ S.mental+=7; return ['랩 생일 파티','교수님이 케이크를 사오셨다. 잠깐 사람 사는 곳 같았다.']; },
    ()=>{ S.network+=3; S.stamina-=3; return ['신입 후배','한 달 내내 가르쳤다. 이제 내 밑에 사람이 있다.']; },
    ()=>{ S.funding-=Math.min(S.funding,25); return ['시약값 인상','항체 하나에 월급 절반.']; },
    ()=>{ S.knowledge+=4; return ['초청 세미나','연사가 내 질문에 "좋은 질문"이라 했다. 사실이었다.']; },
    ()=>{ S.stamina-=8; S.hands+=2; return ['밤샘','타임포인트 실험은 시간을 봐주지 않는다.']; },
    ()=>{ S.mental-=4; return ['경쟁 그룹','비슷한 결과를 먼저 냈다. 우리 것도 다르긴 다르다. 아마.']; },
    ()=>{ S.data+=4; return ['장비 예약 공백','공용 장비가 갑자기 비어 밀린 측정을 몰아서 했다.']; },
    ()=>{ addStain(S); return ['시약 튐','브로모페놀블루가 튀었다. 실험복에 파란 점이 하나 늘었다.']; },
    ()=>{ S.mental+=4; S.writing+=2; return ['카페에서 만난 선배','논문 서론 쓰는 법을 30분 강의해줬다.']; },
  ];
  const prof = [
    ()=>{ S.fame+=3; S.mental+=6; return ['제자 수상','학생이 학회 우수발표상을 받았다. 내 이름이 지도교수 칸에 있었다.']; },
    ()=>{ if(S.students>0){S.students--;S.alumni++;} S.mental-=7; return ['학생 이탈','학생 하나가 진로를 바꿨다. 문 앞에서 오래 이야기했다.']; },
    ()=>{ S.funding-=Math.min(S.funding,80); return ['장비 고장','공용 현미경 레이저가 나갔다. 수리비가 랩 예산에서 나갔다.']; },
    ()=>{ S.fame+=3; S.stamina-=3; return ['언론 인터뷰','기사 제목이 과했지만 내용은 정확했다.']; },
    ()=>{ S.data+=8; S.network+=4; return ['공동연구 제안','해외 랩이 샘플과 함께 공동연구를 제안했다.']; },
    ()=>{ if(chance(0.5)) S.pieces++; else S.data+=5; return ['이상한 데이터','학생이 "이거 버려도 되죠?"라고 가져온 결과가 버릴 게 아니었다. 발견 조각 +1.']; },
    ()=>{ S.funding+=120; return ['특허 등록','기술이전 계약금이 들어왔다. 연구비 +120.']; },
    ()=>{ S.mental-=5; S.network+=3; return ['학과 행정','학과장 부탁으로 위원회 셋을 맡았다. 회의가 연구를 먹는다.']; },
    ()=>{ S.stamina-=6; return ['대학 평가','증빙 서류 200장. 실험복 대신 정장을 입은 주였다.']; },
    ()=>{ S.knowledge+=4; S.mental+=3; return ['안식 세미나','옛 동료가 와서 완전히 다른 분야 이야기를 했다. 머리가 환기됐다.']; },
  ];
  const [t,b]=pick(isProf()?prof:grad)();
  rows.push({slot:'사건', title:t, body:b});
}
function yearEnd(rows){
  // 12월이 포함된 턴에 연말 평가
  const months=[...Array(turnLen())].map((_,i)=>monOf(S.month+i));
  if(!months.includes(12)) return;
  if(isProf()){
    if(S.papers>=10 && chance(0.5)){ S.fame+=2; rows.push({slot:'연말', title:'연말 실적 평가', body:'학과 실적 1위. 학과장이 복도에서 엄지를 들었다. 명성 +2.'}); }
    else rows.push({slot:'연말', title:'랩 송년회', body:`학생 ${S.students}명과 삼겹살. 내년 목표를 물었더니 다들 "졸업"이라 했다.`});
  } else {
    S.mental+=5;
    rows.push({slot:'연말', title:'랩 송년회', body:pick(['교수님이 처음으로 술을 사셨다. 내년엔 논문 하나 더 내자고 했다.','비밀 산타로 피펫 팁 상자를 받았다. 실용적이다.'])});
  }
}
function checkPromotion(rows){
  let msg='';
  const since=S.month-S.stageSince;
  if(S.stage===0 && S.month>=12 && S.knowledge>=25){ S.stage=1; msg='석사과정에 입학했다. 실험복에 이름이 박혔다.'; }
  else if(S.stage===1 && since>=24 && S.papers>=1 && S.knowledge>=45){ S.stage=2; msg='박사과정에 진입했다. 이제 돌아갈 길은 없다.'; }
  else if(S.stage===2 && since>=48 && S.papers>=3 && S.knowledge>=65){ S.stage=3; S.fame+=3; msg='박사 학위 취득! 박사후연구원이 되었다. 명찰 색이 바뀌었다. 포닥 2년, 논문 6편, 인맥 40을 채우면 교수 임용에 지원할 수 있다.'; }
  else if(S.stage===4 && since>=60 && S.papers>=14 && S.fame>=25){ S.stage=5; S.fame+=3; msg='부교수로 승진. 정년 보장. 밤에 잠이 조금 더 잘 온다.'; }
  else if(S.stage===5 && since>=60 && S.papers>=28 && S.fame>=50){ S.stage=6; S.fame+=5; msg='정교수로 승진. 학회에서 사람들이 먼저 인사한다.'; }
  else if(S.stage===6 && since>=36 && S.fame>=75 && S.breakthroughs>=1){ S.stage=7; S.fame+=5; msg='석좌교수. 대학이 내 이름으로 강좌를 열었다. 남은 것은 스톡홀름이다.'; }
  if(msg){ S.stageSince=S.month; rows.push({slot:'승급', title:STAGES[S.stage], body:msg, special:true}); pushLog(STAGES[S.stage]+' 승급'); }
}
function checkAwards(rows){
  if(!isProf()) return;
  const give=(name,gain,body)=>{ if(!S.awards.includes(name)){ S.awards.push(name); S.fame+=gain; S.mental+=8; rows.push({slot:'수상', title:name, body:body+` 명성 +${gain}.`, special:true}); pushLog(name+' 수상'); return true;} return false; };
  if(S.fame>=35) give('젊은 과학자상',3,'시상식에서 실험복 대신 정장을 입었다. 어색했다.');
  if(S.fame>=55 && S.papers>=20) give('학술원 회원',3,'학술원 회원으로 선출됐다. 부모님이 신문을 오려두셨다.');
  if(S.fame>=70 && S.breakthroughs>=1 && chance(0.08)) give('국제 학술상',6,'그 분야에서 노벨상 전 단계라 불리는 상이다. 전화를 받고 한동안 앉아 있었다.');
}
function checkNobel(rows){
  const months=[...Array(turnLen())].map((_,i)=>monOf(S.month+i));
  if(!months.includes(10)) return false;
  const y=yearOf(S.month);
  if(y===S.lastNobelYear) return false;
  S.lastNobelYear=y;
  const eligible = S.breakthroughs>=1 && S.fame>=85 && S.citations>=3000;
  if(!eligible) return false;
  S.nobelYears++;
  const p = clamp(0.04 + (S.fame-85)*0.006 + S.breakthroughs*0.04 + S.nobelYears*0.015, 0.04, 0.35);
  if(chance(p)) return true;
  S.fame+=2; S.mental-=3;
  rows.push({slot:'10월', title:'노벨상 발표', body:pick(['후보로 거론됐지만 올해는 다른 분야였다. 기자 둘이 전화를 걸어왔다.','스웨덴에서 전화는 오지 않았다. 대신 축하 인사를 미리 보낸 동료에게 답장을 썼다.','발표 당일 새벽에 잠이 안 왔다. 올해도 아니었다. 명성은 조금 더 올랐다.'])});
  pushLog('노벨상 후보 거론');
  return false;
}
function snapshot(){ const o={}; for(const k in LABELS) o[k]=S[k]; return o; }
function diff(b){ const out=[]; for(const k in b){ const d=S[k]-b[k]; if(d) out.push({k:LABELS[k],d}); } return out; }
function clampAll(){
  S.stamina=clamp(S.stamina,0,100); S.mental=clamp(S.mental,0,100);
  for(const k of ['knowledge','hands','writing','network','fame']) S[k]=clamp(Math.round(S[k]),0,100);
  S.funding=Math.max(0,Math.round(S.funding)); S.data=Math.max(0,S.data); S.students=Math.max(0,S.students);
}
function pushLog(text){ S.log.unshift({m:S.month,text}); if(S.log.length>120) S.log.pop(); }

function advanceTurn(){
  if(S.ended || plan.some(p=>!p)) return;
  const before=snapshot();
  const startMonth=S.month;
  const labels=slotLabels();
  const rows=[];
  plan.forEach((id,i)=>{ const r=runSlot(id); rows.push({slot:labels[i], title:r.title, body:r.body}); clampAll(); });
  passive(rows);
  resolveSubmissions(rows);
  if(chance(isProf()?0.4:0.3)) randomEvent(rows);
  yearEnd(rows);
  checkPromotion(rows);
  checkAwards(rows);
  const nobel=checkNobel(rows);
  clampAll();
  // 번아웃: 게임오버가 아니라 휴직
  let title = isProf()?`${whenText(startMonth)} 분기 보고`:`${whenText(startMonth)} 보고`;
  if(S.mental<=0){
    S.burnouts++; S.mental=45; S.stamina=65;
    if(isProf()){ S.fame=Math.max(0,S.fame-5); if(S.students>0){S.students--;S.alumni++;} }
    const lost = isProf()?6:3;
    rows.push({slot:'휴직', title:'번아웃', body:`어느 아침 실험복을 옷걸이에 걸어두고 랩을 나섰다. ${lost}개월을 쉬었다. ${isProf()?'학생 하나가 떠나고 명성이 조금 빠졌다.':'돌아왔을 때 벤치는 그대로였다.'} 쉬는 것도 연구다.`, special:true});
    pushLog(`번아웃 휴직 ${lost}개월`);
    S.month+=lost;
    title='번아웃';
  }
  S.month+=turnLen();
  S.report={when:whenText(startMonth), title, rows, delta:diff(before)};
  lastPlan=plan.slice(); S.lastPlan=lastPlan;
  plan=[null,null,null];
  if(nobel){ endGame('nobel'); return; }
  if(age()>=RETIRE_AGE){ endGame('retire'); return; }
  save(); render();
}

/* ---------------- 엔딩 ---------------- */
function endGame(kind){
  S.ended=true; S.endKind=kind; save();
  const score = S.papers*30 + S.citations + S.breakthroughs*500 + S.awards.length*100 + Math.round((S.knowledge+S.hands+S.writing+S.network+S.fame)/5);
  let eyebrow, title, body;
  if(kind==='nobel'){
    eyebrow=`${age()}세, 12월 10일 스톡홀름`;
    title='노벨상 수상';
    body=`${S.name} 교수는 연단에 서서 첫 슬라이드에 ${yearOf(S.month)}년 전 겔 사진을 띄웠다. "이 밴드가 나오지 않았다면 여기 서 있지 못했을 겁니다." 실험복은 여전히 옷장에 있다. 얼룩째로.`;
  } else {
    eyebrow=`${age()}세, 정년 퇴임`;
    const st=S.stage;
    title = st>=7?'석좌교수 퇴임':st>=6?'정교수 퇴임':st>=4?'교수 퇴임':st===3?'영원한 박사후연구원':'긴 대학원의 끝';
    body = st>=6
      ? `${S.name} 교수는 마지막 강의에서 학부생에게 실험복 한 장을 건넸다. "일단 피펫부터 잡아봐." 스톡홀름은 오지 않았지만, 제자 ${S.alumni}명이 각자의 랩에서 피펫을 잡고 있다.`
      : st>=4
      ? `${S.name} 교수는 조용히 연구실을 비웠다. 논문 ${S.papers}편, 제자 ${S.alumni}명. 실험복 얼룩 하나하나에 이야기가 있었다.`
      : `${S.name}은 오랜 시간 벤치를 지켰다. 교수는 되지 못했지만, 안 되는 일을 되게 하는 법은 누구보다 잘 안다.`;
  }
  $('#endEyebrow').textContent=eyebrow; $('#endTitle').textContent=title; $('#endBody').textContent=body;
  const sm=[['최종 직위',STAGES[S.stage]],['논문',S.papers+'편'],['인용',S.citations],['돌파구',S.breakthroughs+'편'],['수상',S.awards.length+'회'],['제자',S.alumni+'명'],['실험',S.experiments+'회'],['번아웃',S.burnouts+'회'],['연구자 점수',score]];
  $('#summary').innerHTML=sm.map(([l,v])=>`<div><div class="eyebrow">${l}</div><div class="n">${v}</div></div>`).join('');
  const bd=[...S.awards.map(a=>'🏅 '+a)];
  if(S.stains.length>=8) bd.push('🧴 얼룩 컬렉터');
  if(S.fails>=15) bd.push('💪 실패 전문가');
  if(S.burnouts===0) bd.push('🧘 번아웃 제로');
  if(S.alumni>=10) bd.push('🌱 제자 부자');
  if(S.citations>=5000) bd.push('📈 인용 5000');
  $('#badges').innerHTML=bd.map(b=>`<span class="chip">${b}</span>`).join('')||'<span class="chip">배지 없음. 그래도 살아남았다.</span>';
  drawAvatar($('#avatarEnd'),S,kind==='nobel');
  $('#startScreen').hidden=true; $('#gameScreen').hidden=true; $('#clock').hidden=true; $('#endScreen').hidden=false;
}

/* ---------------- 대화 ---------------- */
function talk(){
  const lines=[];
  if(S.stamina<25) lines.push('"괜찮아요. 커피가 있으니까요." 손이 조금 떨린다.','"3일 잤어요. 합쳐서요."');
  if(S.mental<30) lines.push('"…리뷰어 2번은 왜 존재하는 걸까요."','"가끔 실험복이 너무 무겁게 느껴져요."');
  if(S.submissions.length) lines.push('"메일 왔나 봐야 해요. 아, 스팸이네."','"심사 중이라는 말은 왜 이렇게 길죠."');
  if(S.pieces>=2) lines.push('"이 결과들이… 하나로 이어지는 것 같아요. 조금만 더."');
  if(isProf() && S.students===0) lines.push('"랩이 조용하네요. 학생을 뽑아야겠어요."');
  if(isProf() && S.students>=5) lines.push('"애들 월급날이 제일 무서워요. 그래도 랩이 시끄러운 게 좋아요."');
  if(S.stage===3) lines.push('"임용 공고를 매일 봐요. 논문이 좀 더 필요하겠죠."');
  if(S.fame>=85) lines.push('"10월이 되면 잠이 안 와요. 다들 그렇다더라고요."');
  if(S.breakthroughs>0) lines.push('"그 논문 이후로 사람들이 저를 다르게 봐요. 저는 그대론데."');
  if(!lines.length) lines.push('"오늘도 피펫을 잡아요. 그게 제 일이니까요."','"겔 사진 폴더가 200장을 넘었어요."','"랩 냉장고에서 제 도시락을 누가 먹었어요."','"실험복 얼룩은 훈장이에요. 라고 믿고 있어요."');
  $('#whoMood').textContent=pick(lines);
  if(!S.talkedThisTurn){ S.talkedThisTurn=true; S.mental=clamp(S.mental+2,0,100); save(); renderStats(); }
}

/* ---------------- 렌더 ---------------- */
function moodText(){
  if(S.stamina<20) return '눈이 반쯤 감겨 있다. 커피가 손에서 떨어지지 않는다.';
  if(S.mental<25) return '실험복 주머니에 손을 넣고 창밖을 오래 본다.';
  if(S.submissions.length) return '메일함을 5분마다 새로고침한다.';
  if(S.pieces>=3) return '발견 조각 셋. 돌파구 논문을 쓸 때다.';
  if(S.data>=(isProf()?20:15)) return '데이터가 쌓였다. 이제 쓸 때다.';
  if(S.stains.length>=5) return '실험복 얼룩이 훈장처럼 늘었다.';
  return '오늘도 피펫을 잡는다.';
}
function renderStats(){
  $('#stats').innerHTML=STATS.map(st=>{
    const v=S[st.k]; let cls=st.vital?'vital':st.fame?'fame':''; if(st.vital&&v<30) cls='low'; else if(st.vital&&v<55) cls='mid';
    return `<div class="stat"><span class="lbl">${st.l}</span><div class="track"><div class="fill ${cls}" style="width:${v}%"></div></div><span class="val mono">${v}</span></div>`;
  }).join('');
  const res=[['연구비',S.funding],['데이터',S.data],['논문',S.papers],['인용',S.citations],['발견 조각',S.pieces+'/3'],['돌파구',S.breakthroughs]];
  if(isProf()) res.splice(4,0,['학생',S.students+'명']);
  $('#res').innerHTML=res.map(([l,v])=>`<div><span class="eyebrow">${l}</span><span class="n mono">${v}</span></div>`).join('');
  const goals=[
    ['교수 임용', S.stage>=4, S.stage>=4?'완료':`${STAGES[S.stage]}`],
    ['돌파구 논문 1편', S.breakthroughs>=1, `${S.breakthroughs}/1 (조각 ${S.pieces}/3)`],
    ['명성 85', S.fame>=85, `${S.fame}/85 (상한 ${fameCap()})`],
    ['인용 3000', S.citations>=3000, `${S.citations}/3000`],
    ['10월의 전화', S.ended&&S.endKind==='nobel', S.nobelYears?`후보 ${S.nobelYears}년째`:'조건 충족 후 매년 추첨'],
  ];
  $('#goal').innerHTML=goals.map(([l,d,p])=>`<li class="${d?'done':''}"><span>${d?'✅':'⬜'}</span><span>${l}</span><span class="prog mono">${p}</span></li>`).join('');
}
function render(){
  $('#clock').hidden=false;
  $('#clockText').textContent=`${age()}세 · ${whenText(S.month)}`;
  $('#whoName').textContent=S.name;
  $('#whoStage').textContent=STAGES[S.stage]+' · '+(MAJORS.find(m=>m.id===S.major)||{}).name;
  $('#whoMood').textContent=moodText();
  drawAvatar($('#avatar'),S);
  renderStats();
  // 보고서
  const r=S.report;
  $('#evWhen').textContent=r.when;
  $('#evTitle').textContent=r.title;
  $('#evBody').innerHTML=`<div class="report">${r.rows.map(row=>`<div class="row ${row.special?'special':''}"><span class="tag">${row.slot}</span><span>${row.title?`<b>${row.title}</b>`:''}${row.body}</span></div>`).join('')}</div>`;
  $('#evDelta').innerHTML=(r.delta||[]).map(d=>`<span class="chip ${d.d>0?'up':'down'} mono">${d.k} ${d.d>0?'+':''}${d.d}</span>`).join('');
  // 일정
  $('#actLabel').textContent = isProf()?`이번 분기 일정 (${slotLabels().join(' · ')})`:`${whenText(S.month)} 일정 짜기 (상순 · 중순 · 하순)`;
  const labels=slotLabels();
  const acts=availableActions();
  const slotsHtml = plan.map((id,i)=>{
    const a=acts.find(x=>x.id===id);
    return `<button class="slot ${a?'filled':''}" data-slot="${i}" title="${a?'비우기':''}"><span class="eyebrow">${labels[i]}</span>${a?`<b>${a.ic} ${actName(a)}</b>`:`<span class="empty">아래에서 선택</span>`}</button>`;
  }).join('');
  const ready=plan.every(Boolean);
  const lp=S.lastPlan; const canRepeat = lp && lp.every(id=>{ const a=acts.find(x=>x.id===id); return a && !(a.need&&a.need(S)); });
  $('#actions').innerHTML = `<div class="slots" style="grid-column:1/-1">${slotsHtml}<div class="gocol"><button class="go" id="goBtn" ${ready?'':'disabled'}>진행 ▶</button><button class="repeat" id="repeatBtn" ${canRepeat?'':'disabled'} title="지난 턴과 같은 일정으로 바로 진행">↻ 지난 일정 반복</button></div></div>` +
    acts.map(a=>{
      const why=a.need?a.need(S):null;
      return `<button class="act" data-id="${a.id}" ${why?'disabled':''}><span class="ic">${a.ic}</span><b>${actName(a)}</b><span>${why?'⛔ '+why:actHint(a)}</span></button>`;
    }).join('');
  $('#pending').innerHTML=S.submissions.map(s=>`<span class="chip ${s.bt?'bt':''}">${s.bt?'🌟 돌파구 논문':'📨'} 심사 중 · ${TIER[s.tier]} 저널${s.revised?' (리비전)':''} · ${s.left}턴 남음</span>`).join('');
  $('#log').innerHTML=S.log.map(l=>`<li><span class="when mono">${whenText(l.m)}</span><span>${l.text}</span></li>`).join('');
  S.talkedThisTurn=false;
}

/* ---------------- 저장 ---------------- */
const KEY='labcoat-save-v2';
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
function load(){ try{ const r=localStorage.getItem(KEY); return r?JSON.parse(r):null; }catch(e){ return null; } }

/* ---------------- 시작 화면 ---------------- */
let selMajor='bio', selShirt=COATS[0];
function renderStart(){
  $('#majors').innerHTML=MAJORS.map(m=>`<button class="major" data-id="${m.id}" aria-pressed="${m.id===selMajor}"><b>${m.name}</b><span>${m.desc}</span></button>`).join('');
  $('#swatches').innerHTML=COATS.map(c=>`<button class="swatch" data-c="${c}" style="background:${c}" aria-pressed="${c===selShirt}" aria-label="옷 색 ${c}"></button>`).join('');
}
document.addEventListener('click', e=>{
  const mj=e.target.closest('.major'); if(mj){ selMajor=mj.dataset.id; renderStart(); return; }
  const sw=e.target.closest('.swatch'); if(sw){ selShirt=sw.dataset.c; renderStart(); return; }
  const act=e.target.closest('.act'); if(act&&!act.disabled){ const i=plan.indexOf(null); if(i>=0){ plan[i]=act.dataset.id; render(); } return; }
  const sl=e.target.closest('.slot'); if(sl){ plan[+sl.dataset.slot]=null; render(); return; }
  if(e.target.closest('#goBtn')){ advanceTurn(); return; }
  if(e.target.closest('#repeatBtn')){ if(S.lastPlan){ plan=S.lastPlan.slice(); advanceTurn(); } return; }
  if(e.target.closest('#talkBtn')){ talk(); return; }
});
$('#startBtn').addEventListener('click', ()=>{
  const name=($('#nameInput').value||'김연구').trim().slice(0,12)||'김연구';
  S=newState(name, selMajor, selShirt);
  plan=[null,null,null];
  pushLog('랩 입성. 실험복 지급.');
  save();
  $('#startScreen').hidden=true; $('#endScreen').hidden=true; $('#gameScreen').hidden=false;
  render();
});
$('#restartBtn').addEventListener('click', ()=>{
  try{ localStorage.removeItem(KEY); }catch(e){}
  S=null; plan=[null,null,null]; renderStart();
  $('#endScreen').hidden=true; $('#clock').hidden=true; $('#startScreen').hidden=false;
});
// 말 걸기 버튼 삽입
(function(){ const b=document.createElement('button'); b.id='talkBtn'; b.className='talk'; b.textContent='💬 말 걸기'; $('.who').appendChild(b); })();


/* ---------------- 디버그·자동 플레이 (밸런스 검증용) ---------------- */
function autoPick(){
  const acts=availableActions().filter(a=>!a.need||!a.need(S)).map(a=>a.id);
  const has=id=>acts.includes(id);
  if(S.stamina<30 && has('rest')) return 'rest';
  if(isProf()){
    if(has('apply')) return 'apply';
    if(S.funding < S.students*45+100 && has('grant')) return 'grant';
    if(S.students<6 && has('recruit')) return 'recruit';
    if(S.data>=20 && has('write')) return 'write';
    if(S.fame<fameCap() && S.funding>=120 && has('keynote')) return 'keynote';
    if(S.fame<fameCap() && has('editor') && chance(0.3)) return 'editor';
    return has('direct')?'direct':'lecture';
  }
  if(has('apply')) return 'apply';
  if(S.data>=15 && has('write')) return 'write';
  if(S.funding<40 && has('ta')) return 'ta';
  if(S.stage===3 && S.network<40 && S.funding>=30 && has('conf')) return 'conf';
  if(S.knowledge < 30+S.stage*15 && has('read')) return 'read';
  return has('exp')?'exp':'read';
}
window.LABCOAT = {
  state:()=>S,
  autoplay(turns=1){ for(let i=0;i<turns && S && !S.ended;i++){ plan=[autoPick(),autoPick(),autoPick()]; advanceTurn(); } return S && {age:age(),stage:STAGES[S.stage],papers:S.papers,cit:S.citations,fame:S.fame,bt:S.breakthroughs,students:S.students,funding:S.funding,ended:S.ended,endKind:S.endKind,burnouts:S.burnouts,month:S.month}; },
  newGame(name='테스트'){ S=newState(name,'bio',COATS[0]); plan=[null,null,null]; $('#startScreen').hidden=true; $('#endScreen').hidden=true; $('#gameScreen').hidden=false; render(); },
};

renderStart();
const saved=load();
if(saved && !saved.ended){ S=saved; if(S.stageSince==null) S.stageSince=1; $('#startScreen').hidden=true; $('#gameScreen').hidden=false; render(); }

// PWA
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load', ()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
})();
