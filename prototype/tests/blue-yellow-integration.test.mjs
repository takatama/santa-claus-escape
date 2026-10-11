import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,restoreState} from '../full-game.js';
import {BOXES,COLORS,sceneFor,papers} from '../full-scenario.js';
import {boxSceneFor,boxTimeline} from '../box-presentation.js';
import {resolveAudioTimeline} from '../timed-audio.js';
const enter=color=>[{type:'START'},{type:'BOXES'},{type:'SELECT',color}].reduce(transition,initialState());

for(const color of ['blue','yellow']) {
  test(`${color}: four original stages, no premature information, manual lid and intact voice sequence`,()=>{
    let state=enter(color);
    for(let exam=1;exam<=4;exam++){
      assert.equal(state.boxes[color].exam,exam);assert.equal(sceneFor(state).key,`${color}${exam}`);
      assert.doesNotMatch(sceneFor(state).segments[0].text,/8848|2502/);
      if(exam<4){assert.equal(transition(state,{type:'INFORMATION'}),state);state=transition(state,{type:'EXAMINE'});}
    }
    assert.equal(transition(state,{type:'EXAMINE'}),state);
    if(color==='blue'){
      const info=transition(state,{type:'INFORMATION'});assert.equal(sceneFor(info).key,'information');
      assert.match(sceneFor(info).segments[0].text,/8848メートル/);assert.equal(info.boxes.blue.dial,'0000');
    }
    for(const value of ['0001','0002','0002',BOXES[color].answer]) {
      state=transition(state,{type:'BOX_DIAL',value});state=transition(state,{type:'ANSWER'});
      assert.equal(state.boxes[color].lastSubmitted,value);
    }
    assert.equal(state.boxes[color].lidOpen,false);assert.equal(papers(state).length,2);
    assert.equal(transition(state,{type:'ANSWER'}),state);
    const unlocked=boxSceneFor(state);assert.doesNotMatch(unlocked.segments[0].text,/中には/);
    state=transition(state,{type:'OPEN_LID'});const opened=boxSceneFor(state);
    assert.equal(unlocked.segments[0].text+'\n'+opened.segments[0].text,sceneFor(state).segments[0].text);
    assert.deepEqual([...boxTimeline(`${color}-unlocked`,resolveAudioTimeline),...boxTimeline(`${color}-paper`,resolveAudioTimeline)],resolveAudioTimeline(`${color}-open`));
    for(const value of [.4,.2,1,0,1]) {
      state=transition(state,{type:'LID',value});assert.equal(restoreState(state).boxes[color].lidProgress,value);
      assert.equal(papers(state).length,2);
    }
    for(const value of [-1,2,NaN])assert.equal(transition(state,{type:'LID',value}),state);
  });
  test(`${color}: legacy direct draft and open saves migrate; corrupt lid data cannot unlock`,()=>{
    let state=enter(color);state.boxes[color].inputMode='direct';state.boxes[color].draft=BOXES[color].answer.replace(/\d/g,c=>String.fromCharCode(c.charCodeAt(0)+0xfee0));
    let restored=restoreState(state);assert.equal(restored.boxes[color].dial,BOXES[color].answer);assert.equal(restored.boxes[color].inputMode,'dial');
    restored=transition(restored,{type:'ANSWER'});delete restored.boxes[color].lidOpen;delete restored.boxes[color].lidProgress;
    assert.equal(restoreState(restored).boxes[color].lidOpen,true);
    state.boxes[color].lidOpen=true;assert.equal(restoreState(state),null);
    state.boxes[color].lidOpen=false;state.boxes[color].lidProgress=.4;assert.equal(restoreState(state),null);
  });
}
test('all six orders: manual lids, saved intermediate positions and paper identities remain coherent',()=>{
  const orders=COLORS.flatMap(a=>COLORS.filter(b=>b!==a).map(b=>[a,b,COLORS.find(c=>c!==a&&c!==b)]));
  for(const order of orders){
    let state=[{type:'START'},{type:'BOXES'}].reduce(transition,initialState());
    order.forEach((color,index)=>{
      state=transition(state,{type:'SELECT',color});state=transition(state,{type:'BOX_DIAL',value:BOXES[color].answer});state=transition(state,{type:'ANSWER'});
      for(const value of [.6,.25,1,0,1]){state=restoreState(transition(state,{type:'LID',value}));assert.equal(papers(state).length,(index+1)*2);}
      assert.equal(new Set(papers(state).map(p=>p.id)).size,(index+1)*2);
      state=transition(state,{type:'CONTINUE_BOX'});
    });
    assert.equal(state.phase,'spell');assert.equal(papers(state).length,6);
  }
});
