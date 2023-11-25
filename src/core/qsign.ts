import axios from 'axios';
import { BaseClient, VerboseLevel } from "./base-client";
import { BUF0 } from './constants';

export async function getT544(this: BaseClient, cmd: string) {
	let sign = BUF0;
	if (this.sig.sign_api_addr && this.apk.qua) {
		const time = Date.now();
		let qImei36 = this.device.qImei36 || this.device.qImei16;
		let post_params = {
			ver: this.apk.ver,
			uin: this.uin || 0,
			data: cmd,
			android_id: this.device.android_id,
			qimei36: qImei36 || this.device.android_id,
			guid: this.device.guid.toString('hex'),
			version: this.apk.sdkver
		};
		let url = new URL(this.sig.sign_api_addr);
		let path = url.pathname;
		if (path.substring(path.length - 1) === '/') {
			path += 'energy';
		} else {
			path = path.replace(/\/sign$/, '/energy');
		}
		url.pathname = path;
		const data = await get.bind(this)(url.href, post_params);
		this.emit("internal.verbose", `[qsign]getT544 ${cmd} result(${Date.now() - time}ms): ${JSON.stringify(data)}`, VerboseLevel.Debug);
		if (data.code === 0) {
			if (typeof (data.data) === 'string') {
				sign = Buffer.from(data.data, 'hex');
			} else if (typeof (data.data?.sign) === 'string') {
				sign = Buffer.from(data.data.sign, 'hex');
			}
		} else {
			if (data.code === 1) {
				if (data.msg.includes('Uin is not registered.')) {
					if (await register.call(this)) {
						return await this.getT544(cmd);
					}
				}
			}
			this.emit("internal.verbose", `[qsign]签名api(energy)异常： ${cmd} result(${Date.now() - time}ms): ${JSON.stringify(data)}`, VerboseLevel.Error);
		}
	}
	return this.generateT544Packet(cmd, sign);
}

export async function getSign(this: BaseClient, cmd: string, seq: number, body: Buffer) {
	let params = BUF0;
	if (!this.sig.sign_api_addr) {
		return params;
	}
	let qImei36 = this.device.qImei36 || this.device.qImei16;
	if (this.apk.qua) {
		const time = Date.now();
		let post_params = {
			qua: this.apk.qua,
			uin: this.uin || 0,
			cmd: cmd,
			seq: seq,
			android_id: this.device.android_id,
			qimei36: qImei36 || this.device.android_id,
			buffer: body.toString('hex'),
			guid: this.device.guid.toString('hex'),
		};
		let url = new URL(this.sig.sign_api_addr);
		let path = url.pathname;
		if (path.substring(path.length - 1) === '/') {
			path += 'sign';
		}
		url.pathname = path;
		const data = await get.bind(this)(url.href, post_params, true);
		this.emit("internal.verbose", `[qsign]getSign ${cmd} result(${Date.now() - time}ms): ${JSON.stringify(data)}`, VerboseLevel.Debug);
		if (data.code === 0) {
			const Data = data.data || {};
			params = this.generateSignPacket(Data.sign, Data.token, Data.extra);
			let list = Data.ssoPacketList || Data.requestCallback || [];
			if (list.length < 1 && cmd.includes('wtlogin')) {
				this.requestToken();
			}
			else {
				this.ssoPacketListHandler(list);
			}
		} else {
			if (data.code === 1) {
				if (data.msg.includes('Uin is not registered.')) {
					if (await register.call(this)) {
						return await this.getSign(cmd, seq, body);
					}
				}
			}
			this.emit("internal.verbose", `[qsign]签名api异常： ${cmd} result(${Date.now() - time}ms): ${JSON.stringify(data)}`, VerboseLevel.Error);
		}
	}
	return params;
}

export async function requestSignToken(this: BaseClient) {
	if (!this.sig.sign_api_addr) {
		return [];
	}
	let qImei36 = this.device.qImei36 || this.device.qImei16;
	if (this.apk.qua) {
		const time = Date.now();
		let post_params = {
			uin: this.uin || 0,
			android_id: this.device.android_id,
			qimei36: qImei36 || this.device.android_id,
			guid: this.device.guid.toString('hex'),
		};
		let url = new URL(this.sig.sign_api_addr);
		let path = url.pathname;
		if (path.substring(path.length - 1) === '/') {
			path += 'request_token';
		} else {
			path = path.replace(/\/sign$/, '/request_token');
		}
		url.pathname = path;
		const data = await get.bind(this)(url.href, post_params);
		this.emit("internal.verbose", `[qsign]requestSignToken result(${Date.now() - time}ms): ${JSON.stringify(data)}`, VerboseLevel.Debug);
		if (data.code === 0) {
			let ssoPacketList = data.data?.ssoPacketList || data.data?.requestCallback || data.data;
			if (!ssoPacketList || ssoPacketList.length < 1) return [];
			return ssoPacketList;
		} else if (data.code === 1) {
			if (data.msg.includes('Uin is not registered.')) {
				if (await register.call(this)) {
					return await this.requestSignToken();
				}
			}
		}
	}
	return [];
}

