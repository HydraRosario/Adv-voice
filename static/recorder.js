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

                this.stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100
                    },
                    video: false 
                });
                
                const recorder = new MediaRecorder(this.stream);
                this.rec = recorder;
                this.blobs = [];
                
                recorder.ondataavailable = (e) => {
                    this.blobs.push(e.data);
                };
                
                recorder.onstop = async () => {
                    const blob = new Blob(this.blobs, { type: 'audio/webm' });
                    await this.sendAudio(blob);
                    this.stream.getTracks().forEach(track => track.stop());
                };
                
                if (recordButton) recordButton.style.display = "none";
                if (stopButton) stopButton.style.display = "";
                
                recorder.start();
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
            const transcriptionResponse = await fetch('/transcribe_audio', {
                method: "POST",
                body: fd
            });
            
            const transcriptionData = await transcriptionResponse.json();
            
            if (transcriptionData.transcription) {
                this.addMessage(transcriptionData.transcription, true);
            }
            
            const modelResponse = await fetch('/process_text', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: transcriptionData.transcription })
            });
            
            const modelData = await modelResponse.json();
            
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
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
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