# icqq

[![npm version](https://img.shields.io/npm/v/icqq/latest.svg)](https://www.npmjs.com/package/icqq)
[![dm](https://shields.io/npm/dm/icqq)](https://www.npmjs.com/package/icqq)
[![node engine](https://img.shields.io/node/v/icqq/latest.svg)](https://nodejs.org)
[![discord](https://img.shields.io/static/v1?label=chat&message=on%20discord&color=7289da&logo=discord)](https://discord.gg/D7T7wPtwvb)

* QQ（安卓）协议基于 Node.js 的实现，支持最低node版本为 v14
* 若你不熟悉 Node.js 或不会组织代码，可通过 [template](https://github.com/icqqjs/icqq-template) 创建一个简单的应用程序
* [Type Docs](https://icqqjs.github.io/icqq/)（文档仅供参考，具体类型以包内d.ts声明文件为准）
* [从 OICQ v1.x 升级](https://github.com/takayama-lily/oicq/projects/3#column-16638290)（v1 在 OICQ 的 master 分支）
* QQ频道未来不会直接支持，请使用插件 [icqq-guild](https://github.com/icqqjs/icqq-guild)

ICQQ 是 [OICQ](https://github.com/takayama-lily/oicq) 的分支。ICQQ 的存在少不了 OICQ 作者 [takayama-lily](https://github.com/takayama-lily) 与 OICQ 的其它贡献者们，在此特别鸣谢！

----

**安装:**

```bash
> npm i icqq  # or > yarn add icqq
```

**快速上手:**

```js
const { createClient } = require("icqq")
const client = createClient()

client.on("system.online", () => console.log("Logged in!"))
client.on("message", e => {
  console.log(e)
  e.reply("hello world", true) //true表示引用对方的消息
})

client.on("system.login.qrcode", function (e) {
  //扫码后按回车登录
  process.stdin.once("data", () => {
    this.login()
  })
}).login()
```

注意：扫码登录现在仅能在同一ip下进行，建议使用密码登录，只需验证一次设备便长期有效  
[密码登录教程](https://github.com/icqqjs/icqq/wiki/01.%E4%BD%BF%E7%94%A8%E5%AF%86%E7%A0%81%E7%99%BB%E5%BD%95-(%E6%BB%91%E5%8A%A8%E9%AA%8C%E8%AF%81%E7%A0%81%E6%95%99%E7%A8%8B))


**其他：**

* [QQWebApi](./web-api.md) QQ Web Api 收集整理 (途中)
* [TXHook](https://github.com/fuqiuluo/TXHook) 抓包工具推荐

[![group:860669870](https://img.shields.io/badge/group-860669870-blue)](https://jq.qq.com/?_wv=1027&k=xAdGDRVh)
