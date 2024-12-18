let blobs = [];
let stream;
let rec;
let recordUrl;
let audioResponseHandler;

function audioHandler(data) {
    const textElement = document.getElementById("text");
    const godElement = document.getElementById("神");
    
    if (textElement) textElement.innerHTML = data.text || '';
    if (godElement) godElement.innerHTML = data.神 || '';
    
    if (data.file) {
        let audio = new Audio();
        audio.crossOrigin = "anonymous";
        
        audio.src = data.file;
        
        audio.play()
            .then(() => {
                console.log("Audio reproduciendo correctamente:", data.file);
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
                    textElement.innerHTML += '<br><small style="color: red;">Error al reproducir el audio. Por favor, inténtelo de nuevo.</small>';
                }
            });
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
        document.getElementById("record").style.display = "";
        document.getElementById("stop").style.display = "none";
        document.getElementById("record-stop-label").style.display = "none";
        document.getElementById("record-stop-loading").style.display = "none";
    });
}

function sendText() {
    const textInput = document.getElementById('textInput');
    if (!textInput) return;
    
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