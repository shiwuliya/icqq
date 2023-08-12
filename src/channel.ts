import { randomBytes } from "crypto";
import { GuildMessageRet } from "./internal";
import { Guild } from "./guild";
import { ApiRejection, pb } from "./core"
import { lock } from "./core/constants";
import { buildMusic, Converter, MusicPlatform, Sendable } from "./message";
import { buildShare, ShareConfig, ShareContent } from "./message/share";

/** 通知类型 */
export enum NotifyType {
    /** 未知类型 */
    Unknown = 0,
    /** 所有消息 */
    AllMessages = 1,
    /** 不通知 */
    Nothing = 2,
}

/** 子频道类型 */
export enum ChannelType {
    /** 未知类型 */
    Unknown = 0,
    /** 文字频道 */
    Text = 1,
    /** 语音频道 */
    Voice = 2,
    /** 直播频道 */
    Live = 5,
    /** @todo 未知类型 */
    App = 6,
    /** 论坛频道 */
    Forum = 7,
}

/** 子频道 */
export class Channel {
    /** 子频道名 */
    channel_name = ""
    /** 频道类型 */
    channel_type = ChannelType.Unknown
    /** 通知类型 */
    notify_type = NotifyType.Unknown

    constructor(public readonly guild: Guild, public readonly channel_id: string) {
        lock(this, "guild")
        lock(this, "channel_id")
    }
    get c() {
        return this.guild.c
    }
    _renew(channel_name: string, notify_type: NotifyType, channel_type: ChannelType) {
        this.channel_name = channel_name
        this.notify_type = notify_type
        this.channel_type = channel_type
    }

    /** 发送网址分享 */
    async shareUrl(content: ShareContent, config?: ShareConfig) {
        const body = buildShare(this.channel_id, this.guild.guild_id, content, config)
        await this.c.sendOidb("OidbSvc.0xb77_9", pb.encode(body))
    }

    /** 发送音乐分享 */
    async shareMusic(platform: MusicPlatform, id: string) {
        const body = await buildMusic(this.channel_id, this.guild.guild_id, platform, id)
        await this.c.sendOidb("OidbSvc.0xb77_9", pb.encode(body))
    }

    /**
     * 发送频道消息
     * 暂时仅支持发送： 文本、AT、表情
     */
    async sendMsg(content: Sendable): Promise<GuildMessageRet> {
        const { rich, brief } = new Converter(content)
        const payload = await this.c.sendUni("MsgProxy.SendMsg", pb.encode({
            1: {
                1: {
                    1: {
                        1: BigInt(this.guild.guild_id),
                        2: Number(this.channel_id),
                        3: this.c.uin
                    },
                    2: {
                        1: 3840,
                        3: randomBytes(4).readUInt32BE()
                    }
                },
                3: {
                    1: rich
                }
            }
        }))
        const rsp = pb.decode(payload)
        if (rsp[1])
            throw new ApiRejection(rsp[1], rsp[2])
        this.c.logger.info(`succeed to send: [Guild(${this.guild.guild_name}),Channel(${this.channel_name})] ` + brief)
        this.c.stat.sent_msg_cnt++
        return {
            seq: rsp[4][2][4],
            rand: rsp[4][2][3],
            time: rsp[4][2][6],
        }
    }

    /** 撤回频道消息 */
    async recallMsg(seq: number): Promise<boolean> {
        const body = pb.encode({
            1: BigInt(this.guild.guild_id),
            2: Number(this.channel_id),
            3: Number(seq)
        })
        await this.c.sendOidbSvcTrpcTcp("OidbSvcTrpcTcp.0xf5e_1", body)
        return true
    }
}
