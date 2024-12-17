import pyttsx3, os, webbrowser, requests, urllib.parse
from groq import Groq
from bs4 import BeautifulSoup
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.document_loaders import DirectoryLoader
from langchain_text_splitters import CharacterTextSplitter
from langchain_chroma import Chroma
import os

#Transcribir audio del usuario a texto
def transcriber(audio):
    client = Groq(
                api_key="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"
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
    api_key = 'sk_c41c49b087bc45b75e35785d6d071373fb0efa7c9026c240'
    voice_id = '21m00Tcm4TlvDq8ikWAM'  # Rachel voice - verified working voice ID
    url = f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream'
    headers = {
        'Accept': 'application/json',
        'xi-api-key': api_key
    }
    data = {
        'text': text,
        'model_id': 'eleven_multilingual_v2',
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
        # Fallback to local TTS if ElevenLabs fails
        try:
            engine = pyttsx3.init()
            engine.save_to_file(text, output_file)
            engine.runAndWait()
            print(f"Audio guardado usando TTS local en {output_file}")
        except Exception as e:
            print(f"Error al usar TTS local: {str(e)}")

#Obtener el clima de una ciudad
def get_weather(location):
    url = f"http://wttr.in/{location}?format=%C+%t"
    response = requests.get(url)
    if response.status_code == 200:
        clima = response.text.strip()
        print(clima)
        return f"{clima} - traduce ésto al español y di la temperatura en grados centígrados, no devuelvas el °C"
    else:
        return "No se pudo obtener el clima."