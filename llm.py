import json
from groq import Groq
from tools import get_weather

class LLM():
    def __init__(self):
        pass
    def process_response(self, text):
        client = Groq(
                    api_key="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"
                )
        MODEL = 'llama3-groq-70b-8192-tool-use-preview'
        messages=[
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
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "Obtener el clima de un lugar específico",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "location debe ser una ciudad",
                            }
                        },
                        "required": ["location"],
                    },
                },
            }
        ]
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            max_tokens=4096
        )

        response_message = response.choices[0].message
        messages.append(response_message)
        if not response_message.tool_calls:
            answer = response_message.content
            function_args = ''
            function_response = ''
            function_name = ''
            return answer, function_args, function_response, function_name
        else:
            tool_calls = response_message.tool_calls
            if tool_calls:
                available_functions = {
                    "get_weather": get_weather
                }
                messages.append(response_message)
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_to_call = available_functions[function_name]
                    function_args = json.loads(tool_call.function.arguments)

                    if function_name == 'get_weather':
                        function_response = function_to_call(
                            location=function_args.get("location"),
                        )
                    messages.append(
                        {
                            "tool_call_id": tool_call.id,
                            "role": "tool",
                            "name": function_name,
                            "content": function_response,
                        }
                    )
                second_response = client.chat.completions.create(
                    model=MODEL,
                    messages=messages
                )
                answer = second_response.choices[0].message.content
                return answer, function_args, function_response, function_name