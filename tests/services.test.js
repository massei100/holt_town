import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaults, speak } from '../src/services.js'

test('Korean speech replaces earlier guidance and remains optional',()=>{
  const calls=[]
  const korean={lang:'ko-KR'}
  let voices=[{lang:'en-US'}]
  globalThis.speechSynthesis={
    getVoices:()=>voices,
    cancel:()=>calls.push('cancel'),
    speak:message=>calls.push(message)
  }
  globalThis.SpeechSynthesisUtterance=class {
    constructor(text){this.text=text}
  }
  try{
    speak('기다려요.',defaults)
    assert.deepEqual(calls,[])
    voices.push(korean)
    speak('기다려요.',{...defaults,voice:false})
    assert.deepEqual(calls,[])
    speak('기다려요.',defaults)
    speak('양쪽을 살펴요.',defaults)
    assert.deepEqual(calls.map(call=>call.text??call),['cancel','기다려요.','cancel','양쪽을 살펴요.'])
    assert.equal(calls[3].voice,korean)
    assert.equal(calls[3].volume,defaults.volume)
  }finally{
    delete globalThis.speechSynthesis
    delete globalThis.SpeechSynthesisUtterance
  }
})
