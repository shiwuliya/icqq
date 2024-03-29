import { unzipSync } from "zlib"
import { pb } from "../core"
import * as T from "./elements"
import { facemap, pokemap } from "./face"
import { buildImageFileParam } from "./image"

/** 解析消息 */
export function parse(rich: pb.Proto | pb.Proto[], uin?: number) {
    return new Parser(rich, uin)
}

/** 消息解析器 */
export class Parser {

    message: T.MessageElem[] = []
    brief = ""
    content = ""
    /** 匿名情报 */
    anon?: pb.Proto
    /** 额外情报 */
    extra?: pb.Proto
    /** 引用回复 */
    quotation?: pb.Proto
    atme = false
    atall = false
    newImg = false
    imgprefix: any = {}

    private exclusive = false
    private it?: IterableIterator<[number, pb.Proto]>

    public constructor(rich: pb.Proto | pb.Proto[], private uin?: number) {
        if (Array.isArray(rich)) {
            this.parseElems(rich)
        } else {
            if (rich[4] && rich[4].length)
                this.parseExclusiveElem(0, rich[4])
            this.parseElems(Array.isArray(rich[2]) ? rich[2] : [rich[2]])
        }
    }

    /** 获取下一个节点的文本 */
    private getNextText() {
        try {
            const elem = this.it?.next().value[1][1]
            return String(elem[1])
        } catch {
            return "[未知]"
        }
    }

    /** 解析: xml, json, ptt, video, flash, file, shake, poke */
    private parseExclusiveElem(type: number, proto: pb.Proto) {
        let elem: T.MessageElem
        let brief: string
        switch (type) {
            case 12: //xml
            case 51: //json
                const buf = proto[1].toBuffer() as Buffer
                elem = {
                    type: type === 12 ? "xml" : "json",
                    data: String(buf[0] > 0 ? unzipSync(buf.slice(1)) : buf.slice(1)),
                    id: proto[2]
                } as T.XmlElem | T.JsonElem
                brief = elem.type + "消息"
                this.content = elem.data
                break
            case 3: //flash
                elem = this.parseNewImgElem(proto, "flash") as T.ImageElem | T.FlashElem
                brief = "闪照"
                this.content = `{flash:${(elem.file as string).slice(0, 32).toUpperCase()}}`
                break
            case 0: //ptt
                elem = {
                    type: "record",
                    file: "protobuf://" + proto.toBase64(),
                    url: "",
                    md5: proto[4].toHex(),
                    size: proto[6] || 0,
                    seconds: proto[19] || 0,
                }
                if (proto[20]) {
                    const url = String(proto[20])
                    elem.url = url.startsWith("http") ? url : "https://grouptalk.c2c.qq.com" + url
                }
                brief = "语音"
                this.content = `{ptt:${elem.url}}`
                break
            case 19: //video
                elem = {
                    type: "video",
                    file: "protobuf://" + proto.toBase64(),
                    name: proto[3]?.toString() || "",
                    fid: String(proto[1]),
                    md5: proto[2].toBase64(),
                    size: proto[6] || 0,
                    seconds: proto[5] || 0,
                }
                brief = "视频"
                this.content = `{video:${elem.fid}}`
                break
            case 5: //transElem
                const trans = pb.decode(proto[2].toBuffer().slice(3))[7][2]
                elem = {
                    type: "file",
                    name: String(trans[4]),
                    fid: String(trans[2]).replace("/", ""),
                    md5: String(trans[8]),
                    size: trans[3],
                    duration: trans[5],
                }
                brief = "群文件"
                this.content = `{file:${elem.fid}}`
                break
            case 37: //qlottie
                elem = {
                    type: "face",
                    id: proto[2][3],
                    text: facemap[proto[2][3]]
                }
                if (!elem.text)
                    elem.text = proto[2][7] ? String(proto[2][7]) : '超级表情';
                if (proto[2][2])
                    elem.qlottie = String(proto[2][2])
                brief = elem.text as string;
                this.content = `{face:${elem.id},text:${elem.text},qlottie:${elem.qlottie}}`
                break;
            case 126: //poke
                if (!proto[3])
                    return
                const pokeid = proto[3] === 126 ? proto[2][4] : proto[3]
                elem = {
                    type: "poke",
                    id: pokeid,
                    text: pokemap[pokeid]
                }
                brief = pokemap[pokeid]
                this.content = `{poke:${elem.id}}`
                break
            default:
                return
        }
        this.message = [elem]
        this.brief = "[" + brief + "]"
        this.exclusive = true
    }

