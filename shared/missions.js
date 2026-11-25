const parcelSpecs=[
  {id:'red',color:'#c94c42',symbol:'★',name:'별',start:[-10.7,10.7],site:[-24,19.7]},
  {id:'blue',color:'#2763b7',symbol:'◆',name:'마름모',start:[-9,10.7],site:[-11.5,19.6],house:[-11.5,16.4]},
  {id:'gold',color:'#e9aa27',ink:'#342408',symbol:'●',name:'동그라미',start:[-7.3,10.7],site:[19,22.2],house:[19,19]},
  {id:'green',color:'#47883d',symbol:'▲',name:'세모',start:[-5.6,10.7],site:[35,20.4],house:[35,17.2]}
]
export const deliveryMission={
  id:'delivery',title:'우리 동네 배달부',icon:'bag',method:'place',goal:'배달하기',
  guide:'배송 광장에서 상자를 들어 같은 모양의 집에 배달해요.',
  success:'친구들과 배달을 모두 마쳤어요!',
  items:parcelSpecs,
  sites:parcelSpecs.map(item=>({id:item.id,point:item.site,color:item.color,ink:item.ink,symbol:item.symbol,name:item.name,kind:'pad'}))
}
const binSpecs=[
  {id:'paper-bin',symbol:'▤',color:'#3771ae',name:'종이',point:[3.8,16.3],kind:'bin'},
  {id:'plastic-bin',symbol:'●',color:'#368266',name:'플라스틱',point:[6.8,16.3],kind:'bin'},
  {id:'metal-bin',symbol:'◆',color:'#785996',name:'캔',point:[8.6,13.2],kind:'bin'}
]
const trash=(id,start,type,model)=>{
  const bin=binSpecs.find(site=>site.id===type)
  return {id,start,target:bin.id,color:bin.color,symbol:bin.symbol,name:bin.name,model}
}
const recycling={
  id:'recycling',title:'깨끗한 우리 공원',icon:'map',method:'place',goal:'분리수거',
  guide:'공원에서 쓰레기를 찾아 같은 그림이 표시된 통에 넣어요.',
  success:'친구들과 공원을 깨끗하게 만들었어요!',
  sites:binSpecs,
  items:[
    trash('paper-cup',[-1.6,12.5],'paper-bin','paper'),
    trash('plastic-bottle',[3.4,10.1],'plastic-bin','bottle'),
    trash('metal-can',[6.2,20.7],'metal-bin','can'),
    trash('paper-sheet',[13,21],'paper-bin','paper')
  ]
}
const relay={
  id:'relay',title:'친구에게 건네요',icon:'person',method:'peer',
  guide:'배송 광장의 물건을 들고 가까이 있는 친구에게 건네요.',
  success:'친구들에게 물건을 모두 건넸어요!',
  sites:[],
  items:parcelSpecs.slice(0,3).map(p=>({
    id:'gift-'+p.id,start:p.start,name:p.name+' 선물',color:p.color,symbol:p.symbol,ink:p.ink,model:'gift'
  }))
}
const beds=[
  {id:'flower-bed',symbol:'✿',color:'#a45f86',name:'꽃 화단',point:[2.6,20.65],kind:'bed'},
  {id:'herb-bed',symbol:'▲',color:'#4f7d46',name:'잎 화단',point:[6.5,21.4],kind:'bed'}
]
const planting=beds.flatMap((site,index)=>[
  {id:'seed-'+site.id,start:[-10.7+index*3.4,10.7],target:site.id,name:site.name+' 씨앗',symbol:site.symbol,color:site.color,model:'seed',verb:'심기'},
  {id:'water-'+site.id,start:[-9+index*3.4,10.7],target:site.id,name:site.name+' 물뿌리개',symbol:site.symbol,color:site.color,model:'watering',verb:'물 주기',requires:'seed-'+site.id}
])
const garden={
  id:'garden',title:'함께 가꾸는 정원',icon:'bag',method:'place',goal:'정원 돌보기',
  guide:'씨앗을 화단에 심고, 같은 화단에 물을 줘요.',
  success:'친구들과 모든 화단을 가꿨어요!',
  sites:beds,items:planting
}
const treasure={
  id:'treasure',title:'우리 동네 보물찾기',icon:'star',method:'collect',
  guide:'마을 곳곳을 살피고 빛나는 보물을 눌러 모아요.',
  success:'친구들과 보물 네 개를 모두 찾았어요!',
  sites:[],
  items:parcelSpecs.map((p,i)=>({
    id:'gem-'+p.id,start:[[-31.5,10],[2.4,9.3],[28,8.1],[-31,-8.65]][i],
    name:p.name+' 보물',symbol:p.symbol,color:p.color,ink:p.ink,model:'gem'
  }))
}
const counter={id:'shop-counter',zone:'store',point:[4.1,1.43],color:'#2763b7',symbol:'▤',name:'손님 계산대',kind:'pad'}
export const clerk={zone:'store',point:[5.15,-2.15],range:1.6,id:'clerk',color:'#935a37',symbol:'✓',name:'직원 자리',kind:'pad'}
export const checkoutDisplay=[4.04,-.1]
const shopping={
  id:'shop',title:'편의점 손님과 직원',icon:'store',method:'checkout',goal:'물건 올리기',
  guide:'편의점에 들어가요. 손님은 물건을 계산대에 올리고, 친구는 직원 자리에서 계산해요.',
  success:'손님과 직원이 함께 계산을 마쳤어요!',
  sites:[counter,clerk],
  items:[
    ['milk','우유','★','#486cab','carton'],
    ['juice','주스','◆','#e49346','carton'],
    ['water','생수','●','#3688a6','bottle'],
    ['snack','과자','▲','#a26081','paper']
  ].map(([id,name,symbol,color,model],index)=>({
    id:'shop-'+id,name,symbol,color,model,zone:'store',start:[-5.16+index*1.75,1.5],target:counter.id
  }))
}
export const missionList=[deliveryMission,recycling,relay,garden,treasure,shopping]
export const missionsById=new Map(missionList.map(mission=>[mission.id,mission]))
export const missionItems=new Map(missionList.flatMap(mission=>mission.items.map(item=>[item.id,item])))
export const missionSites=new Map(missionList.flatMap(mission=>mission.sites.map(site=>[site.id,site])))
export const zoneOf=definition=>definition.zone??'town'
export const siteFor=item=>missionSites.get(item.target??item.id)

