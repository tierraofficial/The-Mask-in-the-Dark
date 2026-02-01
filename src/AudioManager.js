/**
 * AudioManager - Handles definition, loading, and playback of game audio.
 */
export class AudioManager {
    constructor() {
        this.basePath = 'audios/';
        this.sounds = {
            bgm: new Audio(this.basePath + 'bgm.wav'),
            alert: new Audio(this.basePath + 'alert.wav'),
            die: new Audio(this.basePath + 'die.wav'),
            door: new Audio(this.basePath + 'dooropen.ogg'),
            footstep: new Audio(this.basePath + 'footstep.wav')
        };

        // Configuration
        this.sounds.bgm.loop = true;
        this.sounds.bgm.volume = 1; // Slightly lower background music

        this.sounds.die.loop = false;

        this.sounds.footstep.volume = 1;
        this.sounds.door.volume = 1;

        // State
        this.lastFootstepTime = 0;
        this.FOOTSTEP_DELAY = 450; // ms
        this.isMuted = false;
    }

    playBgm() {
        if (this.isMuted) return;
        this.sounds.bgm.currentTime = 0;
        this.sounds.bgm.play().catch(e => console.warn("Audio play blocked", e));
    }

    stopBgm() {
        this.sounds.bgm.pause();
        this.sounds.bgm.currentTime = 0;
    }

    playAlert() {
        if (this.isMuted) return;
        // Allows overlapping or restarts? Let's restart.
        this.sounds.alert.currentTime = 0;
        this.sounds.alert.play().catch(e => console.warn("Audio play blocked", e));
    }

    playDie() {
        if (this.isMuted) return;
        this.sounds.die.currentTime = 0;
        this.sounds.die.play().catch(e => console.warn("Audio play blocked", e));
    }

    stopDie() {
        this.sounds.die.pause();
        this.sounds.die.currentTime = 0;
    }

    playDoor() {
        if (this.isMuted) return;
        // Clone for overlapping doors? No, single channel is usually fine for simple games.
        // Actually door sounds might overlap if opening two quickly?
        // Let's use cloneNode if we want polyphony, but simple is okay.
        // For accurate feedback, let's clone.
        const sfx = this.sounds.door.cloneNode();
        sfx.volume = this.sounds.door.volume;
        sfx.play().catch(e => console.warn("Audio play blocked", e));
    }

    playFootstep() {
        if (this.isMuted) return;
        const now = Date.now();
        if (now - this.lastFootstepTime > this.FOOTSTEP_DELAY) {
            // Random pitch/volume slight variation could be nice, but Audio API limit.
            // Just play.
            const sfx = this.sounds.footstep.cloneNode();
            sfx.volume = this.sounds.footstep.volume; // * (0.8 + Math.random() * 0.4);
            sfx.play().catch(e => { });
            this.lastFootstepTime = now;
        }
    }

    stopAll() {
        this.stopBgm();
        this.stopDie();
        this.sounds.alert.pause();
        this.sounds.alert.currentTime = 0;
    }
}
