// Injected only into the disposable recording browser.
(() => {
  const NativeContext = window.AudioContext;
  const master = new NativeContext({ sampleRate: 48000 });
  const mix = master.createMediaStreamDestination();
  const nativeConnect = AudioNode.prototype.connect;
  const taps = new WeakMap();
  const routed = new WeakSet();
  const references = [];
  const now = () => performance.timeOrigin + performance.now();

  AudioNode.prototype.connect = function (target, ...args) {
    const result = nativeConnect.call(this, target, ...args);
    if (target === this.context.destination && this.context !== master) {
      let tap = taps.get(this.context);
      if (!tap) {
        tap = this.context.createMediaStreamDestination();
        taps.set(this.context, tap);
        nativeConnect.call(master.createMediaStreamSource(tap.stream), mix);
      }
      nativeConnect.call(this, tap);
    }
    return result;
  };
  const createSource = NativeContext.prototype.createMediaElementSource;
  NativeContext.prototype.createMediaElementSource = function (element) {
    const source = createSource.call(this, element);
    routed.add(element);
    return source;
  };
  const nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    master.resume();
    if (!routed.has(this)) {
      const source = createSource.call(master, this);
      const gain = master.createGain();
      const updateVolume = () => { gain.gain.value = this.muted ? 0 : this.volume; };
      updateVolume();
      this.addEventListener('volumechange', updateVolume);
      nativeConnect.call(source, gain);
      nativeConnect.call(gain, master.destination);
      nativeConnect.call(gain, mix);
      routed.add(this);
    }
    return nativePlay.call(this);
  };
  const nativeStart = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    const buffer = this.buffer;
    // Reference untrimmed long speech buffers, rather than guessed file timings.
    if (window.captureExactBuffers && buffer?.duration > 5 && !args[1] && !args[2]) {
      const samples = buffer.getChannelData(0).slice(0, buffer.sampleRate * 4);
      if (samples.some(value => Math.abs(value) > 0.01)) references.push({
        scheduledT: now() + Math.max(0, (args[0] || 0) - this.context.currentTime) * 1000,
        sampleRate: buffer.sampleRate, duration: buffer.duration, samples,
      });
    }
    return nativeStart.apply(this, args);
  };
  const encode = bytes => {
    let text = '';
    for (let i = 0; i < bytes.length; i += 32768)
      text += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(text);
  };
  let recorder, chunks;
  window.beginCapture = async () => {
    await master.resume();
    chunks = [];
    recorder = new MediaRecorder(mix.stream, {
      mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000,
    });
    recorder.ondataavailable = event => chunks.push(event.data);
    const epoch = now();
    recorder.start(100);
    return epoch;
  };
  window.endCapture = () => new Promise((resolve, reject) => {
    recorder.onerror = reject;
    recorder.onstop = async () => {
      try {
        resolve({
          base64: encode(new Uint8Array(await new Blob(chunks).arrayBuffer())),
          references: references.map(({ samples, ...meta }) => ({
            ...meta, base64: encode(new Uint8Array(samples.buffer)),
          })),
        });
      } catch (error) { reject(error); }
    };
    recorder.stop();
  });
})();
