import { ImapFlow } from 'imapflow';
import { parseMail } from './parse-mail.js';
import { MailLogger as mailLogger } from './utils.js';


async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function newClient(account) {
  //decode the accout.auth.pass
  const pass = Buffer.from(account.pass, 'base64').toString('ascii');
  return new ImapFlow({
      host: account.host,
      port: account.port,
      secure: account.secure,
      auth: {
          user: account.user,
          pass: pass,
      },
      // disable logger
      logger: false,
  });
}

export class MailClient {
  // read email account information, transfer to imapflow
  constructor(account) {
    this.account = account;
    this.name = `${account.name}_${account.mailbox}`;
    this.mailbox = account.mailbox;
    this.trashMailbox = account.trash || 'Trash';
    this.client = newClient(this.account);
  }

  setClientListener() {
    // when connection is closed, retry to connect
    this.client.on('close', async () => {
      mailLogger(this.name, 'Connection closed, retry to connect');
      // TODO shoud add a retry limit and interval
      await sleep(15000);
     
      // according to the document, the client should be re-created
      // https://github.com/postalsys/imapflow/issues/63
      this.client = newClient(this.account);
      await this.connectServer(); 
      this.listenOnNewMails();
    });

    // resolve error
    this.client.on('error', async (err) => {
      mailLogger(this.name, `Error occurs: ${err}`);
    });
  }

  async connectServer() {
    this.setClientListener();

    mailLogger(this.name, `Connectting to server`)
    await this.client.connect();
    mailLogger(this.name, `Open mailbox ${this.mailbox}`)
    await this.client.getMailboxLock(this.mailbox);
  }

  async disconnect() {
    mailLogger(this.name, 'Logout');
    this.client.removeAllListeners('close')
    await this.client.logout()
  }

  listenOnNewMails(bot) {
    this.client.on('exists', async (data) => {
      mailLogger(this.name, `Message count in "${data.path}" now is ${data.count}, prev is ${data.prevCount}`)
      this.fetchAndSendMail(bot).catch(err => mailLogger(this.name, `FetchAndSendMail error: ${err}`));
    });
    this.fetchAndSendMail(bot).catch(err => mailLogger(this.name, `FetchAndSendMail error: ${err}`));
  }
  
  async fetchAndSendMail(bot) {
    const msgs = await this.client.search({ recent: true, seen: false }, {uid: true});
    mailLogger(this.name, `Receive "${msgs.length}" new messages`);

    for (const msg_id of msgs) {
      mailLogger(this.name, `To fetch mail:${msg_id}`)
      const msg = await this.client.fetchOne(msg_id, { envelope: true, source: true, bodyStructure: true }, {uid: true});
      mailLogger(this.name, `Fetched mail info: ${msg.uid}, ${msg.envelope.subject}`)

      parseMail(msg)
        .then(mail => bot.sendMail({...mail, mailbox: this.mailbox, server: this.name}))
        .catch(err => mailLogger(this.name, `Parse mail error: ${err}`));

      const status = await this.client.messageFlagsAdd([msg.uid], ['\\Seen'], { uid: true });
      mailLogger(this.name, `Marked mail ${msg.uid} as seen ${status ? "successful" : "failed"}`)
    };
  }

  // delete a mail by msgId 
  async deleteMail(msgId) {
    //await this.client.messageDelete(msgId, { uid: true });
    await this.client.messageMove([msgId], this.trashMailbox, { uid: true });
  }

  // mark the message as unread
  async markMailAsUnread(msgId) {
      await this.client.messageFlagsRemove([msgId], ['\\Seen'], { uid: true });
  }
}


