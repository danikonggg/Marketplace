"""
Servidor para capturar IPs de visitantes - Tarea de Ciberseguridad/Redes
Cuando alguien visita el link, se registra su IP y ubicación
"""

from flask import Flask, request
from datetime import datetime
import urllib.request
import json

app = Flask(__name__)

# Aquí guardamos las IPs que visitan
visitas = []


def obtener_ubicacion(ip):
    """Obtiene país, ciudad y coordenadas desde la IP (API gratuita ip-api.com)"""
    if ip in ('127.0.0.1', 'localhost'):
        return {'ciudad': 'Local', 'pais': 'localhost', 'lat': '-', 'lon': '-'}
    try:
        url = f"http://ip-api.com/json/{ip}?fields=status,country,city,lat,lon,isp"
        with urllib.request.urlopen(url, timeout=3) as response:
            data = json.loads(response.read())
            if data.get('status') == 'success':
                return {
                    'ciudad': data.get('city', '?'),
                    'pais': data.get('country', '?'),
                    'lat': data.get('lat', '-'),
                    'lon': data.get('lon', '-'),
                    'isp': data.get('isp', '?')
                }
    except Exception as e:
        print(f"Error geolocalización: {e}")
    return {'ciudad': '?', 'pais': '?', 'lat': '-', 'lon': '-', 'isp': '?'}


@app.route('/')
def capturar_ip():
    """Ruta principal: captura la IP del visitante"""
    # Obtener la IP real (importante si hay proxy como nginx)
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ',' in ip:
        ip = ip.split(',')[0].strip()  # Tomar la primera si hay varias
    
    # Info adicional útil
    user_agent = request.headers.get('User-Agent', 'Desconocido')
    
    ubicacion = obtener_ubicacion(ip)
    
    visita = {
        'ip': ip,
        'fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'user_agent': user_agent,
        'ubicacion': ubicacion
    }
    visitas.append(visita)
    
    loc = f"{ubicacion['ciudad']}, {ubicacion['pais']}" if ubicacion['ciudad'] != '?' else ubicacion['pais']
    print(f"📍 Nueva visita - IP: {ip} | {loc} | Hora: {visita['fecha']}")
    
    # Página que ve el visitante (puede ser discreta)
    return """
    <html>
    <head><meta charset="utf-8"><title>Bienvenido</title></head>
    <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>Página cargada correctamente ✓</h1>
        <p>Gracias por visitar.</p>
    </body>
    </html>
    """


@app.route('/ver-ips')
def ver_ips():
    """Ruta secreta para ver las IPs capturadas (solo tú la conoces)"""
    if not visitas:
        return "<h2>No hay visitas registradas aún</h2>"
    
    html = "<h2>IPs capturadas (con ubicación):</h2><ul style='list-style:none'>"
    for v in visitas:
        u = v.get('ubicacion', {})
        loc = f"📍 {u.get('ciudad', '?')}, {u.get('pais', '?')}"
        if u.get('lat') != '-':
            loc += f" | Coord: {u.get('lat')}, {u.get('lon')}"
        html += f"<li style='margin:15px 0;padding:10px;background:#f5f5f5;border-radius:8px'><strong>{v['ip']}</strong> - {v['fecha']}<br>🗺️ {loc}<br><small>{v['user_agent'][:80]}...</small></li>"
    html += "</ul>"
    return html


if __name__ == '__main__':
    print("=" * 50)
    print("Servidor de captura de IPs iniciado")
    print("Comparte este link: http://localhost:5000/")
    print("Para ver las IPs: http://localhost:5000/ver-ips")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000)
