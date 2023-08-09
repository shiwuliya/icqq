import * as fs from "fs"
import * as path from "path"
import * as log4js from "log4js"
import { ApiRejection, BaseClient, Domain, generateShortDevice, pb, Platform, ShortDevice } from "./core"
import { Gender, hide, lock, md5, NOOP, OnlineStatus, timestamp } from "./common"
import {
    addClass,
    bindInternalListeners,
    delClass,
    delStamp, getPersonalSign,
    getStamp,
    getSysMsg,
    imageOcr,
    loadBL,
    loadFL,
    loadGL,
    loadGPL,
    loadSL,
    parseFriendRequestFlag,
    parseGroupRequestFlag,
    renameClass,
    setAvatar,
    setPersonalSign,
    setStatus
} from "./internal"
import { FriendInfo, GroupInfo, MemberInfo, StrangerInfo } from "./entities"
import { EventMap, GroupInviteEvent, GroupMessageEvent, PrivateMessageEvent } from "./events"
import { Friend, User } from "./friend"
import { Discuss, Group } from "./group"
import { Member } from "./member"
import { Forwardable, Image, ImageElem, parseDmMessageId, parseGroupMessageId, Quotable, Sendable, } from "./message"
import { Listener, Matcher, ToDispose } from "triptrap";
import { Guild } from "./guild";
import { ErrorCode } from "./errors";
import {Configuration} from "log4js";

const pkg = require("../package.json")

/** 事件接口 */
export interface Client extends BaseClient {
    on<T extends keyof EventMap>(event: T, listener: EventMap[T]): ToDispose<this>

    on<S extends Matcher>(event: S & Exclude<S, keyof EventMap>, listener: Listener): ToDispose<this>

    trap<T extends keyof EventMap>(event: T, listener: EventMap[T]): ToDispose<this>

    trap<S extends Matcher>(event: S & Exclude<S, keyof EventMap>, listener: Listener): ToDispose<this>

    trip<E extends keyof EventMap>(event: E, ...args: Parameters<EventMap[E]>): boolean

    trip<S extends string | symbol>(event: S & Exclude<S, keyof EventMap>, ...args: any[]): boolean

    trapOnce<T extends keyof EventMap>(event: T, listener: EventMap[T]): ToDispose<this>

    trapOnce<S extends Matcher>(event: S & Exclude<S, keyof EventMap>, listener: Listener): ToDispose<this>

    off<T extends keyof EventMap>(event: T): void

    off<S extends Matcher>(event: S & Exclude<S, keyof EventMap>): void
}

/** 一个客户端 */
export class Client extends BaseClient {
    /**
     * 得到一个群对象, 通常不会重复创建、调用
     * @param gid 群号
     * @param strict 严格模式，若群不存在会抛出异常
     * @returns 一个`Group`对象
     */
    readonly pickGroup = Group.as.bind(this)
    /**
     * 得到一个好友对象, 通常不会重复创建、调用
     * @param uid 好友账号
     * @param strict 严格模式，若好友不存在会抛出异常
     * @returns 一个`Friend`对象
     */
    readonly pickFriend = Friend.as.bind(this)
    /**
     * 得到一个群员对象, 通常不会重复创建、调用
     * @param gid 群员所在的群号
     * @param uid 群员的账号
     * @param strict 严格模式，若群员不存在会抛出异常
     * @returns 一个`Member`对象
     */
    readonly pickMember = Member.as.bind(this)
    /**
     * 创建一个用户对象
     * @param uid 用户的账号
     * @returns 一个`User`对象
     */
    readonly pickUser = User.as.bind(this)
    /**
     * 创建一个讨论组对象
     * @param gid 讨论组号
     * @returns 一个`Discuss`对象
     */
    readonly pickDiscuss = Discuss.as.bind(this)
    /**
     * 创建一个频道对象，通常不会重复创建、调用
     * @param guild_id 频道号
     * @returns 一个`Guild`对象
     */
    readonly pickGuild = Guild.as.bind(this)

