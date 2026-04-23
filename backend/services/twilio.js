import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Normaliza un número de teléfono al formato E.164 hondureño.
 * - Elimina espacios, guiones y paréntesis
 * - Si ya empieza con +, lo deja igual
 * - Si empieza con 504, agrega el +
 * - En cualquier otro caso agrega +504 (Honduras)
 */
function normalizarTelefono(numero) {
  const limpio = numero.replace(/[\s\-().]/g, "");
  if (limpio.startsWith("+"))   return limpio;
  if (limpio.startsWith("504")) return `+${limpio}`;
  return `+504${limpio}`;
}

/**
 * Envía un mensaje de WhatsApp usando el Sandbox de Twilio.
 * @param {string} destinatario - Número con o sin código de país, ej: 96065564 o +50496065564
 * @param {string} mensaje - Texto a enviar
 */
export async function enviarWhatsApp(destinatario, mensaje) {
  const numero = normalizarTelefono(destinatario);
  return client.messages.create({
    body: mensaje,
    from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
    to: `whatsapp:${numero}`,
  });
}
