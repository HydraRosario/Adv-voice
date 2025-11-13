import json
import os
from flask import Flask, render_template, request, jsonify, make_response, g, session
from functools import wraps
from tools import transcriber, addVoice
from llm import LLM
import cloudinary
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Clave secreta para sesiones
CORS(app)

# Inicializar Firebase Admin SDK
# Asegúrate de que el archivo 'firebase-credentials.json' está en el directorio raíz
try:
    cred = credentials.Certificate("firebase-credentials.json")
    firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"Error al inicializar Firebase: {e}")
    # En un entorno de producción, podrías querer manejar esto de forma más robusta
    # Por ahora, solo imprimimos el error. La app no funcionará sin Firebase.

functions_history = []

# Decorador para verificar el token de Firebase
def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            # El token se envía como "Bearer <token>"
            token = request.headers["Authorization"].split(" ")[1]

        if not token:
            return jsonify({"error": "Falta el token de autorización"}), 401

        try:
            # Verificar el token usando Firebase Admin SDK
            decoded_token = auth.verify_id_token(token)
            # Guardar la información del usuario en el contexto de la solicitud (opcional)
            g.user = decoded_token
        except Exception as e:
            print(f"Error de verificación de token: {e}")
            return jsonify({"error": "Token inválido o expirado"}), 401
        
        return f(*args, **kwargs)
    return decorated_function

@app.route("/", methods=['GET'])
def index():
    return render_template("recorder.html")

@app.route("/set_mode", methods=["POST"])
@token_required
def set_mode():
    try:
        data = request.get_json()
        mode = data.get('mode')
        if mode in ['Adventista', 'Anticristo']:
            session['assistant_mode'] = mode
            # Solo el admin puede cambiar a 'Anticristo'
            if mode == 'Anticristo':
                user_email = g.user.get('email')
                if user_email != 'hidramusic@gmail.com':
                    return jsonify({"error": "No autorizado"}), 403
            return jsonify({"status": "success", "mode": mode})
        return jsonify({"error": "Modo no válido"}), 400
    except Exception as e:
        print(f"Error en set_mode: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route("/audio", methods=["POST", "OPTIONS"])
@token_required
def audio():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST")
        return response

    try:
        # Obtener el modo de la sesión, con 'Adventista' como valor por defecto
        assistant_mode = session.get('assistant_mode', 'Adventista')
        user_email = g.user.get('email')

        # Doble verificación: solo el admin puede usar el modo 'Anticristo'
        if assistant_mode == 'Anticristo' and user_email != 'hidramusic@gmail.com':
            assistant_mode = 'Adventista' # Revertir a Adventista si no es admin

        print(f"Usuario: {user_email}, Modo: {assistant_mode}")

        if request.is_json:
            data = request.get_json()
            text = data.get('text', '')
            if not text:
                return jsonify({'error': 'No se recibió texto'}), 400
            
            answer = LLM().process_response(text, mode=assistant_mode)
            audio_url = addVoice(answer)
            
            if answer:
                functions_history.append(answer)
            
            return jsonify({
                'result': 'ok',
                'text': answer,
                'file': audio_url,
                'functions_history': functions_history
            })
        else:
            audio_file = request.files.get('audio')
            if not audio_file:
                return jsonify({'error': 'No se recibió archivo de audio'}), 400
            
            result = cloudinary.uploader.upload(
                audio_file,
                resource_type="raw",
                format="wav"
            )
            
            transcription = transcriber(result['secure_url'])
            if not transcription:
                return jsonify({'error': 'No se pudo transcribir el audio'}), 500
            
            answer = LLM().process_response(transcription, mode=assistant_mode)
            audio_url = addVoice(answer)
            
            return jsonify({
                'result': 'ok',
                'transcription': transcription,
                'text': answer,
                'file': audio_url,
                'functions_history': functions_history
            })
    except Exception as e:
        print(f"Error general en /audio: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

# Las siguientes rutas también deberían estar protegidas si se usan directamente desde el frontend
@app.route("/transcribe_audio", methods=["POST"])
@token_required
def transcribe_audio():
    try:
        audio = request.files.get('audio')
        if not audio:
            return jsonify({'error': 'No se recibió archivo de audio'}), 400
        
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
@token_required
def process_text():
    try:
        data = request.get_json()
        text = data.get('text', '')
        if not text:
            return jsonify({'error': 'No se recibió texto'}), 400
        
        answer = LLM().process_response(text)
        audio_url = addVoice(answer)
        
        if answer:
            functions_history.append(answer)
        
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
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))