    /** 日志记录器，初始情况下是`log4js.Logger` */
    public logger: Logger | log4js.Logger;
    /** 账号本地数据存储目录 */
    readonly dir: string
    /** 配置 */
    readonly config: Required<Config>

    protected readonly _cache = new Map<number, Set<string>>()
    protected _sync_cookie?: Uint8Array

    /** 密码的md5值，调用 {@link login} 后会保存在这里，用于`token`过期时恢复登录 */
    password_md5?: Buffer

    get [Symbol.toStringTag]() {
        return "OicqClient"
    }

    /** 好友列表 */
    readonly fl = new Map<number, FriendInfo>()
    /** 陌生人列表 */
    readonly sl = new Map<number, StrangerInfo>()
    /** 群列表 */
    readonly gl = new Map<number, GroupInfo>()
    /** 群员列表缓存 */
    readonly gml = new Map<number, Map<number, MemberInfo>>()
    /** 我加入的频道列表 */
    readonly guilds = new Map<string, Guild>()
    /** 黑名单列表 */
    readonly blacklist = new Set<number>()
    /** 好友分组 */
    readonly classes = new Map<number, string>()

    /** 勿手动修改这些属性 */
    /** 在线状态 */
    status: OnlineStatus = OnlineStatus.Offline
    /** 昵称 */
    nickname = ""
    /** 性别 */
    sex: Gender = "unknown"
    /** 年龄 */
    age = 0
    /** @todo 未知属性 */
    bid = ""
    /** 漫游表情缓存 */
    stamp = new Set<string>()
    /** 相当于频道中的qq号 */
    tiny_id = ""

    /** csrf token */
    get bkn() {
        let bkn = 5381
        for (let v of this.sig.skey)
            bkn = bkn + (bkn << 5) + v
        bkn &= 2147483647
        return bkn
    }

    /** @todo 未知属性 */
    readonly cookies: { [domain in Domain]: string } = new Proxy(this.pskey, {
        get: (obj: any, domain: string) => {
            const cookie = `uin=o${this.uin}; skey=${this.sig.skey};`
            if (!obj[domain])
                return cookie
            return `${cookie} p_uin=o${this.uin}; p_skey=${obj[domain]};`
        },
        set: () => {
            return false
        }
    })

    /** 数据统计 */
    get stat() {
        this.statistics.msg_cnt_per_min = this._calcMsgCntPerMin()
        return this.statistics
    }

    /** 修改日志级别 */
    set log_level(level: LogLevel) {
        this.logger.level = level
        this.config.log_level = level
    }

    /**
     * 继承原版`oicq`的构造方式，建议使用另一个构造函数
     * @param uin 账号
     * @param conf 配置
     */
    constructor(uin: number, conf?: Config)
    /**
     * 账号在调用 {@link login} 时传入
     * @param conf 配置
     */
    constructor(conf?: Config)
    constructor(uin?: number | Config, conf?: Config) {
        if (typeof uin !== "number") conf = uin
        const config = {
            log_level: "info" as LogLevel,
            platform: Platform.Android,
            auto_server: false,
            ignore_self: true,
            resend: true,
            cache_group_member: true,
            reconn_interval: 5,
            data_dir: path.join(require?.main?.path || process.cwd(), "data"),
            ...conf,
        }
        const dir = path.resolve(config.data_dir)
        createDataDir(dir)
        const file = path.join(dir, `device.json`)
        let device: ShortDevice, isNew: boolean = false
        try {
            // device = require(file) as ShortDevice
            const rawFile = fs.readFileSync(file)
            device = JSON.parse(rawFile.toString()) as ShortDevice
            if (typeof (device?.display) === 'undefined') throw new Error()
        } catch {
            device = generateShortDevice()
            isNew = true
            fs.writeFileSync(file, JSON.stringify(device, null, 2))
        }
        super(config.platform, device,config as Required<Config>);
        this.logger = log4js.getLogger('[icqq]');
        if (!config.sign_api_addr) {
            this.logger.warn(`未配置签名API地址，登录/消息发送可能失败`)
        }
        this.setSignServer(config.sign_api_addr);
        if (typeof uin === "number") this.uin = uin
        this.device.mtime = Math.floor(fs.statSync(file).mtimeMs || Date.now())
        this.logger.level = config.log_level
        if (isNew)
            this.logger.mark("创建了新的设备文件：" + file)
        this.logger.mark("----------")
        this.logger.mark(`Package Version: icqq@${pkg.version} (Released on ${pkg.upday})`)
        this.logger.mark("View Changelogs：https://github.com/icqqjs/icqq/releases")
        this.logger.mark("----------")

        this.dir = dir
        this.config = config as Required<Config>
        bindInternalListeners.call(this)
        this.on("internal.verbose", (verbose, level, c) => {
            const list: Exclude<LogLevel, "off">[] = ["fatal", "mark", "error", "warn", "info", "debug", "trace"]
            this.logger[list[level]](verbose)
        })
        lock(this, "dir")
        lock(this, "config")
        lock(this, "_cache")
        lock(this, "internal")
        lock(this, "pickUser")
        lock(this, "pickFriend")
        lock(this, "pickGroup")
        lock(this, "pickDiscuss")
        lock(this, "pickMember")
        lock(this, "cookies")
        lock(this, "fl")
        lock(this, "gl")
        lock(this, "sl")
        lock(this, "gml")
        lock(this, "blacklist")
        hide(this, "_sync_cookie")

        let n = 0
        this.heartbeat = () => {
            this._calcMsgCntPerMin()
            n++
            if (n > 10) {
                n = 0
                this.setOnlineStatus().catch(NOOP)
            }
        }

        if (!this.config.auto_server)
            this.setRemoteServer("msfwifi.3g.qq.com", 8080)
    }

