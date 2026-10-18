import test from 'node:test';
import assert from 'node:assert/strict';
import { wizardPose, ENTRANCE_SECONDS } from '../wizard-puppet.js';
import { WIZARD_PARTS } from '../wizard-parts.js';

test('wizard: one rigid-body hop, then smile and small wrist waves',()=>{
  assert.equal(wizardPose(.10).sy,1);
  assert.ok(wizardPose(.36).y<-.17,'hop must move at least 17% of character height');
  assert.equal(wizardPose(.6).y,0);
  assert.equal(wizardPose(.88).smile,false);
  assert.equal(wizardPose(1).smile,true);
  const arm=Array.from({length:109},(_,i)=>wizardPose(1.10+i/100).arm);
  let crests=0;for(let i=1;i<arm.length;i++)if(arm[i]>.04&&arm[i-1]<=.04)crests++;
  assert.equal(crests,2);assert.equal(wizardPose(ENTRANCE_SECONDS).arm,0);
  assert.ok(arm.every(a=>Math.abs(a)<=.14),'wrist only makes a small greeting');
  let hops=0,airborne=false;
  for(let i=0;i<=300;i++){
    const p=wizardPose(i/100);
    if(p.y<-.001&&!airborne)hops++;
    airborne=p.y<-.001;
    assert.equal(p.sy,1,'the complete painting must not squash or bounce');
    if(i>=58)assert.equal(p.y,0,'landing has no rebound');
  }
  assert.equal(hops,1);
  assert.deepEqual(Object.keys(WIZARD_PARTS),['closed','smile','blink','hand'],'neck, face and hat must never be separate parts');
  assert.deepEqual(WIZARD_PARTS.closed.target,WIZARD_PARTS.smile.target,'expressions share the full-body frame');
  assert.deepEqual(WIZARD_PARTS.closed.target,WIZARD_PARTS.blink.target,'closed eyes also use a complete body painting');
});
test('wizard: eyes and mouth close briefly with each wave, then return to the open-eyed smile',()=>{
  assert.equal(wizardPose(1.1).eyesClosed,false);
  for(const time of [1.24,1.78]) {
    const p=wizardPose(time);assert.equal(p.eyesClosed,true);assert.ok(Math.abs(p.arm)>.03);
  }
  for(const time of [1.4,1.95,2.3])assert.equal(wizardPose(time).eyesClosed,false);
  assert.equal(wizardPose(1.24,0,null,false).eyesClosed,false,'reduced motion has no expression switching');
});
test('wizard: reduced motion is a still smile, reply moves the complete body and idle stays still',()=>{
  const still=wizardPose(null,0,null,false);
  for(const t of [.1,.36,1.3,2,10])assert.deepEqual(wizardPose(t,8,.2,false),still);
  assert.ok(wizardPose(null,1,.4).lean<-.05);
  assert.equal(wizardPose(null,1,1).lean,0);
  assert.deepEqual(wizardPose(null,5.2),wizardPose(null,0));
  assert.equal(wizardPose(null,1,.4).smile,true);
});

test('wizard: playing adds a quiet gesture and closed-eye expression without another hop',()=>{
  for(const t of [.1,.38,.7,1,5.98,6.3]){
    const p=wizardPose(null,t,null,true,true);
    assert.equal(p.y,0);assert.equal(p.sy,1);assert.ok(Math.abs(p.arm)<=.08);
    if(t>=.85)assert.equal(p.arm,0,'no continuous waving during reading');
  }
  assert.equal(wizardPose(null,.38,null,true,true).eyesClosed,true);
  assert.equal(wizardPose(null,.65,null,true,true).eyesClosed,false);
  assert.equal(wizardPose(null,5.98,null,true,true).eyesClosed,true);
  assert.equal(wizardPose(null,.38,.38,true,true).eyesClosed,true);
  assert.equal(wizardPose(null,.38,.38,false,true).eyesClosed,false);
});