    /** 解析: text, at, face, bface, sface, image, mirai */
    private parsePartialElem(type: number, proto: pb.Proto) {
        let elem: T.MessageElem
        let brief = ""
        let content = ""
        switch (type) {
            case 1: //text&at
                brief = String(proto[1])
                const buf = proto[3]?.toBuffer() as Buffer
                if (buf && buf[1] === 1) {
                    elem = {
                        type: "at",
                        qq: 0,
                        text: brief
                    }
                    if (buf[6] === 1) {
                        elem.qq = "all"
                        this.atall = true
                    } else {
                        elem.qq = buf.readUInt32BE(7)
                        if (elem.qq === this.uin)
                            this.atme = true
                    }
                    brief = brief || ("@" + elem.qq)
                    content = `{at:${elem.qq}}`
                } else if (proto[12] && !proto[12][1]) {
                    // 频道中的AT
                    elem = {
                        type: "at",
                        qq: 0,
                        text: brief
                    }
                    elem.id = proto[12][5] ? String(proto[12][5]) : "all"
                    brief = brief || ("@" + elem.qq)
                    content = `{at:${elem.qq}}`
                } else {
                    if (!brief)
                        return
                    content = brief
                    elem = {
                        type: "text",
                        text: brief
                    }
                }
                break
            case 2: //face
                elem = {
                    type: "face",
                    id: proto[1],
                    text: facemap[proto[1]] || "表情",
                }
                brief = `[${elem.text}]`
                content = `{face:${elem.id}}`
                break
            case 33: //face(id>255)
                elem = {
                    type: "face",
                    id: proto[1],
                    text: facemap[proto[1]],
                }
                if (!elem.text)
                    elem.text = proto[2] ? String(proto[2]) : ("/" + elem.id)
                brief = `[${elem.text}]`
                content = `{face:${elem.id}}`
                break
            case 6: //bface
                brief = this.getNextText()
                if (brief.includes("骰子") || brief.includes("猜拳")) {
                    elem = {
                        type: brief.includes("骰子") ? "dice" : "rps",
                        id: proto[12].toBuffer()[16] - 0x30 + 1
                    }
                    content = `{${elem.type}:${elem.id}}`
                } else {
                    elem = {
                        type: "bface",
                        file: proto[4].toHex() + proto[7].toHex() + proto[5],
                        text: brief.replace(/[[\]]/g, "")
                    }
                    content = `{bface:${elem.text}}`
                }
                break
            case 4:
            case 8:
                if (this.newImg) return
                elem = this.parseImgElem(type, proto, "image") as T.ImageElem
                brief = (elem.asface ? "[动画表情]" : "[图片]") + (elem.summary || "")
                content = `{image:${(elem.md5 as string).toUpperCase()}}`
                break
            case 34: //sface
                brief = this.getNextText()
                elem = {
                    type: "sface",
                    id: proto[1],
                    text: brief.replace(/[[\]]/g, ""),
                }
                content = `{sface:${elem.id}}`
                break
            case 31: //mirai
                if (proto[3] === 103904510) {
                    elem = {
                        type: "mirai",
                        data: String(proto[2]),
                    }
                } else {
                    return
                }
                break
            case 45:
                elem = {
                    type: "markdown",
                    content: proto[1]?.toString()
                }
                break
            case 46:
                try {
                    const rows = Array.isArray(proto[1][1]) ? proto[1][1] : [proto[1][1]]
                    elem = {
                        type: "button",
                        content: {
                            appid: Number(proto[1][2]) || 0,
                            rows: rows.map(row => {
                                row = Array.isArray(row[1]) ? row[1] : [row[1]]
                                const buttons: T.Button[] = []
                                for (let val of row) {
                                    const button: T.Button = {
                                        id: "",
                                        render_data: {},
                                        action: {
                                            permission: {}
                                        }
                                    } as T.Button
                                    if (val[1]) button.id = val[1]?.toString()
                                    if (val[2]) {
                                        button.render_data.label = val[2][1]?.toString()
                                        button.render_data.visited_label = val[2][2]?.toString()
                                        button.render_data.style = Number(val[2][3]) || 0
                                    }
                                    if (val[3]) {
                                        button.action.type = Number(val[3][1]) || 0
                                        button.action.unsupport_tips = val[3][4]?.toString()
                                        button.action.data = val[3][5]?.toString()
                                        button.action.reply = val[3][7] === 1
                                        button.action.enter = val[3][8] === 1
                                        if (val[3][2]) {
                                            button.action.permission.type = Number(val[3][2][1]) || 0
                                            button.action.permission.specify_role_ids = val[3][2][2] || []
                                            button.action.permission.specify_user_ids = val[3][2][3] || []
                                        }
                                    }
                                    buttons.push(button)
                                }
                                return { buttons }
                            })
                        }
                    }
                } catch {
                    return
                }
                break
            case 48:
                elem = this.parseNewImgElem(proto, "image") as T.ImageElem | T.FlashElem
                if (!elem) return
                brief = (elem.asface ? "[动画表情]" : "[图片]") + (elem.summary || "")
                content = `{image:${(elem.md5 as string).toUpperCase()}}`
                break
            default:
                return
        }

        // 删除回复中多余的AT元素
        if (this.message.length === 2 && elem.type === "at" && this.message[0]?.type === "at" && this.message[1]?.type === "text") {
            if (this.message[0].qq === elem.qq && this.message[1].text === " ") {
                this.message.splice(0, 2)
                this.brief = ""
            }
        }

        this.brief += brief
        this.content += content
        if (!Array.isArray(this.message))
            this.message = []
        const prev = this.message[this.message.length - 1]
        if (elem.type === "text" && prev?.type === "text")
            prev.text += elem.text
        else
            this.message.push(elem)
    }

