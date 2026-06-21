// engine/input.js

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

        // Solicita Pointer Lock ao clicar no canvas
        this.canvas.addEventListener('click', () => {
            this.canvas.requestPointerLock();
        });

        // Captura movimento do mouse acumulado por frame
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.canvas) {
                this.mouseDeltaX += e.movementX;
                this.mouseDeltaY += e.movementY;
            }
        });
    }

    // Retorna e limpa o deslocamento do mouse do frame atual
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