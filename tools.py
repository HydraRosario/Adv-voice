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
    try:
        with open(audio, "rb") as file:
            transcription = client.audio.transcriptions.create(
                file=(audio, file.read()),
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
def addVoice(text, output_file="static/respuesta.wav"):
    try:
        import edge_tts
        import asyncio
        
        async def generate_audio():
            communicate = edge_tts.Communicate(text, "es-ES-AlvaroNeural", rate="+15%")
            await communicate.save(output_file)
        
        # Asegurarse de que el directorio existe
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        # Ejecutar la función asíncrona
        asyncio.run(generate_audio())
        print(f"Audio guardado en {output_file}")
        
    except Exception as e:
        print(f"Error en la conversión de texto a voz: {str(e)}")

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