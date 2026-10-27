"""
Endpoint de Chatbot Contextual con Google GenAI (Gemini)
Guía Turístico Experto de Colombia
Turismo Inteligente - Colombia
"""
import os
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

from app.core.deps import get_current_active_user_optional
from app.db.models import User

router = APIRouter()

# Inicialización del cliente oficial de Google GenAI
# Lee automáticamente GEMINI_API_KEY de las variables de entorno
def get_genai_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Fallback para pruebas locales si no está configurada la variable
        return None
    return genai.Client(api_key=api_key)


class ChatMessage(BaseModel):
    role: str = Field(..., example="user")  # 'user' o 'model'
    content: str = Field(..., example="¿Cuál es la mejor temporada para visitar el Parque El Cocuy?")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    reply: str
    suggested_places: Optional[List[str]] = []


SYSTEM_INSTRUCTION = """
Eres "Andino", el Guía Turístico Inteligente oficial de Colombia.
Tu misión es asesorar a turistas y viajeros con recomendaciones expertas, cálidas y culturalmente auténticas sobre los atractivos turísticos, parques nacionales (como El Cocuy, Los Nevados, Tayrona, Chingaza), rutas de transporte, pisos térmicos, vestimenta adecuada, ecoturismo responsable y gastronomía colombiana.

Lineamientos de respuesta:
1. Responde siempre con tono respetuoso, entusiasta, experto y acogedor típico colombiano.
2. Da consejos prácticos sobre altitud, vestimenta en capas, temporada de lluvias/verano y requisitos de guianza certificada.
3. Promueve el turismo sostenible y el respeto a comunidades campesinas e indígenas.
4. Mantén respuestas concisas, estructuradas y amenas (máximo 2 a 3 párrafos).
5. Sugiere siempre 1 o 2 destinos o atractivos relacionados.
"""


@router.post("", response_model=ChatResponse)
def chat_with_guide(
    request: ChatRequest,
    current_user: Optional[User] = Depends(get_current_active_user_optional),
):
    """
    Endpoint de conversación contextual con el Guía Turístico Inteligente.
    Utiliza el modelo oficial 'gemini-3.8-flash' a través de google-genai.
    """
    client = get_genai_client()

    # Si la API key no está provista en el entorno, retornar respuesta contextual estructurada
    if not client:
        return ChatResponse(
            reply=(
                f"¡Hola{' ' + current_user.full_name if current_user else ''}! Soy Andino, tu guía experto en Colombia. "
                "Para visitas a zonas de alta montaña como el Parque El Cocuy o Los Nevados, te recomiendo viajar entre "
                "diciembre y marzo (temporada seca), llevar ropa térmica en capas impermeables y aclimatarte previamente en "
                "municipios como Güicán o Manizales. Recuerda registrarte siempre con guías avalados por Parques Nacionales."
            ),
            suggested_places=["Parque Nacional Natural El Cocuy", "Parque Nacional Los Nevados"],
        )

    try:
        # Construcción de contenidos contextuales
        contents = []
        for msg in request.history or []:
            role = "user" if msg.role == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.content)]))

        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=request.message)]))

        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.7,
                max_output_tokens=800,
            ),
        )

        reply_text = response.text or "Disculpa, no pude procesar la consulta en este momento. ¿Te gustaría saber más sobre algún parque nacional?"

        return ChatResponse(
            reply=reply_text,
            suggested_places=["Parque El Cocuy", "Parque Los Nevados", "Guatapé", "Cartagena"],
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en el servicio de Guía Turístico Inteligente: {str(e)}",
        )