    /**
     * 只能在初始化Client时传了`uin`或扫码登录，才能调用
     * * 传了`password`则尝试密码登录
     * * 不传`password`则尝试扫码登录
     * 未传任何参数 则尝试扫码登录
     * 掉线重连时也是自动调用此函数，走相同逻辑
     * 你也可以在配置中修改`reconn_interval`，关闭掉线重连并自行处理
     * @param password 可以为密码原文，或密码的md5值
     */
    async login(password?: string | Buffer): Promise<void>
    /**
     * 传了`uin`，未传`password`
     * 会优先尝试使用token登录 (token在上次登录成功后存放在`this.dir`的`${uin}_token`中)
     * 传了`uin`无token或token失效时：
     * * 传了`password`则尝试密码登录
     * * 不传`password`则尝试扫码登录
     * 未传任何参数 则尝试扫码登录
     * 掉线重连时也是自动调用此函数，走相同逻辑
     * 你也可以在配置中修改`reconn_interval`，关闭掉线重连并自行处理
     * @param uin 登录账号
     * @param password 可以为密码原文，或密码的md5值
     */
    async login(uin?: number, password?: string | Buffer): Promise<void>
    async login(uin?: number | string | Buffer, password?: string | Buffer) {
        // let [uin, password] = args
        if (typeof uin !== "number") {
            password = uin
            uin = this.uin
        }
        if (password && password.length > 0) {
            let md5pass
            if (typeof password === "string")
                md5pass = Buffer.from(password, "hex")
            else
                md5pass = password
            if (md5pass.length !== 16)
                md5pass = md5(String(password))
            this.password_md5 = md5pass
        }
        let apk_info = this.apk.display == 'Android_8.8.88' ? this.apk.display : `${this.apk.display}_${this.apk.version}`
        this.logger.info(`[${uin}]使用协议：${apk_info}`)
        try {
            if (!uin) throw new Error()
            this.uin = uin
            const token_path = path.join(this.dir, this.uin + '_token')
            if (!fs.existsSync(token_path) && fs.existsSync(token_path + '_bak')) {
                fs.renameSync(token_path + '_bak', token_path)
            }
            const token = await fs.promises.readFile(token_path)
            return this.tokenLogin(token)
        } catch (e) {
            if (this.password_md5 && uin) {
                if (this.apk.display === "Watch") {
                    this.logger.warn("手表协议不支持密码登入，将使用扫码登入")
                    return this.sig.qrsig.length ? this.qrcodeLogin() : this.fetchQrcode()
                }
                return this.passwordLogin(uin as number, this.password_md5)
            } else {
                if (this.apk.device_type === -1) {
                    return this.logger.error("当前协议不支持扫码登入，请配置密码重新登入")
                }
                return this.sig.qrsig.length ? this.qrcodeLogin() : this.fetchQrcode()
            }
        }
    }

