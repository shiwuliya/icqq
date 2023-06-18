import { randomBytes } from "crypto"
import { formatTime, md5, randomString } from "./constants"
import axios from "axios";
import { aesDecrypt, aesEncrypt, encryptPKCS1 } from "./algo";


function generateImei() {
    let imei = `86${randomString(12, '0123456789')}`

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
        model: `ICQQ ${randstr(4).toUpperCase()}`,
        wifi_ssid: `HUAWEI-${randstr(7)}`,
        bootloader: `U-boot`,
        android_id: `IL.${randstr(7, true)}.${randstr(4, true)}`,
        boot_id: `${randstr(8)}-${randstr(4)}-${randstr(4)}-${randstr(4)}-${randstr(12,)}`,
        proc_version: `Linux version 5.10.101-android12-${randstr(8)}`,
        mac_address: `2D:${randstr(2).toUpperCase()}:${randstr(2).toUpperCase()}:${randstr(2,).toUpperCase()}:${randstr(2).toUpperCase()}:${randstr(2).toUpperCase()}`,
        ip_address: `192.168.${randstr(2, true)}.${randstr(2, true)}`,
        imei: `${generateImei()}`,
        incremental: `${randstr(10, true).toUpperCase()}`,
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
        android_id: md5(d.android_id).toString("hex"),
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
    qImei16?: string
    qImei36?: string
    mtime?: number
}

