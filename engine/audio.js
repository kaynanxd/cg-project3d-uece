const AudioManager = {
    audioCtx: new (window.AudioContext || window.webkitAudioContext)(),
    buffers: {},

    async load(name, url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        this.buffers[name] = await this.audioCtx.decodeAudioData(arrayBuffer);
    },

    play(name, volume = 0.5) {
        const source = this.audioCtx.createBufferSource();
        source.buffer = this.buffers[name];
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = volume;
        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        source.start(0);
    }
};