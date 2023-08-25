//简单的登录，请参考 ./basic.ts 此处不再赘述
//#region 简单的登录
import { uin, pwd, sign_api_addr, groupID, masterID } from "./config";
import { Client, createClient, segment } from "../src/index";
const client: Client = createClient({ sign_api_addr: sign_api_addr });
client.login(uin, pwd);
client
  .on("system.online", () => {
    console.log("账号登录成功");
  })
  .on("system.login.slider", (event) => {
    console.log(`这是要访问滑块验证网站的url地址：${event.url}`);
    process.stdin.once("data", (input) => {
      client.submitSlider(String(input));
    });
  })
  .on("system.login.device", () => {
    client.sendSmsCode();
    process.stdin.once("data", (data) => {
      client.submitSmsCode(data.toString());
    });
  })
  .on("system.login.error", (event) => {
    console.log(`登录遇到错误，错误代码:${event.code}`);
    console.log(`登录遇到错误，错误信息:${event.message}`);
    process.exit();
  });
//#endregion

/**
 * 更多类型的消息由segment创建
 */

client.on("system.online", () => {
  //at消息 我们在群里面at某个人
  client.sendGroupMsg(groupID, segment.at(masterID));

  //或者把一个at和其他类型的消息组合, 使用消息数组
  client.sendGroupMsg(groupID, [
    segment.at(masterID),
    "我是其他类型的消息中的纯文本消息",
  ]);

  //发送图片
  client.sendGroupMsg(
    groupID,
    segment.image(`https://maohaoji.com/image标签.gif`)
  );

  //当然图片也可以组合其他类型的消息发送
  client.sendGroupMsg(groupID, [
    segment.at(masterID),
    segment.image(`https://maohaoji.com/image标签.gif`),
  ]);

  //更多内容请查看文档或者去浏览segment的d.ts文件
});
