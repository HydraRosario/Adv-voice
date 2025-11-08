// --- Configuración de Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCRjSumxmtDn1rmn6LeUy4DpwknqTpBMGA",
  authDomain: "adv-voice-9b5d9.firebaseapp.com",
  projectId: "adv-voice-9b5d9",
  storageBucket: "adv-voice-9b5d9.firebasestorage.app",
  messagingSenderId: "487180827799",
  appId: "1:487180827799:web:f26a7b0d428f5d33a9fdd2",
  measurementId: "G-LZKVN5BNMV"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// --- Clase del Chat ---
class AudioChat {
    constructor() {
        this.blobs = [];
        this.stream = null;
        this.rec = null;
        this.messagesContainer = document.querySelector('.messages-container');
        this.userToken = null; // Para almacenar el token de ID de Firebase
    }

    getMessagesContainer() {
        return this.messagesContainer;
    }

    // --- Métodos de grabación ---
    async record() {
        const recordButton = document.getElementById("record");
        const stopButton = document.getElementById("stop");
        
        recordButton.disabled = true;
        recordButton.style.cursor = 'wait';

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
            const recorder = new MediaRecorder(this.stream);
            this.rec = recorder;
            this.blobs = [];
            
            recorder.ondataavailable = (e) => this.blobs.push(e.data);
            
            recorder.onstop = () => {
                const blob = new Blob(this.blobs, { type: 'audio/webm' });
                this.sendAudio(blob);
                this.stream.getTracks().forEach(track => track.stop());
            };
            
            recordButton.style.display = "none";
            stopButton.style.display = "";
            recorder.start();
        } catch (error) {
            console.error('Error de grabación:', error);
            this.addMessage(`⚠️ ${error.message}`, false);
            recordButton.disabled = false;
            recordButton.style.cursor = 'pointer';
        }
    }

    // --- Métodos de comunicación con el Backend ---
    async sendAudio(blob) {
        if (!this.userToken) {
            this.addMessage('⚠️ Error de autenticación. Por favor, inicia sesión de nuevo.', false);
            return;
        }

        const fd = new FormData();
        fd.append("audio", blob, "audio.webm");
        this.addMessage("🎤 Grabación enviada, procesando...", true);

        try {
            const response = await fetch('/audio', {
                method: "POST",
                headers: { 'Authorization': `Bearer ${this.userToken}` },
                body: fd
            });

            if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
            
            const data = await response.json();
            
            if (data.transcription) {
                const messages = this.getMessagesContainer().querySelectorAll('.user-chat');
                messages[messages.length - 1].textContent = `"${data.transcription}"`;
            }
            if (data.text) this.addMessage(data.text, false);
            if (data.file) this.playAudio(data.file);

        } catch (error) {
            console.error('Error:', error);
            this.addMessage(`⚠️ ${error.message}`, false);
        } finally {
            document.getElementById("record").style.display = "";
            document.getElementById("stop").style.display = "none";
        }
    }

    async sendText(text) {
        if (!text.trim() || !this.userToken) {
            this.addMessage('⚠️ Error de autenticación. Por favor, inicia sesión de nuevo.', false);
            return;
        }
        
        this.addMessage(text, true);
        
        try {
            const response = await fetch('/audio', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.userToken}`
                },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);

            const data = await response.json();
            if (data.text) this.addMessage(data.text, false);
            if (data.file) this.playAudio(data.file);

        } catch (error) {
            console.error('Error detallado:', error);
            this.addMessage(`⚠️ ${error.message}`, false);
        }
    }

    // --- Métodos de UI y Audio ---
    playAudio(url) {
        try {
            const audio = new Audio(url);
            audio.play().catch(e => console.error("Error al reproducir audio:", e));
        } catch (error) {
            console.error('Error creando o reproduciendo el audio:', error);
        }
    }

    addMessage(text, isUser = false) {
        if (!text) return;
        const container = this.getMessagesContainer();
        if (!container) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-box ${isUser ? 'user-chat' : 'assistant-chat'}`;
        messageDiv.textContent = text;
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }
}

// --- Lógica de Autenticación y Control ---
let chat = null;

function handleAuthStateChange(user) {
    const authContainer = document.getElementById('auth-container');
    const chatContainer = document.getElementById('chat-container');
    const userInfo = document.getElementById('user-info');

    if (user) {
        // Usuario ha iniciado sesión
        authContainer.style.display = 'none';
        chatContainer.style.display = 'block';
        userInfo.textContent = `Hola, ${user.displayName}`;
        
        user.getIdToken().then(token => {
            if (!chat) chat = new AudioChat();
            chat.userToken = token;
        });

    } else {
        // Usuario ha cerrado sesión
        authContainer.style.display = 'block';
        chatContainer.style.display = 'none';
        userInfo.textContent = '';
        if (chat) chat.userToken = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Escuchar cambios en el estado de autenticación
    auth.onAuthStateChanged(handleAuthStateChange);

    // Asignar eventos a los botones
    document.getElementById('login-button').addEventListener('click', () => {
        auth.signInWithPopup(provider).catch(error => console.error("Error en inicio de sesión:", error));
    });

    document.getElementById('logout-button').addEventListener('click', () => {
        auth.signOut();
    });

    document.querySelector('#textInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendText();
        }
    });
});

// --- Funciones Globales para los botones del HTML ---
function sendText() {
    const textInput = document.querySelector('#textInput');
    if (chat && textInput?.value?.trim()) {
        chat.sendText(textInput.value);
        textInput.value = '';
    }
}

function record() {
    if (chat) chat.record();
}

function stop() {
    if (chat && chat.rec?.state === "recording") {
        chat.rec.stop();
    }
}