    /** 设置在线状态 */
    setOnlineStatus(status = this.status || OnlineStatus.Online) {
        return setStatus.call(this, status)
    }

    /** 设置昵称 */
    async setNickname(nickname: string) {
        return this._setProfile(0x14E22, Buffer.from(String(nickname)))
    }

    /**
     * 设置性别
     * @param gender 0：未知，1：男，2：女
     */
    async setGender(gender: 0 | 1 | 2) {
        return this._setProfile(0x14E29, Buffer.from([gender]))
    }

    /**
     * 设置生日
     * @param birthday `YYYYMMDD`格式的`string`（会过滤非数字字符）或`number`
     * */
    async setBirthday(birthday: string | number) {
        const birth = String(birthday).replace(/[^\d]/g, "")
        const buf = Buffer.allocUnsafe(4)
        buf.writeUInt16BE(Number(birth.substring(0, 4)))
        buf[2] = Number(birth.substring(4, 2))
        buf[3] = Number(birth.substring(6, 2))
        return this._setProfile(0x16593, buf)
    }

    /** 设置个人说明 */
    async setDescription(description = "") {
        return this._setProfile(0x14E33, Buffer.from(String(description)))
    }

    /** 设置个性签名 */
    async setSignature(signature = "") {
        return setPersonalSign.call(this, signature)
    }

    /** 获取个性签名 */
    async getSignature() {
        return getPersonalSign.call(this)
    }

    /** 设置头像 */
    async setAvatar(file: ImageElem["file"]) {
        return setAvatar.call(this, new Image({ type: "image", file }))
    }

    /** 获取漫游表情 */
    getRoamingStamp(no_cache = false) {
        return getStamp.call(this, no_cache)
    }

    /** 删除表情(支持批量) */
    deleteStamp(id: string | string[]) {
        return delStamp.call(this, id)
    }

    /** 获取系统消息 */
    getSystemMsg() {
        return getSysMsg.call(this)
    }

    /** 添加好友分组 */
    addClass(name: string) {
        return addClass.call(this, name)
    }

    /** 删除好友分组 */
    deleteClass(id: number) {
        return delClass.call(this, id)
    }

    /** 重命名好友分组 */
    renameClass(id: number, name: string) {
        return renameClass.call(this, id, name)
    }

    /** 重载好友列表 */
    reloadFriendList() {
        return loadFL.call(this)
    }

    /** 重载陌生人列表 */
    reloadStrangerList() {
        return loadSL.call(this)
    }

    /** 重新加载频道列表 */
    reloadGuilds(): Promise<void> {
        return loadGPL.call(this)
    }

    /** 重载群列表 */
    reloadGroupList() {
        return loadGL.call(this)
    }

    /** 重载黑名单 */
    reloadBlackList() {
        return loadBL.call(this)
    }

    /** 清空缓存文件 fs.rm need v14.14 */
    cleanCache() {
        const dir = path.join(this.dir, "image")
        fs.rm?.(dir, { recursive: true }, () => {
            fs.mkdir(dir, NOOP)
        })
    }

    /**
     * 获取视频下载地址
     * use {@link Friend.getVideoUrl}
     */
    getVideoUrl(fid: string, md5: string | Buffer) {
        return this.pickFriend(this.uin).getVideoUrl(fid, md5)
    }

    /**
     * 获取转发消息
     * use {@link Friend.getForwardMsg}
     */
    getForwardMsg(resid: string, fileName?: string) {
        return this.pickFriend(this.uin).getForwardMsg(resid, fileName)
    }

    /**
     * 制作转发消息
     * use {@link Friend.makeForwardMsg} or {@link Group.makeForwardMsg}
     */
    makeForwardMsg(fake: Forwardable[], dm = false) {
        return (dm ? this.pickFriend : this.pickGroup)(this.uin).makeForwardMsg(fake)
    }

