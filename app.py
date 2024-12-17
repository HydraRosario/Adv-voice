import json
from flask import Flask, render_template, request, jsonify
from tools import transcriber, addVoice
from llm import LLM

app = Flask(__name__)

functions_history = []

@app.route("/")
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
        addVoice(answer, "static/respuesta.wav")

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
            audio.save("dijo el señor.wav")
            text = transcriber("dijo el señor.wav")
            神 = "神: " + text
            answer, function_args, function_response, function_name = LLM().process_response(text)
            args_json = json.dumps(function_args, indent=2)
            addVoice(answer, "static/respuesta.wav")

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
            return jsonify({'error': 'No se recibió archivo de audio'}), 400

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)