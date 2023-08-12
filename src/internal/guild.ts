import { randomBytes } from "crypto"
import { pb } from "../core"
import { lock, log } from "../common"
import { parse, MessageElem, Sendable } from "../message"

type Client = import("../client").Client

/** 频道发消息的返回值 */
export interface GuildMessageRet {
	seq: number
	rand: number
	time: number
}

/** 频道消息事件 */
export class GuildMessageEvent {
	/** 频道id */
	guild_id: string
	/** 频道名 */
	guild_name: string
	/** 子频道id */
	channel_id: string
	/** 子频道名 */
	channel_name: string
	post_type: 'message' = 'message'
	detail_type: string = 'guild'
	/** 消息序号（同一子频道中一般顺序递增） */
	seq: number
	rand: number
	time: number
	/** 消息内容 */
	message: MessageElem[]
	raw_message: string
	/** 发送方信息 */
	sender: {
		/** 账号 */
		tiny_id: string
		/** 昵称 */
		nickname: string
	}

	constructor(proto: pb.Proto) {
		const head1 = proto[1][1][1]
		const head2 = proto[1][1][2]
		if (head2[1] !== 3840)
			throw new Error("unsupport guild message type")
		const body = proto[1][3]
		const extra = proto[1][4]
		this.guild_id = String(head1[1])
		this.channel_id = String(head1[2])
		this.guild_name = String(extra[2])
		this.channel_name = String(extra[3])
		this.sender = {
			tiny_id: String(head1[4]),
			nickname: String(extra[1])
		}
		this.seq = head2[4]
		this.rand = head2[3]
		this.time = head2[6]
		const parsed = parse(body[1])
		this.message = parsed.message
		this.raw_message = parsed.brief
		lock(this, "proto")
	}

	/** 暂时仅支持发送： 文本、AT、表情 */
	reply!: (content: Sendable) => Promise<GuildMessageRet>
}

export function guildMsgListener(this: Client, payload: Buffer) {
	try {
		var msg = new GuildMessageEvent(pb.decode(payload))
	} catch {
		return
	}
	if (msg.sender.tiny_id === this.tiny_id && this.config.ignore_self)
		return
	this.stat.recv_msg_cnt++
	this.logger.info(`recv from: [Guild: ${msg.guild_name}, Member: ${msg.sender.nickname}]` + msg.raw_message)
	msg.reply = (content: Sendable) => {
		return this.sendGuildMsg(msg.guild_id, msg.channel_id, content)
	}
	this.em("message.guild", msg)
}