    /** Ocr图片转文字 */
    imageOcr(file: ImageElem["file"]) {
        return imageOcr.call(this, new Image({ type: "image", file }))
    }

    /** @cqhttp (cqhttp遗留方法) use {@link cookies[domain]} */
    getCookies(domain: Domain = "") {
        return this.cookies[domain]
    }

    /** @cqhttp use {@link bkn} */
    getCsrfToken() {
        return this.bkn
    }

    /** @cqhttp use {@link fl} */
    getFriendList() {
        return this.fl
    }

    /** @cqhttp use {@link gl} */
    getGroupList() {
        return this.gl
    }

    /** @cqhttp use {@link guilds} */
    getGuildList() {
        return [...this.guilds.values()].map(guild => {
            return {
                guild_id: guild.guild_id,
                guild_name: guild.guild_name
            }
        })
    }

    /**
     * 添加群精华消息
     * use {@link Group.addEssence}
     * @param message_id 消息id
     */
    async setEssenceMessage(message_id: string) {
        if (message_id.length <= 24) throw new ApiRejection(ErrorCode.MessageBuilderError, '只能加精群消息')
        const { group_id, seq, rand } = parseGroupMessageId(message_id)
        return this.pickGroup(group_id).addEssence(seq, rand)
    }

    /**
     * 移除群精华消息
     * use {@link Group.removeEssence}
     * @param message_id 消息id
     */
    async removeEssenceMessage(message_id: string) {
        if (message_id.length <= 24) throw new ApiRejection(ErrorCode.MessageBuilderError, '消息id无效')
        const { group_id, seq, rand } = parseGroupMessageId(message_id)
        return this.pickGroup(group_id).removeEssence(seq, rand)
    }

    /**
     * 获取子频道列表
     * use {@link Guild.channels}
     */
    getChannelList(guild_id: string) {
        const guild = this.guilds.get(guild_id)
        if (!guild) return []
        return [...guild.channels.values()].map(channel => {
            return {
                guild_id,
                channel_id: channel.channel_id,
                channel_name: channel.channel_name,
                channel_type: channel.channel_type
            }
        })
    }

    /**
     * 获取频道成员列表
     * use {@link Guild.getMemberList}
     */
    getGuildMemberList(guild_id: string) {
        const guild = this.guilds.get(guild_id)
        if (!guild) return []
        return guild.getMemberList()
    }

    /** @cqhttp use {@link sl} */
    getStrangerList() {
        return this.sl
    }

    /** @cqhttp use {@link User.getSimpleInfo} */
    async getStrangerInfo(user_id: number) {
        return this.pickUser(user_id).getSimpleInfo()
    }

    /** @cqhttp use {@link Group.info} or {@link Group.renew} */
    async getGroupInfo(group_id: number, no_cache = false) {
        const group = this.pickGroup(group_id)
        if (no_cache) return group.renew()
        return group.info || group.renew()
    }

    /** @cqhttp use {@link Group.getMemberMap} */
    async getGroupMemberList(group_id: number, no_cache = false) {
        return this.pickGroup(group_id).getMemberMap(no_cache)
    }

    /** @cqhttp use {@link Member.info} or {@link Member.renew} */
    async getGroupMemberInfo(group_id: number, user_id: number, no_cache = false) {
        if (no_cache || !this.gml.get(group_id)?.has(user_id))
            return this.pickMember(group_id, user_id).renew()
        return this.gml.get(group_id)?.get(user_id)!
    }

    /** @cqhttp use {@link Friend.sendMsg} */
    async sendPrivateMsg(user_id: number, message: Sendable, source?: Quotable) {
        return this.pickFriend(user_id).sendMsg(message, source)
    }

    /** @cqhttp use {@link Guild.sendMsg} */
    async sendGuildMsg(guild_id: string, channel_id: string, message: Sendable) {
        return this.pickGuild(guild_id).sendMsg(channel_id, message)
    }

    /** @cqhttp use {@link Group.sendMsg} */
    async sendGroupMsg(group_id: number, message: Sendable, source?: Quotable) {
        return this.pickGroup(group_id).sendMsg(message, source)
    }

