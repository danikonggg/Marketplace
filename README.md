# Capturador de IP - Tarea Ciberseguridad

Servidor simple que registra la IP y ubicación de quien visita el link.

## Opción 1: JavaScript (Node.js)

1. Instalar dependencias:
   ```
   npm install express
   ```

2. Ejecutar:
   ```
   node servidor_ip.js
   ```

## Opción 2: Python

1. Instalar dependencias:
   ```
   pip install -r requirements.txt
   ```

2. Ejecutar:
   ```
   python servidor_ip.py
   ```

## Uso

- Comparte el link `http://TU_IP:3000/` con alguien
- Para ver las IPs capturadas: `http://localhost:3000/ver-ips`
- Si el puerto está ocupado: `node servidor_ip.js 8080`

## Para probar en tu red local

- En la misma PC: usa `http://localhost:3000/`
- Otras PCs en tu red: usa `http://TU_IP_LOCAL:3000/`
