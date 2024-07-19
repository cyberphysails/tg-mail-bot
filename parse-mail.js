import { simpleParser } from 'mailparser';
import crypto from 'crypto';
import * as fs from 'fs';
import { DateFormat } from './utils.js';

const printBodyStructure = (structure) => {
  let structStr = `<li>${structure.part ? structure.part : "0" }.&nbsp;${structure.type}</li>`
  if (structure.childNodes !== undefined ){
    structure.childNodes.forEach(node => {
      structStr += printBodyStructure(node);
    });
  };
  return structStr;
};


// parse email from a buffer
// mail is a message object from imapflow
export const parseMail = async (mail) => {
    const parsed = await simpleParser(mail.source, {
      formatDateString: d => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai',timeStyle: "short", dateStyle: "short" }).format(d),
    });
    // calc md5 of email from, date, subject
    const md5 = crypto.createHash('md5').update(parsed.from.text + parsed.date + parsed.subject).digest('hex');
    let structure = `
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
From: ${parsed.from.html}<br>
To: ${parsed.to.html}<br>
Date: ${parsed.date}<br>
Subject: ${parsed.subject}<br>
Body structure:<br>`;
    structure += printBodyStructure(mail.bodyStructure);
    // store the html content of email to file
    fs.writeFileSync(`data/${md5}`, structure + (parsed.html ? parsed.html : parsed.textAsHtml));
    return {
      from: parsed.from.value.reduce((acc, cur) => acc + cur.address + " ", ""),
      to: parsed.to.value.reduce((acc, cur) => acc + cur.address + " ", ""),
      date: DateFormat.format(parsed.date),
      subject: parsed.subject, 
      md5: md5, 
      uid: mail.uid
    };
}
