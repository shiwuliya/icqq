import {randomBytes} from "crypto"
import {md5, randomString} from "./constants"
import crypto from "crypto";
import axios from "axios";

function initPublicKey(pemStr: string, encryptKey: string) {
    const publicKey = crypto.createPublicKey(pemStr)
    return crypto.publicEncrypt({
        key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(encryptKey))
        .toString('base64')
}

function sign(key: string, params: string, ts: number, nonce: string, secret: string) {
    const md5 = crypto.createHash('md5');
    return md5.update(key + params + ts + nonce + secret).digest('hex');
}

function aesEncrypt(data: string, key: string): Buffer {

    const iv = key.substring(0, 16)
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    let encrypted = cipher.update(data);
    return Buffer.concat([encrypted, cipher.final()]);
    ;
}

function aesDecrypt(encryptedData: string, key: string) {
    const iv = key.substring(0, 16)
    let encryptedText = Buffer.from(encryptedData, 'base64');
    let decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}


function generateImei(uin: number) {
    let imei = uin % 2 ? "86" : "35"
    const buf = Buffer.alloc(4)
    buf.writeUInt32BE(uin)
    let a: number | string = buf.readUInt16BE()
    let b: number | string = Buffer.concat([Buffer.alloc(1), buf.slice(1)]).readUInt32BE()
    if (a > 9999)
        a = Math.trunc(a / 10)
    else if (a < 1000)
        a = String(uin).substr(0, 4)
    while (b > 9999999)
        b = b >>> 1
    if (b < 1000000)
        b = String(uin).substr(0, 4) + String(uin).substr(0, 3)
    imei += a + "0" + b

    function calcSP(imei: string) {
        let sum = 0
        for (let i = 0; i < imei.length; ++i) {
            if (i % 2) {
                let j = parseInt(imei[i]) * 2
                sum += j % 10 + Math.floor(j / 10)
            } else {
                sum += parseInt(imei[i])
            }
        }
        return (100 - sum) % 10
    }

    return imei + calcSP(imei)
}

/** 生成短设备信息 */
export function generateShortDevice() {
    const randstr = (length: number, num: boolean = false) => {
        const map = num ? '0123456789' : '0123456789abcdef'
        return randomString(length, map)
    }
    return {
        "--begin--": "该设备为随机生成，丢失后不能得到原先配置",
        product: `ILPP-${randstr(5).toUpperCase()}`,
        device: `${randstr(5).toUpperCase()}`,
        board: `${randstr(5).toUpperCase()}`,
        brand: `${randstr(4).toUpperCase()}`,
        model: `ILPP ${randstr(4).toUpperCase()}`,
        wifi_ssid: `HUAWEI-${randstr(7)}`,
        bootloader: `U-boot`,
        android_id: `IL.${randstr(7, true)}.${randstr(4, true)}`,
        boot_id: `${randstr(8)}-${randstr(4)}-${randstr(4)}-${randstr(4)}-${randstr(12,)}`,
        proc_version: `Linux version 5.10.101-android12-${randstr(8)}`,
        mac_address: `2D:${randstr(2).toUpperCase()}:${randstr(2).toUpperCase()}:${randstr(2,).toUpperCase()}:${randstr(2).toUpperCase()}:${randstr(2).toUpperCase()}`,
        ip_address: `192.168.${randstr(2, true)}.${randstr(2, true)}`,
        imei: `86${randstr(13, true)}`,
        incremental: `${randstr(10).toUpperCase()}`,
        "--end--": "修改后可能需要重新验证设备。"
    }
}


/** 生成完整设备信息 */
export function generateFullDevice(apk: Apk, d?: ShortDevice) {
    if (!d) d = generateShortDevice()
    return {
        display: d.android_id,
        product: d.product,
        device: d.device,
        board: d.board,
        brand: d.brand,
        model: d.model,
        bootloader: d.bootloader,
        fingerprint: `${d.brand}/${d.product}/${d.device}:10/${d.android_id}/${d.incremental}:user/release-keys`,
        boot_id: d.boot_id,
        proc_version: d.proc_version,
        baseband: "",
        sim: "T-Mobile",
        os_type: "android",
        mac_address: d.mac_address,
        ip_address: d.ip_address,
        wifi_bssid: d.mac_address,
        wifi_ssid: d.wifi_ssid,
        imei: d.imei,
        android_id: d.android_id,
        apn: "wifi",
        version: {
            incremental: d.incremental,
            release: "10",
            codename: "REL",
            sdk: 29,
        },
        imsi: randomBytes(16),
        guid: md5(Buffer.concat([Buffer.from(d.imei), Buffer.from(d.mac_address)])),
    }
}

export type ShortDevice = ReturnType<typeof generateShortDevice>

export interface Device extends ReturnType<typeof generateFullDevice> {
    qImei16?:string
    qImei36?:string
}

export class Device {
    private secret = "ZdJqM15EeO2zWc08";
    private publicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDEIxgwoutfwoJxcGQeedgP7FG9
qaIuS0qzfR8gWkrkTZKM2iWHn2ajQpBRZjMSoSf6+KJGvar2ORhBfpDXyVtZCKpq
LQ+FLkpncClKVIrBwv6PHyUvuCb0rIarmgDnzkfQAqVufEtR64iazGDKatvJ9y6B
9NMbHddGSAUmRTCrHQIDAQAB
-----END PUBLIC KEY-----`;

    constructor(private apk: Apk, d?: ShortDevice) {
        if (!d) d = generateShortDevice()
        Object.assign(this, generateFullDevice(apk, d))
    }

    async getQIMEI() {
        if (this.apk.app_key === "") {
            return;
        }
        const k = randomString(16, "abcdef1234567890");
        const key = initPublicKey(this.publicKey, k);
        const time = new Date().getTime();
        const nonce = randomString(16, "abcdef1234567890");
        const payload = this.genRandomPayloadByDevice();
        const str = JSON.stringify(payload);
        const params = aesEncrypt(str, k).toString('base64');

        const postData = {
            "key": key,
            "params": params,
            "time": time,
            "nonce": nonce,
            "sign": sign(key, params, time, nonce, this.secret),
            "extra": "",
        }
        const {data} = await axios.post<{ data: string, code: number }>("https://snowflake.qq.com/ola/android", postData, {
            headers: {
                'User-Agent': `Dalvik/2.1.0 (Linux; U; Android ${this.version.release}; PCRT00 Build/N2G48H)`,
                'Content-Type': "application/json"
            }
        });
        if (data.code !== 0) {
            return;
        }
        try{

            const {q16,q36}=JSON.parse(aesDecrypt(data.data,k))
            this.qImei16=q16
            this.qImei36=q36
        }catch {}
    }

    genRandomPayloadByDevice() {
        const now = new Date();
        const fixedRand = (max = 1, min = 0) => {
            if (max < min) [max, min] = [min, max]
            const diff = max - min
            return Math.floor(Math.random() * diff) + min
        };
        const reserved = {
            "harmony": "0",
            "clone": "0",
            "containe": "",
            "oz": "UhYmelwouA+V2nPWbOvLTgN2/m8jwGB+yUB5v9tysQg=",
            "oo": "Xecjt+9S1+f8Pz2VLSxgpw==",
            "kelong": "0",
            "uptimes": new Date().toISOString()
                .replace('T', ' ')
                .replace(/\.\d+Z/, ''),
            "multiUser": "0",
            "bod": this.board,
            "brd": this.brand,
            "dv": this.device,
            "firstLevel": "",
            "manufact": this.brand,
            "name": this.model,
            "host": "se.infra",
            "kernel": this.fingerprint
        };
        let beaconId = "";
        const timeMonth = now.toISOString().slice(0, 7) + "-01";
        const rand1 = fixedRand(900000, 100000)
        const rand2 = fixedRand(900000000, 100000000);
        for (let i = 1; i <= 40; i++) {
            switch (i) {
                case 1:
                case 2:
                case 13:
                case 14:
                case 17:
                case 18:
                case 21:
                case 22:
                case 25:
                case 26:
                case 29:
                case 30:
                case 33:
                case 34:
                case 37:
                case 38:
                    beaconId += `k${i}:${timeMonth}${rand1}.${rand2}`;
                    break;
                case 3:
                    beaconId += "k3:0000000000000000";
                    break;
                case 4:
                    beaconId += `k4:${randomString(16, "123456789abcdef")}`;
                    break;
                default:
                    beaconId += `k${i}:${fixedRand(10000)}`;
                    break;
            }
            beaconId += ";";
        }
        return {
            "androidId": '',
            "platformId": 1,
            "appKey": this.apk.app_key,
            "appVersion": this.apk.version,
            "beaconIdSrc": beaconId,
            "brand": this.brand,
            "channelId": "2017",
            "cid": "",
            "imei": this.imei,
            "imsi": '',
            "mac": '',
            "model": this.model,
            "networkType": "unknown",
            "oaid": "",
            "osVersion": `Android ${this.version.release},level ${this.version.sdk}`,
            "qimei": "",
            "qimei36": "",
            "sdkVersion": "1.2.13.6",
            "targetSdkVersion": "26",
            "audit": "",
            "userId": "{}",
            "packageId": this.apk.id,
            "deviceType": this.display,
            "sdkName": "",
            "reserved": JSON.stringify(reserved),
        }
    }
}

/** 支持的登录设备平台 */
export enum Platform {
    Android = 1,
    aPad = 2,
    Watch = 3,
    iMac = 4,
    iPad = 5
}

export type Apk = typeof mobile

const mobile = {
    id: "com.tencent.mobileqq",
    app_key: '0S200MNJT807V3GE',
    name: "A8.9.33.10335",
    version: "8.9.33.10335",
    ver: "8.9.33",
    sign: Buffer.from([166, 183, 69, 191, 36, 162, 194, 119, 82, 119, 22, 246, 243, 110, 182, 141]),
    buildtime: 1671103213,
    appid: 16,
    subid: 537151682,
    bitmap: 184024956,
    sigmap: 34869472,
    sdkver: "6.0.0.2534",
    display: "Android",
    ssover: 19,
}
const watch: Apk = {
    id: "com.tencent.qqlite",
    app_key: '0S200MNJT807V3GE',
    name: "A2.0.5",
    version: "2.0.5",
    ver: "2.0.5",
    sign: Buffer.from([166, 183, 69, 191, 36, 162, 194, 119, 82, 119, 22, 246, 243, 110, 182, 141]),
    buildtime: 1559564731,
    appid: 16,
    subid: 537064446,
    bitmap: 16252796,
    sigmap: 34869472,
    sdkver: "6.0.0.236",
    display: "Watch",
    ssover: 5
}
const hd: Apk = {
    id: "com.tencent.minihd.qq",
    app_key: '0S200MNJT807V3GE',
    name: "A5.9.3.3468",
    version: "5.9.3.3468",
    ver: "5.9.3",
    sign: Buffer.from([170, 57, 120, 244, 31, 217, 111, 249, 145, 74, 102, 158, 24, 100, 116, 199]),
    buildtime: 1637427966,
    appid: 16,
    subid: 537067382,
    bitmap: 150470524,
    sigmap: 1970400,
    sdkver: "6.0.0.2487",
    display: "aPad",
    ssover: 12
}

const apklist: { [platform in Platform]: Apk } = {
    [Platform.Android]: mobile,
    [Platform.aPad]: hd,
    [Platform.Watch]: watch,
    [Platform.iMac]: {...hd},
    [Platform.iPad]: {...hd},
}
apklist[Platform.aPad].subid = 537150493
apklist[Platform.iMac].subid = 537128930
apklist[Platform.iMac].display = "iMac"
apklist[Platform.iPad].subid = 537149258
apklist[Platform.iPad].display = "iPad"

export function getApkInfo(p: Platform): Apk {
    return apklist[p] || apklist[Platform.Android]
}
