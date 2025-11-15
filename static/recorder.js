// --- Lógica de Autenticación y Control ---
let chat = null;
let auth;
let provider;
let currentAssistantMode = "Adventista"; // Default mode

// New AudioChat class implementation
class AudioChat {
    constructor() {
        console.log("AudioChat initialized.");
        this.userToken = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.rec = {
            state: "inactive",
            stop: () => {
                if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
                    this.mediaRecorder.stop();
                }
            }
        };
        this.recordingMessageElement = null; // Initialize temporary message element reference
    }

    addMessage(message, isUser) {
        const messagesContainer = document.querySelector('.messages-container');
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-box');
        messageElement.classList.add(isUser ? 'user-chat' : 'assistant-chat');
        messageElement.textContent = message;
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to bottom
    }

    playAudio(audioUrl) {
        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play().catch(e => console.error("Error playing audio:", e));
        }
    }

    async sendText(text) {
        if (!this.userToken) {
            console.error("User not authenticated.");
            this.addMessage("Error: Debes iniciar sesión para enviar mensajes.", false);
            return;
        }
        this.addMessage(text, true); // Display user message immediately

        try {
            const response = await fetch('/audio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.userToken}`
                },
                body: JSON.stringify({ text: text })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al enviar mensaje de texto.');
            }

            const data = await response.json();
            this.addMessage(data.text, false); // Display assistant's response
            this.playAudio(data.file);

        } catch (error) {
            console.error('Error sending text message:', error);
            this.addMessage(`Error: ${error.message}`, false);
        }
    }

    async record() {
        if (!this.userToken) {
            console.error("User not authenticated.");
            this.addMessage("Error: Debes iniciar sesión para grabar audio.", false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = event => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                // Remove the "Grabando audio..." message immediately when recording stops
                if (this.recordingMessageElement && this.recordingMessageElement.parentNode) {
                    this.recordingMessageElement.parentNode.removeChild(this.recordingMessageElement);
                    this.recordingMessageElement = null;
                }

                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.audioChunks = []; // Clear chunks for next recording
                this.rec.state = "inactive";

                const formData = new FormData();
                formData.append('audio', audioBlob, 'audio.wav');

                try {
                    const response = await fetch('/audio', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.userToken}`
                        },
                        body: formData
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Error al enviar audio.');
                    }

                    const data = await response.json();
                    // Now `data` is defined, so we can use its properties
                    this.addMessage(data.transcription, true); // Display the transcription as the user's message
                    this.addMessage(data.text, false); // Display assistant's response
                    this.playAudio(data.file);

                } catch (error) {
                    console.error('Error sending audio:', error);
                    this.addMessage(`Error: ${error.message}`, false);
                } finally {
                    document.getElementById('record').style.display = 'inline-block';
                    document.getElementById('stop').style.display = 'none';
                }
            };


            this.mediaRecorder.start();
            this.rec.state = "recording";
            // Create and display temporary "Grabando audio..." message
            const messagesContainer = document.querySelector('.messages-container');
            this.recordingMessageElement = document.createElement('div');
            this.recordingMessageElement.classList.add('chat-box', 'user-chat', 'temp-message');
            this.recordingMessageElement.textContent = "Grabando audio...";
            messagesContainer.appendChild(this.recordingMessageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            document.getElementById('record').style.display = 'none';
            document.getElementById('stop').style.display = 'inline-block';

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.addMessage(`Error: No se pudo acceder al micrófono. ${error.message}`, false);
        }
    }
}


async function initializeApp() {
    try {
        const response = await fetch('/config');
        if (!response.ok) {
            throw new Error('No se pudo cargar la configuración del servidor.');
        }
        const firebaseConfig = await response.json();

        // Inicializar Firebase con la configuración cargada
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        provider = new firebase.auth.GoogleAuthProvider();

        // Ahora que Firebase está inicializado, configurar el resto de la app
        setupApplication();

    } catch (error) {
        console.error("Error fatal al inicializar la aplicación:", error);
        document.body.innerHTML = '<p style="color: red; text-align: center; margin-top: 50px;">Error al cargar la configuración. La aplicación no puede iniciar.</p>';
    }
}

function setupApplication() {
    // Escuchar cambios en el estado de autenticación
    auth.onAuthStateChanged(handleAuthStateChange);

    // Asignar eventos a los botones
    document.getElementById('login-button').addEventListener('click', () => {
        auth.signInWithPopup(provider).catch(error => console.error("Error en inicio de sesión:", error));
    });

    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const body = document.body;

    // Initialize sidebar as open by default
    sidebar.classList.add('open');
    sidebarToggle.classList.add('shifted');
    body.classList.add('sidebar-open');

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        sidebarToggle.classList.toggle('shifted');
        body.classList.toggle('sidebar-open');
    });

    // Sidebar Logout Button
    document.getElementById('sidebarLogoutButton').addEventListener('click', () => {
        auth.signOut();
    });

    // Mode Toggle Button
    const modeToggleButton = document.getElementById('modeToggleButton');
    if (modeToggleButton) {
        modeToggleButton.addEventListener('click', async () => {
            const newMode = currentAssistantMode === "Adventista" ? "Anticristo" : "Adventista";
            await setAssistantMode(newMode);
        });
    }

    document.querySelector('#textInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendText();
        }
    });
}

function handleAuthStateChange(user) {
    const loginContainer = document.getElementById('login-container');
    const sessionContainer = document.getElementById('session-container');
    const chatContainer = document.getElementById('chat-container');
    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    const loginButton = document.getElementById('login-button');
    const adminControls = document.getElementById('admin-controls');
    const loginOverlay = document.getElementById('login-overlay');
    const loginMessage = document.getElementById('login-message'); // Get the login message element
    const modeToggleButton = document.getElementById('modeToggleButton');

    if (user) {
        // Usuario ha iniciado sesión
        loginContainer.style.display = 'none';
        sessionContainer.style.display = 'flex';
        chatContainer.style.display = 'block';
        loginOverlay.style.display = 'none'; // Hide overlay
        loginMessage.style.display = 'none'; // Hide login message

        // Update sidebar user avatar
        if (user.photoURL) {
            sidebarUserAvatar.src = user.photoURL;
            sidebarUserAvatar.style.display = 'block'; // Show avatar
        } else {
            sidebarUserAvatar.src = "https://via.placeholder.com/50/CCCCCC/FFFFFF?text=User"; // Default placeholder
            sidebarUserAvatar.style.display = 'block'; // Show avatar
        }

        // Initialize chat object here, after user is authenticated
        user.getIdToken().then(token => {
            if (!chat) {
                chat = new AudioChat();
            }
            chat.userToken = token;

            // Mostrar controles de admin si el email coincide
            if (adminControls) {
                if (user.email === 'hidramusic@gmail.com') {
                    adminControls.style.display = 'flex'; // Use flex to stack children
                    // Ensure modeToggleButton is visible
                    if (modeToggleButton) {
                        modeToggleButton.style.display = 'flex'; // Explicitly set display for the button
                        modeToggleButton.textContent = currentAssistantMode === "Adventista" ? "😇" : "😈";
                    }
                } else {
                    adminControls.style.display = 'none';
                }
            }
        });

    } else {
        // Usuario ha cerrado sesión
        loginContainer.style.display = 'flex'; // Show login button
        sessionContainer.style.display = 'none';
        chatContainer.style.display = 'block'; // Chat container is always visible
        loginOverlay.style.display = 'block'; // Show overlay
        loginMessage.style.display = 'block'; // Show login message
        if (adminControls) adminControls.style.display = 'none';
        if (chat) chat.userToken = null;
        sidebarUserAvatar.style.display = 'none'; // Hide avatar
        loginButton.textContent = "Iniciar"; // Show "Iniciar" text
    }
}

// Nueva función para enviar el modo al backend
async function setAssistantMode(mode) {
    // Ensure chat is initialized before calling its methods
    if (!chat || !chat.userToken) {
        console.error("Chat object not initialized or user not authenticated.");
        return;
    }

    try {
        const response = await fetch('/set_mode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${chat.userToken}`
            },
            body: JSON.stringify({ mode: mode })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al cambiar el modo');
        }

        const data = await response.json();
        console.log('Modo cambiado a:', data.mode);
        currentAssistantMode = data.mode; // Update global mode variable
        const modeToggleButton = document.getElementById('modeToggleButton');
        if (modeToggleButton) {
            modeToggleButton.textContent = currentAssistantMode === "Adventista" ? "😇" : "😈";
        }
        // Opcional: mostrar una pequeña notificación de éxito
        chat.addMessage(`🤖 Modo cambiado a ${data.mode}`, false);

    } catch (error) {
        console.error('Error al establecer el modo:', error);
        chat.addMessage(`⚠️ ${error.message}`, false);
    }
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

// --- Funciones Globales para los botones del HTML ---
function sendText() {
    // Ensure chat is initialized before calling its methods
    if (!chat || !chat.userToken) {
        console.error("Chat object not initialized or user not authenticated.");
        return;
    }
    const textInput = document.querySelector('#textInput');
    if (textInput?.value?.trim()) {
        chat.sendText(textInput.value);
        textInput.value = '';
    }
}

function record() {
    // Ensure chat is initialized before calling its methods
    if (!chat || !chat.userToken) {
        console.error("Chat object not initialized or user not authenticated.");
        return;
    }
    if (chat) chat.record();
}

function stop() {
    // Ensure chat is initialized before calling its methods
    if (!chat || !chat.userToken) {
        console.error("Chat object not initialized or user not authenticated.");
        return;
    }
    if (chat && chat.rec?.state === "recording") {
        chat.rec.stop();
    }
}