    /** @cqhttp use {@link Group.sign} */
    async sendGroupSign(group_id: number) {
        return this.pickGroup(group_id).sign()
    }

    /** @cqhttp use {@link Discuss.sendMsg} */
    async sendDiscussMsg(discuss_id: number, message: Sendable, source?: Quotable) {
        return this.pickDiscuss(discuss_id).sendMsg(message)
    }

    /** @cqhttp use {@link Member.sendMsg} */
    async sendTempMsg(group_id: number, user_id: number, message: Sendable) {
        return this.pickMember(group_id, user_id).sendMsg(message)
    }

    /** @cqhttp use {@link User.recallMsg} or {@link Group.recallMsg} */
    async deleteMsg(message_id: string) {
        if (message_id.length > 24) {
            const { group_id, seq, rand, pktnum } = parseGroupMessageId(message_id)
            return this.pickGroup(group_id).recallMsg(seq, rand, pktnum)
        } else {
            const { user_id, seq, rand, time } = parseDmMessageId(message_id)
            return this.pickUser(user_id).recallMsg(seq, rand, time)
        }
    }

    /** @cqhttp use {@link User.markRead} or {@link Group.markRead} */
    async reportReaded(message_id: string) {
        if (message_id.length > 24) {
            const { group_id, seq } = parseGroupMessageId(message_id)
            return this.pickGroup(group_id).markRead(seq)
        } else {
            const { user_id, time } = parseDmMessageId(message_id)
            return this.pickUser(user_id).markRead(time)
        }
    }

    /** @cqhttp use {@link User.getChatHistory} or {@link Group.getChatHistory} */
    async getMsg(message_id: string) {
        return (await this.getChatHistory(message_id, 1)).pop()
    }

    /** @cqhttp use {@link User.getChatHistory} or {@link Group.getChatHistory} */
    async getChatHistory(message_id: string, count = 20) {
        if (message_id.length > 24) {
            const { group_id, seq } = parseGroupMessageId(message_id)
            return this.pickGroup(group_id).getChatHistory(seq, count)
        } else {
            const { user_id, time } = parseDmMessageId(message_id)
            return this.pickUser(user_id).getChatHistory(time, count)
        }
    }

    /** @cqhttp use {@link Group.muteAnony} */
    async setGroupAnonymousBan(group_id: number, flag: string, duration = 1800) {
        return this.pickGroup(group_id).muteAnony(flag, duration)
    }

    /** @cqhttp use {@link Group.allowAnony} */
    async setGroupAnonymous(group_id: number, enable = true) {
        return this.pickGroup(group_id).allowAnony(enable)
    }

    /** @cqhttp use {@link Group.muteAll} */
    async setGroupWholeBan(group_id: number, enable = true) {
        return this.pickGroup(group_id).muteAll(enable)
    }

    /**
     * 设置当前群成员消息屏蔽状态
     * @param group_id {number} 群号
     * @param member_id {number} 成员QQ号
     * @param isScreen {boolean} 是否屏蔽 默认true
     */
    async setGroupMemberScreenMsg(group_id:number,member_id:number,isScreen?:boolean){
        return this.pickGroup(group_id).setScreenMemberMsg(member_id,isScreen)
    }

    /** @cqhttp use {@link Group.setName} */
    async setGroupName(group_id: number, name: string) {
        return this.pickGroup(group_id).setName(name)
    }

    /** @cqhttp use {@link Group.announce} */
    async sendGroupNotice(group_id: number, content: string) {
        return this.pickGroup(group_id).announce(content)
    }

    /** @cqhttp use {@link Group.setAdmin} or {@link Member.setAdmin} */
    async setGroupAdmin(group_id: number, user_id: number, enable = true) {
        return this.pickMember(group_id, user_id).setAdmin(enable)
    }

    /** @cqhttp use {@link Group.setTitle} or {@link Member.setTitle} */
    async setGroupSpecialTitle(group_id: number, user_id: number, special_title: string, duration = -1) {
        return this.pickMember(group_id, user_id).setTitle(special_title, duration)
    }

