/**
 * Servidor para capturar IPs de visitantes - Tarea de Ciberseguridad/Redes
 * Cuando alguien visita el link, se registra su IP y ubicación
 */

process.on('uncaughtException', (err) => {
  console.error('Error no capturado:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Promise rechazada:', err);
});

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Necesario en Render para obtener la IP real del visitante
app.set('trust proxy', true);

const ARCHIVO_LOG = path.join(__dirname, 'visitas_registradas.txt');

// Aquí guardamos las IPs que visitan
const visitas = [];

function guardarEnArchivo(visita) {
  try {
    const u = visita.ubicacion || {};
    const loc = [u.ciudad, u.region, u.pais].filter(Boolean).filter(x => x !== '-').join(', ') || `${u.ciudad || '?'}, ${u.pais || '?'}`;
    const linea = [
      `[${visita.fecha}]`,
      `IP: ${visita.ip}`,
      `Ubicación: ${loc}`,
      `Código postal: ${u.postal || '-'}`,
      `Zona horaria: ${u.timezone || '-'}`,
      `Coordenadas: ${u.lat}, ${u.lon}`,
      `ISP: ${u.isp || '-'}`,
      `User-Agent: ${visita.user_agent}`,
      '---'
    ].join('\n') + '\n';
    fs.appendFileSync(ARCHIVO_LOG, linea, 'utf8');
  } catch (e) {
    console.error('No se pudo guardar en archivo:', e.message);
  }
}

