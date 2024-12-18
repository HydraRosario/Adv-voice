let blobs = [];
let stream;
let rec;
let recordUrl;
let audioResponseHandler;

function updateText(data) {
    try {
        // Intentar obtener los elementos
        const textElement = document.querySelector("#text") || document.querySelector(".text");
        const godElement = document.querySelector("#神") || document.querySelector(".god");
        
        // Actualizar solo si existen
        if (textElement && data.text) {
            textElement.textContent = data.text;
        }
        if (godElement && data.神) {
            godElement.textContent = data.神;
        }
    } catch (e) {
        console.error('Error actualizando texto:', e);
    }
}

function playAudio(audioUrl) {
    if (!audioUrl) {
        console.error('URL de audio no válida');
        return;
    }

    console.log('Intentando reproducir:', audioUrl);
    
    let audio = new Audio();
    audio.crossOrigin = "anonymous";
    
    // Usar la URL de Cloudinary directamente
    if (audioUrl.includes('cloudinary.com')) {
        audio.src = audioUrl;
    } else {
        // Si no es una URL de Cloudinary, limpiar el prefijo /static/
        audio.src = audioUrl.replace('/static/', '');
    }
    
    audio.play()
        .then(() => {
            console.log("Audio reproduciendo:", audio.src);
            try {
                const container = document.querySelector('.messages-container');
                if (container) {
                    setTimeout(() => {
                        container.scrollTop = container.scrollHeight;
                    }, 100);
                }
            } catch (e) {
                console.log("Error al hacer scroll:", e);
            }
        })
        .catch(e => {
            console.error('Error reproduciendo audio:', e);
            const textElement = document.querySelector("#text") || document.querySelector(".text");
            if (textElement) {
                const errorMsg = document.createElement('div');
                errorMsg.innerHTML = '<small style="color: red;">Error al reproducir el audio. Por favor, inténtelo de nuevo.</small>';
                textElement.appendChild(errorMsg);
            }
        });
}

function audioHandler(data) {
    // Actualizar texto
    updateText(data);
    
    // Reproducir audio si existe
    if (data.file) {
        playAudio(data.file);
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
    .then(audioHandler)
    .catch(error => {
        console.error('Error:', error);
        const elements = {
            record: document.querySelector("#record"),
            stop: document.querySelector("#stop"),
            label: document.querySelector("#record-stop-label"),
            loading: document.querySelector("#record-stop-loading")
        };
        
        if (elements.record) elements.record.style.display = "";
        if (elements.stop) elements.stop.style.display = "none";
        if (elements.label) elements.label.style.display = "none";
        if (elements.loading) elements.loading.style.display = "none";
    });
}

function sendText() {
    const textInput = document.querySelector('#textInput');
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