    /** @cqhttp use {@link Group.setCard} or {@link Member.setCard} */
    async setGroupCard(group_id: number, user_id: number, card: string) {
        return this.pickMember(group_id, user_id).setCard(card)
    }

    /** @cqhttp use {@link Group.kickMember} or {@link Member.kick} */
    async setGroupKick(group_id: number, user_id: number, reject_add_request = false, message?: string) {
        return this.pickMember(group_id, user_id).kick(message, reject_add_request)
    }

    /** @cqhttp use {@link Group.muteMember} or {@link Member.mute} */
    async setGroupBan(group_id: number, user_id: number, duration = 1800) {
        return this.pickMember(group_id, user_id).mute(duration)
    }

    /** @cqhttp use {@link Group.quit} */
    async setGroupLeave(group_id: number) {
        return this.pickGroup(group_id).quit()
    }

    /** @cqhttp use {@link Group.pokeMember} or {@link Member.poke} */
    async sendGroupPoke(group_id: number, user_id: number) {
        return this.pickMember(group_id, user_id).poke()
    }

    /** @cqhttp use {@link Member.addFriend} */
    async addFriend(group_id: number, user_id: number, comment = "") {
        return this.pickMember(group_id, user_id).addFriend(comment)
    }

    /** @cqhttp use {@link Friend.delete} */
    async deleteFriend(user_id: number, block = true) {
        return this.pickFriend(user_id).delete(block)
    }

    /** @cqhttp use {@link Group.invite} */
    async inviteFriend(group_id: number, user_id: number) {
        return this.pickGroup(group_id).invite(user_id)
    }

    /** @cqhttp use {@link Friend.thumbUp} */
    async sendLike(user_id: number, times = 1) {
        return this.pickFriend(user_id).thumbUp(times)
    }

    /** @cqhttp use {@link setAvatar} */
    async setPortrait(file: Parameters<Client["setAvatar"]>[0]) {
        return this.setAvatar(file)
    }

    /** @cqhttp use {@link Group.setAvatar} */
    async setGroupPortrait(group_id: number, file: Parameters<Group["setAvatar"]>[0]) {
        return this.pickGroup(group_id).setAvatar(file)
    }

    /** @cqhttp use {@link Group.fs} */
    acquireGfs(group_id: number) {
        return this.pickGroup(group_id).fs
    }

    /** @cqhttp use {@link User.setFriendReq} or {@link User.addFriendBack} */
    async setFriendAddRequest(flag: string, approve = true, remark = "", block = false) {
        const { user_id, seq, single } = parseFriendRequestFlag(flag)
        const user = this.pickUser(user_id)
        return single ? user.addFriendBack(seq, remark) : user.setFriendReq(seq, approve, remark, block)
    }

    /** @cqhttp use {@link User.setGroupInvite} or {@link User.setGroupReq} */
    async setGroupAddRequest(flag: string, approve = true, reason = "", block = false) {
        const { group_id, user_id, seq, invite } = parseGroupRequestFlag(flag)
        const user = this.pickUser(user_id)
        return invite ? user.setGroupInvite(group_id, seq, approve, block) : user.setGroupReq(group_id, seq, approve, reason, block)
    }

    /**
     * 监听群邀请/消息事件
     * @param group_ids 监听群的群号
     * @returns 事件处理
     */
    group(...group_ids: number[]) {
        return (listener: (event: GroupInviteEvent | GroupMessageEvent) => void) => {
            return this.trap((eventName, event) => {
                return group_ids.includes(event.group_id)
            }, listener)
        }
    }

    /**
     * 监听用户私聊/群聊事件
     * @param user_ids 监听的用户账号
     * @returns 事件处理
     */
    user(...user_ids: number[]) {
        return (listener: (event: PrivateMessageEvent | GroupMessageEvent) => void) => {
            return this.trap((eventName, event) => {
                return user_ids.includes(event.user_id)
            }, listener)
        }
    }

