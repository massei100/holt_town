import { chromium,expect,test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { OrthographicCamera,Vector3 } from 'three'
import { deliveryMission } from '../shared/world.js'

const size={width:1280,height:800}
const named=(page,name)=>page.getByRole('button',{name,exact:true})
const action=(page,value)=>page.locator('[data-action="'+value+'"]')
function mapPixel(point){
  const aspect=size.width/size.height,span=Math.max(50,103/aspect)
  const camera=new OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.1,240)
  const target=new Vector3(2,.13,0)
  camera.position.copy(target).add(new Vector3(29,37,45))
  camera.lookAt(target);camera.updateMatrixWorld();camera.updateProjectionMatrix()
  const p=new Vector3(point[0],.19,point[1]).project(camera)
  return [(p.x+1)*size.width/2,(1-p.y)*size.height/2]
}
async function snap(page,name){
  const folder=process.env.TOWN_SCREENSHOT_DIR
  if(!folder)return
  await mkdir(folder,{recursive:true})
  await page.screenshot({path:folder+'/'+name+'.png',scale:'css'})
}

test('two independent students share movement, carrying and delivery with a teacher watching',async({launchOptions,baseURL})=>{
  const browser=await chromium.launch(launchOptions)
  try{
    const contexts=await Promise.all([
      browser.newContext({viewport:size,deviceScaleFactor:.46,hasTouch:true,isMobile:true}),
      browser.newContext({viewport:size,deviceScaleFactor:.46,hasTouch:true,isMobile:true}),
      browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:.44})
    ])
    const [a,b,t]=await Promise.all(contexts.map(c=>c.newPage()))
    const pageErrors=[]
    for(const [i,page] of [a,b,t].entries()){
      page.on('pageerror',error=>pageErrors.push(error.message))
      await page.addInitScript(board=>localStorage.setItem('my-town:multiplayer:prefs',JSON.stringify({device:board?'board':'tablet',quality:'low',voice:false,effects:false,reduced:true})),i===2)
    }
    await Promise.all([a,b,t].map(p=>p.goto(baseURL)))
    await snap(a,'start')
    await action(t,'teacher-form').click()
    await action(t,'create').click()
    const code=await t.locator('.mp-code strong').textContent()
    expect(code).toMatch(/^[A-Z2-9]{6}$/)
    await expect(t.locator('#mp-online')).toHaveText('0명')
    for(const [index,page] of [a,b].entries()){
      await page.locator('#room-code').fill(code)
      await named(page,'학생 입장').tap()
      if(index===1)await action(page,'avatar-next').tap()
      await action(page,'join').tap()
      await expect(page.locator('#mp-online')).toHaveText((index+1)+'명')
    }
    await expect(t.locator('#mp-online')).toHaveText('2명')
    await action(t,'teacher:start').click()
    await expect(a.locator('#mp-goal-title')).toHaveText('우리 동네 배달부')
    await expect(b.locator('#world')).toHaveAttribute('data-ground','red,blue,gold,green')
    await expect(b.locator('[data-tag="1"]')).toBeVisible()
    const before=await b.locator('[data-tag="1"]').getAttribute('data-position')
    const beforeTransform=await b.locator('[data-tag="1"]').getAttribute('style')
    const pad=await named(a,'앞으로').boundingBox()
    expect(pad.width).toBeGreaterThanOrEqual(50)
    expect(pad.y+pad.height).toBeGreaterThan(size.height*.88)
    const touch=await contexts[0].newCDPSession(a)
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pad.x+pad.width/2,y:pad.y+pad.height/2}]})
    await a.waitForTimeout(240)
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    await expect(b.locator('[data-tag="1"]')).not.toHaveAttribute('data-position',before)
    await expect(b.locator('[data-tag="1"]')).not.toHaveAttribute('style',beforeTransform)
    await a.waitForTimeout(250)
    const stopped=await b.locator('[data-tag="1"]').getAttribute('data-position')
    await a.waitForTimeout(400)
    await expect(b.locator('[data-tag="1"]')).toHaveAttribute('data-position',stopped)
    await expect(t.locator('[data-tag="1"]')).toHaveAttribute('data-position',stopped)
    await action(a,'settings').tap()
    await action(a,'pref:movement:tap').tap()
    await action(a,'close').tap()
    await action(a,'overview').tap()
    await action(b,'overview').tap()
    await expect(a.locator('.mp-dpad')).toBeHidden()
    await a.waitForTimeout(250)
    await a.touchscreen.tap(...mapPixel([-9.6,11.5]))
    await expect(named(a,'줍기')).toBeEnabled({timeout:15000})
    await named(a,'줍기').tap()
    await expect(b.locator('[data-tag="1"]')).toHaveAttribute('data-carry',/red|blue|gold|green/)
    const held=await b.locator('[data-tag="1"]').getAttribute('data-carry')
    await expect(b.locator('#world')).not.toHaveAttribute('data-ground',new RegExp(held))
    const destination=deliveryMission.items.find(item=>item.id===held).site
    await a.touchscreen.tap(...mapPixel(destination))
    await expect(named(a,'배달하기')).toBeEnabled({timeout:20000})
    await snap(b,'students-carry')
    await named(a,'배달하기').tap()
    for(const page of [a,b,t])await expect(page.locator('#mp-count')).toHaveText('1 / 4')
    await expect(t.locator('#mp-roster')).toContainText('플레이어 1')
    expect((await t.locator('.mp-bottom').boundingBox()).y).toBeGreaterThan(980)
    await snap(t,'teacher-map')
    await snap(a,'tablet-delivery')
    expect(pageErrors).toEqual([])
  }finally{
    await browser.close()
  }
})

