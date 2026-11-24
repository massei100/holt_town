export const places = [
  { id:'school', name:'학교', x:-29, z:-14, side:'north', color:0xe3b567, type:'school' },
  { id:'store', name:'편의점', x:-13, z:-14, side:'north', color:0x3476b9, type:'store', open:true },
  { id:'cafe', name:'카페', x:3, z:-14, side:'north', color:0xc97e61, type:'cafe' },
  { id:'bakery', name:'빵집', x:18, z:-14, side:'north', color:0xe9bc5b, type:'bakery' },
  { id:'hospital', name:'병원', x:33, z:-14, side:'north', color:0x82a8ba, type:'hospital' },
  { id:'home', name:'우리 집', x:-24, z:14, side:'south', color:0x6a92bb, type:'home', open:true },
  { id:'park', name:'공원', x:7, z:15, side:'south', color:0x72a66b, type:'park' },
  { id:'bus', name:'버스 정류장', x:28, z:9, side:'south', color:0x78a6ca, type:'bus' }
]
export const characters = [
  { name:'하늘', skin:0xf2c6a5, hair:0x302927, top:'#507ab1', pants:0x34445a, style:0 },
  { name:'민서', skin:0xebba98, hair:0x3e2625, top:'#bf665b', pants:0x625345, style:1 },
  { name:'도윤', skin:0xdba786, hair:0x24262a, top:'#488773', pants:0x3e454d, style:2 },
  { name:'지우', skin:0xf6cdb0, hair:0x58392d, top:'#9d71ad', pants:0x455268, style:3 },
  { name:'연우', skin:0xe5b28e, hair:0x272d35, top:'#cc8b38', pants:0x53534f, style:4 },
  { name:'수빈', skin:0xefbf9c, hair:0x35282a, top:'#538fa1', pants:0x514660, style:5 }
]
export const shirtColors = ['#507ab1','#488773','#bf665b','#cc8b38','#9d71ad','#538fa1']
export const products = [
  {id:'milk', name:'우유', price:1500, color:0xf1f6ff, accent:0x4f85c9},
  {id:'juice', name:'주스', price:1800, color:0xf5a844, accent:0xfaf0bf},
  {id:'water', name:'생수', price:1000, color:0xb3e0ef, accent:0x4b9fba},
  {id:'rice', name:'삼각김밥', price:1700, color:0x42634b, accent:0xf3eee1},
  {id:'chips', name:'과자', price:1300, color:0xeeb34c, accent:0xcc654b},
  {id:'chocolate', name:'초콜릿', price:1200, color:0x986543, accent:0xe9bc78},
  {id:'noodles', name:'컵라면', price:1600, color:0xcc5749, accent:0xffe2ac},
  {id:'tissue', name:'휴지', price:2000, color:0xf0dbe7, accent:0xb2709d}
]
export const missions = {
  milk:{ title:'우유를 사 오세요', steps:[
    {id:'brief', place:'home', icon:'home', text:'우리 집에서 준비물을 받아요.'},
    {id:'cross', place:'store', icon:'cross', text:'횡단보도를 안전하게 건너요.'},
    {id:'choose', place:'store', icon:'milk', text:'편의점에서 우유를 찾아요.'},
    {id:'pay', place:'store', icon:'card', text:'우유를 계산하고 받아요.'},
    {id:'return', place:'home', icon:'home', text:'집에 돌아가 우유를 전해요.'}
  ]}
}

