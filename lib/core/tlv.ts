import * as crypto from "crypto"
import * as tea from "./tea"
import * as pb from "./protobuf"
import Writer from "./writer"
import {md5, BUF0} from "./constants"

type BaseClient = import("./base-client").BaseClient

function packTlv(this: BaseClient, tag: number, ...args: any[]) {
    const t = map[tag].apply(this, args)
    const lbuf = Buffer.allocUnsafe(2)
    lbuf.writeUInt16BE(t.readableLength)
    t.unshift(lbuf)
    const tbuf = Buffer.allocUnsafe(2)
    tbuf.writeUInt16BE(tag)
    t.unshift(tbuf)
    return t.read() as Buffer
}

const map: { [tag: number]: (this: BaseClient, ...args: any[]) => Writer } = {
    0x01: function () {
        return new Writer()
            .writeU16(1) // ip ver
            .writeBytes(crypto.randomBytes(4))
            .writeU32(this.uin)
            .write32(Date.now() & 0xffffffff)
            .writeBytes(Buffer.alloc(4)) //ip
            .writeU16(0);
    },
    0x08: function () {
        return new Writer()
            .writeU16(0)
            .writeU32(2052) //localId
            .writeU16(0)
    },
    0x16: function () {
        return new Writer()
            .writeU32(7)
            .writeU32(16)
            .writeU32(537067759)
            .writeBytes(this.device.guid)
            .writeTlv("com.tencent.qqlite")
            .writeTlv("4.0.2")
            .writeTlv(Buffer.from([0xA6, 0xB7, 0x45, 0xBF, 0x24, 0xA2, 0xC2, 0x77, 0x52, 0x77, 0x16, 0xF6, 0xF3, 0x6E, 0xB6, 0x8D]));
    },
    0x18: function () {
        return new Writer()
            .writeU16(1) // ping ver
            .writeU32(1536)
            .writeU32(this.apk.appid)
            .writeU32(0) // app client ver
            .writeU32(this.uin)
            .writeU16(0)
            .writeU16(0);
    },
    0x1B: function () {
        return new Writer()
            .writeU32(0)
            .writeU32(0)
            .writeU32(3)
            .writeU32(4)
            .writeU32(72)
            .writeU32(2)
            .writeU32(2)
            .writeU16(0);
    },
    0x1D: function () {
        return new Writer()
            .writeU8(1)
            .writeU32(184024956)
            .writeU32(0)
            .writeU8(0)
            .writeU32(0)
    },
    0x1F: function () {
        return new Writer()
            .writeU8(0)
            .writeTlv("android")
            .writeTlv("7.1.2")
            .writeU16(2)
            .writeTlv("China Mobile GSM")
            .writeTlv(BUF0)
            .writeTlv("wifi")
    },
    0x33: function () {
        return new Writer().writeBytes(this.device.guid)
    },
    0x35: function (deviceType:number) {
        return new Writer().writeU32(deviceType)
    },
    0x100: function () {
        return new Writer()
            .writeU16(1) // db buf ver
            .writeU32(this.apk.ssover) // sso ver
            .write32(this.apk.appid)
            .writeU32(this.apk.subid)
            .writeU32(0) // app client ver
            .writeU32(this.apk.main_sig_map);
    },
    0x104: function () {
        return new Writer().writeBytes(this.sig.t104)
    },
    0x106: function (md5pass: Buffer) {
        const body = new Writer()
            .writeU16(4) // tgtgt ver
            .writeBytes(crypto.randomBytes(4))
            .writeU32(this.apk.ssover) // sso ver
            .writeU32(this.apk.appid)
            .writeU32(0) // app client ver
            .writeU64(this.uin)
            .write32(Date.now() & 0xffffffff)
            .writeBytes(Buffer.alloc(4)) // dummy ip
            .writeU8(1) // save password
            .writeBytes(md5pass)
            .writeBytes(this.sig.tgtgt)
            .writeU32(0)
            .writeU8(1) // guid available
            .writeBytes(this.device.guid)
            .writeU32(this.apk.subid)
            .writeU32(1) // login type password
            .writeTlv(String(this.uin))
            .writeU16(0)
            .read();
        const buf = Buffer.alloc(4)
        buf.writeUInt32BE(this.uin)
        const key = md5(Buffer.concat([
            md5pass, Buffer.alloc(4), buf
        ]))
        return new Writer().writeBytes(tea.encrypt(body, key))
    },
    0x107: function () {
        return new Writer()
            .writeU16(0)    // pic type
            .writeU8(0)     // captcha type
            .writeU16(0)    // pic size
            .writeU8(1)     // ret type
    },
    0x108: function () {
        return new Writer().writeBytes(this.sig.ksid||Buffer.from(`|${this.device.imei}|${this.apk.name}`));
    },
    0x109: function () {
        return new Writer().writeBytes(md5(this.device.imei))
    },
    0x10a: function () {
        return new Writer().writeBytes(this.sig.tgt)
    },
    0x112: function () {
        return new Writer().writeTlv(String(this.uin));
    },
    0x116: function () {
        return new Writer()
            .writeU8(0)
            .writeU32(this.apk.bitmap)
            .writeU32(this.apk.sub_sig_map) // sub sigmap
            .writeU8(1) // size of app id list
            .writeU32(1600000226) // app id list[0]
    },
    0x124: function () {
        return new Writer()
            .writeTlv(this.device.os_type.slice(0, 16))
            .writeTlv(this.device.version.release.slice(0, 16))
            .writeU16(2) // network type
            .writeTlv(this.device.sim.slice(0, 16))
            .writeU16(0)
            .writeTlv(this.device.apn.slice(0, 16))
    },
    0x128: function () {
        return new Writer()
            .writeU16(0)
            .writeU8(0) // guid new
            .writeU8(1) // guid available
            .writeU8(0) // guid changed
            .writeU32(16777216) // guid flag
            .writeTlv(this.device.model.slice(0, 32))
            .writeTlv(this.device.guid.slice(0, 16))
            .writeTlv(this.device.brand.slice(0, 16))
    },
    0x141: function () {
        return new Writer()
            .writeU16(1) // ver
            .writeTlv(this.device.sim)
            .writeU16(2) // network type
            .writeTlv(this.device.apn)
    },
    0x142: function () {
        return new Writer()
            .writeU16(0)
            .writeTlv(this.apk.id.slice(0, 32))
    },
    0x143: function () {
        return new Writer().writeBytes(this.sig.d2)
    },
    0x144: function () {
        const body = new Writer()
            .writeU16(5) // tlv cnt
            .writeBytes(packTlv.call(this, 0x109))
            .writeBytes(packTlv.call(this, 0x52d))
            .writeBytes(packTlv.call(this, 0x124))
            .writeBytes(packTlv.call(this, 0x128))
            .writeBytes(packTlv.call(this, 0x16e))
        return new Writer().writeBytes(tea.encrypt(body.read(), this.sig.tgtgt))
    },
    0x145: function () {
        return new Writer().writeBytes(this.device.guid)
    },
    0x147: function () {
        return new Writer()
            .writeU32(this.apk.appid).writeTlv(this.apk.ver)
            .writeTlv(this.apk.sign)
    },
    0x154: function () {
        return new Writer().writeU32(this.sig.seq + 1)
    },
    0x16a: function () {
        return new Writer().writeBytes(this.sig.srm_token);
    },
    0x16e: function () {
        return new Writer().writeBytes(this.device.model)
    },
    0x174: function () {
        return new Writer().writeBytes(this.sig.t174)
    },
    0x177: function () {
        return new Writer()
            .writeU8(0x01)
            .writeU32(this.apk.buildtime)
            .writeTlv(this.apk.sdkver)
    },
    0x17a: function () {
        return new Writer().writeU32(9)
    },
    0x17c: function (code) {
        return new Writer().writeTlv(code)
    },
    0x187: function () {
        return new Writer().writeBytes(md5(this.device.mac_address))
    },
    0x188: function () {
        return new Writer().writeBytes(md5(this.device.android_id))
    },
    0x191: function () {
        return new Writer().writeU8(0x82)
    },
    0x193: function (ticket) {
        return new Writer().writeBytes(ticket)
    },
    0x194: function () {
        return new Writer().writeBytes(this.device.imsi)
    },
    0x197: function () {
        return new Writer().writeTlv(Buffer.alloc(1))
    },
    0x198: function () {
        return new Writer().writeTlv(Buffer.alloc(1))
    },
    0x202: function () {
        return new Writer()
            .writeTlv(this.device.wifi_bssid.slice(0, 16))
            .writeTlv(this.device.wifi_ssid.slice(0, 32))
    },
    0x400: function () {
        return new Writer()
            .writeU16(1)
            .writeU64(this.uin)
            .writeBytes(this.device.guid)
            .writeBytes(crypto.randomBytes(16))
            .write32(1)
            .write32(16)
            .write32(Date.now() & 0xffffffff)
            .writeBytes(Buffer.alloc(0))
    },
    0x401: function () {
        return new Writer().writeBytes(crypto.randomBytes(16))
    },
    0x511: function () {
        const domains = new Set<Domain>([
            "aq.qq.com",
            // "buluo.qq.com",
            "connect.qq.com",
            "docs.qq.com",
            "game.qq.com",
            "gamecenter.qq.com",
            // "graph.qq.com",
            "haoma.qq.com",
            "id.qq.com",
            // "imgcache.qq.com",
            "kg.qq.com",
            "mail.qq.com",
            "mma.qq.com",
            "office.qq.com",
            // "om.qq.com",
            "openmobile.qq.com",
            "qqweb.qq.com",
            "qun.qq.com",
            "qzone.qq.com",
            "ti.qq.com",
            "v.qq.com",
            "vip.qq.com",
            "y.qq.com",
        ])
        const stream = new Writer().writeU16(domains.size)
        for (let v of domains)
            stream.writeU8(0x01).writeTlv(v)
        return stream
    },
    0x516: function () {
        return new Writer().writeU32(0)
    },
    0x521: function (type:number) {
        return new Writer()
            .writeU32(type) // product type
            .writeU16(0) // const
    },
    0x525: function () {
        return new Writer()
            .writeU16(1) // tlv cnt
            .writeU16(0x536) // tag
            .writeTlv(Buffer.from([0x1, 0x0])); // zero
    },
    0x523: function () {
        return new Writer()
            .writeTlv(Buffer.from([0x1, 0x0]))
    },
    0x52d: function () {
        const d = this.device
        const buf = pb.encode({
            1: d.bootloader,
            2: d.proc_version,
            3: d.version.codename,
            4: d.version.incremental,
            5: d.fingerprint,
            6: d.boot_id,
            7: d.android_id,
            8: d.baseband,
            9: d.version.incremental,
        })
        return new Writer().writeBytes(buf)
    },
    0x542: function () {
        return new Writer().writeBytes(Buffer.from([0x4A, 0x02, 0x60, 0x01]));
    },
    0x544: function () {
        // TODO: native generate t544, login error 45
        return new Writer()
            .writeBytes(
                Buffer.concat(
                    [Buffer.from([0x0C, 0x03]),
                        crypto.randomBytes(6),
                        Buffer.alloc(2),
                        crypto.randomBytes(10),
                        Buffer.alloc(4),
                        crypto.randomBytes(4),
                        Buffer.alloc(4),
                    ])); // random generate, may not work?
    },
    0x545: function (qimei) {
        return new Writer().writeBytes(Buffer.from(qimei));
    },
    0x547: function () {
        return new Writer().writeBytes(this.sig.t547);
    },
    0x548: function () {
        // TODO: PoW test data
        return new Writer().writeU8(0x01);
    }
}

export function getPacker(c: BaseClient) {
    return packTlv.bind(c)
}

export type Domain = "aq.qq.com"
    | "buluo.qq.com"
    | "connect.qq.com"
    | "docs.qq.com"
    | "game.qq.com"
    | "gamecenter.qq.com"
    // | "graph.qq.com"
    | "haoma.qq.com"
    | "id.qq.com"
    // | "imgcache.qq.com"
    | "kg.qq.com"
    | "mail.qq.com"
    | "mma.qq.com"
    | "office.qq.com"
    // | "om.qq.com"
    | "openmobile.qq.com"
    | "qqweb.qq.com"
    | "qun.qq.com"
    | "qzone.qq.com"
    | "ti.qq.com"
    | "v.qq.com"
    | "vip.qq.com"
    | "y.qq.com"
    | ""
