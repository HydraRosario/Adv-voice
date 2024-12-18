class AudioChat {
    constructor() {
        this.blobs = [];
        this.stream = null;
        this.rec = null;
        this.isPlaying = false;
        this.audioQueue = [];
        this.messagesContainer = document.querySelector('.messages-container');
    }

    createMessageElement(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-box ${isUser ? 'user-chat' : 'assistant-chat'}`;
        messageDiv.style.cssText = `
            margin: 10px 0;
            padding: 15px 20px;
            border-radius: 20px;
            max-width: 80%;
            word-wrap: break-word;
            animation: fadeIn 0.3s ease;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            ${isUser ? `
                margin-left: auto;
                background-color: #e3c19b;
                color: #000;
                margin-right: 15px;
                border-bottom-right-radius: 5px;
            ` : `
                margin-right: auto;
                background-color: #f5e6d3;
                color: #000;
                margin-left: 15px;
                border-bottom-left-radius: 5px;
            `}
        `;
        
        messageDiv.textContent = text;
        return messageDiv;
    }

    addMessage(text, isUser = false) {
        if (!text) return;
        const messageElement = this.createMessageElement(text, isUser);
        if (this.messagesContainer) {
            this.messagesContainer.appendChild(messageElement);
            setTimeout(() => {
                messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
        }
    }

    async sendText(text) {
        if (!text.trim()) return;
        
        this.addMessage(text, true);
        
        try {
            const response = await fetch('/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            
            const data = await response.json();
            await this.handleResponse(data);
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('⚠️ Error al procesar el mensaje', false);
        }
    }

    async handleResponse(data) {
        if (data.text && data.text.trim()) {
            this.addMessage(data.text, false);
        }
        
        if (data.file) {
            await this.playAudio(data.file);
        }
    }

    async playAudio(url) {
        this.audioQueue.push(url);
        if (!this.isPlaying) {
            this.processAudioQueue();
        }
    }

    async processAudioQueue() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const url = this.audioQueue.shift();
        
        try {
            const audio = new Audio();
            audio.crossOrigin = "anonymous";
            audio.src = url;
            
            await audio.play();
            await new Promise(resolve => {
                audio.onended = resolve;
            });
            
            this.processAudioQueue();
        } catch (error) {
            console.error('Error reproduciendo audio:', error);
            this.processAudioQueue();
        }
    }

    async record() {
        try {
            // Asegurarnos de que estamos en un contexto seguro
            if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
                throw new Error('Se requiere HTTPS para acceder al micrófono');
            }

            // Solicitar permisos con opciones específicas
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.rec = new MediaRecorder(this.stream);
            this.blobs = [];
            
            this.rec.ondataavailable = (e) => {
                this.blobs.push(e.data);
            };
            
            this.rec.onstop = async () => {
                try {
                    const blob = new Blob(this.blobs, { type: 'audio/webm' });
                    await this.sendAudio(blob);
                } finally {
                    if (this.stream) {
                        this.stream.getTracks().forEach(track => track.stop());
                    }
                }
            };
            
            document.getElementById("record").style.display = "none";
            document.getElementById("stop").style.display = "";
            this.rec.start();
        } catch (error) {
            console.error('Error en grabación:', error);
            
            // Restaurar estado de botones
            document.getElementById("record").style.display = "";
            document.getElementById("stop").style.display = "none";
            
            // Lanzar el error para que sea manejado por el código que llama
            throw error;
        }
    }

    async sendAudio(blob) {
        const fd = new FormData();
        fd.append("audio", blob, "audio.webm");
        
        try {
            const response = await fetch('/audio', {
                method: "POST",
                body: fd
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.神 && data.神.trim()) {
                this.addMessage(data.神, true);
            }
            
            if (data.text && data.text.trim()) {
                this.addMessage(data.text, false);
            }
            
            if (data.file) {
                await this.playAudio(data.file);
            }
        } catch (error) {
            console.error('Error en envío de audio:', error);
            throw error;
        } finally {
            document.getElementById("record").style.display = "";
            document.getElementById("stop").style.display = "none";
        }
    }
}

// Inicializar el chat cuando el DOM esté listo
const chat = new AudioChat();

// Función global para enviar texto
function sendText() {
    const textInput = document.querySelector('#textInput');
    if (textInput && textInput.value.trim()) {
        const text = textInput.value;
        textInput.value = '';
        chat.sendText(text);
    }
}

function record() {
    chat.record().catch(error => {
        console.error('Error al iniciar grabación:', error);
        chat.addMessage('⚠️ No fue posible grabar audio. Por favor, verifica los permisos del micrófono.', false);
    });
}

function stop() {
    if (chat.rec && chat.rec.state === "recording") {
        chat.rec.stop();
    }
}

// Event listener para el Enter
document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.querySelector('#textInput');
    if (textInput) {
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendText();
            }
        });
    }
});