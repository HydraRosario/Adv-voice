// --- Lógica de Autenticación y Control ---
let chat = null;
let auth;
let provider;

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

    document.getElementById('logout-button').addEventListener('click', () => {
        auth.signOut();
    });

    // Evento para el selector de modo
    const modeSelector = document.getElementById('mode-selector');
    if (modeSelector) {
        modeSelector.addEventListener('change', (e) => {
            setAssistantMode(e.target.value);
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
    const userInfo = document.getElementById('user-info');
    const adminControls = document.getElementById('admin-controls');
    const logoutButton = document.getElementById('logout-button'); // Obtener el botón de cerrar sesión directamente

    if (user) {
        // Usuario ha iniciado sesión
        loginContainer.style.display = 'none';
        sessionContainer.style.display = 'flex'; // Usar flex para alinear correctamente
        chatContainer.style.display = 'block';
        userInfo.textContent = `Hola, ${user.displayName}`;
        logoutButton.style.display = 'block'; // Asegurar que el botón de cerrar sesión sea visible cuando se inicia sesión
        
        // Mostrar controles de admin si el email coincide
        if (user.email === 'hidramusic@gmail.com') {
            adminControls.style.display = 'block';
        } else {
            adminControls.style.display = 'none'; // Ocultar controles de admin para usuarios no administradores
        }

        user.getIdToken().then(token => {
            if (!chat) chat = new AudioChat();
            chat.userToken = token;
        });

    } else {
        // Usuario ha cerrado sesión
        loginContainer.style.display = 'block';
        sessionContainer.style.display = 'none';
        chatContainer.style.display = 'none';
        userInfo.textContent = '';
        logoutButton.style.display = 'none'; // Ocultar explícitamente el botón de cerrar sesión cuando se cierra la sesión
        if (adminControls) adminControls.style.display = 'none'; // Ocultar si cierra sesión
        if (chat) chat.userToken = null;
    }
}

// Nueva función para enviar el modo al backend
async function setAssistantMode(mode) {
    if (!chat || !chat.userToken) return;

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
