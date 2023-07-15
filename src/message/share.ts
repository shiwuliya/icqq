import { Encodable } from "../core/protobuf/index";

/** 所有可选参数，默认为QQ浏览器 */
export interface ShareConfig {
    appid?: number,
    // style?: number,
    appname?: string,
    /** app签名hash */
    appsign?: string,
}

/** 分享链接 */
export interface ShareContent {
    /** 跳转链接, 没有则发不出 */
    url: string
    /** 链接标题 */
    title: string,
    /** 从消息列表中看到的文字，默认为 `"[分享]"+title` */
    content?: string,
    /** 预览图网址, 默认为QQ浏览器图标，似乎对域名有限制 */
    image?: string,
    summary?: string
    audio?: string
}

enum app {
    qq = 100446242,
    mi = 1105414497,
    quark = 1105781586
}


const defaultConfig: Required<ShareConfig> = {
    appid: app.qq,
    /** 有音乐4 没音乐0 */
    // style: 4,
    appname: 'com.tencent.mtt',
    appsign: 'd8391a394d4a179e6fe7bdb8a301258b',
}
/**
 * 构造频道链接分享
 * @param channel_id 子频道id
 * @param guild_id 频道id
 * @param content 分享链接
 * @param config 分享配置
 */
export function buildShare(channel_id: string, guild_id: string, content: ShareContent, config?: ShareConfig): Encodable
/**
 * 构造链接分享
 * @param target 群号或者好友账号
 * @param bu 类型表示：`0`为好友，`1`为群
 * @param content 分享链接
 * @param config 分享配置
 */
export function buildShare(target: number, bu: 0 | 1, content: ShareContent, config?: ShareConfig): Encodable
export function buildShare(target: number | string, bu: string | 0 | 1, content: ShareContent, config: ShareConfig = {}) {
    config = { ...defaultConfig, ...config }
    return {
        1: config.appid,
        2: 1,
        3: content.audio ? 4 : 0,
        5: {
            1: 1,
            2: "0.0.0",
            3: config.appname,
            4: config.appsign
        },
        10: typeof bu === 'string' ? 3 : bu,
        11: target,
        12: {
            10: content.title,
            11: content.summary,
            12: content.content,
            13: content.url,
            14: content.image /* ?? 'https://tangram-1251316161.file.myqcloud.com/files/20210721/e50a8e37e08f29bf1ffc7466e1950690.png' */,
            16: content.audio,
        },
        19: typeof bu === 'string' ? Number(bu) : undefined
    }
}