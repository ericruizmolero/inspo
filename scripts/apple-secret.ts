// Generates the "Sign in with Apple" client secret (an ES256 JWT signed with the .p8 key).
// Apple accepts it for 6 months at most: regenerate and upload it again before then.
//   npx tsx scripts/apple-secret.ts <path/AuthKey_XXXX.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>
// Output: the value for APPLE_CLIENT_SECRET (APPLE_CLIENT_ID is the Services ID).
import { readFileSync } from "node:fs";
import { importPKCS8, SignJWT } from "jose";

async function main() {
  const [keyPath, teamId, keyId, servicesId] = process.argv.slice(2);
  if (!keyPath || !teamId || !keyId || !servicesId) {
    console.log("Usage: npx tsx scripts/apple-secret.ts <AuthKey.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>");
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
