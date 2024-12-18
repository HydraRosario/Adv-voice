import json
from flask import Flask, render_template, request, jsonify
from tools import transcriber, addVoice
from llm import LLM

app = Flask(__name__)

functions_history = []

@app.route("/", methods=['GET'])
def index():
    return render_template("recorder.html")

@app.route("/audio", methods=["POST"])
def audio():
    if request.is_json:
        # Procesar solicitud de texto
        data = request.get_json()
        text = data.get('text', '')
        
        # Procesar el texto igual que la transcripción de audio
        神 = "神: " + text
        answer, function_args, function_response, function_name = LLM().process_response(text)
        args_json = json.dumps(function_args, indent=2)
        
        # Para Vercel, necesitamos manejar el almacenamiento de archivos de manera diferente
        # Considera usar un servicio de almacenamiento como S3 o similar
        try:
            addVoice(answer, "/tmp/respuesta.wav")
        except Exception as e:
            print(f"Error al generar audio: {str(e)}")

        if answer:
            xlr8 = f"{function_name}<br>{args_json}<br>{function_response}<br><br>"
            functions_history.append(xlr8)
        
        return jsonify({
            'result': 'ok',
            'text': answer,
            '神': 神,
            'file': 'respuesta.wav',
            'functions_history': functions_history
        })
    else:
        # Procesar solicitud de audio
        audio = request.files.get('audio')
        if audio:
            try:
                audio.save("/tmp/dijo el señor.wav")
                text = transcriber("/tmp/dijo el señor.wav")
                神 = "神: " + text
                answer, function_args, function_response, function_name = LLM().process_response(text)
                args_json = json.dumps(function_args, indent=2)
                addVoice(answer, "/tmp/respuesta.wav")

                if answer:
                    xlr8 = f"{function_name}<br>{args_json}<br>{function_response}<br><br>"
                    functions_history.append(xlr8)
                
                return jsonify({
                    'result': 'ok',
                    'text': answer,
                    '神': 神,
                    'file': 'respuesta.wav',
                    'functions_history': functions_history
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        else:
            return jsonify({'error': 'No se recibió archivo de audio'}), 400

# Importante: no uses app.run() en producción
if __name__ == "__main__":
    app.run(debug=True)