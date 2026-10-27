import express from 'express';
import { spawn } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

function openBrowser(url: string): void {
  const command = process.platform === 'win32'
    ? 'cmd.exe'
    : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32'
    ? ['/c', 'start', '', url]
    : [url];
  const browser = spawn(command, args, { detached: true, stdio: 'ignore' });

  browser.on('error', (error) => {
    console.warn('No se pudo abrir el navegador automáticamente:', error.message);
  });
  browser.unref();
}

app.use(express.json());

// Inicialización del SDK oficial de Google GenAI en el servidor
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `
Eres "Andino", el Guía Turístico Inteligente oficial de Colombia.
Tu misión es asesorar a turistas y viajeros con recomendaciones expertas, cálidas y culturalmente auténticas sobre los atractivos turísticos, parques nacionales (como El Cocuy, Los Nevados, Tayrona, Chingaza), rutas de transporte, pisos térmicos, vestimenta adecuada, ecoturismo responsable y gastronomía colombiana.

Lineamientos de respuesta:
1. Responde siempre con tono respetuoso, entusiasta, experto y acogedor típico colombiano.
2. Da consejos prácticos sobre altitud, vestimenta en capas, temporada de lluvias/verano y requisitos de guianza certificada.
3. Promueve el turismo sostenible y el respeto a comunidades campesinas e indígenas.
4. Mantén respuestas concisas, estructuradas y amenas (máximo 2 a 3 párrafos).
5. Sugiere siempre 1 o 2 destinos o atractivos relacionados.
`;

function getContextualFallbackResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('cocuy') || lower.includes('empacar') || lower.includes('ropa') || lower.includes('nieve')) {
    return '¡Para el Parque Nacional Natural El Cocuy debes prepararte con el sistema de 3 capas! Primera capa térmica transpirable, segunda capa polar de abrigo y tercera capa cortaviento e impermeable. Es obligatorio llevar botas de montaña de caña alta, guantes térmicos, protector solar de alto espectro y registrarte con un guía certificado avalado por Parques Nacionales.';
  }
  if (lower.includes('caño cristales') || lower.includes('colores') || lower.includes('temporada')) {
    return '¡La mejor época para maravillarte con Caño Cristales es de junio a noviembre! Durante estos meses las lluvias nutren el río y la planta acuática Macarenia clavigera despliega su explosión de colores rojo, fucsia y verde. Recuerda aplicarte la vacuna contra la fiebre amarilla con al menos 10 días de anticipación y no usar bloqueador solar convencional en el agua.';
  }
  if (lower.includes('guatapé') || lower.includes('medellín') || lower.includes('peñol')) {
    return '¡El trayecto de Medellín a Guatapé toma solo 2 horas en autobús desde la Terminal del Norte! Te sugiero subir los 740 escalones de la Piedra del Peñol temprano en la mañana para disfrutar de la vista 360° sobre el embalse sin aglomeraciones, y luego pasear por la Calle de los Recuerdos admirando los zócalos tradicionales.';
  }
  if (lower.includes('cartagena') || lower.includes('costa') || lower.includes('playa')) {
    return '¡Cartagena de Indias es pura magia colonial y caribeña! No dejes de recorrer las murallas al atardecer en el Baluarte de Santo Domingo, explorar las calles empedradas de San Diego y tomar una lancha hacia las Islas del Rosario o Barú. Viste ropa de lino fresca y mantén buena hidratación por la humedad tropical.';
  }
  if (lower.includes('mal de páramo') || lower.includes('altura') || lower.includes('soroche')) {
    return 'Para prevenir el mal de altura o "soroche" en los Andes colombianos: asciende gradualmente pasando una noche previa en municipios intermedios (como El Cocuy o Güicán a 2.700 m), bebe abundante agua o agua de panela caliente, consume carbohidratos ligeros y evita esfuerzos bruscos en las primeras horas.';
  }
  return '¡Con mucho gusto te oriento! Colombia es el país de los contrastes y la megadiversidad: desde los glaciares andinos de Boyacá y Caldas, hasta las selvas del Amazonas y las fortalezas coloniales de Cartagena. Cuéntame si buscas senderismo de aventura, turismo histórico o rutas culturales gastronómicas.';
}

// Endpoint de Chatbot Contextual con Gemini
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensaje requerido.' });
    }

    if (!apiKey) {
      return res.json({
        reply: getContextualFallbackResponse(message),
        suggestedPlaces: ['Parque Nacional Natural El Cocuy', 'Parque Los Nevados', 'Guatapé'],
      });
    }

    // Construir historial de mensajes
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-6)) {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.content }],
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), 3500)
    );

    let replyText = '';
    try {
      const response: any = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        }),
        timeoutPromise,
      ]);

      replyText = response.text || '';
    } catch (apiErr) {
      console.warn('Fallback a guía experto local:', apiErr);
      replyText = getContextualFallbackResponse(message);
    }

    return res.json({
      reply: replyText || getContextualFallbackResponse(message),
      suggestedPlaces: ['Parque Nacional Natural El Cocuy', 'Parque Los Nevados', 'Cartagena', 'Guatapé'],
    });
  } catch (error: any) {
    console.error('Error en Gemini Chat endpoint:', error);
    return res.json({
      reply: getContextualFallbackResponse('general'),
      suggestedPlaces: ['Parque El Cocuy', 'Guatapé'],
    });
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Turismo Inteligente Colombia corriendo en http://0.0.0.0:${PORT}`);
    if (isDev) openBrowser(`http://localhost:${PORT}/`);
  });
}

startServer();
