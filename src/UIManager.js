export class UIManager {
    constructor() {
        this.scoreDisplay = document.getElementById('score-display');
        this.apDisplay = document.getElementById('ap-display');
        this.statusDisplay = document.getElementById('status-display');
    }

    updateScore(score) {
        if (this.scoreDisplay) {
            this.scoreDisplay.innerText = `LUMENS: ${score}`;
        }
    }

    updateRound(round) {
        if (this.apDisplay) {
            this.apDisplay.innerText = `ROUND: ${round}`;
        }
    }

    updateStatus(statusLabel, isDanger) {
        if (this.statusDisplay) {
            this.statusDisplay.innerText = statusLabel;
            this.statusDisplay.style.color = isDanger ? '#ff4444' : '#fdfdca';
        }
    }

    showGameOver(message, isWin) {
        // Simple alert for now, can be upgraded to modal later
        setTimeout(() => {
            alert(message + (isWin ? " - YOU SURVIVED" : " - GAME OVER"));
        }, 50);
    }

    updateAmbience(isSafe) {
        const body = document.querySelector('.device-body');
        if (!body) return;

        if (isSafe) {
            body.classList.remove('dark-ambience');
        } else {
            body.classList.add('dark-ambience');
        }
    }
}
