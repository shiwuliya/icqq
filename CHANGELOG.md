# Changelog

## [0.4.7](https://github.com/icqqjs/icqq/compare/v0.4.6...v0.4.7) (2023-06-24)


### Bug Fixes

* 支持重写client.getSign（可自行实现调用第三方签名api） ([e87a275](https://github.com/icqqjs/icqq/commit/e87a275c8d0214bdded3ac9401a8be29a3ff5a77))

## [0.4.6](https://github.com/icqqjs/icqq/compare/v0.4.5...v0.4.6) (2023-06-23)


### Bug Fixes

* ipad ver ([58e2529](https://github.com/icqqjs/icqq/commit/58e2529642a011ce8f29dd5d1a6b95590d479c8b))

## [0.4.5](https://github.com/icqqjs/icqq/compare/v0.4.4...v0.4.5) (2023-06-23)


### Bug Fixes

* 禁止Tim协议设置在线状态 ([baa7612](https://github.com/icqqjs/icqq/commit/baa76125b1eaf9d475e171138337fad85fd554d5))

## [0.4.4](https://github.com/icqqjs/icqq/compare/v0.4.3...v0.4.4) (2023-06-23)


### Bug Fixes

* Tim协议心跳超时问题 ([a7d950e](https://github.com/icqqjs/icqq/commit/a7d950e8148949add76f933065de0433b8421f7c))

## [0.4.3](https://github.com/icqqjs/icqq/compare/v0.4.2...v0.4.3) (2023-06-23)


### Bug Fixes

* 将安卓8.8.88协议替换为Tim3.5.1（platform: 6）需配合签名api使用 ([6ef5b26](https://github.com/icqqjs/icqq/commit/6ef5b26f33921298f774c54ed0906c8b3ae0f0e4))

## [0.4.2](https://github.com/icqqjs/icqq/compare/v0.4.1...v0.4.2) (2023-06-21)


### Bug Fixes

* 未配置sign API改为只提示一次 ([45e6040](https://github.com/icqqjs/icqq/commit/45e604043a97ee49fac6a055a1f409801780a8b3))
* 未配置sign API改为只提示一次 ([45e6040](https://github.com/icqqjs/icqq/commit/45e604043a97ee49fac6a055a1f409801780a8b3))

## [0.4.1](https://github.com/icqqjs/icqq/compare/v0.4.0...v0.4.1) (2023-06-21)


### Bug Fixes

* publish error ([ec80b45](https://github.com/icqqjs/icqq/commit/ec80b454bc0a236fd0348945b862ca0e66fd750b))

## [0.4.0](https://github.com/icqqjs/icqq/compare/v0.3.15...v0.4.0) (2023-06-18)


### Features

* 实现消息签名组包（test）。 ([e75fa03](https://github.com/icqqjs/icqq/commit/e75fa0334ab01bb56c9824058831931f63e90f94))


### Bug Fixes

* Config增加签名接口地址配置，可自行实现签名API，供ICQQ调用 ([412c387](https://github.com/icqqjs/icqq/commit/412c3871ed84bd03d53d8f61127e4bbb29c431fd))
* prettier log ([984d59b](https://github.com/icqqjs/icqq/commit/984d59be7b62333f73a3446a4b2349c30170d660))
* 更新ts文件到src，便于区分编译文件和源文件 ([dbca2bb](https://github.com/icqqjs/icqq/commit/dbca2bbb8b98b8f2c68294fcf4024dcc1b8a5dd4))

## [0.3.15](https://github.com/icqqjs/icqq/compare/v0.3.14...v0.3.15) (2023-05-30)


### Bug Fixes

* t548 算法错误 ([790f5ff](https://github.com/icqqjs/icqq/commit/790f5ff07c56f1a2773ab9461ac2f456e61cc4df))

## [0.3.14](https://github.com/icqqjs/icqq/compare/v0.3.13...v0.3.14) (2023-05-20)


### Bug Fixes

* PoW 算法错误 ([5f47445](https://github.com/icqqjs/icqq/commit/5f4744596b78b88c12189f5b9ac89b2f294be299))
* 提交验证码时计算t547。 ([8b21c01](https://github.com/icqqjs/icqq/commit/8b21c01a7af3c86267fd29b8322531a6fd1e95ca))

## [0.3.13](https://github.com/icqqjs/icqq/compare/v0.3.12...v0.3.13) (2023-05-19)


### Bug Fixes

* 刷新token时备份上次token，登录时如找不到token将使用上次的token进行登录 ([8b2a872](https://github.com/icqqjs/icqq/commit/8b2a872a915b6c05b37a6441cf23e2d4879c61eb))

## [0.3.12](https://github.com/icqqjs/icqq/compare/v0.3.11...v0.3.12) (2023-05-17)


### Bug Fixes

* 。 ([4700e26](https://github.com/icqqjs/icqq/commit/4700e263d10e14b36097fe11b3db8b3ad3656597))

## [0.3.11](https://github.com/icqqjs/icqq/compare/v0.3.10...v0.3.11) (2023-05-17)


### Bug Fixes

* 。 ([0d78051](https://github.com/icqqjs/icqq/commit/0d78051bdbd326bfca3216fe84f43b3ad312656d))

## [0.3.10](https://github.com/icqqjs/icqq/compare/v0.3.9...v0.3.10) (2023-05-11)


### Bug Fixes

* 修复token刷新失败问题，刷新间隔修改为12小时。 ([bdbfb44](https://github.com/icqqjs/icqq/commit/bdbfb44e2bb39976ecc28a6d0990dd8b4381ccc6))

## [0.3.9](https://github.com/icqqjs/icqq/compare/v0.3.8...v0.3.9) (2023-05-11)


### Bug Fixes

* 刷新token错误 ([15bd8b4](https://github.com/icqqjs/icqq/commit/15bd8b4c0074d047e0793f08c6a0f07befa92ddd))
* 更改watch自动扫码登陆提示 ([68b4743](https://github.com/icqqjs/icqq/commit/68b474374c1e855db369e00097d6e13c63252285))

## [0.3.8](https://github.com/icqqjs/icqq/compare/v0.3.7...v0.3.8) (2023-05-11)


### Bug Fixes

* 修复扫码登录提示密码错误问题。 ([fc7c80e](https://github.com/icqqjs/icqq/commit/fc7c80ea066b0170515aed1337b13759959bc246))

## [0.3.7](https://github.com/icqqjs/icqq/compare/v0.3.6...v0.3.7) (2023-05-11)


### Bug Fixes

* 修复watch 扫码登陆 ([02a5749](https://github.com/icqqjs/icqq/commit/02a5749477fdd62e39f8275b1fd23ac82695d8c5))

## [0.3.6](https://github.com/icqqjs/icqq/compare/v0.3.5...v0.3.6) (2023-05-10)


### Bug Fixes

* 。 ([64682e8](https://github.com/icqqjs/icqq/commit/64682e839c6908cb0c361bd557b9d61e5fdb5706))

## [0.3.5](https://github.com/icqqjs/icqq/compare/v0.3.4...v0.3.5) (2023-05-10)


### Bug Fixes

* 修复无法发送短信验证码问题。 ([8d397bd](https://github.com/icqqjs/icqq/commit/8d397bd7965e6b9b6c7c5814c03114898d5b515e))

## [0.3.4](https://github.com/icqqjs/icqq/compare/v0.3.3...v0.3.4) (2023-05-10)


### Bug Fixes

* 修复node16以上版本无法正常使用问题。 ([c570689](https://github.com/icqqjs/icqq/commit/c570689835627c5e2c64fb50ebfaf355aa3147fa))

## [0.3.3](https://github.com/icqqjs/icqq/compare/v0.3.2...v0.3.3) (2023-05-10)


### Bug Fixes

* login error 16 ([f4d9c4f](https://github.com/icqqjs/icqq/commit/f4d9c4fc82462ca2238b36fb7dcf1f0c7e18b687))

## [0.3.2](https://github.com/icqqjs/icqq/compare/v0.3.1...v0.3.2) (2023-05-05)


### Bug Fixes

* 544改为本地计算 ([df2a208](https://github.com/icqqjs/icqq/commit/df2a20845f4119dc437afc5133e0ea75b95dd522))
* token登录提示 ([d2002f8](https://github.com/icqqjs/icqq/commit/d2002f88e21d955383549eeba9a07bcf283df82c))
* 升级triptrap ([eb007a2](https://github.com/icqqjs/icqq/commit/eb007a292acb1dc7347b1706ceee4f2a90a2ce77))
* 移除lodash依赖 ([b437b51](https://github.com/icqqjs/icqq/commit/b437b5115295f626e2d2f3cf5f3f7e9c31594ca1))

## [0.3.1](https://github.com/icqqjs/icqq/compare/v0.3.0...v0.3.1) (2023-04-24)


### Bug Fixes

* . ([d99c3b0](https://github.com/icqqjs/icqq/commit/d99c3b05a93da16e4b13b229f0646b48766ea21c))

## [0.3.0](https://github.com/icqqjs/icqq/compare/v0.2.3...v0.3.0) (2023-04-24)


### Features

* 新增安卓QQ8.8.88版本协议，Platform = 6，无法登录的可尝试。 ([e3baaa6](https://github.com/icqqjs/icqq/commit/e3baaa621d0b2f458e6d113e5df7d3872f0ad467))

## [0.2.3](https://github.com/icqqjs/icqq/compare/v0.2.2...v0.2.3) (2023-04-22)


### Bug Fixes

* 更新 T544 API ([8ac1c45](https://github.com/icqqjs/icqq/commit/8ac1c457460678e50695a82c773dc3f3bcd2f6b0))

## [0.2.2](https://github.com/icqqjs/icqq/compare/v0.2.1...v0.2.2) (2023-04-20)


### Bug Fixes

* mac协议无法登录问题。 ([c06e734](https://github.com/icqqjs/icqq/commit/c06e734079881b5ac27425ec48cdd863f323ee69))

## [0.2.1](https://github.com/icqqjs/icqq/compare/v0.2.0...v0.2.1) (2023-04-16)


### Bug Fixes

* 修复版本过低。 ([79540d7](https://github.com/icqqjs/icqq/commit/79540d75b618fc4ae79ba8a235df4b1df17f56c3))

## [0.2.0](https://github.com/icqqjs/icqq/compare/v0.1.0...v0.2.0) (2023-04-05)


### Features

* guild ([c1611f0](https://github.com/icqqjs/icqq/commit/c1611f00f6a4489fff2035fa0139823d5a19be53))
* Support nested MultiMsg ([#373](https://github.com/icqqjs/icqq/issues/373)) ([8de6eb2](https://github.com/icqqjs/icqq/commit/8de6eb2e33b6cb07e301b90703b0aeeaa2f7c876))
* tlv548 ([498a611](https://github.com/icqqjs/icqq/commit/498a611d00c886875a5e78206b0e4700baf558f1))
* 增加新表情 ([#379](https://github.com/icqqjs/icqq/issues/379)) ([211bc18](https://github.com/icqqjs/icqq/commit/211bc186b834704b4ac68b6883d2aaa1e40b84df))


### Bug Fixes

* 125 (exchange_emp) ([4729b38](https://github.com/icqqjs/icqq/commit/4729b387d822a54bfb543410f0c5dcfd4faacc7f))
* 142 ([6f15cdc](https://github.com/icqqjs/icqq/commit/6f15cdc2604a14c746b564505bd8200946d0fe05))
* 179 ([27ef3dd](https://github.com/icqqjs/icqq/commit/27ef3ddaf3a4e92860ae7ac5e3383c365fcd42cf))
* 199 [#202](https://github.com/icqqjs/icqq/issues/202) ([abd25b0](https://github.com/icqqjs/icqq/commit/abd25b097c312ff8874ae961a47c3c1ea5e40402))
* 210 ([3b431f8](https://github.com/icqqjs/icqq/commit/3b431f8b8d84229249286b874cede248a9c2c884))
* 214 ([99e10e6](https://github.com/icqqjs/icqq/commit/99e10e6514e212b354c7ec5e383da5271e30c766))
* 226 ([d65657d](https://github.com/icqqjs/icqq/commit/d65657df9ea0a9e872d75ae7565a40919a45dc2b))
* 263 ([ec11274](https://github.com/icqqjs/icqq/commit/ec1127452ab73cccb2e08e19e845336d7e222692))
* 281 ([58a43ed](https://github.com/icqqjs/icqq/commit/58a43ed6bfa1fec324df296e436f8008e347fcfa))
* 282 ([621007a](https://github.com/icqqjs/icqq/commit/621007a7b87ca4916f2d191457bd3fc0851bd189))
* device降会35 ([667bac7](https://github.com/icqqjs/icqq/commit/667bac7c6a93d5dec8d576ff61b708beb2de32a2))
* generate IMEI ([6be4f9f](https://github.com/icqqjs/icqq/commit/6be4f9f7790d7386e9d94ea738f1497bec4c54e8))
* qimei ([498a611](https://github.com/icqqjs/icqq/commit/498a611d00c886875a5e78206b0e4700baf558f1))
* qimei sdkver ([4663e3a](https://github.com/icqqjs/icqq/commit/4663e3a314fdd81b1481f0ae151c8eeddd972c69))
* tgtgt错误，兼容原版oicq登录方式 ([0bab3e0](https://github.com/icqqjs/icqq/commit/0bab3e09d63cc85a6c27de0dfd87f1a3aa5feacf))
* type Error ([adf3ba6](https://github.com/icqqjs/icqq/commit/adf3ba6f3e9737e0cc4fddd00bdeb8335a42081a))
* update SSO config server URL ([#352](https://github.com/icqqjs/icqq/issues/352)) ([c1d6d99](https://github.com/icqqjs/icqq/commit/c1d6d9989018b58a532ca5cee20e9aa4cc00e64c))
* 修复特殊文件(文件名带%)的链接无法正常下载 ([d82e127](https://github.com/icqqjs/icqq/commit/d82e1274026c956966ee7c5af86c84c8230119a6))
* 合并转发消息使用群聊模式会导致部分框架无法解析来源 ([#361](https://github.com/icqqjs/icqq/issues/361)) ([1c4b261](https://github.com/icqqjs/icqq/commit/1c4b261471bee8aecce83f00b3571220ca39d207))
* 沙箱环境以外的访问到client ([8662855](https://github.com/icqqjs/icqq/commit/8662855e52b7f28ec7c8089bdd53620009da47fd))
* 私聊回复消息产生一个多余的@ ([#320](https://github.com/icqqjs/icqq/issues/320)) ([64532c7](https://github.com/icqqjs/icqq/commit/64532c77137f7bfdb0bb0e2aa4bbef27160885c1))

## [0.1.0](https://github.com/icqqjs/icqq/compare/0.0.1...v0.1.0) (2023-04-03)


### Features

* tlv548 ([498a611](https://github.com/icqqjs/icqq/commit/498a611d00c886875a5e78206b0e4700baf558f1))


### Bug Fixes

* generate IMEI ([6be4f9f](https://github.com/icqqjs/icqq/commit/6be4f9f7790d7386e9d94ea738f1497bec4c54e8))
* qimei ([498a611](https://github.com/icqqjs/icqq/commit/498a611d00c886875a5e78206b0e4700baf558f1))
* qimei sdkver ([4663e3a](https://github.com/icqqjs/icqq/commit/4663e3a314fdd81b1481f0ae151c8eeddd972c69))
* type Error ([adf3ba6](https://github.com/icqqjs/icqq/commit/adf3ba6f3e9737e0cc4fddd00bdeb8335a42081a))
* 修复特殊文件(文件名带%)的链接无法正常下载 ([d82e127](https://github.com/icqqjs/icqq/commit/d82e1274026c956966ee7c5af86c84c8230119a6))
