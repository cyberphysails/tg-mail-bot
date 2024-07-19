
export const DateFormat = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai',timeStyle: "medium", dateStyle: "short" });

export const MailLogger = (server_name, string) => {
    console.log(`${DateFormat.format(new Date())} [${server_name}]: ${string}`);
}
