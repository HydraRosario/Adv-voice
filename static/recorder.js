class AudioChat {
    constructor() {
        this.blobs = [];
        this.stream = null;
        this.rec = null;
        this.isPlaying = false;
        this.audioQueue = [];
    }

    getMessagesContainer() {
        if (!this.messagesContainer) {
            this.messagesContainer = document.querySelector('.messages-container');
        }
        return this.messagesContainer;
    }

    async record() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Tu navegador no soporta la grabación de audio');
            }

            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false
            });
            
            this.rec = new MediaRecorder(this.stream);
            this.blobs = [];
            
            this.rec.ondataavailable = (e) => {
                this.blobs.push(e.data);
            };
            
            this.rec.onstop = async () => {
                const blob = new Blob(this.blobs, { type: 'audio/wav' });
                await this.sendAudio(blob);
                this.stream.getTracks().forEach(track => track.stop());
            };
            
            document.getElementById("record").style.display = "none";
            document.getElementById("stop").style.display = "";
            this.rec.start();
        } catch (error) {
            console.error('Error al iniciar grabación:', error);
            let errorMessage = 'No fue posible grabar audio';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Permiso de micrófono denegado. Por favor, permite el acceso al micrófono.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No se encontró ningún micrófono. Por favor, conecta un micrófono.';
            }
            
            this.addMessage(`⚠️ ${errorMessage}`, false);
            
            document.getElementById("record").style.display = "";
            document.getElementById("stop").style.display = "none";
        }
    }

    async sendAudio(blob) {
        const fd = new FormData();
        fd.append("audio", blob, "audio");
        
        try {
            // Primera petición: solo para transcribir
            const transcriptionResponse = await fetch('/transcribe_audio', {
                method: "POST",
                body: fd
            });
            
            const transcriptionData = await transcriptionResponse.json();
            
            // Mostramos la transcripción inmediatamente
            if (transcriptionData.transcription) {
                this.addMessage(transcriptionData.transcription, true);
            }
            
            // Segunda petición: para obtener la respuesta del modelo
            const modelResponse = await fetch('/process_text', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: transcriptionData.transcription })
            });
            
            const modelData = await modelResponse.json();
            
            // Mostramos la respuesta del modelo
            if (modelData.text) {
                this.addMessage(modelData.text, false);
            }
            
            if (modelData.file) {
                await this.playAudio(modelData.file);
            }
            
            document.getElementById("record").style.display = "";
            document.getElementById("stop").style.display = "none";
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('⚠️ Error al procesar el audio', false);
            
            document.getElementById("record").style.display = "";
            document.getElementById("stop").style.display = "none";
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

    addMessage(text, isUser = false) {
        if (!text) return;
        
        const container = document.querySelector('.messages-container');
        if (!container) {
            console.error('No se pudo encontrar el contenedor de mensajes');
            return;
        }

        try {
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
            container.appendChild(messageDiv);
            
            setTimeout(() => {
                messageDiv.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error) {
            console.error('Error al agregar mensaje:', error);
        }
    }

    async sendText(text) {
        if (!text.trim()) return;
        
        try {
            console.log('Intentando enviar texto:', text);
            this.addMessage(text, true);
            
            const response = await fetch('/audio', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            
            console.log('Respuesta recibida:', response);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Datos recibidos:', data);
            
            if (data.text) {
                this.addMessage(data.text, false);
            }
            
            if (data.file) {
                await this.playAudio(data.file);
            }
        } catch (error) {
            console.error('Error detallado:', error);
            this.addMessage('⚠️ Error al procesar el mensaje', false);
        }
    }
}

let chat = null;

function initChat() {
    try {
        chat = new AudioChat();
        console.log('Chat inicializado correctamente');
        
        const textInput = document.querySelector('#textInput');
        if (textInput) {
            textInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendText();
                }
            });
        }
    } catch (error) {
        console.error('Error al inicializar el chat:', error);
    }
}

document.addEventListener('DOMContentLoaded', initChat);

function sendText() {
    try {
        if (!chat) {
            console.error('Chat no inicializado, intentando inicializar...');
            initChat();
        }
        const textInput = document.querySelector('#textInput');
        if (textInput && textInput.value.trim()) {
            const text = textInput.value;
            textInput.value = '';
            chat.sendText(text);
        }
    } catch (error) {
        console.error('Error al enviar texto:', error);
    }
}

function record() {
    if (!chat) {
        console.error('Chat no inicializado');
        return;
    }
    chat.record();
}

function stop() {
    if (!chat) {
        console.error('Chat no inicializado');
        return;
    }
    if (chat.rec && chat.rec.state === "recording") {
        document.getElementById("record").style.display = "";
        document.getElementById("stop").style.display = "none";
        chat.rec.stop();
    }
}