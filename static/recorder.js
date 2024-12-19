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
        const recordButton = document.getElementById("record");
        const stopButton = document.getElementById("stop");
        
        if (recordButton) {
            recordButton.disabled = true;
            recordButton.style.cursor = 'wait';
        }

        requestAnimationFrame(async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('Tu navegador no soporta la grabación de audio');
                }

                const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
                console.log('Estado del permiso del micrófono:', permissionStatus.state);

                this.stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100
                    },
                    video: false 
                });
                
                console.log('Acceso al micrófono concedido');
                
                const recorder = new MediaRecorder(this.stream);
                this.rec = recorder;
                this.blobs = [];
                
                recorder.ondataavailable = (e) => {
                    console.log('Datos de audio disponibles');
                    this.blobs.push(e.data);
                };
                
                recorder.onstop = async () => {
                    console.log('Grabación detenida');
                    const blob = new Blob(this.blobs, { type: 'audio/webm' });
                    await this.sendAudio(blob);
                    this.stream.getTracks().forEach(track => track.stop());
                };
                
                if (recordButton) recordButton.style.display = "none";
                if (stopButton) stopButton.style.display = "";
                
                recorder.start();
                console.log('Grabación iniciada');
            } catch (error) {
                console.error('Error:', error);
                this.addMessage(`⚠️ ${error.message}`, false);
            } finally {
                if (recordButton) {
                    recordButton.disabled = false;
                    recordButton.style.cursor = 'pointer';
                }
            }
        });
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
            console.log('URL de la petición:', window.location.origin + '/audio');
            this.addMessage(text, true);
            
            const response = await fetch('/audio', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': window.location.origin
                },
                credentials: 'same-origin',
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
    if (!chat) return;
    
    const textInput = document.querySelector('#textInput');
    const sendButton = document.querySelector('.send-button');
    
    if (sendButton) sendButton.disabled = true;
    
    try {
        if (textInput?.value?.trim()) {
            const text = textInput.value;
            textInput.value = '';
            chat.sendText(text);
        }
    } finally {
        if (sendButton) sendButton.disabled = false;
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
    if (!chat) return;
    
    const recordButton = document.getElementById("record");
    const stopButton = document.getElementById("stop");
    
    if (stopButton) stopButton.disabled = true;
    
    try {
        if (chat.rec?.state === "recording") {
            chat.rec.stop();
        }
    } finally {
        if (recordButton) recordButton.style.display = "";
        if (stopButton) {
            stopButton.style.display = "none";
            stopButton.disabled = false;
        }
    }
}