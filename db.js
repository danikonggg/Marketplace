/**
 * Conexión a MongoDB - compatible con Vercel serverless (reutiliza conexión)
 */
const mongoose = require('mongoose');

let cached = global.__mongoose;
if (!cached) cached = global.__mongoose = { conn: null, promise: null };

async function conectarMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️ MONGODB_URI no configurada. Las visitas no se guardarán en BD.');
    return null;
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

async function verificarConexion() {
  if (!process.env.MONGODB_URI) {
    return { conectado: false, mensaje: 'MONGODB_URI no configurada' };
  }
  try {
    await conectarMongo();
    return { conectado: true, mensaje: 'Conectado a MongoDB' };
  } catch (e) {
    return { conectado: false, mensaje: `Error: ${e.message}` };
  }
}

module.exports = { conectarMongo, verificarConexion };