export async function submitSsoPacket(this: BaseClient, cmd: string, callbackId: number, body: Buffer) {
	if (!this.sig.sign_api_addr) {
		return [];
	}
	let qImei36 = this.device.qImei36 || this.device.qImei16;
	if (this.apk.qua) {
		const time = Date.now();
		let post_params = {
			ver: this.apk.ver,
			qua: this.apk.qua,
			uin: this.uin || 0,
			cmd: cmd,
			callback_id: callbackId,
			android_id: this.device.android_id,
			qimei36: qImei36 || this.device.android_id,
			buffer: body.toString('hex'),
			guid: this.device.guid.toString('hex'),
		};
		let url = new URL(this.sig.sign_api_addr);
		let path = url.pathname;
		if (path.substring(path.length - 1) === '/') {
			path += 'submit';
		} else {
			path = path.replace(/\/sign$/, '/submit');
		}
		url.pathname = path;
		const data = await get.bind(this)(url.href, post_params);
		this.emit("internal.verbose", `[qsign]submitSsoPacket result(${Date.now() - time}ms): ${JSON.stringify(data)}`, VerboseLevel.Debug);
		if (data.code === 0) {
			let ssoPacketList = data.data?.ssoPacketList || data.data?.requestCallback || data.data;
			if (!ssoPacketList || ssoPacketList.length < 1) return [];
			return ssoPacketList;
		}
	}
	return [];
}

async function register(this: BaseClient) {
	let qImei36 = this.device.qImei36 || this.device.qImei16;
	const time = Date.now();
	let post_params = {
		uin: this.uin || 0,
		android_id: this.device.android_id,
		qimei36: qImei36,
		guid: this.device.guid.toString('hex')
	};
	let url = new URL(this.sig.sign_api_addr);
	let path = url.pathname;
	if (path.substring(path.length - 1) === '/') {
		path += 'register';
	} else {
		path = path.replace(/\/sign$/, '/register');
	}
	url.pathname = path;
	const data = await get.bind(this)(url.href, post_params);
	this.emit("internal.verbose", `[qsign]register result(${Date.now() - time}ms): ${JSON.stringify(data)}`, VerboseLevel.Debug);
	if (data.code == 0) {
		return true;
	};
	this.emit("internal.verbose", `[qsign]签名api注册异常：result(${Date.now() - time}ms): ${JSON.stringify(data)}`, VerboseLevel.Error);
	return false;
}

export async function getApiQQVer(this: BaseClient) {
	let QQVer = this.config.ver;
	if (!this.sig.sign_api_addr) {
		return QQVer;
	}
	const apks = this.getApkInfoList(this.config.platform);
	const packageName = this.apk.id;
	let url = new URL(this.sig.sign_api_addr);
	let path = url.pathname;
	if (path.substring(path.length - 1) != '/') {
		path = path.replace(/\/sign$/, '/');
	}
	url.pathname = path;
	const data = await get.bind(this)(url.href);
	if (data.code === 0) {
		const ver = data?.data?.protocol?.version;
		if (ver) {
			if (apks.find(val => val.ver === ver)) {
				QQVer = ver;
			}
		}
	}
	return QQVer;
}

async function get(this: BaseClient, url: string, params: object = {}, post: boolean = false) {
	const config: any = {
		timeout: 30000,
		headers: {
			'User-Agent': `icqq@${this.pkg.version} (Released on ${this.pkg.upday})`,
			'Content-Type': "application/x-www-form-urlencoded"
		}
	};
	let data: any = { code: -1 };
	let num: number = 0;
	while (data.code == -1 && num < 3) {
		if (num > 0) await new Promise((resolve) => setTimeout(resolve, 2000));
		num++;
		if (post) {
			data = await axios.post(url, params, config).catch(err => ({ data: { code: -1, msg: err?.message } }));
		} else {
			config.params = params;
			data = await axios.get(url, config).catch(err => ({ data: { code: -1, msg: err?.message } }));
		}
		data = data.data;
	}
	return data;
}