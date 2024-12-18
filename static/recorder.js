class AudioChat {
    constructor() {
        this.blobs = [];
        this.stream = null;
        this.rec = null;
        this.isPlaying = false;
        this.audioQueue = [];
        this.messagesContainer = document.querySelector('.messages-container');
        
        // Inicializar con el mensaje de bienvenida
        if (this.messagesContainer) {
            this.addMessage("¡Hola! Soy aquí para ayudarte con tus preguntas y necesidades. ¿En qué puedo ayudarte hoy?", false);
        }
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
        
        // Añadir animación CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
        
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
            audio.src = url.includes('cloudinary.com') ? url : url;
            
            await audio.play();
            await new Promise(resolve => {
                audio.onended = resolve;
            });
            
            this.processAudioQueue();
        } catch (error) {
            console.error('Error reproduciendo audio:', error);
            this.addMessage('⚠️ Error al reproducir el audio', false);
            this.processAudioQueue();
        }
    }

    async handleResponse(data) {
        // Solo añadir mensajes si hay texto
        if (data.text && data.text.trim()) {
            this.addMessage(data.text, false);
        }
        
        // No duplicar el mensaje del usuario
        // El mensaje del usuario ya se añadió en sendText()
        
        if (data.file) {
            await this.playAudio(data.file);
        }
    }

    async sendText(text) {
        if (!text.trim()) return;
        
        // Limpiar el input inmediatamente
        const textInput = document.querySelector('#textInput');
        const textToSend = text.trim(); // Guardar el texto antes de limpiar
        if (textInput) {
            textInput.value = '';
        }
        
        this.addMessage(textToSend, true);
        
        try {
            const response = await fetch('/audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToSend })
            });
            
            const data = await response.json();
            await this.handleResponse(data);
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('⚠️ Error al procesar el mensaje', false);
        }
    }

    async sendAudio(blob) {
        const fd = new FormData();
        fd.append("audio", blob, "audio");
        
        try {
            // Mostrar indicador de carga
            document.getElementById("record-stop-label").style.display = "none";
            document.getElementById("record-stop-loading").style.display = "";
            
            const response = await fetch('/audio', {
                method: "POST",
                body: fd
            });
            
            const data = await response.json();
            console.log('Datos recibidos del servidor:', data); // Log para depuración
            
            // Verificar todos los campos posibles de transcripción
            if (data.transcription) {
                console.log('Transcripción encontrada:', data.transcription);
                this.addMessage(data.transcription, true);
            } else if (data.神) {
                console.log('Transcripción 神 encontrada:', data.��);
                this.addMessage(data.神, true);
            } else if (data.userMessage) {
                console.log('Mensaje de usuario encontrado:', data.userMessage);
                this.addMessage(data.userMessage, true);
            } else {
                console.log('No se encontró transcripción en la respuesta');
            }
            
            // Añadir respuesta del asistente
            if (data.text && data.text.trim()) {
                console.log('Respuesta del asistente:', data.text);
                this.addMessage(data.text, false);
            }
            
            // Reproducir audio si existe
            if (data.file) {
                console.log('Audio recibido:', data.file);
                await this.playAudio(data.file);
            }
            
            // Restaurar botones
            document.getElementById("record").style.display = "";
            document.getElementById("stop").style.display = "none";
            document.getElementById("record-stop-label").style.display = "";
            document.getElementById("record-stop-loading").style.display = "none";
        } catch (error) {
            console.error('Error completo:', error);
            this.addMessage('⚠️ Error al procesar el audio', false);
            
            // Restaurar botones en caso de error
            document.getElementById("record").style.display = "";
            document.getElementById("stop").style.display = "none";
            document.getElementById("record-stop-label").style.display = "";
            document.getElementById("record-stop-loading").style.display = "none";
        }
    }
}

// Inicializar el chat cuando el DOM esté listo
const chat = new AudioChat();

// Función global para enviar texto
function sendText() {
    const textInput = document.querySelector('#textInput');
    if (textInput && textInput.value.trim()) {
        chat.sendText(textInput.value);
    }
}

// Event listener para el Enter
document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.querySelector('#textInput');
    if (textInput) {
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (textInput.value.trim()) {
                    chat.sendText(textInput.value);
                }
            }
        });
    }
});

function doPreview() {
    if (chat.blobs.length) {
        const blob = new Blob(chat.blobs);
        chat.sendAudio(blob);
    }
}

function record() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            chat.stream = stream;
            chat.rec = new MediaRecorder(stream);
            chat.rec.ondataavailable = e => chat.blobs.push(e.data);
            chat.rec.start();
            
            document.getElementById("record").style.display = "none";
            document.getElementById("stop").style.display = "";
            document.getElementById("record-stop-label").style.display = "";
            document.getElementById("record-stop-loading").style.display = "none";
        })
        .catch(console.error);
}

function stop() {
    chat.rec.stop();
    chat.stream.getTracks()[0].stop();
    document.getElementById("record-stop-label").style.display = "none";
    document.getElementById("record-stop-loading").style.display = "";
    chat.blobs = [];
    setTimeout(doPreview, 1000);
}