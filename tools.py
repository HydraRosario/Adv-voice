import os, requests, urllib.parse
from groq import Groq
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
import cloudinary.api
import io
import time

# Cargar variables de entorno
load_dotenv()

# Configurar Cloudinary
cloudinary.config( 
  cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'), 
  api_key = os.getenv('CLOUDINARY_API_KEY'), 
  api_secret = os.getenv('CLOUDINARY_API_SECRET')
)

#Transcribir audio del usuario a texto
def transcriber(audio):
    client = Groq(
                api_key=os.getenv('GROQ_API_KEY')
            )
    try:
        transcription = client.audio.transcriptions.create(
            file=audio,
            model="whisper-large-v3",
            prompt="",
            language="es",
            temperature=0.0  
        )
        text = transcription.text
        print('神: ', text)
        return text
    except Exception as e:
        print(f"Error en transcripción: {str(e)}")
        return None

#Convertir el texto de respuesta a voz
def addVoice(text, output_file="respuesta.wav"):
    try:
        import edge_tts
        import asyncio
        
        async def generate_audio():
            communicate = edge_tts.Communicate(text, "es-ES-AlvaroNeural", rate="+15%")
            
            # Crear un buffer en memoria para el audio
            buffer = io.BytesIO()
            await communicate.save(buffer)
            buffer.seek(0)
            
            # Subir a Cloudinary
            result = cloudinary.uploader.upload(
                buffer,
                resource_type="raw",
                public_id=f"respuesta_{int(time.time())}",
                format="wav"
            )
            
            return result['secure_url']
            
        # Ejecutar la función asíncrona
        audio_url = asyncio.run(generate_audio())
        print(f"Audio guardado en Cloudinary: {audio_url}")
        return audio_url
        
    except Exception as e:
        print(f"Error en la conversión de texto a voz: {str(e)}")
        return None

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