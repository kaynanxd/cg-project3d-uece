const AudioManager = {
    audioCtx: new (window.AudioContext || window.webkitAudioContext)(),
    buffers: {},

    async load(name, url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        this.buffers[name] = await this.audioCtx.decodeAudioData(arrayBuffer);
    },

    play(name, volume = 0.5) {

        if (!this.buffers[name]) {
            console.warn(`Som '${name}' não carregado`);
            return;
        }

        const source = this.audioCtx.createBufferSource();
        source.buffer = this.buffers[name];

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        source.start(0);
    },

    playMusic(name, volume = 0.3) {
        if (!this.buffers[name]) return;

        if (this.musicSource) {
            this.musicSource.stop();
        }

        const source = this.audioCtx.createBufferSource();
        source.buffer = this.buffers[name];
        source.loop = true;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        source.start(0);

        this.musicSource = source;
    }
};