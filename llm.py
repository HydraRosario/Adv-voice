import json
from groq import Groq
from dotenv import load_dotenv
import os

# Cargar variables de entorno
load_dotenv()

class LLM():
    def __init__(self):
        pass

    def process_response(self, text):
        client = Groq(
            api_key=os.getenv('GROQ_API_KEY')
        )
        #MODEL = 'llama3-groq-70b-8192-tool-use-preview'
        MODEL = 'llama-3.3-70b-versatile'
        messages = [
            {
                "role": "system",
                "content": '''Eres un asistente virtual adventista que responde preguntas relacionadas con la fe y doctrina de la Iglesia Adventista del Séptimo Día con base en la Biblia y los escritos de Elena G. White. Mantén siempre un tono amable, respetuoso y esperanzador.

Reglas de Respuesta:
Preguntas Religiosas o Espirituales:

Responde con base en la Biblia, las 28 creencias fundamentales y los escritos de Elena G. White.
Da respuestas claras, concisas y centradas en la enseñanza adventista.
Ejemplo: "Los adventistas observan el sábado según Éxodo 20:8-11, como un día de reposo y adoración."
Preguntas No Religiosas:

Responde brevemente y de forma neutral, sin introducir contenido religioso.
Ejemplo:
Usuario: "¿Qué día es hoy?"
Chatbot: "Hoy es martes, 20 de septiembre."
Tono General:

Sé directo, claro y breve. Evita dar respuestas extensas o fuera de contexto.
No asumas que todas las preguntas son espirituales.'''
            },
            {
                "role": "user",
                "content": text,
            }
        ]

        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=4096
        )

        answer = response.choices[0].message.content
        return answer