    private parseElems(arr: pb.Proto[]) {
        this.it = arr.entries()
        while (true) {
            let wrapper = this.it.next().value?.[1]
            if (!wrapper) break
            const type = Number(Object.keys(Reflect.getPrototypeOf(wrapper) as object)[0])
            const proto = wrapper[type]
            if (type === 16) { //extraInfo
                this.extra = proto
            } else if (type === 21) { //anonGroupMsg
                this.anon = proto
            } else if (type === 45) { //sourceMsg
                this.quotation = proto
            } else if (!this.exclusive) {
                switch (type) {
                    case 1: //text
                    case 2: //face
                    case 4: //notOnlineImage
                    case 6: //bface
                    case 8: //customFace
                    case 31: //mirai
                    case 34: //sface
                        this.parsePartialElem(type, proto)
                        break
                    case 5: //transElem
                    case 12: //xml
                    case 19: //video
                    case 51: //json
                        this.parseExclusiveElem(type, proto)
                        break
                    case 53: //commonElem
                        if (proto[1] === 3) { //flash
                            this.parseExclusiveElem(3, proto[2][1] ? proto[2][1] : proto[2][2])
                        } else if (proto[1] === 33) { //face(id>255)
                            this.parsePartialElem(33, proto[2])
                        } else if (proto[1] === 2) { //poke
                            this.parseExclusiveElem(126, proto)
                        } else if (proto[1] === 37) { //qlottie
                            this.parseExclusiveElem(37, proto)
                        } else if (proto[1] === 20) { //json
                            this.parseExclusiveElem(51, proto[2])
                        } else if (proto[1] === 45) {
                            this.parsePartialElem(proto[1], proto[2])
                        } else if (proto[1] === 46) {
                            this.parsePartialElem(proto[1], proto[2])
                        } else if (proto[1] === 48) {
                            this.parsePartialElem(proto[1], proto[2])
                        }
                        break
                    default:
                        break
                }
            }
        }
    }

