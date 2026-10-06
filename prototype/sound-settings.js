// BGM専用。声と効果音の音量には適用しない。
export const DEFAULT_BGM_VOLUME=20;
export const MAX_BGM_GAIN=.025;
export function normalizeBgmVolume(value){
  return typeof value==='number'&&Number.isFinite(value)?Math.round(Math.max(0,Math.min(100,value))):DEFAULT_BGM_VOLUME;
}
export const bgmGain=volume=>MAX_BGM_GAIN*normalizeBgmVolume(volume)/100;
