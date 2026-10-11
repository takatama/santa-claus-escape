// Adopted picture-book wording. Original scenario and recordings remain intact.
export const BLUE_CLUE='その名を調べよ。高さがカギを開く';
export const BLUE_SEARCH_URL='https://www.google.com/search?q='+encodeURIComponent('サガルマータ');
export const RESCUE_APPEARED='スノードームの中からサンタが出てきました。';
export const PAUSED_NARRATION='サンタさんは、まだガラスの中です。サンタの脱出でした。また会いに来てくださいね。';
export const STORYBOOK_AUDIO_IDS=Object.freeze({intro:'storybook-intro',help:'storybook-help',blue4:'storybook-blue4',information:'storybook-information',paused:'storybook-paused',rescue:'storybook-rescue','rescue-appeared':'storybook-rescue-appeared'});
export function storybookSegments(key,segments) {
  return segments?.map((segment,index)=>{
    if(key==='intro'&&index===0)return {...segment,text:'あれれ？雪の入った、まるいガラスの中から声が聞こえます。'};
    if(key==='intro'&&index===1)return {...segment,text:segment.text.replace('この端末に閉じ込められて','このスノードームに閉じ込められて')};
    if(key==='help'&&index===0)return {...segment,text:segment.text.replace('この端末によびかけてくれれば','ひみつの言葉をわしに伝えてくれれば')};
    if(key==='blue4')return {...segment,text:segment.text.replace('その高さは、この端末が知っている',BLUE_CLUE).replace('サガルマータについて調べますか？','サガルマータを検索しますか？')};
    if(key==='information')return {...segment,text:'サガルマータは、ネパール語で、エベレストのことです。\nエベレストは、世界で一番高い山です。今の高さは、およそ8849メートルです。昔の資料では、8848メートルと書かれています。\nこの箱は、どちらの数字でも開きます。',spoken:'サガルマータは、ネパール語で、エベレストのことです。エベレストは、世界で一番高い山です。今の高さは、およそ八千八百四十九メートルです。昔の資料では、八千八百四十八メートルと書かれています。この箱は、どちらの数字でも開きます。'};
    if(key==='paused'&&index===2)return {...segment,text:PAUSED_NARRATION};
    if(key==='rescue'&&index===1)return {...segment,text:`シャララララーン。${RESCUE_APPEARED}`,spoken:RESCUE_APPEARED};
    return segment;
  });
}