    /** emit an event */
    em(name = "", data?: any) {
        data = Object.defineProperty(data || {}, "self_id", {
            value: this.uin,
            writable: true,
            enumerable: true,
            configurable: true,
        })
        while (true) {
            this.emit(name, data)
            let i = name.lastIndexOf(".")
            if (i === -1)
                break
            name = name.slice(0, i)
        }
    }

    protected _msgExists(from: number, type: number, seq: number, time: number) {
        if (timestamp() + this.sig.time_diff - time >= 60 || time < this.stat.start_time)
            return true
        const id = [from, type, seq].join("-")
        const set = this._cache.get(time)
        if (!set) {
            this._cache.set(time, new Set([id]))
            return false
        } else {
            if (set.has(id))
                return true
            else
                set.add(id)
            return false
        }
    }

    protected _calcMsgCntPerMin() {
        let cnt = 0
        for (let [time, set] of this._cache) {
            if (timestamp() - time >= 60)
                this._cache.delete(time)
            else
                cnt += set.size
        }
        return cnt
    }

    private async _setProfile(k: number, v: Buffer) {
        const buf = Buffer.allocUnsafe(11 + v.length)
        buf.writeUInt32BE(this.uin)
        buf.writeUInt8(0, 4)
        buf.writeInt32BE(k, 5)
        buf.writeUInt16BE(v.length, 9)
        buf.fill(v, 11)
        const payload = await this.sendOidb("OidbSvc.0x4ff_9", buf)
        const obj = pb.decode(payload)
        return obj[3] === 0 || obj[3] === 34
    }

    /** @deprecated use {@link submitSlider} */
    sliderLogin(ticket: string) {
        return this.submitSlider(ticket)
    }

    /** @deprecated use {@link sendSmsCode} */
    sendSMSCode() {
        return this.sendSmsCode()
    }

    /** @deprecated use {@link submitSmsCode} */
    submitSMSCode(code: string) {
        return this.submitSmsCode(code)
    }

    /** @deprecated use {@link status} */
    get online_status() {
        return this.status
    }
}

/** 日志等级 */
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "mark" | "off"
export type LogLevelMap = { [key in LogLevel]: number }
export type LoggerFn={
    [key in LogLevel]: (...args: any[]) => any
}
export interface Logger extends LoggerFn{
    level?: LogLevel
}
/** 配置项 */
export interface Config {
    /**
     * 日志等级，默认`info`
     * 打印日志会降低性能，若消息量巨大建议修改此参数
     */
    log_level?: LogLevel
    /** 登录设备，默认为安卓手机 */
    platform?: Platform
    /** 使用版本，仅在对应platform中有多个版本是有效，不填则使用最新版本 */
    ver?: string
    /** log4js配置 */
    log_config?: Configuration| string
    /** 群聊和频道中过滤自己的消息，默认`true` */
    ignore_self?: boolean
    /** 被风控时是否尝试用分片发送，默认`true` */
    resend?: boolean
    /** 数据存储文件夹，需要可写权限，默认主模块下的data文件夹 */
    data_dir?: string
    /**
     * 触发`system.offline.network`事件后的重新登录间隔秒数，默认5(秒)，不建议设置过低
     * 设置为0则不会自动重连，然后你可以监听此事件自己处理
     */
    reconn_interval?: number
    /**
     * 签名服务器地址，未配置可能会导致登录失败和无法收发消息
     */
    sign_api_addr?: string
    /** 是否缓存群员列表(默认true)，群多的时候(500~1000)会多占据约100MB+内存，关闭后进程只需不到20MB内存 */
    cache_group_member?: boolean
    /** 自动选择最优服务器(默认true)，关闭后会一直使用`msfwifi.3g.qq.com:8080`进行连接 */
    auto_server?: boolean
    /** ffmpeg */
    ffmpeg_path?: string
    ffprobe_path?: string
}

/** 数据统计 */
export type Statistics = Client["stat"]

function createDataDir(dir: string) {
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { mode: 0o755, recursive: true })
    const img_path = path.join(dir, "image")
    if (!fs.existsSync(img_path))
        fs.mkdirSync(img_path)
}

/** 创建一个客户端 (=new Client) */
export function createClient(config?: Config) {
    return new Client(config)
}
