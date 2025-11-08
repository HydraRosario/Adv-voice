# Asistente Bíblico Digital (Adv-Voice)

Este proyecto es una aplicación web que funciona como un asistente de voz interactivo. Los usuarios pueden hacer preguntas mediante texto o grabando un mensaje de voz, y reciben una respuesta tanto en formato de texto como de audio.

El asistente está configurado con una personalidad específica: un "asistente virtual adventista", diseñado para responder preguntas sobre la fe y la doctrina de la Iglesia Adventista del Séptimo Día, basándose en la Biblia y otros escritos relevantes.

## ✨ Características

- **Interfaz Dual:** Soporta tanto entrada de texto como de voz.
- **Transcripción de Voz a Texto:** Utiliza el modelo `whisper-large-v3` a través de la API de Groq para convertir la voz del usuario en texto.
- **Inteligencia Artificial:** Emplea un modelo de lenguaje grande (`llama-3.3-70b-versatile` a través de la API de Groq) para generar respuestas coherentes y contextuales.
- **Síntesis de Voz:** Convierte la respuesta del asistente en un audio con sonido natural usando el servicio TTS de Microsoft Edge.
- **Almacenamiento en la Nube:** Gestiona los archivos de audio (grabaciones y respuestas) a través de Cloudinary.

## 🛠️ Tecnologías Utilizadas

- **Backend:** Python con Flask.
- **Frontend:** HTML, CSS, JavaScript.
- **API de IA y Transcripción:** [Groq](https://groq.com/)
- **Síntesis de Voz:** [edge-tts](https://github.com/rany2/edge-tts) (Servicio TTS de Microsoft Edge)
- **Almacenamiento de Medios:** [Cloudinary](https://cloudinary.com/)

## 🚀 Cómo Empezar

Sigue estos pasos para configurar y ejecutar el proyecto en tu entorno local.

### 1. Prerrequisitos

- Python 3.8 o superior.
- Una cuenta en [Groq](https://console.groq.com/keys) para obtener una API key.
- Una cuenta en [Cloudinary](https://cloudinary.com/users/register/free) para obtener las credenciales de la nube.

### 2. Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone <URL-del-repositorio>
    cd <nombre-del-directorio>
    ```

2.  **Crea y activa un entorno virtual:**
    ```bash
    # Para Windows
    python -m venv venv
    venv\Scripts\activate

    # Para macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Instala las dependencias:**
    ```bash
    pip install -r requirements.txt
    ```

### 3. Configuración de Variables de Entorno

1.  En la raíz del proyecto, crea un archivo llamado `.env`.

2.  Añade las siguientes claves al archivo `.env` con tus credenciales:
    ```env
    GROQ_API_KEY="tu_clave_de_groq"
    CLOUDINARY_CLOUD_NAME="tu_cloud_name_de_cloudinary"
    CLOUDINARY_API_KEY="tu_api_key_de_cloudinary"
    CLOUDINARY_API_SECRET="tu_api_secret_de_cloudinary"
    ```

### 4. Ejecutar la Aplicación

1.  Inicia el servidor de Flask:
    ```bash
    flask run
    ```

2.  Abre tu navegador y ve a `http://127.0.0.1:5000` para interactuar con el asistente.