async function obtenerUbicacion(ip) {
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return { ciudad: 'Local', pais: 'localhost', lat: '-', lon: '-', region: '-', postal: '-', timezone: '-', isp: '-' };
  }

  const vacio = { ciudad: '?', pais: '?', lat: '-', lon: '-', region: '-', postal: '-', timezone: '-', isp: '?' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  // ipinfo.io - base de datos más precisa, más campos
  try {
    const res = await fetch(`https://ipinfo.io/${ip}/json`, { 
      headers: { 'Accept': 'application/json' },
      signal: controller.signal 
    });
    const data = await res.json();
    if (data && !data.error) {
      clearTimeout(timeout);
      const [lat, lon] = (data.loc || '-,-').split(',');
      return {
        ciudad: data.city || '?',
        pais: data.country || '?',
        region: data.region || '-',
        postal: data.postal || '-',
        timezone: data.timezone || '-',
        lat: lat || '-',
        lon: lon || '-',
        isp: data.org || '?'
      };
    }
  } catch (e) {
    clearTimeout(timeout);
    console.log('ipinfo falló, intentando ip-api...', e.message);
  }

  const controller2 = new AbortController();
  const timeout2 = setTimeout(() => controller2.abort(), 5000);

  // Fallback: ip-api.com
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,zip,lat,lon,timezone,isp`, {
      signal: controller2.signal
    });
    clearTimeout(timeout2);
    const data = await res.json();
    if (data && data.status === 'success') {
      return {
        ciudad: data.city || '?',
        pais: data.country || '?',
        region: data.regionName || '-',
        postal: data.zip || '-',
        timezone: data.timezone || '-',
        lat: data.lat ?? '-',
        lon: data.lon ?? '-',
        isp: data.isp || '?'
      };
    }
  } catch (e) {
    clearTimeout(timeout2);
    console.log('Error geolocalización:', e.message);
  }
  return vacio;
}

// Ruta ligera para health check de Render (evita timeout)
app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

app.get('/', async (req, res) => {
  let ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || req.ip;
  if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip === '::1') ip = '127.0.0.1';

  const userAgent = req.headers['user-agent'] || 'Desconocido';

  const ubicacion = await obtenerUbicacion(ip);

  const visita = {
    ip,
    fecha: new Date().toLocaleString('es'),
    user_agent: userAgent,
    ubicacion
  };
  visitas.push(visita);
  guardarEnArchivo(visita);

  const loc = ubicacion.ciudad !== '?' ? `${ubicacion.ciudad}, ${ubicacion.pais}` : ubicacion.pais;
  console.log(`📍 Nueva visita - IP: ${ip} | ${loc} | Hora: ${visita.fecha}`);

  res.send(`
    <html>
    <head><meta charset="utf-8"><title>Bienvenido</title></head>
    <body style="font-family: Arial; text-align: center; padding: 50px;">
      <h1>Página cargada correctamente ✓</h1>
      <p>Gracias por visitar.</p>
    </body>
    </html>
  `);
});

app.get('/ver-ips', (req, res) => {
  const estilos = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Space Grotesk', sans-serif;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
      min-height: 100vh;
      color: #e4e4e7;
      padding: 2rem;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(90deg, #22d3ee, #a78bfa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle { color: #71717a; margin-bottom: 2rem; font-size: 0.95rem; }
    .badge {
      display: inline-block;
      background: rgba(34, 211, 238, 0.2);
      color: #22d3ee;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      margin-bottom: 1.5rem;
    }
    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1rem;
      transition: all 0.2s;
    }
    .card:hover {
      background: rgba(255,255,255,0.05);
      border-color: rgba(34, 211, 238, 0.3);
      transform: translateX(4px);
    }
    .card .ip { font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; color: #22d3ee; font-weight: 600; }
    .card .fecha { color: #71717a; font-size: 0.85rem; margin: 0.25rem 0; }
    .card .ubicacion { color: #a78bfa; margin: 0.25rem 0; }
    .card .extra { font-size: 0.85rem; color: #71717a; margin: 0.35rem 0; }
    .card .ua { color: #52525b; font-size: 0.8rem; margin-top: 0.5rem; }
    .empty {
      text-align: center;
      padding: 3rem;
      color: #52525b;
      background: rgba(255,255,255,0.02);
      border-radius: 12px;
      border: 1px dashed rgba(255,255,255,0.1);
    }
    .save-note { color: #22c55e; font-size: 0.85rem; margin-top: 1rem; }
  `;

  if (visitas.length === 0) {
    return res.send(`
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>Registro de visitas</title><style>${estilos}</style></head>
      <body><div class="container"><h1>🔒 Registro de visitas</h1><p class="subtitle">Ciberseguridad / Redes</p>
      <div class="empty">No hay visitas registradas aún.<br>Comparte el link y las verás aquí.</div></div></body></html>
    `);
  }

  let cards = visitas.map(v => {
    const u = v.ubicacion || {};
    const parts = [u.ciudad, u.region, u.pais].filter(Boolean).filter(x => x !== '-' && x !== '?');
    const loc = parts.length ? parts.join(', ') : `${u.ciudad || '?'}, ${u.pais || '?'}`;
    const extra = [];
    if (u.postal && u.postal !== '-') extra.push(`📮 ${u.postal}`);
    if (u.timezone && u.timezone !== '-') extra.push(`🕐 ${u.timezone}`);
    if (u.lat !== '-') extra.push(`📍 ${u.lat}, ${u.lon}`);
    if (u.isp && u.isp !== '-' && u.isp !== '?') extra.push(`📡 ${u.isp}`);
    const extraHtml = extra.length ? `<div class="extra">${extra.join(' · ')}</div>` : '';
    return `
      <div class="card">
        <div class="ip">${v.ip}</div>
        <div class="fecha">${v.fecha}</div>
        <div class="ubicacion">${loc}</div>
        ${extraHtml}
        <div class="ua">${v.user_agent.substring(0, 90)}${v.user_agent.length > 90 ? '...' : ''}</div>
      </div>
    `;
  }).join('');

  res.send(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>Registro de visitas</title><style>${estilos}</style></head>
    <body>
      <div class="container">
        <h1>🔒 Registro de visitas</h1>
        <p class="subtitle">Ciberseguridad / Redes — IPs y ubicaciones capturadas</p>
        <span class="badge">${visitas.length} visita${visitas.length !== 1 ? 's' : ''}</span>
        ${cards}
        <p class="save-note">✓ Guardado en visitas_registradas.txt</p>
      </div>
    </body></html>
  `);
});

const PORT = process.env.PORT || process.argv[2] || 3000; // Mac usa 5000 para AirPlay

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('Servidor de captura de IPs iniciado (Node.js)');
  console.log(`Comparte este link: http://localhost:${PORT}/`);
  console.log(`Para ver las IPs: http://localhost:${PORT}/ver-ips`);
  console.log('='.repeat(50));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Puerto ${PORT} ya está en uso. Prueba otro: node servidor_ip.js 8080`);
  } else {
    console.error('Error:', err);
  }
  process.exit(1);
});
