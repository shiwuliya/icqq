import { randomBytes } from "crypto"
import { md5 } from "./constants"

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
		let result = ''
		const map = num ? '0123456789' : '0123456789abcdef'
		for (let i = length; i > 0; --i) result += map[Math.floor(Math.random() * map.length)]
		return result
	}
	const hash = md5(randstr(10))
	const hex = hash.toString("hex")
	return {
		"--begin--":  "该设备为随机生成，丢失后不能得到原先配置",
		product:      `ILPP-${randstr(5).toUpperCase()}`,
		device:       `${randstr(5).toUpperCase()}`,
		board:        `${randstr(5).toUpperCase()}`,
		brand:        `${randstr(4).toUpperCase()}`,
		model:        `ILPP ${randstr(4).toUpperCase()}`,
		wifi_ssid:    `HUAWEI-${randstr(7)}`,
		bootloader:   `U-boot`,
		android_id:   `IL.${randstr(7, true)}.${randstr(4, true)}`,
		boot_id:      `${randstr(8)}-${randstr(4)}-${randstr(4)}-${randstr(4)}-${randstr(12,)}`,
		proc_version: `Linux version 5.10.101-android12-${randstr(8)}`,
		mac_address:  `2D:${randstr(2).toUpperCase()}:${randstr(2).toUpperCase()}:${randstr(2,).toUpperCase()}:${randstr(2).toUpperCase()}:${randstr(2).toUpperCase()}`,
		ip_address:   `192.168.${randstr(2, true)}.${randstr(2, true)}`,
		imei:         `86${randstr(13, true)}`,
		incremental:  `${randstr(10).toUpperCase()}`,
		"--end--":    "修改后可能需要重新验证设备。"
	}
}


/** 生成完整设备信息 */
export function generateFullDevice(d?: ShortDevice) {
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
export type Device = ReturnType<typeof generateFullDevice>

// ----------

/** 支持的登录设备平台 */
export enum Platform {
	Android = 1,
	aPad = 2,
	Watch = 3,
	iMac = 4,
	iPad = 5,
}

export type Apk = typeof mobile

const mobile = {
	id: "com.tencent.mobileqq",
	name: "A8.8.80.7400",
	version: "8.8.80.7400",
	ver: "8.8.80",
	sign: Buffer.from([166, 183, 69, 191, 36, 162, 194, 119, 82, 119, 22, 246, 243, 110, 182, 141]),
	buildtime: 1640921786,
	appid: 16,
	subid: 537143609,
	bitmap: 184024956,
	sigmap: 34869472,
	sdkver: "6.0.0.2494",
	display: "Android",
}
const watch: Apk = {
	id: "com.tencent.qqlite",
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
}
const hd: Apk = {
	id: "com.tencent.minihd.qq",
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
}

const apklist: {[platform in Platform]: Apk} = {
	[Platform.Android]: mobile,
	[Platform.aPad]: hd,
	[Platform.Watch]: watch,
	[Platform.iMac]: { ...hd },
	[Platform.iPad]: { ...hd },
}

apklist[Platform.iMac].subid = 537128930
apklist[Platform.iMac].display = "iMac"
apklist[Platform.iPad].subid = 537118796
apklist[Platform.iPad].display = "iPad"

export function getApkInfo(p: Platform): Apk {
	return apklist[p] || apklist[Platform.Android]
}
