// engine/camera.js

class FPSCamera {
    constructor(posX, posY, posZ) {
        this.position = { x: posX, y: posY, z: posZ };
        this.yaw = 0.0;
        this.pitch = 0.0;

        this.moveSpeed = 0.08;
        this.lookSpeed = 0.0025;

        // SOM DE PASSOS
        this.stepCooldown = 0;
    }

    update(inputHandler, speed) {
        let moving = false;

        let mouse = inputHandler.getMouseDelta();
        this.yaw -= mouse.x * this.lookSpeed;
        this.pitch -= mouse.y * this.lookSpeed;

        const limit = 89.0 * Math.PI / 180.0;
        if (this.pitch > limit) this.pitch = limit;
        if (this.pitch < -limit) this.pitch = -limit;

        let sinYaw = Math.sin(this.yaw);
        let cosYaw = Math.cos(this.yaw);

        let forwardX = -sinYaw;
        let forwardZ = -cosYaw;
        let rightX = cosYaw;
        let rightZ = -sinYaw;

        // Movimento aplicando o parâmetro de speed dinâmico
        if (inputHandler.isPressed('w')) {
            moving = true;
            this.position.x += forwardX * speed;
            this.position.z += forwardZ * speed;
        }
        if (inputHandler.isPressed('s')) {
            moving = true;
            this.position.x -= forwardX * speed;
            this.position.z -= forwardZ * speed;
        }
        if (inputHandler.isPressed('a')) {
            moving = true;
            this.position.x -= rightX * speed;
            this.position.z -= rightZ * speed;
        }
        if (inputHandler.isPressed('d')) {
            moving = true;
            this.position.x += rightX * speed;
            this.position.z += rightZ * speed;
        }

        if (moving) {
            if (this.stepCooldown <= 0) {
                AudioManager.play("footstep", 1);
                // Dica: Se quiser passos rápidos ao correr, mude o cooldown baseado na speed!
                this.stepCooldown = speed > 0.1 ? 35 : 60;
            }
        }

        if (this.stepCooldown > 0) {
            this.stepCooldown--;
        }

        return moving; // Retorna se o jogador está andando/correndo
    }

    getViewMatrix() {
        let matRx = Matrix4.rotationX(-this.pitch);
        let matRy = Matrix4.rotationY(-this.yaw);
        let matT = Matrix4.translation(-this.position.x, -this.position.y, -this.position.z);
        return Matrix4.multiply(Matrix4.multiply(matRx, matRy), matT);
    }
}