    private parseNewImgElem(proto: pb.Proto, type: "flash" | "image") {
        let elem: T.ImageElem | T.FlashElem
        const path = (proto[2][1]?.[11] || proto[2][1]?.[12])?.[30]
        if (path) {
            this.newImg = true
            elem = {
                type,
                file: proto[1][1][1][4]?.toString(),
                url: `https://${proto[1][2][3]}${path}${proto[1][2][2][1] || "&spec=0"}`,
                fid: proto[1][1][2]?.toString(),
                md5: proto[1][1][1][2]?.toString(),
                height: proto[1][1][1][7],
                width: proto[1][1][1][6],
                size: proto[1][1][1][1],
                summary: proto[2][1]?.[2]?.toString()
            }
            if (type === "image") elem.asface = proto[2][1]?.[1] === 1
            elem.file = buildImageFileParam(elem.md5 as string, elem.size, elem.width, elem.height, proto[1][1][1][5][2])
            return elem
        } else {
            elem = {
                type,
                file: proto[1][1][1][4]?.toString(),
                url: `https://${proto[1][2][3]}${proto[1][2][1]}`,
                fid: proto[1][1][2]?.toString(),
                md5: proto[1][1][1][2]?.toString(),
                height: proto[1][1][1][7],
                width: proto[1][1][1][6],
                size: proto[1][1][1][1],
                summary: proto[2][1]?.[2]?.toString()
            }
            if (type === "image") elem.asface = proto[2][1]?.[1] === 1
            elem.file = buildImageFileParam(elem.md5 as string, elem.size, elem.width, elem.height, proto[1][1][1][5][2])
            this.imgprefix[elem.md5 as string] = elem
        }
    }

    private parseImgElem(source_type: number, proto: pb.Proto, type: "flash" | "image") {
        let elem: T.ImageElem | T.FlashElem
        let dm = type === 'flash' ? (proto[1] ? true : false) : (source_type === 8 ? false : true);
        let md5 = proto[dm ? 7 : 13].toHex()
        let path = proto[dm ? 29 : 34]?.[30]
        if (this.imgprefix[md5] && path) {
            elem = {
                ...this.imgprefix[md5],
                type,
                url: `${new URL(this.imgprefix[md5].url).origin}${path}&spec=0`
            }
        } else {
            elem = {
                type,
                file: '',
                url: '',
                md5: md5,
                height: proto[dm ? 8 : 23],
                width: proto[dm ? 9 : 22],
                size: proto[dm ? 2 : 25],
                summary: proto[dm ? 29 : 34]?.[dm ? 8 : 9]?.toString()
            }
            elem.file = buildImageFileParam(elem.md5 as string, elem.size, elem.width, elem.height, proto[dm ? 5 : 20])
        }
        if (type === "image") elem.asface = proto[dm ? 29 : 34]?.[1] === 1
        if (!elem.url) {
            if (path) {
                elem.url = `https://c2cpicdw.qpic.cn${path}&spec=0`
            } else if (proto[16]) {
                elem.url = `https://gchat.qpic.cn${proto[16]}`
            } else if (proto[15]) {
                elem.url = `https://c2cpicdw.qpic.cn${proto[15]}`
            } else {
                elem.url = getGroupImageUrl(md5)
            }
        }
        return elem
    }
}

export function getGroupImageUrl(md5: string) {
    return `https://gchat.qpic.cn/gchatpic_new/0/0-0-${md5.toUpperCase()}/0`
}
