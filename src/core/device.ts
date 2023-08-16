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
        product: `ICQQ-${randstr(5).toUpperCase()}`,
        device: `${randstr(5).toUpperCase()}`,
        board: `${randstr(5).toUpperCase()}`,
        brand: `${randstr(4).toUpperCase()}`,
        model: `ICQQ ${randstr(4).toUpperCase()}`,
        wifi_ssid: `HUAWEI-${randstr(7)}`,
        bootloader: `U-boot`,
        display: `IC.${randstr(7, true)}.${randstr(4, true)}`,
        boot_id: `${randstr(8)}-${randstr(4)}-${randstr(4)}-${randstr(4)}-${randstr(12,)}`,
        proc_version: `Linux version 5.10.101-android10-${randstr(8)}`,
        mac_address: `02:00:00:00:00:00`,
        ip_address: `192.168.${randstr(2, true)}.${randstr(2, true)}`,
        android_id: `${md5(generateImei()).toString("hex").substring(8, 24)}`,
        incremental: `${randstr(10, true)}`,
        "--end--": "修改后可能需要重新验证设备。"
    }
}


/** 生成完整设备信息 */
export function generateFullDevice(apk: Apk, d?: ShortDevice) {
    if (!d) d = generateShortDevice()
    return {
        display: d.display,
        product: d.product,
        device: d.device,
        board: d.board,
        brand: d.brand,
        model: d.model,
        bootloader: d.bootloader,
        fingerprint: `${d.brand}/${d.product}/${d.device}:10/${d.display}/${d.incremental}:user/release-keys`,
        boot_id: d.boot_id,
        proc_version: d.proc_version,
        baseband: "",
        sim: "T-Mobile",
        os_type: "android",
        mac_address: d.mac_address,
        ip_address: d.ip_address,
        wifi_bssid: d.mac_address,
        wifi_ssid: d.wifi_ssid,
        imei: d.android_id,
        android_id: d.android_id,
        apn: "wifi",
        version: {
            incremental: d.incremental,
            release: "10",
            codename: "REL",
            sdk: 29,
        },
        imsi: randomBytes(16),
        guid: md5(Buffer.concat([Buffer.from(d.android_id), Buffer.from(d.mac_address)])),
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
            this.qImei36 = q36 || q16
            if (this.qImei36) this.imsi = Buffer.from(this.qImei36, 'hex')
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
            "imsi": this.imsi.toString('hex'),
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

/**
 * 支持的登录设备平台
 * * `aPad`和`Watch`协议无法设置在线状态、无法接收某些群事件（包括戳一戳等）
 * * 目前仅`Watch`支持扫码登录，可能会支持`iPad`扫码登录
 */
export enum Platform {
    /** 安卓手机 */
    Android = 1,
    /** 安卓平板 */
    aPad = 2,
    /** 安卓手表 */
    Watch = 3,
    /** MacOS */
    iMac = 4,
    /** iPad */
    iPad = 5,
    /** Tim */
    Tim = 6
}

/** 登录设备通用属性 */
export type Apk = {
    id: string
    app_key: string
    name: string
    version: string
    ver: string
    sign: Buffer
    buildtime: number
    appid: number
    subid: number
    bitmap: number
    main_sig_map: number
    sub_sig_map: number
    sdkver: string
    display: string
    /** 用于扫码登录 */
    device_type: number
    qua: string
    ssover: number
}
const mobile: Apk[] = [
    // 每个版本不同的信息
    {
        name: "A8.9.70.11730",
        version: "8.9.70.11730",
        ver: "8.9.70",
        buildtime: 1688720082,
        subid: 537169928,
        bitmap: 150470524,
        sdkver: "6.0.0.2551",
        qua: 'V1_AND_SQ_8.9.70_4330_YYB_D',
        ssover: 20,
    },
    {
        name: "A8.9.75.354d41fc",
        version: "8.9.75.12110",
        ver: "8.9.75",
        buildtime: 1691565978,
        subid: 537173381,
        bitmap: 150470524,
        sdkver: "6.0.0.2554",
        qua: 'V1_AND_SQ_8.9.75_4482_YYB_D',
        ssover: 20,
    },
    {
        name: "A8.9.73.11945",
        version: "8.9.73.11945",
        ver: "8.9.73",
        buildtime: 1690371091,
        subid: 537171689,
        bitmap: 150470524,
        sdkver: "6.0.0.2553",
        qua: 'V1_AND_SQ_8.9.73_4416_YYB_D',
        ssover: 20,
    },
    {
        name: "A8.9.68.11565",
        version: "8.9.68.11565",
        ver: "8.9.68",
        buildtime: 1687254022,
        subid: 537168313,
        bitmap: 150470524,
        sdkver: "6.0.0.2549",
        qua: 'V1_AND_SQ_8.9.68_4264_YYB_D',
        ssover: 20,
    },
    {
        name: "A8.9.63.11390",
        version: "8.9.63.11390",
        ver: "8.9.63",
        buildtime: 1685069178,
        subid: 537164840,
        bitmap: 150470524,
        sdkver: "6.0.0.2546",
        qua: 'V1_AND_SQ_8.9.63_4194_YYB_D',
        ssover: 20,
    }
].map((shortInfo) => {
    // 固定信息
    return {
        id: "com.tencent.mobileqq",
        appid: 16,
        app_key: '0S200MNJT807V3GE',
        sign: Buffer.from('A6 B7 45 BF 24 A2 C2 77 52 77 16 F6 F3 6E B6 8D'.split(' ').map(s => parseInt(s, 16))),
        main_sig_map: 16724722,
        sub_sig_map: 0x10400,
        display: "Android",
        device_type: 3,
        ...shortInfo
    }
})
const aPadSubids = [
    {
        ver: '8.9.75',
        subid: 537173429,
    },
    {
        ver: '8.9.73',
        subid: 537171737,
    },
    {
        ver: '8.9.70',
        subid: 537169976,
    },
    {
        ver: '8.9.68',
        subid: 537168361,
    },
    {
        ver: '8.9.63',
        subid: 537164888,
    }
]
const tim: Apk[] = [
    // 每个版本不同的信息
    {
        name: "A3.5.2.3178",
        version: "3.5.2.3178",
        ver: "3.5.2",
        buildtime: 1630062176,
        subid: 537162286,
        bitmap: 150470524,
        sdkver: "6.0.0.2484",
        qua: "V1_AND_SQ_8.3.9_352_TIM_D",
        ssover: 18,
    },
    {
        name: "A3.5.1.3168",
        version: "3.5.1.3168",
        ver: "3.5.1",
        buildtime: 1630062176,
        subid: 537150355,
        bitmap: 150470524,
        sdkver: "6.0.0.2484",
        qua: "V1_AND_SQ_8.3.9_351_TIM_D",
        ssover: 18,
    }
].map((shortInfo) => {
    // 固定信息
    return {
        id: "com.tencent.tim",
        app_key: '0S200MNJT807V3GE',
        sign: Buffer.from('775e696d09856872fdd8ab4f3f06b1e0', 'hex'),
        appid: 16,
        main_sig_map: 16724722,
        sub_sig_map: 0x10400,
        display: "Tim",
        device_type: -1,
        ...shortInfo
    }
})

const watch: Apk[] = [
    {
        name: "A2.0.8",
        version: "2.0.8",
        ver: "2.0.8",
        buildtime: 1559564731,
        subid: 537065138,
        bitmap: 16252796,
        sdkver: "6.0.0.2365",
        qua: '',
        ssover: 5
    },
    {
        name: "A2.1.7",
        version: "2.1.7",
        ver: "2.1.7",
        buildtime: 1654570540,
        subid: 537140974,
        bitmap: 16252796,
        sdkver: "6.0.0.2366",
        qua: 'V1_WAT_SQ_2.1.7_002_IDC_B',
        ssover: 5
    }
].map((shortInfo) => {
    // 固定信息
    return {
        id: "com.tencent.qqlite",
        app_key: '0S200MNJT807V3GE',
        sign: Buffer.from('A6 B7 45 BF 24 A2 C2 77 52 77 16 F6 F3 6E B6 8D'.split(' ').map(s => parseInt(s, 16))),
        appid: 16,
        main_sig_map: 16724722,
        sub_sig_map: 0x10400,
        display: "Watch",
        device_type: 8,
        ...shortInfo
    }
})

const hd: Apk = {
    id: "com.tencent.qq",
    app_key: '0S200MNJT807V3GE',
    name: "A6.8.2.21241",
    version: "6.8.2.21241",
    ver: "6.8.2",
    sign: Buffer.from('AA 39 78 F4 1F D9 6F F9 91 4A 66 9E 18 64 74 C7'.split(' ').map(s => parseInt(s, 16))),
    buildtime: 1647227495,
    appid: 16,
    subid: 537128930,
    bitmap: 150470524,
    main_sig_map: 1970400,
    sub_sig_map: 66560,
    sdkver: "6.2.0.1023",
    display: "iMac",
    device_type: 5,
    qua: '',
    ssover: 12
}
const apklist: { [platform in Platform]: Apk | Apk[] } = {
    [Platform.Android]: mobile,
    [Platform.Tim]: tim,
    [Platform.aPad]: mobile.map(apk => {
        return {
            ...apk,
            subid: aPadSubids.find(s => s.ver === apk.ver)!.subid,
            display: 'aPad'
        }
    }),
    [Platform.Watch]: watch,
    [Platform.iMac]: { ...hd },
    [Platform.iPad]: {
        ...mobile[0],
        subid: 537155074,
        sign: hd.sign,
        name: '8.9.50.611',
        version: '8.9.50.611',
        ver: '8.9.50',
        sdkver: '6.0.0.2535',
        qua: '',
        display: 'iPad',
        ssover: 19
    },
}

export function getApkInfo(p: Platform, ver?: string): Apk {
    const apis = apklist[p]
    if (Array.isArray(apis)) return apis.find(a => a.ver === ver) || apis[0]
    return apis as Apk
}
