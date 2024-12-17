import os, requests, urllib.parse
from groq import Groq
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

#Transcribir audio del usuario a texto
def transcriber(audio):
    client = Groq(
                api_key=os.getenv('GROQ_API_KEY')
            )
    filename = os.path.dirname(__file__) + "\\dijo el señor.wav"
    with open(filename, "rb") as file:
        transcription = client.audio.transcriptions.create(
            file=(filename, file.read()),
            model="whisper-large-v3",
            prompt="",
            language="es",
            temperature=0.0  
        )
    text = transcription.text
    print('神: ', text)
    return text

#Convertir el texto de respuesta a voz
def addVoice(text, output_file="respuesta.wav"):
    voice_id = '21m00Tcm4TlvDq8ikWAM'  # Rachel voice - verified working voice ID
    model = "eleven_multilingual_v2"
    api_key = os.getenv('ELEVEN_LABS_API_KEY')
    url = f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream'
    headers = {
        'Accept': 'application/json',
        'xi-api-key': api_key
    }
    data = {
        'text': text,
        'model_id': model,
        'voice_settings': {
            'stability': 0.5,
            'similarity_boost': 0.8,
            'style': 0.0,
            'use_speaker_boost': True
        }
    }
    response = requests.post(url, headers=headers, json=data, stream=True)
    if response.ok:
        with open(output_file, 'wb') as f:
            for chunk in response.iter_content(chunk_size=1024):
                f.write(chunk)
        print(f"Audio guardado en {output_file}")
    else:
        print(f"Error en la solicitud: {response.status_code} - {response.text}")

#Obtener el clima de una ciudad
def get_weather(location):
    try:
        url = f"http://wttr.in/{location}?format=%C+%t"
        response = requests.get(url)
        if response.status_code == 200:
            clima = response.text.strip()
            print(clima)
            return f"{clima} - traduce ésto al español y di la temperatura en grados centígrados, no devuelvas el °C"
        else:
            return "No se pudo obtener el clima."
    except Exception as e:
        print(f"Error al obtener el clima: {str(e)}")