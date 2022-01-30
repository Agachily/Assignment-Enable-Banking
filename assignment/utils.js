const fs = require("fs");
const jwa = require("jwa");
const path = require("path");
const readline = require('readline');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "config.json")))
const KEY_PATH = config.keyPath;
const APPLICATION_ID = config.applicationId;

/**
 * Get the header for JWT Web Token
 * @returns The header for JWT Web Token
 */
const getJWTHeader = () => {
  return encodeData({
    typ: "JWT",
    alg: "RS256",
    kid: APPLICATION_ID
  })
}

/**
 * Base64 encode the payload to get the second part of the JWT
 * @param {*} data The bate to be encoded
 * @returns The data in the Base64 format
 */
const encodeData = (data) => {
  return Buffer.from(JSON.stringify(data)).toString("base64").replace("=", "")
}

/**
 * Get the payload for JWT Web Token
 * @param {*} exp timestamp when the token expires
 * @returns 
 */
const getJWTBody = (exp) => {
  const timestamp = Math.floor((new Date()).getTime() / 1000)
  return encodeData({
    iss: "enablebanking.com",
    aud: "api.tilisy.com",
    iat: timestamp,
    exp: timestamp + exp,
  })
}

/**
 * Get the signature with the private key
 * @param {*} data The data to be signed
 * @returns The signed data
 */
const signWithKey = (data) => {
  const key = fs.readFileSync(KEY_PATH, "utf8");
  const hmac = jwa("RS256");
  return hmac.sign(data, key);
}

/**
 * Get the JWT web token
 * @param {*} exp The token will expire after one hour
 * @returns The whole JWT web token
 */
const getJWT = (exp = 3600) => {
  const jwtHeaders = getJWTHeader()
  const jwtBody = getJWTBody(exp);
  const jwtSignature = signWithKey(`${jwtHeaders}.${jwtBody}`)
  return `${jwtHeaders}.${jwtBody}.${jwtSignature}`
}

/**
 * Get the user input
 * @param {*} query The query that will be dispalyed to user
 * @returns 
 */
const input = (query) => {
  const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
      rl.close();
      resolve(ans);
  }))
}

module.exports = {
  getJWT: getJWT,
  config: config,
  input: input,
}
