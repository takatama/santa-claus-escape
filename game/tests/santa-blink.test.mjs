import test from 'node:test';
import assert from 'node:assert/strict';
import {createSantaBlink} from '../atmosphere.js';
import {wizardPose} from '../wizard-puppet.js';

test('Santa blinks independently and defers to wizard greetings and conversation',()=>{
  const blink=createSantaBlink();let closed=0;
  for(let i=0;i<18000;i++){
    const time=i/100,conversation=time%9;
    const wizard=wizardPose(time<2.25?time:null,conversation,conversation<.85?conversation:null,true,true);
    const eyes=blink(time,true,wizard.eyesClosed);
    if(eyes)closed++;
    assert.ok(!eyes||!wizard.eyesClosed,`overlap at ${time}`);
  }
  assert.ok(closed>200,'Santa must keep blinking during long conversations');
});

test('reduced motion opens the eyes and wizard input cancels an ongoing blink',()=>{
  const blink=createSantaBlink();
  assert.equal(blink(2.1,true),.5);assert.equal(blink(2.2,true),1);
  assert.equal(blink(2.21,true,true),0);assert.equal(blink(2.3,true),0);
  assert.equal(blink(3,true),.5);assert.equal(blink(3.1,true),1);
  assert.equal(blink(3.11,false),0);assert.equal(blink(3.12,true),0);
});
