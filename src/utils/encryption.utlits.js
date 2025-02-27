import CryptoJS from 'crypto-js';

import crypto from "crypto";
export const Encryption = ({ value, secretKey }) => {
    if (!secretKey) throw new Error("Encryption key missing");
    return CryptoJS.AES.encrypt(value, secretKey).toString();
};

export const Decryption = ({ cipher, secretKey }) => {
    if (!secretKey) throw new Error("Encryption key missing");
    const bytes = CryptoJS.AES.decrypt(cipher, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
};


export const HashPhone = (phone) => {
    const salt = process.env.SALT || "12";
    return CryptoJS.SHA256(phone + salt).toString(CryptoJS.enc.Hex);
};

