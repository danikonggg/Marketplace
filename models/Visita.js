const mongoose = require('mongoose');

const ubicacionSchema = new mongoose.Schema({
  ciudad: String,
  pais: String,
  region: String,
  postal: String,
  timezone: String,
  lat: String,
  lon: String,
  isp: String
}, { _id: false });

const visitaSchema = new mongoose.Schema({
  ip: { type: String, required: true },
  fecha: { type: String, required: true },
  user_agent: String,
  ubicacion: ubicacionSchema
}, { timestamps: true });

module.exports = mongoose.models.Visita || mongoose.model('Visita', visitaSchema);
