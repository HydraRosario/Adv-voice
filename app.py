import json
import os
from flask import Flask, render_template, request, jsonify, make_response
from tools import transcriber, addVoice
from llm import LLM
import cloudinary
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

functions_history = []

@app.route("/", methods=['GET'])
def index():
    return render_template("recorder.html")

@app.route("/audio", methods=["POST", "OPTIONS"])
def audio():
    print(f"Request Headers: {request.headers}")
    print(f"Request Method: {request.method}")
    print(f"Request URL: {request.url}")
    
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST")
        return response

    try:
        if request.is_json:
            print("JSON Data:", request.get_json())
            print("Procesando solicitud JSON")
            data = request.get_json()
            text = data.get('text', '')
            if not text:
                print("No se recibió texto")
                return jsonify({'error': 'No se recibió texto'}), 400
            
            print(f"Texto recibido: {text}")
            # Procesar el texto
            神 = text
            answer, function_args, function_response, function_name = LLM().process_response(text)
            args_json = json.dumps(function_args, indent=2)
            
            try:
                audio_url = addVoice(answer)
            except Exception as e:
                print(f"Error al generar audio: {str(e)}")
                audio_url = None
            
            if answer:
                xlr8 = f"{function_name}<br>{args_json}<br>{function_response}<br><br>"
                functions_history.append(xlr8)
            
            return jsonify({
                'result': 'ok',
                'text': answer,
                '神': 神,
                'file': audio_url,
                'functions_history': functions_history
            })
        else:
            print("Procesando solicitud de audio")
            audio = request.files.get('audio')
            if not audio:
                print("No se recibió archivo de audio")
                return jsonify({'error': 'No se recibió archivo de audio'}), 400
            
            try:
                print("Subiendo audio a Cloudinary")
                # Subir audio a Cloudinary
                result = cloudinary.uploader.upload(
                    audio,
                    resource_type="raw",
                    format="wav"
                )
                
                transcription = transcriber(result['secure_url'])
                if not transcription:
                    return jsonify({'error': 'No se pudo transcribir el audio'}), 500
                
                answer, function_args, function_response, function_name = LLM().process_response(transcription)
                args_json = json.dumps(function_args, indent=2)
                
                audio_url = addVoice(answer)
                
                if answer:
                    xlr8 = f"{function_name}<br>{args_json}<br>{function_response}<br><br>"
                    functions_history.append(xlr8)
                
                return jsonify({
                    'result': 'ok',
                    'transcription': transcription,
                    'text': answer,
                    'file': audio_url,
                    'functions_history': functions_history
                })
            except Exception as e:
                print(f"Error procesando audio: {str(e)}")
                return jsonify({'error': str(e)}), 500
    except Exception as e:
        print(f"Error general: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route("/transcribe_audio", methods=["POST"])
def transcribe_audio():
    try:
        audio = request.files.get('audio')
        if not audio:
            return jsonify({'error': 'No se recibió archivo de audio'}), 400
        
        # Subir audio a Cloudinary
        result = cloudinary.uploader.upload(
            audio,
            resource_type="raw",
            format="wav"
        )
        
        transcription = transcriber(result['secure_url'])
        if not transcription:
            return jsonify({'error': 'No se pudo transcribir el audio'}), 500
        
        return jsonify({
            'result': 'ok',
            'transcription': transcription
        })
    except Exception as e:
        print(f"Error transcribiendo audio: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route("/process_text", methods=["POST"])
def process_text():
    try:
        data = request.get_json()
        text = data.get('text', '')
        if not text:
            return jsonify({'error': 'No se recibió texto'}), 400
        
        answer, function_args, function_response, function_name = LLM().process_response(text)
        args_json = json.dumps(function_args, indent=2)
        
        audio_url = addVoice(answer)
        
        if answer:
            xlr8 = f"{function_name}<br>{args_json}<br>{function_response}<br><br>"
            functions_history.append(xlr8)
        
        return jsonify({
            'result': 'ok',
            'text': answer,
            'file': audio_url,
            'functions_history': functions_history
        })
    except Exception as e:
        print(f"Error procesando texto: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(debug=True)