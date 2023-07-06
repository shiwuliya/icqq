import { BinaryLike, createHash } from "crypto"
import { promisify } from "util"
import * as zlib from "zlib"
import * as stream from "stream"

/** 一个0长buf */
export const BUF0 = Buffer.alloc(0)

/** 4个0的buf */
export const BUF4 = Buffer.alloc(4)

/** 16个0的buf */
export const BUF16 = Buffer.alloc(16)

/** no operation */
export const NOOP = () => { }

/** promisified unzip */
export const unzip = promisify(zlib.unzip)

/** promisified gzip */
export const gzip = promisify(zlib.gzip)

/** promisified pipeline */
export const pipeline = promisify(stream.pipeline)

/** md5 hash */
export const md5 = (data: BinaryLike) => createHash("md5").update(data).digest()

/** sha hash */
export const sha = (data: BinaryLike) => createHash("sha1").update(data).digest()
export const randomString = (n: number, template = 'abcdef1234567890') => {
	const len = template.length
	return new Array(n).fill(false).map(() => template.charAt(Math.floor(Math.random() * len))).join('')
}

export function formatTime(value: Date | number | string, template: string = 'yyyy-MM-dd HH:mm:ss') {
	const date = new Date()
	const o: Record<string, number> = {
		"M+": date.getMonth() + 1, //月份
		"d+": date.getDate(), //日
		"H+": date.getHours(), //小时
		"m+": date.getMinutes(), //分
		"s+": date.getSeconds(), //秒
		"q+": Math.floor((date.getMonth() + 3) / 3), //季度
		"S": date.getMilliseconds() //毫秒
	};
	if (/(y+)/.test(template)) template = template.replace(/(y+)/, (sub) => (date.getFullYear() + "").slice(0, sub.length));
	for (let k in o) {
		const reg = new RegExp("(" + k + ")")
		if (reg.test(template)) {
			template = template.replace(reg, (v) => `${o[k]}`.padStart(v.length, ''));
		}
	}
	return template;
}
/** unix timestamp (second) */
export const timestamp = () => Math.floor(Date.now() / 1000)

/** 数字ip转通用ip */
export function int32ip2str(ip: number | string) {
	if (typeof ip === "string")
		return ip
	ip = ip & 0xffffffff
	return [
		ip & 0xff,
		(ip & 0xff00) >> 8,
		(ip & 0xff0000) >> 16,
		(ip & 0xff000000) >> 24 & 0xff,
	].join(".")
}

/** 隐藏并锁定一个属性 */
export function lock(obj: any, prop: string) {
	Reflect.defineProperty(obj, prop, {
		configurable: false,
		enumerable: false,
		writable: false,
	})
}
export function unlock(obj: any, prop: string) {
	Reflect.defineProperty(obj, prop, {
		configurable: false,
		enumerable: false,
		writable: true,
	})
}

/** 隐藏一个属性 */
export function hide(obj: any, prop: string) {
	Reflect.defineProperty(obj, prop, {
		configurable: false,
		enumerable: false,
		writable: true,
	})
}
