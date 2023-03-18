import crypto from "crypto";

export function encryptPKCS1(pemStr: string, encryptKey: string) {
    const publicKey = crypto.createPublicKey(pemStr)
    return crypto.publicEncrypt({
        key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(encryptKey)).toString('base64')
}