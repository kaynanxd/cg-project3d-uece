// engine/camera.js

class FPSCamera {
    constructor(posX, posY, posZ) {
        this.position = { x: posX, y: posY, z: posZ };
        this.yaw = 0.0;   // Olhar para os lados (em radianos)
        this.pitch = 0.0; // Olhar para cima/baixo (em radianos)
        
        this.moveSpeed = 0.08;
        this.lookSpeed = 0.0025;
    }

    update(inputHandler) {
        // 1. Atualiza a rotação pelo mouse
        let mouse = inputHandler.getMouseDelta();
        this.yaw -= mouse.x * this.lookSpeed;
        this.pitch -= mouse.y * this.lookSpeed;

        // Limita o Pitch para evitar que a câmera vire de cabeça para baixo
        const limit = 89.0 * Math.PI / 180.0;
        if (this.pitch > limit) this.pitch = limit;
        if (this.pitch < -limit) this.pitch = -limit;

        // 2. Calcula vetores Direção (Forward) e Lateral (Right) no plano XZ (estilo Doom)
        let sinYaw = Math.sin(this.yaw);
        let cosYaw = Math.cos(this.yaw);

        let forwardX = -sinYaw;
        let forwardZ = -cosYaw;
        let rightX = cosYaw;
        let rightZ = -sinYaw;

        // 3. Processa entradas do teclado para atualizar posição
        if (inputHandler.isPressed('w')) {
            this.position.x += forwardX * this.moveSpeed;
            this.position.z += forwardZ * this.moveSpeed;
        }
        if (inputHandler.isPressed('s')) {
            this.position.x -= forwardX * this.moveSpeed;
            this.position.z -= forwardZ * this.moveSpeed;
        }
        if (inputHandler.isPressed('a')) {
            this.position.x -= rightX * this.moveSpeed;
            this.position.z -= rightZ * this.moveSpeed;
        }
        if (inputHandler.isPressed('d')) {
            this.position.x += rightX * this.moveSpeed;
            this.position.z += rightZ * this.moveSpeed;
        }
    }

    // Retorna a View Matrix gerada a partir das transformações inversas do mundo
    getViewMatrix() {
        // Em uma câmera FPS, primeiro rotacionamos inversamente o mundo e depois o transladamos
        let matRx = Matrix4.rotationX(-this.pitch);
        let matRy = Matrix4.rotationY(-this.yaw);
        let matT = Matrix4.translation(-this.position.x, -this.position.y, -this.position.z);

        // Combina: View = Rx * Ry * T
        let view = Matrix4.multiply(matRx, matRy);
        view = Matrix4.multiply(view, matT);
        return view;
    }
}