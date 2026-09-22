// Genera el client secret de "Sign in with Apple" (un JWT ES256 firmado con la clave .p8).
// Apple lo acepta con una vida máxima de 6 meses: hay que regenerarlo y volver a subirlo antes.
//   npx tsx scripts/apple-secret.ts <ruta/AuthKey_XXXX.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>
// Resultado: el valor para APPLE_CLIENT_SECRET (APPLE_CLIENT_ID es el Services ID).
import { readFileSync } from "node:fs";
import { importPKCS8, SignJWT } from "jose";

async function main() {
  const [keyPath, teamId, keyId, servicesId] = process.argv.slice(2);
  if (!keyPath || !teamId || !keyId || !servicesId) {
    console.log("Uso: npx tsx scripts/apple-secret.ts <AuthKey.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>");
    process.exit(1);
  }
  const key = await importPKCS8(readFileSync(keyPath, "utf8"), "ES256");
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(servicesId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(key);
  console.log(jwt);
}
main();
