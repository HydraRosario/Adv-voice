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
        document.getElementById("record-stop-label").style.display="block"
        document.getElementById("record-stop-loading").style.display="none"
        document.getElementById("stop").disabled=false

        blobs = [];

        //Grabar audio, blabla
        stream = await navigator.mediaDevices.getUserMedia({audio:true, video:false})
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
    var chatBox = document.querySelector('.chat-container');
    if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
    } else {
        console.error('El elemento chat-container no se encontró en el DOM');
    }
}

function doPreview() {
    if (!blobs.length) {
        console.log("No hay blobs!");
    } else {
        const blob = new Blob(blobs);
        var fd = new FormData();
        fd.append("audio", blob, "audio");

        fetch(recordUrl, {
            method: "POST",
            body: fd,
        })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }
            return response.json();
        })
        .then((data) => {
            audioResponseHandler(data);
            scrollToBottom(); // Asegúrate de que esta función esté definida
        })
        .catch((error) => {
            console.error('Error al enviar el audio:', error);
        });
    }
}

function stop() {
    document.getElementById("record-stop-label").style.display="none";
    document.getElementById("record-stop-loading").style.display="block";
    document.getElementById("stop").disabled=true;
    rec.stop();
}

function handleAudioResponse(response){
    if (!response || response == null) {
        console.log("No response");
        return;
    }
    document.getElementById("record").style.display="";
    document.getElementById("stop").style.display="none";
    if (audioResponseHandler != null) {
        audioResponseHandler(response);
    }
}

function sendText() {
    const textInput = document.getElementById("textInput");
    const text = textInput.value.trim();
    
    if (text) {
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
            textInput.value = ''; // Limpiar el campo de texto
            
            if (typeof data.file !== "undefined") {
                audioFile = data.file;
                let audio = new Audio();
                audio.setAttribute("src", "static/" + audioFile + "?t=" + new Date().getTime());
                audio.play();
                scrollToBottom();
            }
        });
    }
}