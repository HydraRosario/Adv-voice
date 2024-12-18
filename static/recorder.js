let blobs = [];
let stream;
let rec;
let recordUrl;
let audioResponseHandler;
let chatHistory = [];

function recorder(url, handler) {
    recordUrl = url;
    if (typeof handler !== "undefined") {
        audioResponseHandler = handler;
    }
}

async function record() {
    try {
        document.getElementById("神").innerHTML = "<i>Grabando...</i>";
        document.getElementById("record").style.display="none";
        document.getElementById("stop").style.display="";
        document.getElementById("record-stop-label").style.display="block";
        document.getElementById("record-stop-loading").style.display="none";
        document.getElementById("stop").disabled=false;

        blobs = [];

        stream = await navigator.mediaDevices.getUserMedia({audio:true, video:false});
        rec = new MediaRecorder(stream);
        rec.ondataavailable = e => {
            if (e.data) {
                blobs.push(e.data);
            }
        }
        
        rec.onstop = doPreview;
        rec.start();
    } catch (e) {
        alert("No fue posible grabar audio.");
    }
}

function scrollToBottom() {
    var chatBox = document.querySelector('.messages-container');
    if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function doPreview() {
    if (!blobs.length) {
        console.log("No hay blobs!");
    } else {
        const blob = new Blob(blobs);
        var fd = new FormData();
        fd.append("audio", blob, "audio");

        fetch(recordUrl + "?t=" + new Date().getTime(), {
            method: "POST",
            body: fd
        })
        .then(response => response.json())
        .then(data => {
            if (audioResponseHandler) {
                audioResponseHandler(data);
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

function stop() {
    document.getElementById("record-stop-label").style.display="none";
    document.getElementById("record-stop-loading").style.display="block";
    document.getElementById("stop").disabled=true;
    rec.stop();
    stream.getTracks().forEach(track => track.stop());
}

function sendText() {
    const textInput = document.getElementById('textInput');
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
        .then(data => {
            document.getElementById("text").innerHTML = data.text;
            document.getElementById("神").innerHTML = data.神;
            
            if (data.file) {
                let audio = new Audio();
                audio.src = data.file;
                audio.play();
                scrollToBottom();
            }
        })
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