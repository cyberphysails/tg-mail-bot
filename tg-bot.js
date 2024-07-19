import { Telegraf } from 'telegraf';
import { button, inlineKeyboard } from 'telegraf/markup';
import { link, join, fmt } from 'telegraf/format';
import { MailLogger } from './utils.js';

const CB_CMD_DEL_MAIL_SURE = "del_mail_sure";
const CB_CMD_DEL_MAIL = "del_mail";
const CB_CMD_UNREAD_MAIL = "mark_mail_unread";

const buildCallbackData = (cmd, server, uid) => `${cmd} ${server} ${uid}`;
const parseCallbackData = (data) => {
  const res = data.split(' ');
  return res.length < 3 ? 
    {cmd: data, server:"", uid:""} : {cmd: res[0], server: res[1], uid: res[2]};
};

const inlineKBNewMail = (server, uid) => inlineKeyboard([
  button.callback("🗑️Delete", buildCallbackData(CB_CMD_DEL_MAIL, server, uid)), 
  button.callback("⭐Unread", buildCallbackData(CB_CMD_UNREAD_MAIL, server, uid)),
])

export const init_bot = (mailboxInstances, urlPrefix, botId, channelId) => {
  const bot = new Telegraf(botId)
  bot.start((ctx) => ctx.reply('Bot To Get Emails'))
  bot.help((ctx) => ctx.reply('I\'m busy.'))
  //bot.on(message('sticker'), (ctx) => ctx.reply('👍'))
  bot.hears('hi', (ctx) => ctx.reply('Hey there'))

  // react to messages of channel
  bot.on('channel_post', async (ctx) => {
    const chatId = ctx.channelPost.chat.id
    console.log('channel_port', chatId)
    if (ctx.channelPost.text === "text") {
      ctx.telegram.sendMessage(chatId, `wow ${ctx.channelPost.text}`,
          inlineKeyboard([
            button.callback("🗑️Delete", CB_CMD_DEL_MAIL), 
            button.callback("⭐Unread", CB_CMD_UNREAD_MAIL)]),
      )
    }
        //reply_markup: inlineKeyboard([[button.callback("Delete", CB_CMD_DEL_MAIL), button.callback("Unread", CB_CMD_UNREAD_MAIL)]])
    //    reply_markup : {
    //      inline_keyboard: [
    //        [
    //          {text: "🗑️Delete", callback_data: CB_CMD_DEL_MAIL },
    //          {text: "⭐Unread", callback_data: CB_CMD_UNREAD_MAIL },
    //        ],
    //      ],
    //    }
    //  })
    //}

    // Using context shortcut
    //await ctx.reply(`Hello ${ctx.state.role}`)
  })

  bot.on('callback_query', async (ctx) => {
    const query = ctx.callbackQuery;
    //console.log("get query", query);
    const msg = query.message;
    const cbData = parseCallbackData(query.data); 
    // check callback data, if server or uid info missed, clear inline keyboard
    if (cbData.server === "" || cbData.uid === "") {
      ctx.answerCbQuery("Mailbox info missed!");
      ctx.editMessageReplyMarkup()
      return;
    }
    switch (cbData.cmd) {
      case CB_CMD_DEL_MAIL:
        // confirm delete
        //ctx.editMessageReplyMarkup({inline_keyboard: [[{text: "Confirm to delete", callback_data: CB_CMD_DEL_MAIL_SURE}]]});
        ctx.editMessageReplyMarkup(inlineKeyboard([
          button.callback("Confirm to delete", buildCallbackData(CB_CMD_DEL_MAIL_SURE, cbData.server, cbData.uid))
        ]).reply_markup)
        break;
      case CB_CMD_DEL_MAIL_SURE:
        try {
          await mailboxInstances[cbData.server].deleteMail(cbData.uid);
        } catch (err) {
          ctx.answerCbQuery("Err occurs when delete!");
          ctx.editMessageReplyMarkup(inlineKBNewMail(cbData.server, cbData.uid).reply_markup);
          MailLogger(cbData.server,`Delete mail error: ${err}`);
          return;
        }
        MailLogger(cbData.server,`Delete mail: ${cbData.uid}`);
        ctx.answerCbQuery("Mail deleted!");
        ctx.deleteMessage(msg.message_id);
        break;
      case CB_CMD_UNREAD_MAIL:
        try {
          await mailboxInstances[cbData.server].markMailAsUnread(cbData.uid);
        } catch (err) {
          ctx.answerCbQuery("Err occurs when mark mail!");
          MailLogger(cbData.server,`Mark mail as unread error: ${err}`);
          return;
        }
        MailLogger(cbData.server,`Mark mail as unread: ${cbData.uid}`);
        ctx.editMessageReplyMarkup()
        break;
      default:
        ctx.answerCbQuery(`get a query: ${query.data}`);
    }
  })

  // warp a function to send mail to channel
  // rate limit 
  bot._workCnt = 0
  bot._mailList = []
  bot._sleep = async (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  } 
  bot.sendMail = (mail) => {
    bot._mailList.push(mail)
    if (bot._workCnt <= 0) {
      bot._doSendMail()
    }
  }
  bot._doSendMail = async () => {
    bot._workCnt += 1
    let limitCnt = 1;
    for (;;) {
      const mail = bot._mailList.pop();
      if (mail === undefined) {
        bot._workCnt -= 1
        return
      }
      try {
        const msgTemplate = [
          `Inbox: ${mail.server}`,
          `From: ${mail.from}`, 
          `To: ${mail.to}`, 
          `Date: ${mail.date}`, 
          fmt`Subject: ${link(mail.subject, `${urlPrefix}/${mail.md5}`)}`
        ];
        await bot.telegram.sendMessage(channelId, join(msgTemplate, '\n'), inlineKBNewMail(mail.server, mail.uid));
      } catch (err) {
        console.error("Send mail error:", err);
        bot._mailList.push(mail)
      } finally {
        // limit to 3 times per second
        if ( limitCnt > 3 ) {
          limitCnt = 1;
          await bot._sleep(1000)
        } else {
          limitCnt += 1;
        }
      }
    }
  }
  
  return bot
}
