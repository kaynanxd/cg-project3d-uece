class InputHandler {
    constructor(canvasId) {
        this.keys = {};
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this.canvas = document.getElementById(canvasId);

        // Configura ouvintes do teclado
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        this.canvas.addEventListener('click', () => {
            if (typeof currentState !== 'undefined' &&
                (currentState === GameState.PLAYING || currentState === GameState.PAUSED) &&
                document.pointerLockElement !== this.canvas) {
                this.canvas.requestPointerLock();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.canvas) {
                this.mouseDeltaX += e.movementX;
                this.mouseDeltaY += e.movementY;
            }
        });
    }

    getMouseDelta() {
        let deltas = { x: this.mouseDeltaX, y: this.mouseDeltaY };
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        return deltas;
    }

    isPressed(key) {
        return !!this.keys[key.toLowerCase()];
    }
}