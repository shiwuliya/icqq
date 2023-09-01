import { uin, pwd, masterID, sign_api_addr } from "./config";

/**
 * 在实际开发中, 我们应当在安装完毕icqq依赖后, 如下行一样引入
 * import { createClient } from 'icqq'
 */

/* 这里因为直接在icqq库中, 就直接从源文件导入就行 */
import { Client, createClient } from "../src/index";

/**
 * 我们为每一个QQ账号创建一个实例
 * 我们可以使用createClient方法或者直接new Client()来创建实例
 */

const client: Client = createClient({ sign_api_addr: sign_api_addr });

//我们后续的开发会主要围绕这个client

/**调用login方法传入账号密码来进行登录 */
client.login(uin, pwd);

/**
 * 同时我们监听相关的事件
 * icqq的登录结果是作为事件传回的
 */

//登录成功
// Client.on<"system.online">(event: "system.online", listener: (event: undefined) => void): ToDispose<Client>
client.on("system.online", () => {
  console.log("账号登录成功");
});

//遇到滑动验证码(滑块)
// Client.on<"system.login.slider">(event: "system.login.slider", listener: (event: {url: string;}) => void): ToDispose<Client>
client.on("system.login.slider", (event) => {
  console.log(`这是要访问滑块验证网站的url地址：${event.url}`);
  //我们要访问event.url，完成滑块并从网络相应中取出ticket
  // ticket使用submitSlider方法传入
  process.stdin.once("data", (input) => {
    client.submitSlider(String(input));
  });
});

//遇到短信验证码(包含真假设备锁)
//Client.on<"system.login.device">(event: "system.login.device", listener: (event: {url: string;phone: string;}) => void): ToDispose<Client>
client.on("system.login.device", (event) => {
  use(event);
  //使用sendSmsCode方法来发送短信验证码
  client.sendSmsCode();
  process.stdin.once("data", (data) => {
    //输入短信验证码并使用submitSmsCode方法传入
    client.submitSmsCode(data.toString());
  });
});

//遇到登录错误的信息
client.on("system.login.error", (event) => {
  console.log(`登录遇到错误，错误代码:${event.code}`);
  console.log(`登录遇到错误，错误信息:${event.message}`);
  process.exit();
});

//开始处理消息的部分
/**
 * icqq的消息接受部分依旧使用on监听来实现
 *
 * 一个事件可以绑定多个监听函数，并且为连续传递，例如：
 * 为 notice 事件绑定的监听器，对所有 notice.*.* 事件都有效
 * 为 notice.group 事件绑定的监听器，对所有 notice.group.* 事件都有效
 */

client.on("system.online", () => {
  //运用sendPrivateMsg实现发送私聊消息
  client.sendPrivateMsg(masterID, "Hello World");

  //监听所有私聊消息
  client.on("message.private", (event) => {
    console.log(
      `收到私聊消息来自${event.sender.user_id}, 文本内容为:${event.raw_message}`
    );
  });

  //监听群聊消息
  client.on("message.group", (event) => {
    console.log(
      `收到群聊${event.group_id}消息来自${event.sender.user_id}, 文本内容为:${event.raw_message}`
    );
  });
});

/**这个函数可以帮助我们使用掉无用的变量, 因展示需要声明的部分无用变量可能会导致eslint检查不通过报错 */
const use = async (v: any) => new Promise((res) => res(v));
