import json
import os
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
    try:
        if request.is_json:
            # Procesar solicitud de texto
            data = request.get_json()
            text = data.get('text', '')
            if not text:
                return jsonify({'error': 'No se recibió texto'}), 400
            
            # Procesar el texto
            神 = text
            answer, function_args, function_response, function_name = LLM().process_response(text)
            args_json = json.dumps(function_args, indent=2)
            
            try:
                addVoice(answer, "static/respuesta.wav")
            except Exception as e:
                print(f"Error al generar audio: {str(e)}")
            
            if answer:
                xlr8 = f"{function_name}<br>{args_json}<br>{function_response}<br><br>"
                functions_history.append(xlr8)
            
            return jsonify({
                'result': 'ok',
                'text': "神: " + answer,
                '神': 神,
                'file': 'respuesta.wav',
                'functions_history': functions_history
            })
        else:
            # Procesar solicitud de audio
            audio = request.files.get('audio')
            if not audio:
                return jsonify({'error': 'No se recibió archivo de audio'}), 400
            
            try:
                audio_path = "static/input.wav"
                audio.save(audio_path)
                
                text = transcriber(audio_path)
                if not text:
                    return jsonify({'error': 'No se pudo transcribir el audio'}), 500
                
                神 = text
                answer, function_args, function_response, function_name = LLM().process_response(text)
                args_json = json.dumps(function_args, indent=2)
                
                addVoice(answer, "static/respuesta.wav")
                
                if answer:
                    xlr8 = f"{function_name}<br>{args_json}<br>{function_response}<br><br>"
                    functions_history.append(xlr8)
                
                return jsonify({
                    'result': 'ok',
                    'text': "神: " + answer,
                    '神': 神,
                    'file': 'respuesta.wav',
                    'functions_history': functions_history
                })
            except Exception as e:
                print(f"Error procesando audio: {str(e)}")
                return jsonify({'error': str(e)}), 500
    except Exception as e:
        print(f"Error general: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

if __name__ == "__main__":
    app.run(debug=True)