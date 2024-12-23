import os, requests, urllib.parse, time
from groq import Groq
from dotenv import load_dotenv
import cloudinary
import cloudinary.uploader
import cloudinary.api
import io
import tempfile
import asyncio
import edge_tts

# Cargar variables de entorno
load_dotenv()

# Configurar Cloudinary
cloudinary.config( 
  cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'), 
  api_key = os.getenv('CLOUDINARY_API_KEY'), 
  api_secret = os.getenv('CLOUDINARY_API_SECRET')
)

#Transcribir audio del usuario a texto
def transcriber(audio_url):
    client = Groq(
                api_key=os.getenv('GROQ_API_KEY')
            )
    try:
        # Descargar el archivo de audio desde la URL
        response = requests.get(audio_url)
        if response.status_code != 200:
            raise Exception("No se pudo descargar el audio")
        
        # Crear un archivo temporal para el audio descargado
        temp_filename = f"temp_input_{int(time.time())}.wav"
        temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
        
        try:
            # Guardar el audio descargado
            with open(temp_path, 'wb') as f:
                f.write(response.content)
            
            # Abrir y transcribir el archivo
            with open(temp_path, 'rb') as audio_file:
                transcription = client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3",
                    prompt="",
                    language="es",
                    temperature=0.0
                )
            
            text = transcription.text
            print('神: ', text)
            return text
            
        finally:
            # Limpiar el archivo temporal
            try:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
            except Exception as e:
                print(f"Error eliminando archivo temporal: {str(e)}")
                
    except Exception as e:
        print(f"Error en transcripción: {str(e)}")
        return None

#Convertir el texto de respuesta a voz
def addVoice(text):
    try:
        async def generate_audio():
            communicate = edge_tts.Communicate(text, "es-ES-AlvaroNeural", rate="+35%")
            
            # Generar un nombre único para el archivo temporal
            temp_filename = f"temp_audio_{int(time.time())}.wav"
            temp_path = os.path.join(tempfile.gettempdir(), temp_filename)
            
            try:
                # Guardar el audio
                await communicate.save(temp_path)
                
                # Subir a Cloudinary
                result = cloudinary.uploader.upload(
                    temp_path,
                    resource_type="raw",
                    public_id=f"respuesta_{int(time.time())}",
                    format="wav"
                )
                
                return result['secure_url']
                
            finally:
                # Intentar eliminar el archivo temporal
                try:
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
                except Exception as e:
                    print(f"Error eliminando archivo temporal: {str(e)}")
        
        # Ejecutar la función asíncrona
        audio_url = asyncio.run(generate_audio())
        print(f"Audio guardado en Cloudinary: {audio_url}")
        return audio_url
        
    except Exception as e:
        print(f"Error en la conversión de texto a voz: {str(e)}")
        return None