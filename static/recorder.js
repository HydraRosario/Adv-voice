let blobs = [];
let stream;
let rec;
let recordUrl;
let audioResponseHandler;

function updateText(textElement, godElement, data) {
    try {
        if (textElement && data.text) textElement.innerHTML = data.text;
        if (godElement && data.神) godElement.innerHTML = data.神;
    } catch (e) {
        console.error('Error actualizando texto:', e);
    }
}

function playAudio(audioUrl, textElement) {
    if (!audioUrl) {
        console.error('URL de audio no válida');
        return;
    }

    let audio = new Audio();
    audio.crossOrigin = "anonymous";
    
    // Limpiar la URL si viene con /static/
    const cleanUrl = audioUrl.replace('/static/', '');
    audio.src = cleanUrl;
    
    audio.play()
        .then(() => {
            console.log("Audio reproduciendo:", cleanUrl);
            try {
                const messagesContainer = document.querySelector('.messages-container');
                if (messagesContainer) {
                    setTimeout(() => {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }, 100);
                }
            } catch (e) {
                console.log("Error al hacer scroll:", e);
            }
        })
        .catch(e => {
            console.error('Error reproduciendo audio:', e);
            if (textElement) {
                const errorMsg = document.createElement('div');
                errorMsg.innerHTML = '<small style="color: red;">Error al reproducir el audio. Por favor, inténtelo de nuevo.</small>';
                textElement.appendChild(errorMsg);
            }
        });
}

function audioHandler(data) {
    const textElement = document.getElementById("text");
    const godElement = document.getElementById("神");
    
    // Actualizar texto de manera segura
    updateText(textElement, godElement, data);
    
    // Reproducir audio si existe
    if (data.file) {
        playAudio(data.file, textElement);
    }
}

function recorder(url, handler) {
    recordUrl = url;
    audioResponseHandler = audioHandler;
}

function doPreview() {
    if (!blobs.length) {
        console.log("No hay blobs!");
        return;
    }
    
    const blob = new Blob(blobs);
    var fd = new FormData();
    fd.append("audio", blob, "audio");

    fetch(recordUrl, {
        method: "POST",
        body: fd
    })
    .then(response => response.json())
    .then(data => {
        if (audioResponseHandler) {
            audioResponseHandler(data);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        const elements = {
            record: document.getElementById("record"),
            stop: document.getElementById("stop"),
            label: document.getElementById("record-stop-label"),
            loading: document.getElementById("record-stop-loading")
        };
        
        if (elements.record) elements.record.style.display = "";
        if (elements.stop) elements.stop.style.display = "none";
        if (elements.label) elements.label.style.display = "none";
        if (elements.loading) elements.loading.style.display = "none";
    });
}

function sendText() {
    const textInput = document.getElementById('textInput');
    if (!textInput) {
        console.error('Elemento textInput no encontrado');
        return;
    }
    
    const text = textInput.value.trim();
    if (text) {
        textInput.value = '';
        
        fetch('/audio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        })
        .then(response => response.json())
        .then(audioHandler)
        .catch(error => console.error('Error:', error));
    }
}

// Añadir event listener para el campo de texto
document.getElementById('text-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {  // Detectar cuando se presiona Enter
        e.preventDefault();    // Prevenir el comportamiento por defecto
        document.getElementById('send-button').click();  // Simular click en el botón de enviar
    }
});