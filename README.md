
## Usage

create a `accounts.js` file in root directory, and export your email account and telegram bot information.

```javascript
export const BotId = "xxx";
export const ChannelId = "xxx";
export const accounts = [
  {
    name: 'example',
    host: 'imap.example.com',
    port: 993,
    secure: true,
    user: 'user@example.com',
    pass: 'password-encodeed-by-base64',
    // inbox, junk, trash folder path, distinct by email provider
    inbox: 'INBOX',
    junk: 'Spam',
    trash: 'Trash',
  }
]
```

## TODO
- [x] 检查垃圾邮件
- [x] outlook 删除邮件不生效的问题
- [x] 邮件信息时间格式简化
- [x] 客户端重连失败问题
- [x] plain text 邮件内容解析
- [ ] 支持 oauth2 验证登录
- [ ] nodejs 进程管理方案(systemd or other)
- [ ] Promise 内部 error 处理

