import { accounts, ChannelId, BotId  } from './accounts.js';
import { init_bot } from './tg-bot.js';
import { start_server as start_http_server } from './server-mail.js';
import { MailClient } from './get-mail.js';

// init mail client
const MailboxInstancs = {};
for (const account of accounts) {
  // open two client for inbox and junk, each client has its own connection
  const inboxIns = {...account, mailbox: (account.inbox || 'INBOX')};
  const inboxClient = new MailClient(inboxIns);
  MailboxInstancs[inboxClient.name] = inboxClient;
  await inboxClient.connectServer();

  const junkIns = {...account, mailbox: (account.junk || 'Junk')};
  const junkClient = new MailClient(junkIns);
  MailboxInstancs[junkClient.name] = junkClient;
  await junkClient.connectServer();
  
};

// start http server for serving mail file
const http_server = start_http_server('0.0.0.0', 3000)

// start bot
const bot = init_bot(MailboxInstancs, 'http://192.168.66.13:3000', BotId, ChannelId)
bot.launch()

// start listen new mails
Object.keys(MailboxInstancs).forEach(key => {
  MailboxInstancs[key].listenOnNewMails(bot);
});

// Enable graceful stop
process.once('SIGINT', () => {
  console.log('Stoping bot[SIGINT]');
  Object.keys(MailboxInstancs).forEach(key => {
    MailboxInstancs[key].disconnect();
  });
  http_server.close();
  bot.stop('SIGINT')
})
process.once('SIGTERM', () => {
  console.log('Stoping bot[SIGTERM]');
  Object.keys(MailboxInstancs).forEach(key => {
    MailboxInstancs[key].disconnect();
  });
  http_server.close();
  bot.stop('SIGTERM')
})
