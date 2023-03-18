import crypto from "crypto";

/**
 * 编码
 * @param data
 * @param key
 */
export function aesEncrypt(data: string, key: string): Buffer {

    const iv = key.substring(0, 16)
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let encrypted = cipher.update(data);
    return Buffer.concat([encrypted, cipher.final()]);
    ;
}

/**
 * 解码
 * @param encryptedData
 * @param key
 */
export function aesDecrypt(encryptedData: string, key: string) {
    const iv = key.substring(0, 16)
    let encryptedText = Buffer.from(encryptedData, 'base64');
    let decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}