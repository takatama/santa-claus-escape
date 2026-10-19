const narrator = (text,spoken) => ({speaker:'narrator',text,...(spoken?{spoken}:{})});
const fairy = text => ({speaker:'witch',text});
const santa = text => ({speaker:'santa',text});
export const EN_BOXES = Object.freeze({
  red:{name:'Red',answer:'6135',letters:['E','W'],words:['FACE']},
  blue:{name:'Blue',answer:'8848',answers:['8848','8849'],letters:['E','T']},
  yellow:{name:'Yellow',answer:'3354',letters:['E','I','S'],words:['TWO','SIX','SEVEN','NINE'],hands:['グー','チョキ','パー','グー']},
});
export const EN_QUESTIONS = Object.freeze([
  {id:'christmas-letter',kind:'text',title:'A Christmas riddle.',question:"Let's start with a riddle! The year ends on December 31st. What does Christmas end with?",aliases:['s','letter s','the letter s'],response:'The letter S! It is the last letter in the word Christmas.'},
  {id:'red-ornament',kind:'choice',title:'A red Christmas decoration.',question:"Now for a quiz! Long ago, people hung something red and round on Christmas trees. What was it? The sun, an apple, or a reindeer's nose?",choices:['The sun','An apple',"A reindeer's nose"],aliases:['An apple'],response:'An apple! Long ago, people hung real apples on Christmas trees. Apples could be stored through the winter.'},
  {id:'deer-ten-times',kind:'text',title:'One last trick question.',question:'Here comes a trick question! Say deer with me ten times. Ready? Deer, deer, deer, deer, deer, deer, deer, deer, deer, deer! Now, what does Santa ride in?',aliases:['sleigh','a sleigh','sled','a sled','his sleigh'],response:'A sleigh! The reindeer pull it.'},
]);
export const EN_MESSAGES = {
  intro:[narrator('Wait… I can hear a voice coming from the snow globe!'),santa("Hello there! Can you help me get out? I'm Santa. Santa Claus! A fairy played a trick on me and shut me inside this snow globe. Oh dear! I need to get the presents ready. I need your help!"),narrator('Will you help Santa escape?')],
  help:[santa("Wonderful! Thank you! The fairy left three boxes. There are two or three letters inside each one. Put all the letters in order to make a secret word. Tell me the word, and I can get out! Will you take a look at the boxes?"),narrator('There is a red box, a blue box, and a yellow box.')],
  red1:[narrator('You take a look at the red box. It has a lock with four number wheels. You need four digits to open it. There is something written under the snow.')],
  red2:[narrator('The word FACE is written on the red box. There are two more clues below it.')],
  red3:[narrator('The word FACE is written on the red box. Below it, a clue says: BAG is 217. There is one more clue.')],
  red4:[narrator('The red box says: FACE. BAG is 217. BEE is 255. You have found all the clues. Which four digits will open the lock?')],
  blue1:[narrator('You take a look at the blue box. It has a lock with four number wheels. There is a picture under the snow.')],
  blue2:[narrator('There is a picture of a mountain on the blue box. Something is written beside it.')],
  blue3:[narrator('Beside the mountain, it says: Sagarmatha. There is more writing below it.')],
  blue4:[narrator('Beside the mountain, it says: Sagarmatha. Look up my name. My height in meters opens the lock. You have found all the clues. You can search for Sagarmatha, or read about the mountain here.')],
  information:[narrator('Sagarmatha is the Nepali name for Mount Everest, the highest mountain in the world above sea level. Its height is about 8,849 meters. Older books say 8,848 meters. Either number opens this box.', 'Sagarmatha is the Nepali name for Mount Everest, the highest mountain in the world above sea level. Its height is about eight thousand eight hundred and forty-nine meters. Older books say eight thousand eight hundred and forty-eight meters. Either number opens this box.')],
  yellow1:[narrator('You take a look at the yellow box. It has a lock with four number wheels. There is something written under the snow.')],
  yellow2:[narrator('Four words are written on the yellow box: TWO, SIX, SEVEN, NINE. There is a riddle below them.')],
  yellow3:[narrator('The words are TWO, SIX, SEVEN, NINE. Below them, it says: One is three. Three is five. Five is four. Four is the magic number. There is one more clue.')],
  yellow4:[narrator('The words are TWO, SIX, SEVEN, NINE. The riddle says: One is three. Three is five. Five is four. Four is the magic number. One more clue says: The word HUNDRED is seven. You have found all the clues.')],
  letters:[narrator('All three boxes are open! You found seven letters: E, W, E, T, E, I, S. Put the seven letters in order to make the secret word.')],
  'branch-discovery':[narrator('Someone seems to be hiding behind the branches.')],
  invite:[fairy("Ta-da! Your sweetie is here! …Oh! Who are you?"),narrator('A fairy appears.'),fairy("You called me? I thought you were Santa! Oh well. Will you play with me? Play with me, and I'll let Santa out!"),narrator('Would you like to play with the fairy?')],
  paused:[fairy("Oh… I thought I'd found someone to play with. Santa will stay here for now. If you want to play later, say the secret word to call me!"),santa("Oh, that fairy! I'll be here when you come back."),narrator('Santa is still inside the snow globe. Come back whenever you like.')],
  reinvite:[narrator('The boxes have disappeared. Would you like to play with the fairy?')],
  rescue:[fairy('Hee hee! That was fun!'),narrator('Santa steps out of the snow globe!'),santa("Thank you! You helped me get out! Now, fairy, just because I was too busy to play doesn't mean you can shut me in a snow globe!"),fairy("But… I was lonely! Playing with you today was so much fun. Thank you!"),santa("Now, I'd better get those presents ready! Thanks to you, I can make everyone happy. I'll see you on Christmas Eve!"),narrator('You helped Santa escape! Thank you for playing.')],
};
const meanings={red:'E as in egg, and W as in whale.',blue:'E as in egg, and T as in tiger.',yellow:'E as in egg, I as in igloo, and S as in star.'};
export function englishBoxSegments(color,digits,part='open') {
  const box=EN_BOXES[color],name=box.name.toLowerCase();
  const set=`You set the ${name} box to ${digits}.`;
  const opened=`The ${name} box is unlocked!`;
  const paper=`Inside, you find ${box.letters.length} letters: ${box.letters.join(', ')}. ${meanings[color]}`;
  const text=part==='wrong'?`${set} Oh! The box is still locked.`:part==='paper'?paper:part==='unlocked'?`${set} ${opened}`:`${set} ${opened}\n${paper}`;
  return [{...narrator(text),spoken:text}];
}
export function englishSceneFor(state) {
  const color=state.selectedBox,saved=state.boxes[color];let key,title,chapter,segments,effect;
  switch(state.phase){
    case 'welcome':case 'intro':key='intro';title='I need your help!';chapter="Santa's voice";break;
    case 'boxes':{const remaining=Object.keys(EN_BOXES).filter(c=>!state.boxes[c].opened);key=remaining.length===3?'help':remaining.length?`remaining-${remaining.join('-')}`:'letters';if(remaining.length&&remaining.length<3)segments=[narrator(`Still to open: ${remaining.map(c=>EN_BOXES[c].name.toLowerCase()+' box').join(' and ')}.`)];title='Three boxes and a secret word.';chapter='Three boxes';break;}
    case 'box':key=state.boxMessage==='information'?'information':state.boxMessage==='wrong'?`${color}-wrong-${saved.lastSubmitted}`:`${color}${saved.exam}`;title='Find the four digits.';chapter=EN_BOXES[color].name+' box';if(state.boxMessage==='wrong'){segments=englishBoxSegments(color,saved.lastSubmitted,'wrong');effect='wrong';}break;
    case 'boxResponse':key=`${color}-open${saved.lastSubmitted&&saved.lastSubmitted!==EN_BOXES[color].answer?`-${saved.lastSubmitted}`:''}`;title='Letters inside the box.';chapter=EN_BOXES[color].name+' box';segments=englishBoxSegments(color,saved.lastSubmitted);effect='unlock';break;
    case 'spell':key='letters';title='Put the seven letters in order.';chapter='The secret word';break;
    case 'witchInvite':if(state.witchDiscovery?.pending&&!state.witchDiscovery.appeared){key='branch-discovery';title='Someone behind the branches.';chapter='The snowy forest';}else{key=state.reinvited?'reinvite':'invite';title='A fairy appears.';chapter='The fairy';effect=state.reinvited?undefined:'magic';}break;
    case 'witchPaused':key='paused';title='Come back whenever you like.';chapter='A bookmark for later';break;
    case 'witchQuestion':{const q=EN_QUESTIONS[state.questionIndex];key=`question-${q.id}`;title=q.title;chapter=`Game ${state.questionIndex+1} of 3`;segments=[fairy(q.question)];break;}
    case 'witchResponse':{const q=EN_QUESTIONS[state.questionIndex],r=state.responses[state.questionIndex];key=`response-${q.id}-${r.correct?'right':'wrong'}`;title="The fairy's answer.";chapter=`Game ${state.questionIndex+1} of 3`;segments=[fairy((r.correct?"That's right! ":'')+q.response)];break;}
    case 'rescue':case 'complete':key='rescue';title='See you on Christmas Eve!';chapter='Santa Claus Escape';effect='rescue';break;
  }
  return {key,title,chapter,segments:segments||EN_MESSAGES[key],bgm:state.phase.startsWith('witch')?'witch':'normal',effect};
}
export function englishProductionScenes(){
  const scenes={...EN_MESSAGES};
  for(const color of Object.keys(EN_BOXES)){scenes[`${color}-open`]=englishBoxSegments(color,EN_BOXES[color].answer);scenes[`${color}-wrong-0000`]=englishBoxSegments(color,'0000','wrong');}
  for(const colors of [['red','blue'],['red','yellow'],['blue','yellow'],['red'],['blue'],['yellow']])scenes[`remaining-${colors.join('-')}`]=[narrator(`Still to open: ${colors.map(c=>EN_BOXES[c].name.toLowerCase()+' box').join(' and ')}.`)];
  EN_QUESTIONS.forEach(q=>{scenes[`question-${q.id}`]=[fairy(q.question)];for(const right of [true,false])scenes[`response-${q.id}-${right?'right':'wrong'}`]=[fairy((right?"That's right! ":'')+q.response)];});return scenes;
}