export class Device {
    private secret = 'ZdJqM15EeO2zWc08';
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
        const k = randomString(16);
        const key = encryptPKCS1(this.publicKey, k);
        const time = Date.now();
        const nonce = randomString(16);
        const payload = this.genRandomPayloadByDevice();
        const params = aesEncrypt(JSON.stringify(payload), k).toString('base64');
        try {
            const { data } = await axios.post<{ data: string, code: number }>(
                "https://snowflake.qq.com/ola/android", {
                key,
                params,
                time, nonce,
                sign: md5(key + params + time + nonce + this.secret).toString("hex"),
                extra: ''
            }, {
                headers: {
                    'User-Agent': `Dalvik/2.1.0 (Linux; U; Android ${this.version.release}; PCRT00 Build/N2G48H)`,
                    'Content-Type': "application/json"
                }
            });
            if (data?.code !== 0) {
                return;
            }
            const { q16, q36 } = JSON.parse(aesDecrypt(data.data, k))
            this.qImei16 = q16
            this.qImei36 = q36
        } catch {
        }
    }

    genRandomPayloadByDevice() {
        const fixedRand = (max = 1, min = 0) => {
            if (max < min) [max, min] = [min, max]
            const diff = max - min
            return Math.floor(Math.random() * diff) + min
        };
        const reserved = {
            "harmony": "0",
            "clone": Math.random() > 0.5 ? "1" : "0",
            "containe": "",
            "oz": "",
            "oo": "",
            "kelong": Math.random() > 0.5 ? "1" : "0",
            "uptimes": formatTime(new Date()),
            "multiUser": Math.random() > 0.5 ? "1" : "0",
            "bod": this.board,
            "brd": this.brand,
            "dv": this.device,
            "firstLevel": "",
            "manufact": this.brand,
            "name": this.model,
            "host": "se.infra",
            "kernel": this.fingerprint
        };
        const timestamp = Date.now();
        this.mtime = this.mtime || Date.now()
        const mtime1 = new Date(this.mtime || Date.now());
        const dateFormat = (fmt?: string, time: number | Date = Date.now()) => formatTime(time, fmt)
        const mtimeStr1 = dateFormat("YYYY-mm-ddHHMMSS", mtime1) + "." + this.imei.slice(2, 11);
        const mtime2 = new Date(this.mtime - parseInt(this.imei.slice(2, 4)));
        const mtimeStr2 = dateFormat("YYYY-mm-ddHHMMSS", mtime2) + "." + this.imei.slice(5, 14);
        let beaconIdArr: (string | number)[] = [
            `${formatTime(new Date(timestamp + fixedRand(60, 0)))}.${String(fixedRand(99, 0)).padStart(2, '0')}0000000`,
            mtimeStr1,
            '0000000000000000',
            md5(this.android_id + this.imei).toString("hex").slice(0, 16),
            ...new Array(4).fill(false).map((_) => fixedRand(10000000, 1000000)),
            this.boot_id,
            '1',
            fixedRand(5, 0),
            fixedRand(5, 0),
            `${formatTime(new Date(timestamp + fixedRand(60, 0)))}.${String(fixedRand(99, 0)).padStart(2, '0')}0000000`,
            `${formatTime(new Date(timestamp + fixedRand(60, 0)))}.${String(fixedRand(99, 0)).padStart(2, '0')}0000000`,
            fixedRand(5, 0),
            fixedRand(100, 10),
            `${formatTime(new Date(timestamp + fixedRand(60, 0)))}.${String(fixedRand(99, 0)).padStart(2, '0')}0000000`,
            `${formatTime(new Date(timestamp + fixedRand(60, 0)))}.${String(fixedRand(99, 0)).padStart(2, '0')}0000000`,
            fixedRand(50000, 10000),
            fixedRand(100, 10),
            `${formatTime(new Date(timestamp + fixedRand(60, 0)))}.${String(fixedRand(99, 0)).padStart(2, '0')}0000000`,
            mtimeStr2,
            fixedRand(10000, 1000),
            fixedRand(5, 0),
            `${dateFormat("YYYY-mm-ddHHMMSS")}.${String(((10 + parseInt(this.imei.slice(5, 7))) % 100)).padStart(2, "0")}0000000`,
            `${dateFormat("YYYY-mm-ddHHMMSS")}.${String(((11 + parseInt(this.imei.slice(5, 7))) % 100)).padStart(2, "0")}0000000`,
            fixedRand(10000, 1000),
            fixedRand(100, 10),
            `${dateFormat("YYYY-mm-ddHHMMSS")}.${String(((11 + parseInt(this.imei.slice(5, 7))) % 100)).padStart(2, "0")}0000000`,
            `${dateFormat("YYYY-mm-ddHHMMSS")}.${String(((11 + parseInt(this.imei.slice(5, 7))) % 100)).padStart(2, "0")}0000000`,
            fixedRand(10000, 1000),
            fixedRand(5, 0),
            `${formatTime(new Date(timestamp + fixedRand(60, 0)))}.${String(fixedRand(99, 0)).padStart(2, '0')}0000000`,
            `${formatTime(new Date(timestamp + fixedRand(60, 0)))}.${String(fixedRand(99, 0)).padStart(2, '0')}0000000`,
            fixedRand(5, 0),
            fixedRand(100, 10),
            `${formatTime(new Date(timestamp + fixedRand(60, 0)))}.${String(fixedRand(99, 0)).padStart(2, '0')}0000000`,
            `${formatTime(new Date(timestamp + fixedRand(60, 0)))}.${String(fixedRand(99, 0)).padStart(2, '0')}0000000`,
            fixedRand(5, 0),
            fixedRand(5, 0),
        ].map((str, idx) => `k${idx + 1}:${str}`)
        return {
            "androidId": this.android_id,
            "platformId": 1,
            "appKey": this.apk.app_key,
            "appVersion": this.apk.version,
            "beaconIdSrc": beaconIdArr.join(';'),
            "brand": this.brand,
            "channelId": "2017",
            "cid": "",
            "imei": this.imei,
            "imsi": this.imsi.toString("hex"),
            "mac": this.mac_address,
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
    iPad = 5,
    old_Android = 6
}

export type Apk = typeof mobile
const mobile = {
    id: "com.tencent.mobileqq",
    app_key: '0S200MNJT807V3GE',
    name: "A8.9.50.f5a7d351",
    version: "8.9.50.10650",
    ver: "8.9.50",
    sign: Buffer.from('A6 B7 45 BF 24 A2 C2 77 52 77 16 F6 F3 6E B6 8D'.split(' ').map(s => parseInt(s, 16))),
    buildtime: 1676531414,
    appid: 16,
    subid: 537155547,
    bitmap: 150470524,
    main_sig_map: 16724722,
    sub_sig_map: 0x10400,
    sdkver: "6.0.0.2535",
    display: "Android",
	qua: 'V1_AND_SQ_8.9.50_3898_YYB_D',
    ssover: 19,
}
const old_mobile = {
    id: "com.tencent.mobileqq",
    app_key: '0S200MNJT807V3GE',
    name: "A8.8.88.7083",
    version: "8.8.88.7083",
    ver: "8.8.88",
    sign: Buffer.from([0xA6, 0xB7, 0x45, 0xBF, 0x24, 0xA2, 0xC2, 0x77, 0x52, 0x77, 0x16, 0xF6, 0xF3, 0x6E, 0xB6, 0x8D]),
    buildtime: 1648004515,
    appid: 16,
    subid: 537118044,
    bitmap: 150470524,
    main_sig_map: 16724722,
    sub_sig_map: 0x10400,
    sdkver: "6.0.0.2497",
    display: "Android_8.8.88",
	qua: '',
    ssover: 18,
}
const watch: Apk = {
    id: "com.tencent.qqlite",
    app_key: '0S200MNJT807V3GE',
    name: "A2.0.8",
    version: "2.0.8",
    ver: "2.0.8",
    sign: Buffer.from('A6 B7 45 BF 24 A2 C2 77 52 77 16 F6 F3 6E B6 8D'.split(' ').map(s => parseInt(s, 16))),
    buildtime: 1559564731,
    appid: 16,
    subid: 537065138,
    bitmap: 16252796,
    main_sig_map: 16724722,
    sub_sig_map: 0x10400,
    sdkver: "6.0.0.2365",
    display: "Watch",
	qua: '',
    ssover: 5
}
const hd: Apk = {
    id: "com.tencent.minihd.qq",
    app_key: '0S200MNJT807V3GE',
    name: "A5.9.3.3468",
    version: "5.9.3.3468",
    ver: "5.9.3",
    sign: Buffer.from('AA 39 78 F4 1F D9 6F F9 91 4A 66 9E 18 64 74 C7'.split(' ').map(s => parseInt(s, 16))),
    buildtime: 1637427966,
    appid: 16,
    subid: 537128930,
    bitmap: 150470524,
    main_sig_map: 1970400,
    sub_sig_map: 66560,
    sdkver: "6.0.0.2433",
    display: "iMac",
	qua: '',
    ssover: 12
}

const apklist: { [platform in Platform]: Apk } = {
    [Platform.Android]: mobile,
    [Platform.old_Android]: old_mobile,
    [Platform.aPad]: {
        ...mobile,
        subid: 537155599,
        display: 'aPad'
    },
    [Platform.Watch]: watch,
    [Platform.iMac]: { ...hd },
    [Platform.iPad]: {
        ...mobile,
        subid: 537155074,
        sign: hd.sign,
        name: 'A8.9.50.611',
        version: 'A8.9.50.611',
        sdkver: '6.0.0.2535',
		qua: '',
        display: 'iPad'
    },
}

export function getApkInfo(p: Platform): Apk {
    return apklist[p] || apklist[Platform.Android]
}
