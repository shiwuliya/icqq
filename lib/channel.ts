import {randomBytes} from "crypto";
import {Guild} from "./guild";
import {ApiRejection, pb} from "./core"
import {lock} from "./core/constants";
import {Converter, Sendable} from "./message";

export enum NotifyType {
    Unknown = 0,
    AllMessages = 1,
    Nothing = 2,
}

export enum ChannelType {
    Unknown = 0,
    Text = 1,
    Voice = 2,
    Live = 5,
    App = 6,
    Forum = 7,
}

export class Channel{

    channel_name = ""
    channel_type = ChannelType.Unknown
    notify_type = NotifyType.Unknown

    constructor(public readonly guild: Guild, public readonly channel_id: string) {
        lock(this, "guild")
        lock(this, "channel_id")
    }
    _renew(channel_name: string, notify_type: NotifyType, channel_type: ChannelType) {
        this.channel_name = channel_name
        this.notify_type = notify_type
        this.channel_type = channel_type
    }

    /**
     * 发送频道消息
     * 暂时仅支持发送： 文本、AT、表情
     */
    async sendMsg(content: Sendable): Promise<{ seq: number, rand: number, time: number}> {
        const {rich,brief}=new Converter(content)
        const payload = await this.guild.c.sendUni("MsgProxy.SendMsg", pb.encode({
            1: {
                1: {
                    1: {
                        1: BigInt(this.guild.guild_id),
                        2: Number(this.channel_id),
                        3: this.guild.c.uin
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
        this.guild.c.logger.info(`succeed to send: [Guild(${this.guild.guild_name}),Channel(${this.channel_name})] ` + brief)
        this.guild.c.stat.sent_msg_cnt++
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
        await this.guild.c.sendOidbSvcTrpcTcp("OidbSvcTrpcTcp.0xf5e_1", body)
        return true
    }
}
