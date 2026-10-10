/** Persistent dialogue DOM shared by illustrated stages. Repaint only new text. */
export function stageDialogueMarkup() {
  return `<section class="box-dialogue" aria-labelledby="box-dialogue-title"><header><h2 id="box-dialogue-title">お話</h2><span class="box-voice" role="status" hidden><span class="box-voice-icon" aria-hidden="true"><svg viewBox="0 0 24 32"><path d="M2 12h5l8-8v24l-8-8H2z" fill="currentColor"/><path d="M19 10q7 6 0 12" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="box-voice-bars"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></span><span>声を再生中</span></span><button type="button" data-action="mute" class="box-dialogue-mute"></button></header><div id="transcript" class="box-dialogue-scroll" role="region" aria-label="現在の台詞、スクロールして読む" tabindex="0"></div></section>`;
}
export function createStageDialogue(element) {
  const find = selector => element.querySelector(selector);
  let lastDialogue;
  return {
    setStatus(status) {
      const playing = status === '読み上げ中';
      find('.box-voice').hidden = !playing;
      find('#box-dialogue-title').hidden = playing;
    },
    update({ dialogue, muted, status }) {
      const text = find('#transcript');
      if (lastDialogue !== dialogue) { text.innerHTML = dialogue; text.scrollTop = 0; lastDialogue = dialogue; }
      const mute = find('.box-dialogue-mute');
      mute.textContent = muted ? '音声オフ' : '音声オン'; mute.setAttribute('aria-pressed', String(muted));
      this.setStatus(status);
    },
  };
}

/** Updating settings must not replace the stage, its input, or its captions. */
export function createStageSettings(content) {
  let lastSettings;
  return {
    update(settings) {
      if (lastSettings === settings) return;
      const focused = document.activeElement;
      const action = content.contains(focused) ? focused?.dataset.action : null;
      const volumeFocus = content.contains(focused) && focused?.id === 'bgm-volume';
      const expanded = Array.from(content.querySelectorAll('details'), node => node.open);
      const scroll = content.scrollTop;
      content.innerHTML = settings; lastSettings = settings;
      content.querySelectorAll('details').forEach((node, index) => { node.open = expanded[index] === true; });
      if (action) content.querySelector(`[data-action="${action}"]`)?.focus({preventScroll:true});
      if (volumeFocus) content.querySelector('#bgm-volume')?.focus({preventScroll:true});
      content.scrollTop = scroll;
    },
  };
}
