import { sceneFor } from './full-scenario.js';

export function rescueSceneFor(view,part) {
  const scene=sceneFor(view);
  if(!['rescue','complete'].includes(view.phase))return scene;
  part ||= view.rescueMotion?.released===false?'first':'full';
  return {...scene,key:`rescue-${part}`,segments:part==='first'?scene.segments.slice(0,1):part==='ending'?scene.segments.slice(1):scene.segments};
}
export function rescueTimeline(key,resolve) {
  const full=resolve('rescue');
  if(key==='rescue-first')return full.slice(0,2);
  if(key==='rescue-ending')return full.slice(2);
  if(key==='rescue-full')return full;
  return resolve(key);
}

// A two-part original scene, held at the physical release. No saved audio jobs.
// After cancellation, explicit replay/resume starts from the first sentence.
export class RescueNarration {
  constructor(play){this.play=play;this.clear();}
  clear(){this.current=null;this.firstDone=false;this.released=false;this.view=null;}
  start(view){this.clear();this.view=view;this.released=view.rescueMotion?.released!==false;this.current=this.released?'full':'first';this.play(rescueSceneFor(view,this.current));}
  release(view){this.view=view;this.released=true;
    if(this.current)return;
    this.current=this.firstDone?'ending':'full';this.play(rescueSceneFor(view,this.current));
  }
  finish(){const current=this.current;this.current=null;
    if(current==='first'){this.firstDone=true;if(this.released){this.current='ending';this.play(rescueSceneFor(this.view,'ending'));}}
  }
}
