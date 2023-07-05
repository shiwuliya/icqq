import axios from 'axios';
import { BaseClient } from "./base-client";
import { BUF0 } from './constants';

export class qsign extends BaseClient {
    async getT544(cmd: String): Promise<Buffer> {
        let sign = BUF0;
        if (this.apk.qua) {
            let post_params = {
                ver: this.apk.ver,
                uin: this.uin,
                data: cmd,
                guid: this.device.guid.toString('hex'),
                version: this.apk.sdkver
            };
            let url = new URL(this.sig.sign_api_addr);
            url.pathname = '/energy';
            const { data } = await axios.get(url.href, {
                params: post_params,
                timeout: 10000,
                headers: {
                    'User-Agent': `Dalvik/2.1.0 (Linux; U; Android ${this.device.version.release}; PCRT00 Build/N2G48H)`,
                    'Content-Type': "application/x-www-form-urlencoded"
                }
            }).catch(() => ({ data: { code: -1 } }));
            this.logger.debug(`getT544 ${cmd} result: ${JSON.stringify(data)}`);
            if (data.code == 0) {
                if (typeof (data.data) === 'string') {
                    sign = Buffer.from(data.data, 'hex');
                } else if (typeof (data.data?.sign) === 'string') {
                    sign = Buffer.from(data.data.sign, 'hex');
                }
            } else if (data.code == 1) {
                if (data.msg.includes('Uin is not registered.')) {
                    if (await register.call(this)) {
                        return await this.getT544(cmd);
                    }
                }
            } else {
                this.logger.error(`签名api(energy)异常： ${cmd} result: ${JSON.stringify(data)}`);
            }
        }
        return this.generateT544Packet(cmd, sign);
    }


    async getSign(cmd: String, seq: number, body: Buffer): Promise<Buffer> {
        let params = BUF0;
        if (!this.sig.sign_api_addr) {
            return params;
        }
        let qImei36 = this.device.qImei36 || this.device.qImei16;
        if (qImei36 && this.apk.qua) {
            let url = this.sig.sign_api_addr;
            let post_params = {
                qua: this.apk.qua,
                uin: this.uin,
                cmd: cmd,
                seq: seq,
                buffer: body.toString('hex')
            };
            const { data } = await axios.post(url, post_params, {
                timeout: 10000,
                headers: {
                    'User-Agent': `Dalvik/2.1.0 (Linux; U; Android ${this.device.version.release}; PCRT00 Build/N2G48H)`,
                    'Content-Type': "application/x-www-form-urlencoded"
                }
            }).catch(() => ({ data: { code: -1 } }));
            this.logger.debug(`getSign ${cmd} result: ${JSON.stringify(data)}`);
            if (data.code == 0) {
                const Data = data.data || {};
                params = this.generateSignPacket(Data.sign, Data.token, Data.extra);
                let list = Data.ssoPacketList || Data.requestCallback || [];
                if (list.length < 1 && cmd.includes('wtlogin')) {
                    this.requestToken();
                }
                else {
                    this.ssoPacketListHandler(list);
                }
            } else if (data.code == 1) {
                if (data.msg.includes('Uin is not registered.')) {
                    if (await register.call(this)) {
                        return await this.getSign(cmd, seq, body);
                    }
                }
            } else {
                this.logger.error(`签名api异常： ${cmd} result: ${JSON.stringify(data)}`);
            }
        }
        return params;
    }
}

async function register(this: BaseClient) {
    let qImei36 = this.device.qImei36 || this.device.qImei16;
    let post_params = {
        uin: this.uin,
        android_id: this.device.android_id,
        qimei36: qImei36,
        guid: this.device.guid.toString('hex')
    };
    let url = new URL(this.sig.sign_api_addr);
    url.pathname = '/register';
    const { data } = await axios.get(url.href, {
        params: post_params,
        timeout: 15000,
        headers: {
            'User-Agent': `Dalvik/2.1.0 (Linux; U; Android ${this.device.version.release}; PCRT00 Build/N2G48H)`,
            'Content-Type': "application/x-www-form-urlencoded"
        }
    }).catch(() => ({ data: { code: -1 } }));
    this.logger.debug(`register result: ${JSON.stringify(data)}`);
    if (data.code == 0) {
        return true;
    } else {
        console.log(`签名api注册异常：result: ${JSON.stringify(data)}`);
    }
    return false;
}

